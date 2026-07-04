import { useAuth } from '@/features/auth/useAuth';
import { db } from '@/lib/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/consent-term-cache', () => ({
  refreshConsentTermCache: vi.fn().mockResolvedValue(undefined),
}));

// jsdom não implementa ResizeObserver; o Select (Radix) usado no formulário depende dele.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

import { PessoaForm } from './pessoa-form';

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('PessoaForm — consent inline', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAuth.setState({ user: { id: 'u1' } as never, papel: 'admin', loading: false });
  });

  it('com termo cacheado: checkbox habilitado, submit salva pessoa + enfileira consent', async () => {
    await db.consent_terms.put({
      id: 'term-1',
      versao: '2',
      texto: 'texto do termo',
      ativo: true,
      criado_em: '2026-01-01T00:00:00Z',
    });
    const user = userEvent.setup();
    render(
      <Providers>
        <PessoaForm open onOpenChange={() => {}} />
      </Providers>,
    );

    await user.type(await screen.findByLabelText(/nome/i), 'Fulana Teste');
    const consentCheck = await screen.findByRole('checkbox', { name: /consentiu verbalmente/i });
    await waitFor(() => expect(consentCheck).toBeEnabled());
    await user.click(consentCheck);
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(async () => {
      const queue = await db.sync_queue.toArray();
      const consentItems = queue.filter((q) => q.table === 'pessoa_consents');
      expect(consentItems).toHaveLength(1);
      expect((consentItems[0].data as unknown as { consent_term_id: string }).consent_term_id).toBe(
        'term-1',
      );
    });
  });

  it('sem termo cacheado: aviso de indisponível e sem checkbox marcável', async () => {
    render(
      <Providers>
        <PessoaForm open onOpenChange={() => {}} />
      </Providers>,
    );
    expect(await screen.findByText(/indisponível/i)).toBeInTheDocument();
  });

  it('"Ver termo" expande o texto do termo', async () => {
    await db.consent_terms.put({
      id: 'term-1',
      versao: '2',
      texto: 'CONTEUDO-DO-TERMO',
      ativo: true,
      criado_em: '2026-01-01T00:00:00Z',
    });
    const user = userEvent.setup();
    render(
      <Providers>
        <PessoaForm open onOpenChange={() => {}} />
      </Providers>,
    );
    await user.click(await screen.findByRole('button', { name: /ver termo/i }));
    expect(screen.getByText('CONTEUDO-DO-TERMO')).toBeInTheDocument();
  });
});
