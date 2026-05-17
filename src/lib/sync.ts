import type { SyncQueueItem } from '@/types/domain';
import type { Table } from 'dexie';
import { db } from './db';
import { supabase } from './supabase';

// Linha mínima comum a todas as tabelas que entram no pull/push:
// PK string `id`; algumas têm `atualizado_em` (LWW), `chamadas` não tem.
interface SyncableRow {
  id: string;
  atualizado_em?: string;
}
type SyncableTable = Table<SyncableRow, string>;

let inProgress = false;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

export async function enqueueSync(
  item: Omit<SyncQueueItem, 'id' | 'attempts' | 'timestamp'>,
): Promise<void> {
  await db.sync_queue.add({
    ...item,
    attempts: 0,
    timestamp: Date.now(),
  });
  scheduleSync();
}

export function scheduleSync(): void {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void runSync();
  }, 500);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ATTEMPTS = 5;

export async function runSync(): Promise<void> {
  if (inProgress) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  inProgress = true;

  try {
    // Limpa itens órfãos: IDs não-UUID (pre-fix bug) ou já tentados demais
    const allQueue = await db.sync_queue.toArray();
    const orphanIds = allQueue
      .filter((q) => {
        if (q.attempts >= MAX_ATTEMPTS) return true;
        const id = q.data?.id;
        if (id && typeof id === 'string' && !UUID_REGEX.test(id)) return true;
        return false;
      })
      .map((q) => q.id)
      .filter((id): id is number => typeof id === 'number');
    if (orphanIds.length > 0) {
      await db.sync_queue.bulkDelete(orphanIds);
    }

    const queue = await db.sync_queue.orderBy('timestamp').toArray();
    for (const item of queue) {
      try {
        if (item.operation === 'delete') {
          const { error } = await supabase.from(item.table).delete().eq('id', item.data.id);
          if (error) throw error;
        } else {
          const onConflict =
            item.table === 'presencas'
              ? 'chamada_id,pessoa_id'
              : item.table === 'chamadas'
                ? 'data'
                : 'id';
          // Supabase JS infers a strict per-table payload type, but `item.data` is a
          // discriminated union — cast via `never` to satisfy each branch's overload.
          const { error } = await supabase
            .from(item.table)
            .upsert(item.data as never, { onConflict });
          if (error) throw error;
        }
        await db.sync_queue.delete(item.id!);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await db.sync_queue.update(item.id!, {
          attempts: item.attempts + 1,
          last_error: message,
          attempted_at: Date.now(),
        });
      }
    }
    await pullChanges();
  } finally {
    inProgress = false;
  }
}

async function pullChanges(): Promise<void> {
  const tables: SyncQueueItem['table'][] = [
    'familias',
    'pessoas',
    'chamadas',
    'presencas',
    'cestas',
    'itens',
    'pedidos',
  ];

  // Pending sync queue por tabela (não deletar dado local que está pendente push)
  const pendingByTable = new Map<string, Set<string>>();
  const queue = await db.sync_queue.toArray();
  for (const q of queue) {
    if (!pendingByTable.has(q.table)) pendingByTable.set(q.table, new Set());
    if (q.data?.id) pendingByTable.get(q.table)!.add(q.data.id as string);
  }

  // Paralelizar todos os fetches do server (latência soma ~700ms vs ~3-5s sequencial)
  // Paginar via .range() pra escapar do cap default de 1000 rows do PostgREST.
  const PAGE = 1000;
  const fetched = await Promise.all(
    tables.map(async (tableName) => {
      const all: SyncableRow[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .range(from, from + PAGE - 1);
        if (error) return { tableName, data: null };
        if (!data || data.length === 0) break;
        all.push(...(data as SyncableRow[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return { tableName, data: all };
    }),
  );

  for (const { tableName, data } of fetched) {
    if (!data) continue;
    // Dexie.table(name) returns Table<any,any> — narrow para nosso shape comum.
    const table = db.table(tableName) as SyncableTable;

    const serverIds = new Set(data.map((r) => r.id));
    const pendingIds = pendingByTable.get(tableName) ?? new Set<string>();

    await db.transaction('rw', table, async () => {
      for (const row of data) {
        const local = await table.get(row.id);
        const localTs = local?.atualizado_em ?? '';
        const rowTs = row.atualizado_em ?? '';
        if (!local || rowTs >= localTs) {
          await table.put(row);
        }
      }
      const all = await table.toArray();
      for (const local of all) {
        if (!serverIds.has(local.id) && !pendingIds.has(local.id)) {
          await table.delete(local.id);
        }
      }
    });
  }

  // Cleanup presencas com chamada_id órfão (chamada local foi deletada acima)
  const validChamadaIds = new Set((await db.chamadas.toArray()).map((c) => c.id));
  const orphanPresencas = await db.presencas
    .filter((p) => !validChamadaIds.has(p.chamada_id))
    .toArray();
  if (orphanPresencas.length > 0) {
    await db.transaction('rw', db.presencas, async () => {
      for (const p of orphanPresencas) {
        if (!pendingByTable.get('presencas')?.has(p.id)) {
          await db.presencas.delete(p.id);
        }
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', scheduleSync);
  setInterval(scheduleSync, 30_000);
}
