# Plan 2 — Handoff

**Status:** Concluído (código). Aguarda aplicação manual de migrations + deploy de Edge Functions.
**Branch:** `refactor/react-lgpd`
**Data conclusão:** 2026-05-16
**Próximo:** Plan 3 (features migradas) — escrever quando hora chegar.

## Estado entregue

### Phase A — Scaffolding (✅)
- Vite 6 + React 19 + TypeScript scaffold
- Tailwind v4.3 + shadcn/ui (button, input, label, dialog, select, checkbox, sonner)
- Biome lint+format
- vite-plugin-pwa configurado
- Path alias `@/*` → `src/*`
- Env vars validadas por Zod (`src/lib/env.ts`)
- GitHub Actions CI (lint + typecheck + test + build + e2e)
- Vercel headers segurança (CSP, HSTS, X-Frame-Options, etc) em `vercel.json`
- `.env.example` documentando vars públicas

### Phase B — Supabase backend (✅ código, ⏳ aplicação)
- 9 migrations em `supabase/migrations/`:
  - 001_init_baseline (idempotente, schema atual)
  - 002_app_users_rbac
  - 003_consent_audit
  - 004_lgpd_requests
  - 005_anonimizacao (colunas `anonimizado_em/por` em `pessoas`)
  - 006_rls_policies (admin + operador + temp anon_legacy)
  - 007_seed_consent_term v1
  - 008_find_inactive_pessoas (RPC)
  - 009_seed_admin (template)
- 4 Edge Functions em `supabase/functions/`:
  - anonymize-inactive (cron mensal)
  - admin-create-user
  - admin-reset-password
  - export-pessoa-lgpd

### Phase C — Auth + shell (✅)
- Supabase client com tipos `Database` (placeholder, regenerar via `pnpm run supabase:types` após `supabase login`)
- Auth store Zustand (`src/features/auth/useAuth.ts`)
- Login email+senha (`src/features/auth/login.tsx`)
- RBAC via `RequireRole`
- Idle timeout 15min (`src/lib/idle.ts`)
- Logout completo (limpa IndexedDB + caches + storage)
- Router com rotas públicas (`/login`, `/privacidade`) e protegidas
- Bottom nav com tabs filtradas por papel
- `/privacidade` markdown LGPD
- Playwright E2E smoke (3 testes)

### Phase D — Data layer (✅)
- Dexie schema (`src/lib/db.ts`) com 7 stores + sync_queue
- Tipos de domínio (`src/types/domain.ts`)
- Sync engine (`src/lib/sync.ts`) — enqueue + push/pull + debounce + online detection
- SyncStatus indicator conectado via dexie-react-hooks
- 7 hooks com query + mutations + invalidation:
  - use-pessoas
  - use-familias
  - use-chamada (get-or-create + cascade delete)
  - use-presencas (deterministic IDs)
  - use-cestas
  - use-itens (+ update quantidade)
  - use-pedidos (+ atender)

## Verificação

| Check | Status |
|---|---|
| `pnpm run lint` | ✅ 0 errors |
| `pnpm run typecheck` | ✅ clean |
| `pnpm run test` | ✅ 13 tests / 7 files |
| `pnpm run build` | ✅ PWA generated |
| `pnpm run test:e2e` | ✅ 3 tests |

## Ações manuais pendentes do usuário (para Plan 2 ficar 100% operacional)

### 1. Aplicar migrations no Supabase

Cada arquivo em `supabase/migrations/` deve ser executado **em ordem** no Supabase SQL Editor:

```
001_init_baseline.sql
002_app_users_rbac.sql
003_consent_audit.sql
004_lgpd_requests.sql
005_anonimizacao.sql
006_rls_policies.sql
007_seed_consent_term.sql
008_find_inactive_pessoas.sql
009_seed_admin.sql        ← NÃO executar diretamente; é template comentado
```

Alternativa: `supabase db push` se Supabase CLI estiver linkado.

### 2. Criar primeiro admin

1. Dashboard → Authentication → Users → "Add user"
2. Email do pastor/coordenador, senha temporária forte (`openssl rand -base64 16`)
3. Confirmar email automaticamente
4. Copiar UUID gerado
5. SQL Editor:
   ```sql
   INSERT INTO app_users (id, nome, papel, ativo, criado_em)
   VALUES ('<uuid>', '<Nome>', 'admin', TRUE, NOW());
   ```
6. Comunicar senha temporária ao admin via canal seguro

### 3. Deploy Edge Functions

Requer Supabase CLI instalada + autenticada:

