# Backlog da auditoria 2026-07-03/04 — findings fora da Wave 1

Origem: auditoria multi-agente (5 dimensões: sync linha-a-linha, data-hooks, ui-pages, auth-security, pwa-config) com verificação adversarial parcial (parte dos verificadores caiu por limite de sessão — itens "PLAUSIBLE" têm alegação detalhada mas sem contra-prova independente; re-verificar antes de fixar).

Wave 1 (fixada em `docs/superpowers/plans/2026-07-04-audit-wave1-fixes.md`): purge da sync_queue → dead-letter; logout/idle destruindo IndexedDB e precache; gate de auth no pull; bootstrap offline/listener; RLS presenças retroativas (migration 012).

## 🔴 Segurança / LGPD — server-side (exigem decisão de produto + apply no Supabase)

1. **[CONFIRMED] Edge function `anonymize-inactive` sem auth do chamador** (`supabase/functions/anonymize-inactive/index.ts:11`) — qualquer um com a anon key pública invoca anonimização irreversível (service role). Fix: exigir JWT de admin (verificar `papel` via `current_app_user_papel` ou service-to-service secret).
2. **[CONFIRMED] `resolve-username` é oráculo de enumeração** (`supabase/functions/resolve-username/index.ts:68`) — devolve e-mail real de qualquer username, não autenticado, e loga username+email. Fix: resposta opaca (sempre 200 genérico), rate-limit, remover logs de PII.
3. **[CONFIRMED] `audit_log.diff` guarda snapshot completo com PII pré-anonimização** (`supabase/migrations/003_consent_audit.sql:46`) — anonimização fica ineficaz (nome/telefone/endereço originais permanecem no audit_log). Fix: redigir colunas sensíveis do row_to_json no trigger, ou apagar/redigir entradas de audit_log da pessoa no ato da anonimização.
4. **[CONFIRMED] Operador puxa TODAS as colunas de `pessoas`** (RLS `006:37` + `sync.ts select('*')`) — endereço completo + visita_obs em IndexedDB sem criptografia de todo device de operador. Fix: view/colunas restritas pra operador (column-level privileges ou view `pessoas_operador`), pull seleciona colunas por papel.

## 🟠 Correção de dados — client-side

5. **[PLAUSIBLE, alta] Anonimização LGPD não toca o Dexie local** (`use-lgpd.ts:42`; relacionados P8/P16/P30) — pessoa anonimizada continua com PII local até o próximo pull; pior: edição offline enfileirada ANTES da anonimização re-insere PII no servidor (upsert sem LWW). Fix: update local + enqueue na mesma transação; push com guarda de `atualizado_em` (LWW) ou checagem de `anonimizado_em` server-side (trigger que rejeita upsert de linha anonimizada).
6. **[PLAUSIBLE, alta] `useSavePedido` reseta `solicitado_em`/status na edição** (`use-pedidos.ts:46`) — pessoa perde o lugar na fila a cada edição. Fix: merge com registro existente (preservar campos não presentes no input).
7. **[PLAUSIBLE, média] Cestas duplicadas entre devices** (`use-cestas.ts:24`) — guard local só; servidor sem UNIQUE(pessoa_id, data). Fix: migration UNIQUE parcial (`WHERE ativo`) + onConflict no push + tratamento 23505 como sucesso idempotente.
8. **[PLAUSIBLE, média] `useCreateConsentTerm` pode deixar ZERO termos ativos** (`use-consent-terms.ts:25`) — desativa o vigente sem atomicidade com o insert. Fix: RPC transacional no Postgres (função `publish_consent_term`), ou ordem invertida com rollback manual.
9. **[PLAUSIBLE, média] DELETE remoto filtrado por RLS "sucede" com 0 rows** (`sync.ts:64`) — deleção some da fila sem acontecer; pull ressuscita o registro. Fix: `.select()` no delete e tratar 0 rows como erro permanente (dead-letter).
10. **[PLAUSIBLE, média] Pull pagina `.range()` sem `.order()`** (`sync.ts:126`) — páginas podem pular/duplicar rows; delete-pass usa snapshot incompleto. Fix: `.order('id')` em todas as páginas.
11. **[PLAUSIBLE, média] Snapshot `pendingByTable` lido antes dos fetches** (`sync.ts:109`) — writes durante o pull podem ser apagados pelo delete-pass. Fix: reler a fila dentro da transação de cada tabela.
12. **[PLAUSIBLE, média] Mutations não invalidam query keys de entidade única** (`['pessoa', id]` etc.) — edição reaberta mostra dado velho. Fix: invalidar keys específicas nos onSuccess.
13. **[PLAUSIBLE, média] Double-tap em toggle de presença/estoque subconta** (`chamada-page.tsx:124`, `estoque-page.tsx:43`) — read-modify-write do render corrente. Fix: functional update a partir do Dexie na mutation, ou disable durante isPending.
14. **[PLAUSIBLE, baixa] `trocar`/dedupe de chamadas duplicadas não re-parenteia presenças** (`use-chamada.ts:43`) — mitigado na prática pelo lookup server-first + UNIQUE(data); fix definitivo: re-parentear presenças da órfã antes de deletar.

## 🟡 PWA / plataforma

15. **[PLAUSIBLE, alta] SW `autoUpdate` com skipWaiting sem reload coordenado** (`vite.config.ts:12`) — troca de versão no meio da sessão pode quebrar lazy chunks. Fix: `registerType: 'prompt'` + toast "Nova versão disponível" com reload, ou reload automático em navegação.
16. **[PLAUSIBLE, alta] Sem error boundary / errorElement** (`src/app/router.tsx:37`) — crash de render = tela default do React Router em inglês. Fix: errorElement global com recuperação (reload + link login).
17. **[PLAUSIBLE, média] Precache exclui chunks de privacidade/termos/lgpd** (`vite.config.ts:31`) — política de privacidade não abre offline. Fix: revisar globIgnores.
18. **[PLAUSIBLE, média] `db-backup.yml` sem pipefail** — pg_dump falho + gzip ok = backup vazio "sucesso". Fix: `set -o pipefail` no step (uma linha).
19. **[CONFIRMED, alto trabalho] `bootstrapAuth` exige rede no boot** — parcialmente mitigado na Wave 1 (R4). Follow-up: revisar UX de "sessão offline" de longo prazo (expiração de token supabase vs uso offline prolongado).

## Notas de verificação

- Itens 1-4 CONFIRMED por verificador adversarial. Demais PLAUSIBLE (verificador caiu por rate-limit) — re-verificar a alegação lendo o código antes de implementar.
- 1 finding refutado na auditoria (descartado).
- Findings do fluxo antigo de consent (modal bloqueado offline) já resolvidos pelas features de 2026-07-03 (cache Dexie + checkbox inline).
