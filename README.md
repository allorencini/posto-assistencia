# Posto Assistência

PWA offline-first para o Posto Simão Pedro (Grupo Espírita Paulo de Tarso) controlar presença, cestas e doações. React 19 + Supabase, com sincronização IndexedDB ↔ Postgres e RLS por papel (admin / operador).

Production: <https://posto-assistencia.vercel.app>

## Stack

- **Frontend:** Vite 6 + React 19 + TypeScript + Tailwind v4 + shadcn/ui
- **Estado:** Zustand (auth) + TanStack Query v5 (cache server) + Dexie (IndexedDB)
- **Backend:** Supabase Postgres + Auth + Realtime + Edge Functions
- **Auth:** Supabase Auth (JWT) + RLS policies por `current_app_user_papel()`
- **PWA:** vite-plugin-pwa + Workbox (precache shell, runtime cache p/ lazy chunks)
- **CI:** GitHub Actions (lint + typecheck + unit + build + e2e Playwright)
- **Backup:** GHA cron semanal → `pg_dump` → artifact 90 dias

## Comandos

```bash
pnpm install
pnpm dev               # local em :5173
pnpm run lint          # biome (lint + format)
pnpm run typecheck     # tsc --noEmit
pnpm test              # vitest unit
pnpm run test:e2e      # playwright
pnpm run build         # tsc -b + vite build
```

Edge Functions (precisam `pnpm exec supabase login`):

```bash
pnpm exec supabase functions deploy <nome>
```

## Variáveis de ambiente

Cliente (`.env.local`, todas com prefixo `VITE_`):

| Var | Obrigatória | Notas |
|---|---|---|
| `VITE_SUPABASE_URL` | sim | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | sim | publishable key (pública por design) |
| `VITE_DPO_NOME` | sim | string ≥1 char (exibida em `/privacidade`) |
| `VITE_DPO_EMAIL` | não | omitir esconde linha de email |
| `VITE_APP_VERSION` | não | default `dev` |

Edge Functions (Supabase Vault): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (injetadas automaticamente pelo runtime).

## Arquitetura — sincronização

1. UI escreve em Dexie (IndexedDB) + enfileira em `sync_queue`
2. `runSync` push: percorre `sync_queue` ordenado por timestamp → upsert/delete via PostgREST
3. `runSync` pull: `.range()` paginado por tabela → upsert no Dexie (LWW por `atualizado_em`)
4. Realtime (`startRealtime`) escuta `postgres_changes` em 6 tabelas → atualiza Dexie + invalida queries TanStack
5. `runSync` é disparado: login, online event, `setInterval` 30s, debounce 500ms após mutation

## RLS / papéis

- `anon`: zero acesso (policies `*_anon_legacy_temp` removidas no cutover 2026-05-17, migration 011)
- `authenticated`:
  - `admin`: full ALL nas 7 tabelas de domínio
  - `operador`: ALL exceto delete chamadas, edição presença passada (CURRENT_DATE)

Lookup do papel: `current_app_user_papel()` (SECURITY DEFINER) → consulta `app_users.papel`.

## LGPD

- Consentimento obrigatório no cadastro (`pessoa_consents` armazena versão + timestamp)
- Audit log: `audit_log` (triggers em `pessoas`, `app_users`, `consent_terms`)
- LGPD requests: `lgpd_requests` (export, anonimização, revogação)
- Edge Function `export-pessoa-lgpd` retorna JSON do titular
- DPO responsável: ver `VITE_DPO_NOME` no env.example

## Backup

Workflow `.github/workflows/db-backup.yml` roda `pg_dump` toda domingo 03:00 UTC.

Secrets necessários: `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_NAME` (vindo do Session Pooler — IPv4).

Restaurar: baixa artifact + `gunzip -c presenca-<stamp>.sql.gz | psql $URL`.

## Estrutura

```
src/
  app/           # router, shell, providers
  features/
    auth/        # login, useAuth, bootstrap
    chamada/     # marcar presença do dia
    historico/   # acordeão por data + cestas
    ranking/     # ordinal #N + cestas + período
    estoque/     # CRUD itens, bump qtd
    pedidos/     # accordion por item + atendidos
    admin/       # users, audit, lgpd, termos, resync
  hooks/         # use-pessoas, use-chamada, use-presencas, etc
  lib/           # db, sync, supabase, realtime, query, env
  schemas/       # Zod schemas dos forms
  types/         # domain.ts
tests/e2e/       # playwright (login redirect, validação, /privacidade)
supabase/
  migrations/    # 001–011 (RLS, RBAC, LGPD, cutover)
  functions/     # admin-create-user, admin-reset-password, etc
```

## Status (pós-Plan 4, 2026-05-17)

- Cutover concluído: produção 100% React, anon RLS removida
- Bundle: 7 chunks vendor + 10 page chunks lazy (index 226kB / 73kB gzip)
- CI verde, backup pg_dump operacional, repo público auditado sem segredos vazados
