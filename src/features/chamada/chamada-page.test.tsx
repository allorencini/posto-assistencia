import { useAuth } from '@/features/auth/useAuth';
import { db } from '@/lib/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      }),
    }),
  },
}));

import { ChamadaPage } from './chamada-page';

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('ChamadaPage — data retroativa', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAuth.setState({ user: { id: 'u1' } as never, papel: 'admin', loading: false });
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
});
