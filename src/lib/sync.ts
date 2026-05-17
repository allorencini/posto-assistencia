import type { SyncQueueItem } from '@/types/domain';
import { db } from './db';
import { supabase } from './supabase';

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

export async function runSync(): Promise<void> {
  if (inProgress) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  inProgress = true;

  try {
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
          const { error } = await supabase.from(item.table).upsert(item.data, { onConflict });
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

  for (const tableName of tables) {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error || !data) continue;
    const table = (db as unknown as Record<string, any>)[tableName];
    if (!table) continue;

    const serverIds = new Set((data as any[]).map((r) => r.id as string));
    const pendingIds = pendingByTable.get(tableName) ?? new Set<string>();

    await db.transaction('rw', table, async () => {
      // Upsert server rows
      for (const row of data as any[]) {
        const local = await table.get(row.id);
        const localTs = local?.atualizado_em ?? '';
        if (!local || row.atualizado_em >= localTs) {
          await table.put(row);
        }
      }
      // Delete local rows that don't exist on server AND not pending push (órfãs)
      const all = (await table.toArray()) as any[];
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