```bash
supabase login
supabase functions deploy anonymize-inactive --project-ref hhtxaeauuutmuwwkotgf
supabase functions deploy admin-create-user --project-ref hhtxaeauuutmuwwkotgf
supabase functions deploy admin-reset-password --project-ref hhtxaeauuutmuwwkotgf
supabase functions deploy export-pessoa-lgpd --project-ref hhtxaeauuutmuwwkotgf
```

### 4. Agendar cron anonymize-inactive (opcional, recomendado)

Requer extensions `pg_cron` + `pg_net` habilitadas (Database → Extensions).

```sql
SELECT cron.schedule(
  'anonymize-inactive-monthly',
  '0 3 1 * *',  -- todo dia 1 às 3h UTC
  $$
    SELECT net.http_post(
      url := 'https://hhtxaeauuutmuwwkotgf.supabase.co/functions/v1/anonymize-inactive',
      headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
    );
  $$
);
```

`app.service_role_key` precisa estar setado como custom GUC ou usar valor hardcoded no momento da criação (recomendado: criar via Supabase Vault).

### 5. Gerar tipos reais do Supabase

Após Supabase CLI estar autenticada:

```bash
pnpm run supabase:types
```

Vai substituir o placeholder em `src/types/supabase.ts` com schema real. Removerá necessidade dos casts inline em `bootstrap.ts` / `login.tsx`.

### 6. Configurar env vars no Vercel

Settings → Environment Variables (escopo Preview + Production):

- `VITE_SUPABASE_URL` = `https://hhtxaeauuutmuwwkotgf.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `sb_publishable_fxsXFdouInfiol_QFywOHA_KAddbI_T`
- `VITE_DPO_NOME` = definir
- `VITE_DPO_EMAIL` = definir
- `VITE_APP_VERSION` = `dev`

### 7. Smoke teste Vercel preview da branch

Vercel deve auto-deployar `refactor/react-lgpd` como preview URL. Acessar URL, validar:
- Login com admin criado (passo 2) funciona
- Bottom nav mostra "Admin" pra admin
- Logout limpa IndexedDB
- `/privacidade` acessível sem login

## Próximos passos (Plan 3 — features migradas)

Páginas atualmente são stubs ("Em construção"). Plan 3 vai migrar lógica vanilla pra cada feature:

1. **Cadastro** → pessoa-form (com consent modal capturando v1), familia-form, item-form
2. **Chamada** → marcar presença, busca DOM-filter, histórico inline
3. **Histórico** → lista por data + por pessoa + cestas + edição admin
4. **Ranking** → seções por grupo + famílias + botão excluir-ranking
5. **Estoque** → CRUD itens + quantidade inline
6. **Pedidos** → accordion por item + ATENDIDOS separado
7. **Admin** → /usuarios + /audit + /lgpd (busca pessoa + export/anonimizar) + /termos

Referência da lógica vanilla: `legacy/js/*`. Conversão React + TypeScript + hooks + shadcn/ui + RHF + Zod schemas.

## Anti-regressão crítico (NÃO REMOVER ANTES DO CUTOVER)

Migration `006_rls_policies.sql` inclui no final:

```sql
-- ===== TEMP: policies pra anon role manter vanilla legacy funcionando até cutover =====
-- REMOVER no Plan 4 (cutover) — TICKET: cutover-remove-anon-legacy-policies
CREATE POLICY pessoas_anon_legacy_temp ON pessoas FOR ALL TO anon USING (true) WITH CHECK (true);
-- ... (7 tabelas)
```

**NÃO REMOVER essas policies enquanto o app vanilla legacy estiver em produção.** Removê-las = vanilla quebra. Plan 4 (cutover) tira essas policies no momento da promoção do refactor pra produção.

## Riscos remanescentes pra Plan 3+

| Risco | Mitigação |
|---|---|
| Sync engine retry sem cap explícito gera storm em falha persistente | Phase D backlog: max attempts=5 + alerta admin |
| Edge Function `anonymize-inactive` sem tests automatizados | Aceito; valida via execução manual |
| Primeiro admin senha temporária pode vazar | Comunicar via canal cifrado, forçar troca no 1º login (Plan 3 add `/conta` page) |
| Bundle size >500KB warning no build | Plan 4 backlog: code splitting por rota |
| `src/types/supabase.ts` placeholder requer cast inline em queries `.single()` | Resolver com `pnpm run supabase:types` após CLI auth |
| Lint warns `noExplicitAny` em sync.ts (7-8 warnings) | Aceito; configurado como warn pra não bloquear |
