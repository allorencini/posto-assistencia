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

import { useAuth } from './useAuth';

describe('bootstrapAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuth.setState({ user: null, papel: null, loading: true });
  });

  it('sem sessão: registra onAuthStateChange mesmo assim', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const { bootstrapAuth } = await import('./bootstrap');
    await bootstrapAuth();
    expect(onAuthStateChangeMock).toHaveBeenCalledTimes(1);
    expect(useAuth.getState().user).toBeNull();
  });

  it('falha de rede no app_users com papel cacheado: mantém sessão, sem signOut', async () => {
    const user = { id: 'u1' };
    getSessionMock.mockResolvedValue({ data: { session: { user } } });
    singleMock.mockRejectedValue(new TypeError('Failed to fetch'));
    localStorage.setItem('presenca-papel-cache', JSON.stringify({ id: 'u1', papel: 'operador' }));
    const { bootstrapAuth } = await import('./bootstrap');
    await bootstrapAuth();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(useAuth.getState().user).toEqual(user);
    expect(useAuth.getState().papel).toBe('operador');
  });

  it('usuário desativado (resposta definitiva do servidor): signOut + clear', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    singleMock.mockResolvedValue({ data: { papel: 'operador', ativo: false }, error: null });
    const { bootstrapAuth } = await import('./bootstrap');
    await bootstrapAuth();
    expect(signOutMock).toHaveBeenCalled();
    expect(useAuth.getState().user).toBeNull();
  });

  it('boot feliz: seta sessão e cacheia papel', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    singleMock.mockResolvedValue({ data: { papel: 'admin', ativo: true }, error: null });
    const { bootstrapAuth } = await import('./bootstrap');
    await bootstrapAuth();
    expect(useAuth.getState().papel).toBe('admin');
    expect(JSON.parse(localStorage.getItem('presenca-papel-cache')!)).toEqual({
      id: 'u1',
      papel: 'admin',
    });
  });
});
