# Chamada Retroativa + Consent LGPD Offline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir registrar chamada de sábados passados na aba Chamada (com sync endurecido contra corrida de ID) e capturar consentimento LGPD via checkbox inline com termo cacheado localmente (funciona offline).

**Architecture:** Feature 1 parametriza a `ChamadaPage` existente por data (`selectedDate`, default hoje) e adiciona lookup server-first no `useGetOrCreateChamada` para reusar o id canônico do servidor quando online. Feature 2 adiciona tabela Dexie `consent_terms` (cache local do termo ativo, refresh em background), reescreve `useActiveConsentTerm` para ler Dexie-first, e substitui o botão+`ConsentModal` do `PessoaForm` por checkbox inline com termo expansível.

**Tech Stack:** React 19 + TypeScript, Dexie (IndexedDB), Supabase JS, TanStack Query, react-hook-form + zod, vitest + @testing-library/react, biome.

**Spec:** `docs/superpowers/specs/2026-07-03-chamada-retroativa-consent-offline-design.md`

## Global Constraints

- Repo: `c:/projects/presenca`. Branch: `feat/chamada-retroativa-consent-offline` (já criada).
- Package manager: **pnpm**. Gates: `pnpm lint` (biome), `pnpm typecheck`, `pnpm test` (vitest run), `pnpm build`.
- Offline-first é requisito central: NENHUMA chamada de rede pode bloquear o caminho crítico de marcação de presença ou de salvamento de cadastro. Toda falha de rede degrada para comportamento local.
- Zod `consent_declarado.refine(v => v === true)` em `src/schemas/pessoa.ts` NÃO muda.
- Sem mudança de schema no servidor (Supabase). Só schema local Dexie (v1 → v2, aditivo).
- Estilo: classes tailwind + CSS vars do tema (`var(--color-border)`, `var(--color-bg-card)`, `var(--color-red)`, `var(--color-text-muted)`). Componentes ui em `src/components/ui/` (Button, Checkbox, Dialog, Input, Label, Select).
- Testes de hook seguem o padrão de `src/hooks/use-pessoas.test.tsx`: `db.delete()` + `db.open()` no beforeEach, `useAuth.setState(...)`, wrapper com QueryClient `retry: false`.
- Mensagens de UI em pt-BR.
- Commits frequentes, mensagem convencional (`feat:`/`fix:`/`test:`), rodapé `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Tipo `ConsentTerm` + Dexie v2 com tabela `consent_terms`

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/lib/db.ts`
- Test: `src/lib/db.test.ts`

**Interfaces:**
- Consumes: nada novo.
- Produces: `interface ConsentTerm { id: string; versao: string; texto: string; ativo: boolean; criado_em: string }` em `@/types/domain`; `db.consent_terms: Table<ConsentTerm, string>` em `@/lib/db`.

- [ ] **Step 1: Write the failing test**

Adicionar ao final do `describe` existente em `src/lib/db.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/db.test.ts`
Expected: FAIL — `db.consent_terms` is undefined (property does not exist).

- [ ] **Step 3: Write minimal implementation**

Em `src/types/domain.ts`, adicionar após a interface `Familia`:

```ts
export interface ConsentTerm {
  id: string;
  versao: string;
  texto: string;
  ativo: boolean;
  criado_em: string;
}
```

Em `src/lib/db.ts`: importar `ConsentTerm` no type-import existente, declarar a tabela e adicionar a versão 2 (NÃO alterar a `version(1)` existente — Dexie exige histórico de versões):

```ts
export class PresencaDB extends Dexie {
  // ...tabelas existentes...
  consent_terms!: Table<ConsentTerm, string>;

  constructor() {
    super('presenca-db');
    this.version(1).stores({
      // ...bloco existente INTACTO...
    });
    this.version(2).stores({
      consent_terms: 'id',
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/db.test.ts`
Expected: PASS (todos os testes do arquivo).

