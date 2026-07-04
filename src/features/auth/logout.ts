import { db } from '@/lib/db';
import { stopRealtime } from '@/lib/realtime';
import { runSync } from '@/lib/sync';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

// Best-effort: um runSync travado (rede degradada, não offline) não pode segurar o
// idle-logout de segurança indefinidamente. Timeout → segue o fluxo normalmente
// (pendências ficam na fila, banco local não é apagado — mesmo tratamento de falha).
const SYNC_ON_LOGOUT_TIMEOUT_MS = 10_000;

export async function logout() {
  try {
    stopRealtime();
  } catch {
    // ignore
  }
  // Última chance de esvaziar a fila antes de decidir se o banco pode ser apagado.
  try {
    if (typeof navigator === 'undefined' || navigator.onLine) {
      await Promise.race([
        // .catch: se o timeout vence primeiro, este runSync segue rodando em background e
        // pode rejeitar depois — sem o catch aqui vira unhandled rejection.
        runSync().catch(() => {}),
        new Promise<void>((resolve) => setTimeout(resolve, SYNC_ON_LOGOUT_TIMEOUT_MS)),
      ]);
    }
  } catch {
    // ignore — best-effort
  }
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore — limpa local sempre
  }
  // Fecha a fonte de novos enqueues ANTES de contar a fila: toda mutation local checa
  // `useAuth.getState().user` e lança 'Not authenticated' quando ausente. Sem isso, uma
  // mutation concorrente (tablet compartilhado / aba duplicada) poderia enfileirar um
  // item novo DEPOIS da contagem abaixo e antes do db.delete(), perdendo o dado.
  // Janela residual aceita: uma mutation que já passou o check de auth um instante antes
  // deste clear() ainda pode terminar seu enqueue após a contagem — não fechamos essa
  // corrida (custo/benefício não justifica um lock extra aqui).
  useAuth.getState().clear();

  let pending: number | 'unknown' = 'unknown';
  try {
    pending = await db.sync_queue.count();
  } catch {
    // não conseguiu nem contar → trata como pendente (não apaga)
  }
  // Item dead-letter (attempts >= MAX_ATTEMPTS) também conta aqui e bloqueia o delete —
  // decisão deliberada: preservar dado/evidência > liberar espaço local. O admin vê e
  // limpa via tela de Sincronização (retryDeadItems), não silenciosamente aqui.
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
  window.location.href = '/login';
}
