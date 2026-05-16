import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { db } from '@/lib/db';
import { usePessoas, useSavePessoa } from './use-pessoas';
import { useAuth } from '@/features/auth/useAuth';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('use-pessoas', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAuth.setState({ user: { id: 'u1' } as any, papel: 'admin', loading: false });
  });

  it('returns empty list initially', async () => {
    const { result } = renderHook(() => usePessoas(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('saves pessoa locally + enqueues sync', async () => {
    const { result } = renderHook(() => useSavePessoa(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ nome: 'TEST', grupo: 'adulto' });
    });
    const all = await db.pessoas.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].nome).toBe('TEST');
    const queue = await db.sync_queue.toArray();
    expect(queue).toHaveLength(1);
  });
});
