import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db';

const upsertMock = vi.fn();
const deleteEqMock = vi.fn();
const selectRangeMock = vi.fn().mockResolvedValue({ data: [], error: null });
vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      upsert: upsertMock,
      delete: () => ({ eq: deleteEqMock }),
      select: () => ({ range: selectRangeMock }),
    }),
  },
}));
vi.mock('@/features/auth/useAuth', () => ({
  useAuth: { getState: () => ({ user: mockUser }) },
}));
let mockUser: { id: string } | null = { id: 'u1' };

describe('sync engine', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    mockUser = { id: 'u1' };
    upsertMock.mockReset();
    upsertMock.mockResolvedValue({ error: null });
    deleteEqMock.mockReset();
    deleteEqMock.mockResolvedValue({ error: null });
    selectRangeMock.mockReset();
    selectRangeMock.mockResolvedValue({ data: [], error: null });
  });

  it('enqueueSync adds item to sync_queue', async () => {
    const { enqueueSync } = await import('./sync');
    await enqueueSync({
      table: 'pessoas',
      operation: 'upsert',
      data: { id: 'p1' },
      user_id: 'u1',
    });
    const queue = await db.sync_queue.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0].table).toBe('pessoas');
    expect(queue[0].attempts).toBe(0);
  });

  it('runSync sem sessão: não faz push nem pull', async () => {
    mockUser = null;
    await db.sync_queue.add({
      table: 'pessoas',
      operation: 'upsert',
      data: { id: crypto.randomUUID() },
      user_id: 'u1',
      attempts: 0,
      timestamp: Date.now(),
    });
    const { runSync } = await import('./sync');
    await runSync();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(selectRangeMock).not.toHaveBeenCalled();
    expect(await db.sync_queue.count()).toBe(1);
    mockUser = { id: 'u1' };
  });

  it('item com attempts >= MAX não é deletado nem re-tentado (dead-letter)', async () => {
    await db.sync_queue.add({
      table: 'pessoas',
      operation: 'upsert',
      data: { id: crypto.randomUUID() },
      user_id: 'u1',
      attempts: 5,
      timestamp: Date.now(),
    });
    const { runSync } = await import('./sync');
    await runSync();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(await db.sync_queue.count()).toBe(1);
  });

  it('erro permanente (PostgrestError com code) incrementa attempts', async () => {
    upsertMock.mockResolvedValue({ error: { code: '42501', message: 'rls' } });
    await db.sync_queue.add({
      table: 'pessoas',
      operation: 'upsert',
      data: { id: crypto.randomUUID() },
      user_id: 'u1',
      attempts: 0,
      timestamp: Date.now(),
    });
    const { runSync } = await import('./sync');
    await runSync();
    const [item] = await db.sync_queue.toArray();
    expect(item.attempts).toBe(1);
  });

  it('falha de rede (exceção sem code) NÃO incrementa attempts', async () => {
    upsertMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await db.sync_queue.add({
      table: 'pessoas',
      operation: 'upsert',
      data: { id: crypto.randomUUID() },
      user_id: 'u1',
      attempts: 0,
      timestamp: Date.now(),
    });
    const { runSync } = await import('./sync');
    await runSync();
    const [item] = await db.sync_queue.toArray();
    expect(item.attempts).toBe(0);
    expect(item.last_error).toContain('fetch');
  });

  it('retryDeadItems zera attempts dos mortos', async () => {
    await db.sync_queue.add({
      table: 'pessoas',
      operation: 'upsert',
      data: { id: crypto.randomUUID() },
      user_id: 'u1',
      attempts: 7,
      timestamp: Date.now(),
      last_error: 'x',
    });
    const { retryDeadItems } = await import('./sync');
    const n = await retryDeadItems();
    expect(n).toBe(1);
    const [item] = await db.sync_queue.toArray();
    expect(item.attempts).toBe(0);
  });

  it('sessão cai no meio do push (logout concorrente): item 2 não é empurrado nem morto', async () => {
    const id1 = crypto.randomUUID();
    const id2 = crypto.randomUUID();
    await db.sync_queue.bulkAdd([
      {
        table: 'pessoas',
        operation: 'upsert',
        data: { id: id1 },
        user_id: 'u1',
        attempts: 0,
        timestamp: Date.now(),
      },
      {
        table: 'pessoas',
        operation: 'upsert',
        data: { id: id2 },
        user_id: 'u1',
        attempts: 0,
        timestamp: Date.now() + 1,
      },
    ]);
    let calls = 0;
    upsertMock.mockImplementation(() => {
      calls += 1;
      if (calls === 1) {
        // Simula logout concorrente (idle timeout, aba duplicada) terminando
        // bem no meio do push do item 1.
        mockUser = null;
        return Promise.resolve({ error: null });
      }
      // Se o loop não rechecar a sessão, chega aqui com anon key: PostgREST
      // rejeitaria com code string (RLS) → classificado permanente → attempts+1.
      return Promise.resolve({ error: { code: '42501', message: 'rls sem sessão' } });
    });
    const { runSync } = await import('./sync');
    await runSync();
    // Sem o break, este runSync órfão empurraria (e mataria) o item 2 também.
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const remaining = await db.sync_queue.toArray();
    expect(remaining).toHaveLength(1);
    const item2 = remaining.find((q) => (q.data as { id: string }).id === id2);
    expect(item2).toBeDefined();
    expect(item2!.attempts).toBe(0);
  });

  it('sessão cai durante o pull (idle-logout no meio do ciclo): dado local não-pendente sobrevive', async () => {
    await db.pessoas.put({
      id: 'p-local',
      nome: 'Local',
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
      criado_em: '2026-01-01T00:00:00Z',
      atualizado_em: '2026-01-01T00:00:00Z',
    });
    // Fila vazia (push não roda). O select().range() do pull derruba a sessão
    // ANTES de resolver — simula um logout concorrente (idle timeout) que
    // termina bem no meio do ciclo de pull, depois do entry-check de
    // pullChanges já ter passado.
    selectRangeMock.mockImplementation(() => {
      mockUser = null;
      return Promise.resolve({ data: [], error: null });
    });
    const { runSync } = await import('./sync');
    await runSync();
    // Sem o recheck antes do delete-pass, o servidor "vazio" (RLS sob sessão
    // caída) apagaria a linha local não-pendente.
    expect(await db.pessoas.get('p-local')).toBeDefined();
  });

  it('push só do dono da fila: item de outro usuário (device compartilhado) fica preservado', async () => {
    const idOutro = crypto.randomUUID();
    const idMeu = crypto.randomUUID();
    await db.sync_queue.bulkAdd([
      {
        table: 'pessoas',
        operation: 'upsert',
        data: { id: idOutro },
        user_id: 'outro',
        attempts: 0,
        timestamp: Date.now(),
      },
      {
        table: 'pessoas',
        operation: 'upsert',
        data: { id: idMeu },
        user_id: 'u1',
        attempts: 0,
        timestamp: Date.now() + 1,
      },
    ]);
    const { runSync } = await import('./sync');
    await runSync();
    // Só o item do usuário logado (u1) foi empurrado.
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith({ id: idMeu }, { onConflict: 'id' });
    const remaining = await db.sync_queue.toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].user_id).toBe('outro');
    expect(remaining[0].data).toEqual({ id: idOutro });
  });
});
