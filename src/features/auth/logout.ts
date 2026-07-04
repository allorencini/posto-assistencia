import { db } from '@/lib/db';
import { stopRealtime } from '@/lib/realtime';
import { runSync } from '@/lib/sync';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export async function logout() {
  try {
    stopRealtime();
  } catch {
    // ignore
  }
  // Última chance de esvaziar a fila antes de decidir se o banco pode ser apagado.
  let pending = -1;
  try {
    if (typeof navigator === 'undefined' || navigator.onLine) await runSync();
    pending = await db.sync_queue.count();
  } catch {
    // não conseguiu nem contar → trata como pendente (não apaga)
  }
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore — limpa local sempre
  }
  if (pending === 0) {
    try {
      await db.delete();
    } catch {
      // ignore
    }
  }
  // pendências > 0 (ou erro de contagem): o banco fica; os registros sobem no próximo login com sessão.
  try {
    sessionStorage.clear();
    localStorage.clear();
  } catch {
    // ignore
  }
  try {
    // Nunca apagar o precache do Workbox — sem ele o PWA não boota offline.
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => !k.startsWith('workbox-precache')).map((k) => caches.delete(k)),
    );
  } catch {
    // ignore
  }
  useAuth.getState().clear();
  window.location.href = '/login';
}
