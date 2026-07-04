import { useAuth } from '@/features/auth/useAuth';
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
export const MAX_ATTEMPTS = 5;

export function isDeadItem(item: SyncQueueItem): boolean {
  return item.attempts >= MAX_ATTEMPTS;
}

export async function retryDeadItems(): Promise<number> {
  let n = 0;
  await db.sync_queue
    .toCollection()
    .filter((q) => isDeadItem(q))
    .modify((q) => {
      q.attempts = 0;
      q.last_error = undefined;
      n += 1;
    });
  if (n > 0) scheduleSync();
  return n;
}

export async function runSync(): Promise<void> {
  if (!useAuth.getState().user) return;
  if (inProgress) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  inProgress = true;

  try {
    // Limpa itens órfãos: IDs não-UUID (lixo do bug pré-fix, irrecuperável por construção).
    // Itens mortos (attempts >= MAX_ATTEMPTS) NÃO são deletados aqui — vão pra dead-letter
    // (pulados no loop abaixo) até um retry manual via retryDeadItems().
    const allQueue = await db.sync_queue.toArray();
    const orphanIds = allQueue
      .filter((q) => {
        const id = q.data?.id;
        return !!(id && typeof id === 'string' && !UUID_REGEX.test(id));
      })
      .map((q) => q.id)
      .filter((id): id is number => typeof id === 'number');
    if (orphanIds.length > 0) {
      await db.sync_queue.bulkDelete(orphanIds);
    }

    // Device compartilhado: um logout que preserva o Dexie (pendências não sincronizadas)
    // seguido de login de OUTRO usuário não pode empurrar a fila de A sob a sessão de B —
    // o item seria atribuído a B e o trigger enforce_operador_fields poderia mutilar
    // silenciosamente edições de admin. Cada item só é empurrado pelo dono original;
    // itens de outros usuários ficam preservados na fila (e continuam protegendo as
    // linhas locais correspondentes via pendingByTable no pull) até o dono logar de novo.
    const uid = useAuth.getState().user?.id;
    const queue = await db.sync_queue.orderBy('timestamp').toArray();
    for (const item of queue) {
      if (isDeadItem(item)) continue;
      if (item.user_id !== uid) continue;
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
        // Só erro permanente (PostgrestError com `.code` string — RLS, FK, unique) mata o
        // item (incrementa attempts). Falha transiente (rede: fetch rejeitado sem `.code`)
        // não pode contar pra dead-letter — só atualiza o diagnóstico.
        const code = (err as { code?: unknown })?.code;
        const permanent = typeof code === 'string';
        await db.sync_queue.update(item.id!, {
          ...(permanent ? { attempts: item.attempts + 1 } : {}),
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

const g = globalThis as { __presencaSyncTimers?: boolean };
if (typeof window !== 'undefined' && !g.__presencaSyncTimers) {
  g.__presencaSyncTimers = true;
  window.addEventListener('online', scheduleSync);
  setInterval(scheduleSync, 30_000);
}
