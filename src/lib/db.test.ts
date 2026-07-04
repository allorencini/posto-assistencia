import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';

describe('db (Dexie)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('puts and gets pessoa', async () => {
    await db.pessoas.put({
      id: 'p1',
      nome: 'TEST',
      grupo: 'adulto',
      familia_id: null,
      telefone: null,
      rua: null,
      numero: null,
      complemento: null,
      bairro: null,
      cep: null,
      visitada: false,
      apta_cesta: null,
      visita_obs: null,
      excluir_ranking: false,
      ativo: true,
      anonimizado_em: null,
      anonimizado_por: null,
      criado_em: '2026-05-15T00:00:00Z',
      atualizado_em: '2026-05-15T00:00:00Z',
    });
    const found = await db.pessoas.get('p1');
    expect(found?.nome).toBe('TEST');
  });

  it('enqueues sync item', async () => {
    await db.sync_queue.add({
      table: 'pessoas',
      operation: 'upsert',
      data: { id: 'p1' },
      user_id: 'u1',
      attempts: 0,
      timestamp: Date.now(),
    });
    const all = await db.sync_queue.toArray();
    expect(all).toHaveLength(1);
  });

  it('consent_terms store exists and round-trips', async () => {
    await db.consent_terms.put({
      id: 't1',
      versao: '1',
      texto: 'termo de teste',
      ativo: true,
      criado_em: '2026-07-03T00:00:00Z',
    });
    const got = await db.consent_terms.get('t1');
    expect(got?.texto).toBe('termo de teste');
  });
});
