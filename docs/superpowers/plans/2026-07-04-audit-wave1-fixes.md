# Audit Wave 1 — Fixes Críticos de Perda de Dados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar os caminhos confirmados de perda silenciosa de dados offline (purge da sync_queue, logout/idle destruindo o IndexedDB, pull deslogado apagando a base) e destravar a RLS pra chamada retroativa de operador.

**Architecture:** Fixes cirúrgicos nos módulos existentes: sync.ts ganha dead-letter (itens falhados param de ser deletados e ficam visíveis), gate de auth e classificação transiente/permanente; logout preserva o Dexie quando há pendências e nunca apaga o precache do PWA; bootstrap registra o listener de auth sempre e tolera boot offline; migration 012 relaxa RLS de presenças de `= CURRENT_DATE` pra `<= CURRENT_DATE` (operador).

**Tech Stack:** React 19 + TS, Dexie, Supabase JS, zustand, vitest. Repo `c:/projects/presenca`, branch `feat/chamada-retroativa-consent-offline`.

**Origem:** auditoria multi-agente 2026-07-03/04 (findings CONFIRMED C1–C6, PLAUSIBLE P4/P6/P17/P19/P25/P34/P39/P42). Backlog do restante: `docs/superpowers/specs/2026-07-04-audit-backlog.md`.

## Global Constraints

- Package manager: **pnpm**. Gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Offline-first: NENHUM fix pode introduzir rede no caminho crítico nem apagar dado local não sincronizado.
- Perda silenciosa de dados é o pior defeito: na dúvida, preservar dado + sinalizar, nunca deletar.
- Testes de hook/lib seguem padrão de `src/lib/consent-term-cache.test.ts` (mock de `@/lib/supabase` com `vi.mock`, `db.delete()`+`db.open()` no beforeEach).
- Migrations NÃO são aplicadas automaticamente (auto-deploy do Supabase GitHub integration está DESLIGADO de propósito). Criar o arquivo é o deliverable; aplicação é passo manual do usuário.
- Mensagens de UI em pt-BR. Commits convencionais + rodapé `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task R1: Migration 012 — RLS de presenças retroativas pra operador

**Files:**
- Create: `supabase/migrations/012_presencas_operador_retro.sql`

**Interfaces:**
- Consumes: policies existentes de `006_rls_policies.sql:108-124`.
- Produces: operador pode INSERT/UPDATE presenças de chamadas com `data <= CURRENT_DATE` (retroativo + sync pós-meia-noite). Datas futuras continuam bloqueadas; DELETE continua admin-only; chamadas UPDATE continua admin-only.

- [ ] **Step 1: Criar a migration**

```sql
-- 012: operador pode marcar presença retroativa (chamada de data passada).
-- Antes: presencas_insert/update exigiam chamada.data = CURRENT_DATE pra operador.
-- Isso quebrava (a) a feature de chamada retroativa e (b) o caso pré-existente de
-- presença marcada offline no sábado e sincronizada após a meia-noite — o push
-- violava RLS, o item falhava na sync_queue e era descartado (perda de dados).
-- Datas futuras continuam bloqueadas (<= CURRENT_DATE). Admin inalterado.

DROP POLICY IF EXISTS presencas_insert ON presencas;
CREATE POLICY presencas_insert ON presencas FOR INSERT TO authenticated
  WITH CHECK (
    current_app_user_papel() = 'admin'
    OR (
      current_app_user_papel() = 'operador'
      AND (SELECT data FROM chamadas WHERE id = chamada_id) <= CURRENT_DATE
    )
  );

