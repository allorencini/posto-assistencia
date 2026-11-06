// Regressão: app preso em "Carregando..." ao abrir com sessão já salva
// (aba nova, F5, reabrir o navegador).
//
// Usa o client REAL do supabase-js (não mock), porque o bug mora na interação
// com o auth-js: durante o initialize() ele recupera a sessão do storage e
// emite SIGNED_IN aguardando o listener. Se o listener fizer `await` de uma
// query Supabase, a query chama auth.getSession(), que espera o initialize()
// terminar, que espera o listener. Deadlock: bootstrapAuth nunca resolve.
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  let releaseInit!: () => void;
  const initGate = new Promise<void>((resolve) => {
    releaseInit = resolve;
  });

  const now = Math.floor(Date.now() / 1000);
  const session = {
    access_token: 'header.payload.signature',
    refresh_token: 'refresh-token-de-teste',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user: {
      id: 'u1',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
    },
  };
  const store = new Map<string, string>([['auth-teste', JSON.stringify(session)]]);

  return { initGate, releaseInit: () => releaseInit(), store };
});

vi.mock('@/lib/supabase', async () => {
  const { createClient } = await import('@supabase/supabase-js');

  const fakeFetch: typeof fetch = async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('/rest/v1/app_users')) {
      return new Response(JSON.stringify({ papel: 'admin', ativo: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(null, { status: 204 });
  };

  // No browser o lock do auth-js é navigator.locks, cuja aquisição é
  // assíncrona: o React monta e o bootstrapAuth registra o listener ANTES do
  // initialize() recuperar a sessão. jsdom não tem navigator.locks, então o
  // gate reproduz essa ordem de forma determinística (só a 1ª aquisição, que
  // é a do initialize, espera).
  let first = true;
  const lock = async <R>(_name: string, _timeout: number, fn: () => Promise<R>): Promise<R> => {
    if (first) {
      first = false;
      await h.initGate;
    }
    return fn();
  };

  return {
    supabase: createClient('http://localhost:54321', 'anon-key-de-teste', {
      global: { fetch: fakeFetch },
      auth: {
        storageKey: 'auth-teste',
        storage: {
          getItem: (k: string) => h.store.get(k) ?? null,
          setItem: (k: string, v: string) => void h.store.set(k, v),
          removeItem: (k: string) => void h.store.delete(k),
        },
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        lock,
      },
    }),
  };
});
vi.mock('@/lib/realtime', () => ({ startRealtime: vi.fn(), stopRealtime: vi.fn() }));
vi.mock('@/lib/sync', () => ({ runSync: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/consent-term-cache', () => ({
  refreshConsentTermCache: vi.fn().mockResolvedValue(undefined),
}));

describe('bootstrapAuth com sessão salva (client real do supabase-js)', () => {
  it('termina o boot em vez de travar em deadlock com o listener', async () => {
    const { bootstrapAuth } = await import('./bootstrap');
    const { useAuth } = await import('./useAuth');

    const boot = bootstrapAuth(); // registra o listener e espera getSession()
    h.releaseInit(); // initialize() segue: recupera a sessão e emite SIGNED_IN

    const outcome = await Promise.race([
      boot.then(() => 'terminou'),
      new Promise((resolve) => setTimeout(() => resolve('travou'), 2000)),
    ]);

    expect(outcome).toBe('terminou');
    expect(useAuth.getState().loading).toBe(false);
    expect(useAuth.getState().papel).toBe('admin');
  });
});
