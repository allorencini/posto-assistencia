import { db } from '@/lib/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refreshMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/consent-term-cache', () => ({
  refreshConsentTermCache: (...args: unknown[]) => refreshMock(...args),
}));

import { useActiveConsentTerm } from './use-consent-term';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useActiveConsentTerm', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    refreshMock.mockClear();
    refreshMock.mockResolvedValue(undefined);
  });

  it('retorna termo do cache Dexie sem depender de rede', async () => {
    await db.consent_terms.put({
      id: 't1',
      versao: '1',
      texto: 'cacheado',
      ativo: true,
      criado_em: '2026-01-01T00:00:00Z',
    });
    const { result } = renderHook(() => useActiveConsentTerm(), { wrapper });
    await waitFor(() => expect(result.current.data?.id).toBe('t1'));
  });

  it('cache vazio: tenta refresh uma vez e relê', async () => {
    refreshMock.mockImplementation(async () => {
      await db.consent_terms.put({
        id: 't9',
        versao: '1',
        texto: 'baixado',
        ativo: true,
        criado_em: '2026-01-01T00:00:00Z',
      });
    });
    const { result } = renderHook(() => useActiveConsentTerm(), { wrapper });
    await waitFor(() => expect(result.current.data?.id).toBe('t9'));
    expect(refreshMock).toHaveBeenCalled();
  });

  it('cache vazio + refresh falho: retorna null (indisponível)', async () => {
    const { result } = renderHook(() => useActiveConsentTerm(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
