import { getSupabase, isConfigured } from './supabase-config.js';
import {
  getSyncQueue, clearSyncQueueItem,
  bulkPut, getAllPessoas, getChamadas, getAllPresencas
} from './db.js';

let syncInProgress = false;

function updateIndicator(status) {
  const el = document.getElementById('sync-indicator');
  if (!el) return;
  el.className = `sync-indicator ${status}`;
  el.title = status === 'online' ? 'Sincronizado'
    : status === 'offline' ? 'Offline — dados salvos localmente'
    : 'Sincronizando...';
}

function isOnline() {
  return navigator.onLine;
}

// Push local changes to Supabase
async function pushChanges() {
  const queue = await getSyncQueue();
  if (queue.length === 0) return;

  const sb = await getSupabase();

  for (const item of queue) {
    try {
      const { table, data } = item;

      // Upsert to Supabase (on conflict update)
      const onConflict = table === 'presencas' ? 'chamada_id,pessoa_id'
        : table === 'chamadas' ? 'data'
        : 'id';
      const { error } = await sb
        .from(table)
        .upsert(data, { onConflict });

      if (error) {
        console.warn(`Sync error for ${table}:`, error.message);
        continue; // Leave in queue, retry next cycle
      }

      await clearSyncQueueItem(item.id);
    } catch (err) {
      console.warn('Sync push error:', err);
    }
  }
}

// Pull remote changes to local IndexedDB
async function pullChanges() {
  const sb = await getSupabase();

  for (const table of ['pessoas', 'chamadas', 'presencas', 'cestas', 'itens']) {
    try {
      const { data, error } = await sb.from(table).select('*');
      if (error) {
        console.warn(`Pull error for ${table}:`, error.message);
        continue;
      }
      if (data && data.length > 0) {
        await bulkPut(table, data);
      }
    } catch (err) {
      console.warn('Sync pull error:', err);
    }
  }
}

// Full sync cycle: push first, then pull
async function syncNow() {
  if (syncInProgress || !isOnline() || !isConfigured()) return;

  syncInProgress = true;
  updateIndicator('syncing');

  try {
    await pushChanges();
    await pullChanges();
    updateIndicator('online');
  } catch (err) {
    console.warn('Sync cycle error:', err);
    updateIndicator('offline');
  } finally {
    syncInProgress = false;
  }
}

export function initSync() {
  // Update indicator on connectivity change
  window.addEventListener('online', () => {
    updateIndicator('online');
    syncNow();
  });
  window.addEventListener('offline', () => {
    updateIndicator('offline');
  });

  // Initial state
  updateIndicator(isOnline() ? 'online' : 'offline');

  // Initial sync
  if (isOnline() && isConfigured()) {
    syncNow();
  }

  // Periodic sync every 30 seconds when online
  setInterval(() => {
    if (isOnline() && isConfigured()) syncNow();
  }, 30000);
}

// Export for manual trigger
export { syncNow };
