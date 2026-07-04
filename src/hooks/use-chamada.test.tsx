import { useAuth } from '@/features/auth/useAuth';
import { db } from '@/lib/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const limitMock = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ limit: limitMock }),
      }),
    }),
  },
}));

import { useGetOrCreateChamada } from './use-chamada';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useGetOrCreateChamada — server-first', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAuth.setState({ user: { id: 'u1' } as never, papel: 'admin', loading: false });
    limitMock.mockReset();
  });

  it('chamada local existente: retorna sem consultar servidor', async () => {
    await db.chamadas.put({ id: 'local-1', data: '2026-06-20', criado_em: '2026-06-20T10:00:00Z' });
    const { result } = renderHook(() => useGetOrCreateChamada(), { wrapper });
    let out: { id: string } | undefined;
    await act(async () => {
      out = await result.current.mutateAsync('2026-06-20');
    });
    expect(out?.id).toBe('local-1');
    expect(limitMock).not.toHaveBeenCalled();
  });

  it('servidor tem chamada pra data: reusa id canônico, nada enfileirado', async () => {
    limitMock.mockResolvedValue({
      data: [{ id: 'server-1', data: '2026-06-20', criado_em: '2026-06-20T09:00:00Z' }],
      error: null,
    });
    const { result } = renderHook(() => useGetOrCreateChamada(), { wrapper });
    let out: { id: string } | undefined;
    await act(async () => {
      out = await result.current.mutateAsync('2026-06-20');
    });
    expect(out?.id).toBe('server-1');
    expect((await db.chamadas.get('server-1'))?.data).toBe('2026-06-20');
    expect(await db.sync_queue.count()).toBe(0);
  });

  it('lookup falha (rede ruim): cria local + enfileira (comportamento atual)', async () => {
    limitMock.mockRejectedValue(new Error('timeout'));
    const { result } = renderHook(() => useGetOrCreateChamada(), { wrapper });
    let out: { id: string } | undefined;
    await act(async () => {
      out = await result.current.mutateAsync('2026-06-20');
    });
    expect(out?.id).toBeTruthy();
    const queue = await db.sync_queue.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0].table).toBe('chamadas');
  });

  it('servidor sem chamada pra data: cria local + enfileira', async () => {
    limitMock.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useGetOrCreateChamada(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('2026-06-20');
    });
    expect(await db.sync_queue.count()).toBe(1);
  });
});
