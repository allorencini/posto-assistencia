import { db } from './db';
import { supabase } from './supabase';
import type { SyncQueueItem } from '@/types/domain';

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
          const onConflict = item.table === 'presencas'
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
    'familias', 'pessoas', 'chamadas', 'presencas', 'cestas', 'itens', 'pedidos',
  ];

  for (const tableName of tables) {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error || !data) continue;
    const table = (db as any)[tableName];
    if (!table) continue;
    await db.transaction('rw', table, async () => {
      for (const row of data) {
        const local = await table.get(row.id);
        const localTs = local?.atualizado_em ?? '';
        if (!local || row.atualizado_em >= localTs) {
          await table.put(row);
        }
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', scheduleSync);
  setInterval(scheduleSync, 30_000);
}
