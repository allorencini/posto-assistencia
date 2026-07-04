import { useAuth } from '@/features/auth/useAuth';
import { db } from '@/lib/db';
import type { Pessoa } from '@/types/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// @testing-library/react só auto-registra cleanup via `afterEach` GLOBAL; este
// projeto roda com `globals: false` (vitest.config.ts), então isso nunca dispara
// sozinho e o DOM de um teste vaza pro próximo (múltiplas instâncias de
// ChamadaPage montadas simultaneamente). O teste de corrida abaixo depende de
// reencontrar a MESMA instância/estado ao longo da interação, por isso o
// cleanup explícito é necessário aqui.
afterEach(() => cleanup());

const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ limit: limitMock }),
      }),
    }),
  },
}));

import { ChamadaPage } from './chamada-page';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function makePessoa(overrides: Partial<Pessoa> = {}): Pessoa {
  return {
    id: 'p1',
    nome: 'Fulano de Tal',
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
    ...overrides,
  };
}

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('ChamadaPage — data retroativa', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAuth.setState({ user: { id: 'u1' } as never, papel: 'admin', loading: false });
    limitMock.mockReset().mockResolvedValue({ data: [], error: null });
  });

  it('sem banner quando data = hoje', async () => {
    render(
      <Providers>
        <ChamadaPage />
      </Providers>,
    );
    await waitFor(() => expect(screen.queryByText(/retroativa/i)).not.toBeInTheDocument());
  });

  it('trocar pra data passada mostra banner retroativo', async () => {
    render(
      <Providers>
        <ChamadaPage />
      </Providers>,
    );
    const dateInput = await screen.findByLabelText(/^data$/i);
    fireEvent.change(dateInput, { target: { value: '2026-06-20' } });
    expect(await screen.findByText(/retroativa/i)).toBeInTheDocument();
    expect(screen.getByText(/20\/06\/2026/)).toBeInTheDocument();
  });

  it('input de data tem max = hoje (bloqueia futuro)', async () => {
    render(
      <Providers>
        <ChamadaPage />
      </Providers>,
    );
    const dateInput = (await screen.findByLabelText(/^data$/i)) as HTMLInputElement;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(dateInput.max).toBe(today);
  });

  it('não cria chamada duplicada quando o usuário troca de data e volta antes da criação em voo resolver', async () => {
    await db.pessoas.put(makePessoa());

    // Trava o lookup server-first (fetchServerChamada -> supabase.limit()) num estado
    // pendente controlável, pra manter a criação da chamada em D1 "em voo" enquanto o
    // usuário navega D1 -> D2 -> D1 e tenta o toggle de novo.
    const deferred = createDeferred<{ data: unknown[]; error: null }>();
    limitMock.mockReturnValue(deferred.promise);

    render(
      <Providers>
        <ChamadaPage />
      </Providers>,
    );

    const D1 = '2026-06-20';
    const D2 = '2026-06-19';
    const dateInput = await screen.findByLabelText(/^data$/i);
    fireEvent.change(dateInput, { target: { value: D1 } });

    const toggleButton = await screen.findByRole('button', { name: /falta|presente/i });
    fireEvent.click(toggleButton);

    // Garante que a criação em D1 já está em voo (parada no lookup do servidor)
    // antes de navegar pra longe e voltar.
    await waitFor(() => expect(limitMock).toHaveBeenCalledTimes(1));

    fireEvent.change(dateInput, { target: { value: D2 } });
    fireEvent.change(dateInput, { target: { value: D1 } });

    const toggleButtonAgain = await screen.findByRole('button', { name: /falta|presente/i });
    fireEvent.click(toggleButtonAgain);

    // Libera o lookup pendente — qualquer criação concorrente pra D1 se resolve agora.
    deferred.resolve({ data: [], error: null });

    await waitFor(
      async () => {
        expect(await db.chamadas.where('data').equals(D1).count()).toBe(1);
      },
      { timeout: 3000 },
    );
  });
});