- [ ] **Step 5: Commit**

```bash
git add src/types/domain.ts src/lib/db.ts src/lib/db.test.ts
git commit -m "feat(db): tabela local consent_terms (Dexie v2)"
```

---

### Task 2: Cache do termo — `refreshConsentTermCache` + wiring de boot

**Files:**
- Create: `src/lib/consent-term-cache.ts`
- Modify: `src/App.tsx`
- Modify: `src/hooks/use-consent-terms.ts` (admin CRUD — refresh após publicar termo novo)
- Test: `src/lib/consent-term-cache.test.ts`

**Interfaces:**
- Consumes: `db.consent_terms` (Task 1), `supabase` de `@/lib/supabase`.
- Produces: `refreshConsentTermCache(): Promise<void>` em `@/lib/consent-term-cache` — busca termo ativo no Supabase e substitui o conteúdo de `db.consent_terms`; silencioso em erro/offline. Registra listener `online` no module scope (mesmo padrão de `sync.ts:179-182`).

- [ ] **Step 1: Write the failing test**

Criar `src/lib/consent-term-cache.test.ts`:

```ts
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
      data: { id: 't1', versao: '2', texto: 'novo termo', ativo: true, criado_em: '2026-07-01T00:00:00Z' },
      error: null,
    });
    const { refreshConsentTermCache } = await import('./consent-term-cache');
    await refreshConsentTermCache();
    const cached = await db.consent_terms.toArray();
    expect(cached).toHaveLength(1);
    expect(cached[0].id).toBe('t1');
  });

  it('substitui termo antigo cacheado pelo novo', async () => {
    await db.consent_terms.put({ id: 'old', versao: '1', texto: 'antigo', ativo: true, criado_em: '2026-01-01T00:00:00Z' });
    maybeSingle.mockResolvedValue({
      data: { id: 't2', versao: '3', texto: 'atual', ativo: true, criado_em: '2026-07-02T00:00:00Z' },
      error: null,
    });
    const { refreshConsentTermCache } = await import('./consent-term-cache');
    await refreshConsentTermCache();
    const cached = await db.consent_terms.toArray();
    expect(cached).toHaveLength(1);
    expect(cached[0].id).toBe('t2');
  });

  it('erro de rede não lança e não apaga cache existente', async () => {
    await db.consent_terms.put({ id: 'keep', versao: '1', texto: 'mantém', ativo: true, criado_em: '2026-01-01T00:00:00Z' });
    maybeSingle.mockRejectedValue(new Error('network down'));
    const { refreshConsentTermCache } = await import('./consent-term-cache');
    await expect(refreshConsentTermCache()).resolves.toBeUndefined();
    const cached = await db.consent_terms.toArray();
    expect(cached).toHaveLength(1);
    expect(cached[0].id).toBe('keep');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/consent-term-cache.test.ts`
Expected: FAIL — módulo `./consent-term-cache` não existe.

- [ ] **Step 3: Write minimal implementation**

Criar `src/lib/consent-term-cache.ts`:

```ts
import type { ConsentTerm } from '@/types/domain';
import { db } from './db';
import { supabase } from './supabase';

/**
 * Cacheia o termo de consentimento ativo no Dexie pra que o cadastro de
 * pessoa funcione offline. Best-effort: qualquer falha é silenciosa —
 * a próxima janela online tenta de novo (boot, evento 'online', publicação
 * de termo novo pelo admin).
 */
export async function refreshConsentTermCache(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    const { data, error } = await supabase
      .from('consent_terms')
      .select('id, versao, texto, ativo, criado_em')
      .eq('ativo', true)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return;
    await db.transaction('rw', db.consent_terms, async () => {
      await db.consent_terms.clear();
      await db.consent_terms.put(data as ConsentTerm);
    });
  } catch {
    // silencioso: cache é best-effort
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void refreshConsentTermCache());
}
```