DROP POLICY IF EXISTS presencas_update ON presencas;
CREATE POLICY presencas_update ON presencas FOR UPDATE TO authenticated
  USING (
    current_app_user_papel() = 'admin'
    OR (
      current_app_user_papel() = 'operador'
      AND (SELECT data FROM chamadas WHERE id = chamada_id) <= CURRENT_DATE
    )
  );
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/012_presencas_operador_retro.sql
git commit -m "fix(rls): operador pode marcar presença em chamada retroativa (<= hoje)"
```

Nota: sem teste automatizado (não há harness de RLS no repo). Validação manual pós-apply: operador marca presença em data passada → push sem erro 42501.

---

### Task R2: Sync engine — dead-letter, gate de auth, classificação de erro

**Files:**
- Modify: `src/lib/sync.ts`
- Modify: `src/components/sync-status.tsx`
- Modify: `src/features/admin/resync/resync-page.tsx`
- Test: `src/lib/sync.test.ts` (expandir)

**Interfaces:**
- Consumes: `db.sync_queue`, `useAuth` (`@/features/auth/useAuth`).
- Produces: `MAX_ATTEMPTS` exportado; `isDeadItem(item: SyncQueueItem): boolean` exportado (`attempts >= MAX_ATTEMPTS`); `retryDeadItems(): Promise<number>` exportado (zera `attempts`/`last_error` dos mortos e agenda sync; retorna quantos resetou). `runSync` continua `Promise<void>`.

Comportamento novo em `runSync`:
1. **Gate de auth:** primeiro check do corpo — `if (!useAuth.getState().user) return;`. Sem sessão, NADA roda (nem push nem pull). Motivo: deslogado, o PostgREST responde `200 []` sob RLS anon e o delete-pass do pull apagaria a base local inteira.
2. **Dead-letter em vez de purge:** REMOVER o bloco que deleta itens com `attempts >= MAX_ATTEMPTS` (linhas ~46-58 atuais). Manter apenas a limpeza de IDs não-UUID (lixo do bug pré-fix, irrecuperável por construção). No loop de push, pular itens mortos: `if (item.attempts >= MAX_ATTEMPTS) continue;`. Itens mortos permanecem na fila → `pendingByTable` do pull continua protegendo as linhas locais correspondentes (nada a mudar no pull).
3. **Classificação de erro:** no `catch` por item, só incrementar `attempts` quando o erro é permanente — heurística: `PostgrestError` tem `.code` string (ex.: `42501` RLS, `23503` FK, `23505` unique). Falha de rede (fetch rejeitado → `TypeError`/`Error` sem `.code`) atualiza `last_error`/`attempted_at` mas NÃO incrementa `attempts` (transiente não pode matar item).
4. **Guard de HMR nos timers:** módulo registra `window.addEventListener('online', ...)` + `setInterval` uma única vez por página: flag em `globalThis` (`__presencaSyncTimers`), não por execução de módulo.

`sync-status.tsx`: novo estado do pill — `deadCount = useLiveQuery(() => db.sync_queue.filter((q) => q.attempts >= MAX_ATTEMPTS).count(), [], 0)`. Se `deadCount > 0`: cor `var(--color-red)`, label `Falha de sincronização (${deadCount}) — abra Admin > Sincronização`. Prioridade acima dos estados atuais.

`resync-page.tsx`:
- `forcePull`: depois do `runSync`, recontar fila; se `> 0`, `toast.warning(\`Sincronização executada; ${n} registro(s) ainda pendentes/com falha\`)` em vez do success incondicional.
- Seção nova "Falhas de sincronização": lista itens mortos (`table`, `operation`, `last_error`, `attempted_at` formatado) via `useLiveQuery`, com botão "Tentar novamente" → `retryDeadItems()` + toast com o total resetado. Seção só aparece se houver mortos.
- `wipeAndReload`: confirm passa a incluir pendências: `` `Apagar todo o cache local?${n > 0 ? ` ATENÇÃO: ${n} registro(s) NÃO ENVIADOS serão perdidos.` : ''} ` `` (contar `db.sync_queue.count()` antes do confirm).

- [ ] **Step 1: Escrever os testes que falham** (adicionar a `src/lib/sync.test.ts`; mock de supabase + useAuth no topo do arquivo):

```ts
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
```

Casos novos (cada um com `db.delete()`+`db.open()` no beforeEach e reset dos mocks):

```ts
it('runSync sem sessão: não faz push nem pull', async () => {
  mockUser = null;
  await db.sync_queue.add({ table: 'pessoas', operation: 'upsert', data: { id: crypto.randomUUID() }, user_id: 'u1', attempts: 0, timestamp: Date.now() });
  const { runSync } = await import('./sync');
  await runSync();
  expect(upsertMock).not.toHaveBeenCalled();
  expect(selectRangeMock).not.toHaveBeenCalled();
  expect(await db.sync_queue.count()).toBe(1);
  mockUser = { id: 'u1' };
});

it('item com attempts >= MAX não é deletado nem re-tentado (dead-letter)', async () => {
  await db.sync_queue.add({ table: 'pessoas', operation: 'upsert', data: { id: crypto.randomUUID() }, user_id: 'u1', attempts: 5, timestamp: Date.now() });
  const { runSync } = await import('./sync');
  await runSync();
  expect(upsertMock).not.toHaveBeenCalled();
  expect(await db.sync_queue.count()).toBe(1);
});

it('erro permanente (PostgrestError com code) incrementa attempts', async () => {
  upsertMock.mockResolvedValue({ error: { code: '42501', message: 'rls' } });
  await db.sync_queue.add({ table: 'pessoas', operation: 'upsert', data: { id: crypto.randomUUID() }, user_id: 'u1', attempts: 0, timestamp: Date.now() });
  const { runSync } = await import('./sync');
  await runSync();
  const [item] = await db.sync_queue.toArray();
  expect(item.attempts).toBe(1);
});

it('falha de rede (exceção sem code) NÃO incrementa attempts', async () => {
  upsertMock.mockRejectedValue(new TypeError('Failed to fetch'));
  await db.sync_queue.add({ table: 'pessoas', operation: 'upsert', data: { id: crypto.randomUUID() }, user_id: 'u1', attempts: 0, timestamp: Date.now() });
  const { runSync } = await import('./sync');
  await runSync();
  const [item] = await db.sync_queue.toArray();
  expect(item.attempts).toBe(0);
  expect(item.last_error).toContain('fetch');
});

it('retryDeadItems zera attempts dos mortos', async () => {
  await db.sync_queue.add({ table: 'pessoas', operation: 'upsert', data: { id: crypto.randomUUID() }, user_id: 'u1', attempts: 7, timestamp: Date.now(), last_error: 'x' });
  const { retryDeadItems } = await import('./sync');
  const n = await retryDeadItems();
  expect(n).toBe(1);
  const [item] = await db.sync_queue.toArray();
  expect(item.attempts).toBe(0);
});
```

Atenção: o teste existente de `enqueueSync` continua passando; se o mock de useAuth conflitar com outro teste do arquivo, isolar com `vi.doMock`/arquivo novo `sync-deadletter.test.ts` — decisão do implementador, documentar no relatório.

- [ ] **Step 2: Rodar e ver falhar** — `pnpm vitest run src/lib/sync.test.ts` (imports inexistentes/comportamento antigo).

- [ ] **Step 3: Implementar** conforme "Comportamento novo" acima. Pontos exatos em sync.ts:
  - topo do `runSync`: gate de auth (novo import `useAuth`).
  - bloco de órfãos: manter só o filtro de UUID inválido no `orphanIds`.
  - loop: `if (item.attempts >= MAX_ATTEMPTS) continue;` antes do try.
  - catch: `const code = (err as { code?: unknown })?.code; const permanent = typeof code === 'string'; await db.sync_queue.update(item.id!, { ...(permanent ? { attempts: item.attempts + 1 } : {}), last_error: message, attempted_at: Date.now() });`
  - exports novos: `export const MAX_ATTEMPTS = 5;` (troca a const local), `isDeadItem`, `retryDeadItems` (usa `db.sync_queue.toCollection().modify` filtrado + `scheduleSync()`).
  - timers: `const g = globalThis as { __presencaSyncTimers?: boolean }; if (typeof window !== 'undefined' && !g.__presencaSyncTimers) { g.__presencaSyncTimers = true; window.addEventListener('online', scheduleSync); setInterval(scheduleSync, 30_000); }`

- [ ] **Step 4: UI** — sync-status.tsx (deadCount vermelho prioritário) e resync-page.tsx (toast honesto, seção de falhas com retry, confirm com pendências) conforme spec acima.

- [ ] **Step 5: Rodar tudo** — `pnpm vitest run src/lib/sync.test.ts` PASS; `pnpm test` PASS; `pnpm typecheck` PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sync.ts src/lib/sync.test.ts src/components/sync-status.tsx src/features/admin/resync/resync-page.tsx
git commit -m "fix(sync): dead-letter em vez de purge, gate de auth no pull, erro transiente não mata item"
```

---

### Task R3: Logout/idle não destrói dados pendentes nem o precache do PWA

**Files:**
- Modify: `src/features/auth/logout.ts`
- Test: `src/features/auth/logout.test.ts` (novo)

**Interfaces:**
- Consumes: `db`, `runSync` (`@/lib/sync`), `supabase`, `useAuth`, `stopRealtime`.
- Produces: mesmo contrato `logout(): Promise<void>`. Comportamento novo: (1) antes de qualquer destruição, tenta `runSync()` se online; (2) `db.delete()` SÓ quando `sync_queue.count() === 0` (na dúvida/erro de contagem, NÃO deleta); (3) purge de CacheStorage filtra fora chaves `workbox-precache*` (PWA continua bootando offline); (4) resto do fluxo inalterado (signOut, storages, clear, redirect).

- [ ] **Step 1: Teste que falha** (`src/features/auth/logout.test.ts`):

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn().mockResolvedValue({}) } } }));
vi.mock('@/lib/realtime', () => ({ stopRealtime: vi.fn() }));
vi.mock('@/lib/sync', () => ({ runSync: vi.fn().mockResolvedValue(undefined) }));

describe('logout', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    // jsdom: location.href é atribuível via defineProperty
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });
  });

  it('com pendências na sync_queue: NÃO apaga o banco local', async () => {
    await db.sync_queue.add({ table: 'presencas', operation: 'upsert', data: { id: crypto.randomUUID() }, user_id: 'u1', attempts: 0, timestamp: Date.now() });
    const deleteSpy = vi.spyOn(db, 'delete');
    const { logout } = await import('./logout');
    await logout();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(await db.sync_queue.count()).toBe(1);
  });

  it('sem pendências: apaga o banco local', async () => {
    const deleteSpy = vi.spyOn(db, 'delete').mockResolvedValue(undefined as never);
    const { logout } = await import('./logout');
    await logout();
    expect(deleteSpy).toHaveBeenCalled();
  });

  it('preserva caches workbox-precache*', async () => {
    const deleted: string[] = [];
    vi.stubGlobal('caches', {
      keys: async () => ['workbox-precache-v2-https://x', 'runtime-admin'],
      delete: async (k: string) => { deleted.push(k); return true; },
    });
    const { logout } = await import('./logout');
    await logout();
    expect(deleted).toEqual(['runtime-admin']);
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Ver falhar** — `pnpm vitest run src/features/auth/logout.test.ts`.

- [ ] **Step 3: Implementar** em logout.ts:

```ts
import { db } from '@/lib/db';
import { stopRealtime } from '@/lib/realtime';
import { runSync } from '@/lib/sync';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export async function logout() {
  try {
    stopRealtime();
  } catch {
    // ignore
  }
  // Última chance de esvaziar a fila antes de decidir se o banco pode ser apagado.
  let pending = -1;
  try {
    if (typeof navigator === 'undefined' || navigator.onLine) await runSync();
    pending = await db.sync_queue.count();
  } catch {
    // não conseguiu nem contar → trata como pendente (não apaga)
  }
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore — limpa local sempre
  }
  if (pending === 0) {
    try {
      await db.delete();
    } catch {
      // ignore
    }
  }
  // pendências > 0: o banco fica; os registros sobem no próximo login com sessão.
  try {
    sessionStorage.clear();
    localStorage.clear();
  } catch {
    // ignore
  }
  try {
    // Nunca apagar o precache do Workbox — sem ele o PWA não boota offline.
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => !k.startsWith('workbox-precache')).map((k) => caches.delete(k)),
    );
  } catch {
    // ignore
  }
  useAuth.getState().clear();
  window.location.href = '/login';
}
```

- [ ] **Step 4: Ver passar + suite** — `pnpm vitest run src/features/auth/logout.test.ts` PASS; `pnpm test` PASS; `pnpm typecheck` PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/logout.ts src/features/auth/logout.test.ts
git commit -m "fix(auth): logout preserva dados não sincronizados e o precache do PWA"
```

