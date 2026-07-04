import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db';

const maybeSingle = vi.fn();
vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({ maybeSingle }),
          }),
        }),
      }),
    }),
  },
}));

describe('consent-term-cache', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    maybeSingle.mockReset();
  });

  it('popula Dexie com o termo ativo do servidor', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 't1',
        versao: '2',
        texto: 'novo termo',
        ativo: true,
        criado_em: '2026-07-01T00:00:00Z',
      },
      error: null,
    });
    const { refreshConsentTermCache } = await import('./consent-term-cache');
    await refreshConsentTermCache();
    const cached = await db.consent_terms.toArray();
    expect(cached).toHaveLength(1);
    expect(cached[0].id).toBe('t1');
  });

  it('substitui termo antigo cacheado pelo novo', async () => {
    await db.consent_terms.put({
      id: 'old',
      versao: '1',
      texto: 'antigo',
      ativo: true,
      criado_em: '2026-01-01T00:00:00Z',
    });
    maybeSingle.mockResolvedValue({
      data: {
        id: 't2',
        versao: '3',
        texto: 'atual',
        ativo: true,
        criado_em: '2026-07-02T00:00:00Z',
      },
      error: null,
    });
    const { refreshConsentTermCache } = await import('./consent-term-cache');
    await refreshConsentTermCache();
    const cached = await db.consent_terms.toArray();
    expect(cached).toHaveLength(1);
    expect(cached[0].id).toBe('t2');
  });

  it('erro de rede não lança e não apaga cache existente', async () => {
    await db.consent_terms.put({
      id: 'keep',
      versao: '1',
      texto: 'mantém',
      ativo: true,
      criado_em: '2026-01-01T00:00:00Z',
    });
    maybeSingle.mockRejectedValue(new Error('network down'));
    const { refreshConsentTermCache } = await import('./consent-term-cache');
    await expect(refreshConsentTermCache()).resolves.toBeUndefined();
    const cached = await db.consent_terms.toArray();
    expect(cached).toHaveLength(1);
    expect(cached[0].id).toBe('keep');
  });
});
