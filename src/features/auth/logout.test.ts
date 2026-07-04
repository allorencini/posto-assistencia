import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn().mockResolvedValue({}) } } }));
vi.mock('@/lib/realtime', () => ({ stopRealtime: vi.fn() }));
vi.mock('@/lib/sync', () => ({ runSync: vi.fn().mockResolvedValue(undefined) }));

describe('logout', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    // jsdom: location.href é atribuível via defineProperty
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });
  });

  it('com pendências na sync_queue: NÃO apaga o banco local', async () => {
    await db.sync_queue.add({ table: 'presencas', operation: 'upsert', data: { id: crypto.randomUUID() }, user_id: 'u1', attempts: 0, timestamp: Date.now() });
    const deleteSpy = vi.spyOn(db, 'delete');
    const { logout } = await import('./logout');
    await logout();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(await db.sync_queue.count()).toBe(1);
  });

  it('sem pendências: apaga o banco local', async () => {
    const deleteSpy = vi.spyOn(db, 'delete').mockResolvedValue(undefined as never);
    const { logout } = await import('./logout');
    await logout();
    expect(deleteSpy).toHaveBeenCalled();
  });

  it('preserva caches workbox-precache*', async () => {
    const deleted: string[] = [];
    vi.stubGlobal('caches', {
      keys: async () => ['workbox-precache-v2-https://x', 'runtime-admin'],
      delete: async (k: string) => { deleted.push(k); return true; },
    });
    const { logout } = await import('./logout');
    await logout();
    expect(deleted).toEqual(['runtime-admin']);
    vi.unstubAllGlobals();
  });

  it('falha ao contar a fila (db.sync_queue.count rejeita): NÃO apaga o banco local', async () => {
    const countSpy = vi.spyOn(db.sync_queue, 'count').mockRejectedValue(new Error('boom'));
    const deleteSpy = vi.spyOn(db, 'delete');
    const { logout } = await import('./logout');
    await logout();
    expect(deleteSpy).not.toHaveBeenCalled();
    countSpy.mockRestore();
  });

  it('ordem: runSync é chamado antes de supabase.auth.signOut', async () => {
    const { runSync } = await import('@/lib/sync');
    const { supabase } = await import('@/lib/supabase');
    const { logout } = await import('./logout');
    await logout();
    const runSyncCall = vi.mocked(runSync).mock.invocationCallOrder[0];
    const signOutCall = vi.mocked(supabase.auth.signOut).mock.invocationCallOrder[0];
    expect(runSyncCall).toBeDefined();
    expect(signOutCall).toBeDefined();
    expect(runSyncCall).toBeLessThan(signOutCall);
  });
});