---

### Task R4: Bootstrap — listener de auth sempre registrado + boot offline não derruba sessão

**Files:**
- Modify: `src/features/auth/bootstrap.ts`
- Test: `src/features/auth/bootstrap.test.ts` (novo)

**Interfaces:**
- Consumes: `supabase`, `useAuth`, `startRealtime`/`stopRealtime`, `runSync`.
- Produces: mesmo contrato `bootstrapAuth(): Promise<void>`. Comportamentos novos:
  1. `supabase.auth.onAuthStateChange(...)` registrado SEMPRE (antes de qualquer early-return) — sessão iniciada pela LoginPage passa a ter listener de SIGNED_OUT/refresh sem reload.
  2. Papel cacheado: a cada `setSession` bem-sucedido no bootstrap, persistir `localStorage.setItem('presenca-papel-cache', JSON.stringify({ id: user.id, papel }))`.
  3. Boot offline/rede ruim: se o SELECT de `app_users` falhar por REDE (exceção, ou `error` sem confirmação do servidor — heurística: `error.code` ausente/`''` + `!appUser`), NÃO fazer signOut; usar o papel do cache local se o id bater (`setSession(session.user, cachedPapel)`); sem cache → `clear()` sem signOut (mantém token pra retry no próximo boot).
  4. signOut + clear SÓ quando o servidor afirma que o usuário é inválido (`appUser` retornado com `ativo === false`, ou resposta definitiva sem row — `error.code === 'PGRST116'`).
  5. Mesma tolerância no callback do onAuthStateChange (falha de rede na consulta → mantém sessão corrente em vez de derrubar).

