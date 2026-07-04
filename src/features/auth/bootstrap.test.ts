import type { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const singleMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue({});
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      signOut: signOutMock,
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: singleMock }) }),
      update: () => ({ eq: vi.fn().mockResolvedValue({}) }),
    }),
  },
}));
vi.mock('@/lib/realtime', () => ({ startRealtime: vi.fn(), stopRealtime: vi.fn() }));
vi.mock('@/lib/sync', () => ({ runSync: vi.fn().mockResolvedValue(undefined) }));

// `listenerRegistered` em bootstrap.ts é estado de módulo (singleton por ciclo
// de vida do módulo). `vi.resetModules()` no beforeEach garante um módulo novo
// a cada teste — e como bootstrap.ts importa `./useAuth` internamente, isso
// também cria uma store nova por teste. Por isso NUNCA usamos um `useAuth`
// importado estaticamente no topo do arquivo para asserções: ele ficaria
// preso à store do primeiro import (anterior ao reset), diferente da store
// que o bootstrap.ts sob teste está de fato mutando. `loadBootstrap()` importa
// os dois dinamicamente, na mesma "geração" do module registry, garantindo
// que apontem pra mesma store.
async function loadBootstrap() {
  const { bootstrapAuth } = await import('./bootstrap');
  const { useAuth } = await import('./useAuth');
  return { bootstrapAuth, useAuth };
}

function fakeUser(id: string): User {
  return { id } as unknown as User;
}

describe('bootstrapAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('sem sessão: registra onAuthStateChange mesmo assim', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const { bootstrapAuth, useAuth } = await loadBootstrap();
    await bootstrapAuth();
    expect(onAuthStateChangeMock).toHaveBeenCalledTimes(1);
    expect(useAuth.getState().user).toBeNull();
  });

  it('chamar bootstrapAuth 2x no mesmo módulo: registra o listener uma única vez', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const { bootstrapAuth } = await loadBootstrap();
    await bootstrapAuth();
    await bootstrapAuth();
    expect(onAuthStateChangeMock).toHaveBeenCalledTimes(1);
  });

  it('falha de rede no app_users com papel cacheado: mantém sessão, sem signOut', async () => {
    const user = { id: 'u1' };
    getSessionMock.mockResolvedValue({ data: { session: { user } } });
    singleMock.mockRejectedValue(new TypeError('Failed to fetch'));
    localStorage.setItem('presenca-papel-cache', JSON.stringify({ id: 'u1', papel: 'operador' }));
    const { bootstrapAuth, useAuth } = await loadBootstrap();
    await bootstrapAuth();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(useAuth.getState().user).toEqual(user);
    expect(useAuth.getState().papel).toBe('operador');
  });

  it('falha de rede no app_users SEM papel cacheado no boot inicial: limpa estado sem signOut', async () => {
    const user = { id: 'u1' };
    getSessionMock.mockResolvedValue({ data: { session: { user } } });
    singleMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { bootstrapAuth, useAuth } = await loadBootstrap();
    await bootstrapAuth();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().loading).toBe(false);
  });

  it('erro genérico (não PGRST116) com papel cacheado: trata como offline, mantém sessão', async () => {
    const user = { id: 'u1' };
    getSessionMock.mockResolvedValue({ data: { session: { user } } });
    singleMock.mockResolvedValue({ data: null, error: { code: '50013' } });
    localStorage.setItem('presenca-papel-cache', JSON.stringify({ id: 'u1', papel: 'operador' }));
    const { bootstrapAuth, useAuth } = await loadBootstrap();
    await bootstrapAuth();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(useAuth.getState().user).toEqual(user);
    expect(useAuth.getState().papel).toBe('operador');
  });

  it('usuário desativado (resposta definitiva do servidor): signOut + clear', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    singleMock.mockResolvedValue({ data: { papel: 'operador', ativo: false }, error: null });
    const { bootstrapAuth, useAuth } = await loadBootstrap();
    await bootstrapAuth();
    expect(signOutMock).toHaveBeenCalled();
    expect(useAuth.getState().user).toBeNull();
  });

  it('boot feliz: seta sessão e cacheia papel', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    singleMock.mockResolvedValue({ data: { papel: 'admin', ativo: true }, error: null });
    const { bootstrapAuth, useAuth } = await loadBootstrap();
    await bootstrapAuth();
    expect(useAuth.getState().papel).toBe('admin');
    expect(JSON.parse(localStorage.getItem('presenca-papel-cache')!)).toEqual({
      id: 'u1',
      papel: 'admin',
    });
  });

  describe('callback registrado via onAuthStateChange', () => {
    // Registra o listener via um boot sem sessão (early-return, não toca em
    // resolvePapel) e devolve a callback real passada pro onAuthStateChange
    // mockado, pra exercitá-la diretamente — é o único jeito de cobrir o
    // corpo do listener, já que bootstrapAuth nunca a invoca sozinho.
    async function registerAndCapture() {
      getSessionMock.mockResolvedValue({ data: { session: null } });
      const { bootstrapAuth, useAuth } = await loadBootstrap();
      await bootstrapAuth();
      const callback = onAuthStateChangeMock.mock.calls[0]![0] as (
        event: string,
        session: { user: { id: string } } | null,
      ) => Promise<void>;
      return { useAuth, callback };
    }

    it('sessão null: limpa o estado', async () => {
      const { useAuth, callback } = await registerAndCapture();
      useAuth.getState().setSession(fakeUser('prev'), 'admin');

      await callback('SIGNED_OUT', null);

      expect(useAuth.getState().user).toBeNull();
      expect(useAuth.getState().papel).toBeNull();
    });

    it('falha de rede sem cache (fora do boot inicial): mantém a sessão corrente', async () => {
      const { useAuth, callback } = await registerAndCapture();
      const currentUser = fakeUser('u1');
      useAuth.getState().setSession(currentUser, 'operador');
      singleMock.mockRejectedValue(new TypeError('Failed to fetch'));

      await callback('TOKEN_REFRESHED', { user: { id: 'u1' } });

      expect(signOutMock).not.toHaveBeenCalled();
      expect(useAuth.getState().user).toEqual(currentUser);
      expect(useAuth.getState().papel).toBe('operador');
    });

    it('resposta definitiva ativo:false: signOut + clear', async () => {
      const { useAuth, callback } = await registerAndCapture();
      useAuth.getState().setSession(fakeUser('u1'), 'operador');
      singleMock.mockResolvedValue({ data: { papel: 'operador', ativo: false }, error: null });

      await callback('TOKEN_REFRESHED', { user: { id: 'u1' } });

      expect(signOutMock).toHaveBeenCalled();
      expect(useAuth.getState().user).toBeNull();
    });
  });
});