Em `src/App.tsx`, disparar o refresh após o bootstrap de auth (RLS exige sessão):

```tsx
import { useEffect, useState } from 'react';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';
import { bootstrapAuth } from './features/auth/bootstrap';
import { refreshConsentTermCache } from './lib/consent-term-cache';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bootstrapAuth()
      .then(() => void refreshConsentTermCache())
      .finally(() => setReady(true));
  }, []);
  // ...resto intacto
}
```

Em `src/hooks/use-consent-terms.ts` (mutation de criar/publicar termo do admin): no `onSuccess` existente, adicionar `void refreshConsentTermCache();` (import de `@/lib/consent-term-cache`) — admin publica termo novo → cache local atualiza na hora.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/consent-term-cache.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/consent-term-cache.ts src/lib/consent-term-cache.test.ts src/App.tsx src/hooks/use-consent-terms.ts
git commit -m "feat(consent): cache local do termo ativo (boot + online + publicação)"
```

---

### Task 3: `useActiveConsentTerm` Dexie-first

**Files:**
- Modify: `src/hooks/use-consent-term.ts` (reescrever)
- Test: `src/hooks/use-consent-term.test.tsx` (novo)

**Interfaces:**
- Consumes: `db.consent_terms` (Task 1), `refreshConsentTermCache` (Task 2).
- Produces: `useActiveConsentTerm(): UseQueryResult<ConsentTerm | null>` — retorna termo do cache local imediatamente (offline ok); com cache vazio tenta um refresh e relê; `null` = indisponível.

- [ ] **Step 1: Write the failing test**

Criar `src/hooks/use-consent-term.test.tsx`:

```tsx
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
    await db.consent_terms.put({ id: 't1', versao: '1', texto: 'cacheado', ativo: true, criado_em: '2026-01-01T00:00:00Z' });
    const { result } = renderHook(() => useActiveConsentTerm(), { wrapper });
    await waitFor(() => expect(result.current.data?.id).toBe('t1'));
  });

  it('cache vazio: tenta refresh uma vez e relê', async () => {
    refreshMock.mockImplementation(async () => {
      await db.consent_terms.put({ id: 't9', versao: '1', texto: 'baixado', ativo: true, criado_em: '2026-01-01T00:00:00Z' });
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/hooks/use-consent-term.test.tsx`
Expected: FAIL — implementação atual busca Supabase direto (mock de consent-term-cache não intercepta; primeiro teste falha porque `supabase` real não está mockado / termo não vem do Dexie).

- [ ] **Step 3: Write minimal implementation**

Reescrever `src/hooks/use-consent-term.ts`:

```ts
import { refreshConsentTermCache } from '@/lib/consent-term-cache';
import { db } from '@/lib/db';
import { useQuery } from '@tanstack/react-query';

export function useActiveConsentTerm() {
  return useQuery({
    queryKey: ['consent_term', 'active'],
    queryFn: async () => {
      const cached = await db.consent_terms.toArray();
      if (cached.length > 0) {
        // Stale-while-revalidate: devolve o cache já e atualiza por trás.
        void refreshConsentTermCache();
        return cached[0];
      }
      // Primeiro uso neste device: tenta baixar agora (se online).
      await refreshConsentTermCache();
      const after = await db.consent_terms.toArray();
      return after[0] ?? null;
    },
    staleTime: 5 * 60_000,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/hooks/use-consent-term.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-consent-term.ts src/hooks/use-consent-term.test.tsx
git commit -m "feat(consent): useActiveConsentTerm lê cache Dexie primeiro (offline-first)"
```

---

### Task 4: `PessoaForm` — checkbox inline + termo expansível; deletar `ConsentModal`

**Files:**
- Modify: `src/features/cadastro/pessoa-form.tsx`
- Delete: `src/features/cadastro/consent-modal.tsx`
- Test: `src/features/cadastro/pessoa-form.test.tsx` (novo)

**Interfaces:**
- Consumes: `useActiveConsentTerm` (Task 3), `useRegisterConsent` (existente — `{ pessoa_id, consent_term_id }`), `useSavePessoa` (existente).
- Produces: UX final do cadastro. Nenhuma API nova.

- [ ] **Step 1: Write the failing test**

Criar `src/features/cadastro/pessoa-form.test.tsx`:

```tsx
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
    await db.consent_terms.put({ id: 'term-1', versao: '2', texto: 'texto do termo', ativo: true, criado_em: '2026-01-01T00:00:00Z' });
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
      expect((consentItems[0].data as { consent_term_id: string }).consent_term_id).toBe('term-1');
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
    await db.consent_terms.put({ id: 'term-1', versao: '2', texto: 'CONTEUDO-DO-TERMO', ativo: true, criado_em: '2026-01-01T00:00:00Z' });
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
```

Nota: se `@testing-library/user-event` não estiver em devDependencies, instalar: `pnpm add -D @testing-library/user-event`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/features/cadastro/pessoa-form.test.tsx`
Expected: FAIL — UI atual tem botão "Capturar consentimento LGPD", não o checkbox inline.

- [ ] **Step 3: Write minimal implementation**

Em `src/features/cadastro/pessoa-form.tsx`:

1. Remover: import de `ConsentModal`, estados `consentOpen`/`pendingTermId`, o render `<ConsentModal .../>` no final, e os handlers `onPointerDownOutside`/`onInteractOutside` do `DialogContent` (workaround do dialog aninhado — morre junto com o modal).
2. Adicionar: `import { useActiveConsentTerm } from '@/hooks/use-consent-term';` e no corpo:

```tsx
const { data: term, isLoading: termLoading } = useActiveConsentTerm();
const termUnavailable = !termLoading && !term;
const [termOpen, setTermOpen] = useState(false);
```

3. Substituir o bloco `{!pessoaId && (...)}` do botão de consentimento por:

```tsx
{!pessoaId && (
  <div className="border-t border-[var(--color-border)] pt-4">
    {termUnavailable ? (
      <p className="text-sm text-[var(--color-red)]">
        Termo de consentimento indisponível — conecte à internet uma vez para baixá-lo.
      </p>
    ) : (
      <>
        <label htmlFor="consent-check" className="flex items-start gap-2 text-sm">
          <Controller
            control={control}
            name="consent_declarado"
            render={({ field }) => (
              <Checkbox
                id="consent-check"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
                disabled={!term}
                className="mt-1"
              />
            )}
          />
          <span>
            Li o termo ao titular dos dados e ele(a) consentiu verbalmente com o tratamento.
          </span>
        </label>
        <button
          type="button"
          onClick={() => setTermOpen((v) => !v)}
          className="mt-1 text-xs text-[var(--color-text-muted)] underline"
        >
          {termOpen ? 'Ocultar termo' : `Ver termo${term ? ` (v${term.versao})` : ''}`}
        </button>
        {termOpen && term && (
          <div className="mt-2 max-h-56 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-sm leading-relaxed">
            <p className="mb-2 text-xs text-[var(--color-text-muted)]">Versão: {term.versao}</p>
            <p>{term.texto}</p>
          </div>
        )}
      </>
    )}
    {errors.consent_declarado && (
      <p className="mt-1 text-sm text-[var(--color-red)]">{errors.consent_declarado.message}</p>
    )}
  </div>
)}
```

4. No `onSubmit`, substituir o bloco `if (!pessoaId && pendingTermId)` por:

```ts
if (!pessoaId) {
  if (!term) throw new Error('Termo de consentimento indisponível');
  await registerConsent.mutateAsync({
    pessoa_id: saved.id,
    consent_term_id: term.id,
  });
}
```

5. Deletar o arquivo `src/features/cadastro/consent-modal.tsx` (`git rm`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/features/cadastro/pessoa-form.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Run full test suite (regressão)**

Run: `pnpm test`
Expected: PASS — nenhum teste existente referencia `ConsentModal` (verificar; se algum quebrar por import, remover a referência).

- [ ] **Step 6: Commit**

```bash
git add -A src/features/cadastro/
git commit -m "feat(cadastro): consent LGPD via checkbox inline offline-friendly (remove ConsentModal)"
```

---

### Task 5: `useGetOrCreateChamada` — lookup server-first

**Files:**
- Modify: `src/hooks/use-chamada.ts`
- Test: `src/hooks/use-chamada.test.tsx` (novo)

**Interfaces:**
- Consumes: `supabase` de `@/lib/supabase`, `db`, `enqueueSync` (existentes).
- Produces: mesmo contrato externo `useGetOrCreateChamada(): UseMutationResult<Chamada, Error, string>` — comportamento novo: quando online e sem chamada local pra data, tenta reusar o id do servidor antes de criar UUID novo.

- [ ] **Step 1: Write the failing test**

Criar `src/hooks/use-chamada.test.tsx`:

```tsx
import { useAuth } from '@/features/auth/useAuth';
import { db } from '@/lib/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/hooks/use-chamada.test.tsx`
Expected: teste 2 FAIL (cria UUID local e enfileira em vez de reusar `server-1`). Testes 1/3/4 podem passar — ok.

- [ ] **Step 3: Write minimal implementation**

Em `src/hooks/use-chamada.ts`, adicionar import `supabase` e a função privada + o passo novo no `mutationFn` de `useGetOrCreateChamada` (entre o dedupe local e a criação):

```ts
import { supabase } from '@/lib/supabase';

// Lookup server-first: evita a corrida de ID do upsert onConflict('data') —
// se outro device já criou chamada pra essa data, reusa o id canônico do
// servidor em vez de gerar UUID novo (que tentaria reescrever o PK no push
// e violaria FK de presencas existentes). Falha rápido e silencioso:
// offline/timeout → cria local (comportamento anterior).
async function fetchServerChamada(data: string): Promise<Chamada | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  try {
    const { data: rows, error } = await supabase
      .from('chamadas')
      .select('id, data, criado_em')
      .eq('data', data)
      .limit(1);
    if (error || !rows || rows.length === 0) return null;
    return rows[0] as Chamada;
  } catch {
    return null;
  }
}
```

No `mutationFn`, após o bloco de dedupe local (`if (all.length > 0) {...}`) e antes de `const now = ...`:

```ts
const server = await fetchServerChamada(data);
if (server) {
  await db.chamadas.put(server);
  return server;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/hooks/use-chamada.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-chamada.ts src/hooks/use-chamada.test.tsx
git commit -m "fix(sync): get-or-create de chamada consulta servidor antes de criar id novo"
```

---

### Task 6: `ChamadaPage` — seletor de data + banner retroativo

**Files:**
- Modify: `src/features/chamada/chamada-page.tsx`
- Test: `src/features/chamada/chamada-page.test.tsx` (novo)

**Interfaces:**
- Consumes: `useGetOrCreateChamada` (Task 5), hooks existentes.
- Produces: UX final da chamada retroativa. Nenhuma API nova.

- [ ] **Step 1: Write the failing test**

Criar `src/features/chamada/chamada-page.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/features/chamada/chamada-page.test.tsx`
Expected: FAIL — não existe input "Data" nem banner.

- [ ] **Step 3: Write minimal implementation**

Em `src/features/chamada/chamada-page.tsx`:

1. Imports novos: `Input` e `Label` de `@/components/ui/...`, `useRef` já importado.
2. Helper de formatação (abaixo de `todayISO`):

```ts
function formatDateBanner(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
```

3. Estado e derivações — substituir o bloco atual de `today`/`existing`/`chamadaId`:

```tsx
const today = todayISO();
const [selectedDate, setSelectedDate] = useState(today);
const isRetro = selectedDate !== today;
const selectedDateRef = useRef(selectedDate);

const existing = useMemo(
  () => chamadas.find((c) => c.data === selectedDate) ?? null,
  [chamadas, selectedDate],
);
const [chamadaId, setChamadaId] = useState<string | null>(existing?.id ?? null);
if (existing && chamadaId !== existing.id) setChamadaId(existing.id);
const { data: presencas = [] } = usePresencasByChamada(chamadaId);
const creatingRef = useRef<Promise<string> | null>(null);

const handleDateChange = (d: string) => {
  if (!d || d > today) return;
  selectedDateRef.current = d;
  setSelectedDate(d);
  setChamadaId(chamadas.find((c) => c.data === d)?.id ?? null);
  creatingRef.current = null;
};

const ensureChamadaId = async (): Promise<string> => {
  if (chamadaId) return chamadaId;
  const dateAtCall = selectedDate;
  if (!creatingRef.current) {
    creatingRef.current = getOrCreate.mutateAsync(dateAtCall).then((c) => c.id);
  }
  const id = await creatingRef.current;
  // Guarda contra troca de data com criação em voo: só fixa o id no estado
  // se a data selecionada ainda é a mesma da chamada criada.
  if (selectedDateRef.current === dateAtCall) setChamadaId(id);
  return id;
};
```

4. Trocar as referências restantes de `today` por `selectedDate`:
   - `last4Chamadas`: filtro `c.data < selectedDate` e dep do `useMemo` vira `[chamadas, selectedDate]`.
   - Subtítulo: `{selectedDate} · {presentCount} presentes`.

5. Header com input de data + banner (substituir o `<div>` do título):

```tsx
<div className="flex items-end justify-between gap-2">
  <div>
    <h1 className="text-2xl font-semibold">Chamada</h1>
    <p className="text-sm text-[var(--color-text-muted)]">
      {selectedDate} · {presentCount} presentes
    </p>
  </div>
  <div>
    <Label htmlFor="chamada-data">Data</Label>
    <Input
      id="chamada-data"
      type="date"
      value={selectedDate}
      max={today}
      onChange={(e) => handleDateChange(e.target.value)}
      className="w-40"
    />
  </div>
</div>

{isRetro && (
  <div className="rounded-md border border-[var(--color-yellow,#eab308)] bg-[color-mix(in_srgb,var(--color-yellow,#eab308)_15%,transparent)] px-3 py-2 text-sm font-medium">
    ⚠️ Chamada retroativa — {formatDateBanner(selectedDate)}
  </div>
)}
```

Nota: se `--color-yellow` não existir no tema (`src/styles/`), definir a var lá seguindo o padrão das outras cores, ou usar valor fixo `#eab308`. Verificar o arquivo de tema antes.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/features/chamada/chamada-page.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/chamada/
git commit -m "feat(chamada): seletor de data pra chamada retroativa com banner de aviso"
```

---

### Task 7: Gates finais + push

**Files:**
- Nenhum novo — verificação.

**Interfaces:** n/a.

- [ ] **Step 1: Rodar todos os gates**

```bash
cd /c/projects/presenca
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected: todos PASS, 0 errors. Se `pnpm lint` acusar formatação, rodar `pnpm lint:fix` e re-checar.

- [ ] **Step 2: Grep de referências mortas**

```bash
grep -rn "ConsentModal\|consent-modal" src/ && echo "FALHOU: referências restantes" || echo "OK"
```

Expected: OK (zero referências).

- [ ] **Step 3: Push da branch**

```bash
git push -u origin feat/chamada-retroativa-consent-offline
```

---

## Fora deste plano

- Fixes da auditoria de sync/app (workflow `presenca-audit`) — triagem separada; tarefas serão planejadas à parte depois dos findings confirmados.
- E2E novo pro fluxo retroativo (só `login.spec.ts` existe hoje; cobertura unit/component acima é o gate).