- [ ] **Step 1: Teste que falha** (`src/features/auth/bootstrap.test.ts`) — mock completo de supabase:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const singleMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue({});
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: getSessionMock, onAuthStateChange: onAuthStateChangeMock, signOut: signOutMock },
    from: () => ({
      select: () => ({ eq: () => ({ single: singleMock }) }),
      update: () => ({ eq: vi.fn().mockResolvedValue({}) }),
    }),
  },
}));
vi.mock('@/lib/realtime', () => ({ startRealtime: vi.fn(), stopRealtime: vi.fn() }));
vi.mock('@/lib/sync', () => ({ runSync: vi.fn().mockResolvedValue(undefined) }));

import { useAuth } from './useAuth';

describe('bootstrapAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuth.setState({ user: null, papel: null, loading: true });
  });

  it('sem sessão: registra onAuthStateChange mesmo assim', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const { bootstrapAuth } = await import('./bootstrap');
    await bootstrapAuth();
    expect(onAuthStateChangeMock).toHaveBeenCalledTimes(1);
    expect(useAuth.getState().user).toBeNull();
  });

  it('falha de rede no app_users com papel cacheado: mantém sessão, sem signOut', async () => {
    const user = { id: 'u1' };
    getSessionMock.mockResolvedValue({ data: { session: { user } } });
    singleMock.mockRejectedValue(new TypeError('Failed to fetch'));
    localStorage.setItem('presenca-papel-cache', JSON.stringify({ id: 'u1', papel: 'operador' }));
    const { bootstrapAuth } = await import('./bootstrap');
    await bootstrapAuth();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(useAuth.getState().user).toEqual(user);
    expect(useAuth.getState().papel).toBe('operador');
  });

  it('usuário desativado (resposta definitiva do servidor): signOut + clear', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    singleMock.mockResolvedValue({ data: { papel: 'operador', ativo: false }, error: null });
    const { bootstrapAuth } = await import('./bootstrap');
    await bootstrapAuth();
    expect(signOutMock).toHaveBeenCalled();
    expect(useAuth.getState().user).toBeNull();
  });

  it('boot feliz: seta sessão e cacheia papel', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    singleMock.mockResolvedValue({ data: { papel: 'admin', ativo: true }, error: null });
    const { bootstrapAuth } = await import('./bootstrap');
    await bootstrapAuth();
    expect(useAuth.getState().papel).toBe('admin');
    expect(JSON.parse(localStorage.getItem('presenca-papel-cache')!)).toEqual({ id: 'u1', papel: 'admin' });
  });
});
```

Nota de import: como bootstrap registra estado no módulo, usar `await import('./bootstrap')` DEPOIS dos mocks (padrão já usado em consent-term-cache.test.ts). Se precisar de `vi.resetModules()` entre casos, aplicar no beforeEach.

- [ ] **Step 2: Ver falhar.** `pnpm vitest run src/features/auth/bootstrap.test.ts`.

- [ ] **Step 3: Implementar** — reorganizar bootstrap.ts:
  - Extrair o corpo do callback atual de `onAuthStateChange` pra função interna com a tolerância de rede do item 5.
  - Registrar o listener no INÍCIO de `bootstrapAuth` (guard de módulo pra não registrar 2x se bootstrapAuth rodar de novo: `let listenerRegistered = false;`).
  - Helper interno `resolvePapel(session): Promise<'ok' | 'invalid' | 'offline'>` com a heurística do item 3/4; caminhos: ok → setSession + cache papel; invalid → signOut + clear; offline → cache hit ? setSession(cached) : clear() sem signOut.
  - Manter `startRealtime()`, `void runSync()` e o update de `ultimo_login_em` APENAS no caminho ok (não no offline — sem rede não adianta).

- [ ] **Step 4: Ver passar + suite.** `pnpm vitest run src/features/auth/bootstrap.test.ts` PASS; `pnpm test`; `pnpm typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/bootstrap.ts src/features/auth/bootstrap.test.ts
git commit -m "fix(auth): listener de sessão sempre ativo e boot offline não derruba a sessão"
```

---

### Task R5: Gates finais da wave

**Files:** nenhum novo.

- [ ] **Step 1:** `cd /c/projects/presenca && pnpm lint && pnpm typecheck && pnpm test && pnpm build` — tudo PASS (rodar `pnpm lint:fix` antes se houver formatação).
- [ ] **Step 2:** Smoke manual dos fluxos tocados descritos no relatório final (não bloqueante).

---

## Fora desta wave (backlog documentado)

Ver `docs/superpowers/specs/2026-07-04-audit-backlog.md` — findings server-side/product (auth de edge functions, oráculo resolve-username, PII em audit_log, colunas PII no pull de operador), anonimização local (P8/P16/P30), pedidos reset (P18/P27), cestas duplicadas (P28), SW update flow (P20), error boundary (P21), pull com ORDER BY (P5), precache privacidade (P37), pipefail no backup (P38).
