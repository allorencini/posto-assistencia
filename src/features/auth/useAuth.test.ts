import { beforeEach, describe, expect, it } from 'vitest';
import { useAuth } from './useAuth';

describe('useAuth store', () => {
  beforeEach(() => {
    useAuth.setState({ user: null, papel: null, loading: false });
  });

  it('initial state is logged out', () => {
    const { user, papel } = useAuth.getState();
    expect(user).toBeNull();
    expect(papel).toBeNull();
  });

  it('setSession populates user and papel', () => {
    useAuth.getState().setSession({ id: 'u1', email: 't@t.com' } as any, 'admin');
    const s = useAuth.getState();
    expect(s.user?.id).toBe('u1');
    expect(s.papel).toBe('admin');
  });

  it('clear resets state', () => {
    useAuth.getState().setSession({ id: 'u1', email: 't@t.com' } as any, 'admin');
    useAuth.getState().clear();
    expect(useAuth.getState().user).toBeNull();
  });
});
