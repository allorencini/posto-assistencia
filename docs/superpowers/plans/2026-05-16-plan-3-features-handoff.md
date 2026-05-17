# Plan 3 — Handoff

**Status:** Concluído (código). Aguarda smoke E2E manual no Vercel preview.
**Branch:** `refactor/react-lgpd`
**Data conclusão:** 2026-05-16
**Próximo:** Plan 4 (cutover) — promover branch pra produção, remover policies `*_anon_legacy_temp`, descontinuar app vanilla.

## Entregue

### Phase F — Schemas Zod (Tasks 1-5)
- `src/schemas/{pessoa, familia, item, pedido, admin-user}.ts`

### Phase G — UI components (Tasks 6-9)
- `src/components/{search-input, filter-pills, empty-state, confirm-dialog}.tsx`

### Phase H — Cadastro (Tasks 10-19)
- Hooks: `use-consent-term`, `use-pessoa-consent`
- Features: `consent-modal`, `pessoa-form`, `pessoa-list`, `familia-form`, `familia-list`, `item-form`, `item-list`, `cadastro-page`
- 3 abas (Pessoas / Famílias / Itens) + busca DOM-filter + grupos
- **Consent capture obrigatório no cadastro de pessoa nova**
- Operador NÃO vê campos sensíveis (endereço, visita_obs, apta_cesta) no form

### Phase I — Chamada (Task 23)
- `src/features/chamada/chamada-page.tsx`
- Cria chamada do dia automaticamente
- Toggle presença per pessoa, agrupado por grupo
- Busca DOM-filter

### Phase J — Histórico (Task 26)
- `src/features/historico/historico-page.tsx`
- 3 abas: Por Data / Por Pessoa / Cestas
- Admin pode deletar chamadas e cestas

### Phase K — Ranking (Task 30)
- `src/features/ranking/ranking-page.tsx`
- Seção Famílias + 4 seções por grupo
- Botão ✕ pra excluir pessoa do ranking (marca `excluir_ranking=true`)

### Phase L — Estoque (Task 33)
- `src/features/estoque/estoque-page.tsx`
- CRUD + bump quantidade inline (botões − / +)

### Phase M — Pedidos (Tasks 36-37)
- `src/features/pedidos/{pedido-form, pedidos-page}.tsx`
- Accordion por item (pendentes) + section ATENDIDOS

### Phase N — Admin (Tasks 40-48)
- Shell + sub-router (/admin/{usuarios,audit,lgpd,termos})
- **Usuários**: criar (via Edge Function), resetar senha, toggle ativo
- **Audit log**: tabela com filtros por tabela + registro_id
- **LGPD**: buscar pessoa, exportar JSON (Edge Function + download), anonimizar, revogar consentimento, histórico de operações
- **Termos**: versionar termos de consentimento (cria novo → marca anterior inativo)

### Phase O — Cleanup
- Biome lint: noForEach desabilitado (overhead rule); a11y labels fixados
- Auto-format aplicado em todos os arquivos
- Pre-existing `docs/superpowers/specs/2026-04-14-familias-design.md` (modificação não relacionada) preservado intocado

## Verificação CI/local

| Check | Status |
|---|---|
| `pnpm run lint` | ✅ 0 errors, 8 warnings (noExplicitAny intencional) |
| `pnpm run typecheck` | ✅ clean |
| `pnpm test` | ✅ 13 tests / 7 files |
| `pnpm run build` | ✅ PWA 968 KiB precache |

## Ações pendentes do usuário

### Smoke E2E manual no Vercel preview (Tasks 50-51 do Plan 3)

Vercel rebuild dispara automaticamente após push. Preview URL:
`https://posto-assistencia-git-refactor-react-lgpd-allorencinis-projects.vercel.app`

Checklist:
- Login admin OK
- Cadastros: criar pessoa nova (deve exigir consent modal); editar; excluir; criar família com membros; criar item
- Chamada: marcar presença na chamada do dia
- Histórico: 3 abas funcionam, admin deleta chamada/cesta
- Ranking: ordenação correta, botão ✕ marca excluir
- Estoque: bump qtd, criar item, excluir
- Pedidos: criar, marcar atendido, accordion abre/fecha
- Admin/usuarios: criar operador (testar Edge Function `admin-create-user`)
  - Logar como operador → verificar restrições: sem /admin, não edita visita_obs em pessoa (trigger silenciosamente reverte)
- Admin/audit: ver registros das mutações
- Admin/lgpd: buscar pessoa, exportar JSON (baixa arquivo), anonimizar, revogar
- Admin/termos: criar termo v2 → v1 fica `ativo=false`
- Logout limpa IndexedDB

Reportar bugs encontrados pra fix-it commits.

## Anti-regressão crítico

Policies `*_anon_legacy_temp` (role anon, `USING (true)`) **continuam ativas** em produção pra manter vanilla legacy operando em `main`. Remoção apenas no Plan 4 (cutover).

## Open items pra Plan 4

| Item | Decisão pendente |
|---|---|
| DPO formal | Ariel Lorencini (confirmar; usar `VITE_DPO_NOME` no preview) |
| Termo consentimento v1 validação jurídica | Revisar com advogado antes do cutover |
| Backup formal | Supabase Pro auto-backup vs pg_dump semanal via Edge Function |
| Code splitting | Bundle 780KB+ — `manualChunks` no rollup pra rotas |
| Operador "fresh password" UX | `/conta` page pra trocar senha temporária no 1º login |
| `noExplicitAny` warns | Tipar melhor `db.transaction(table, ...)` no sync.ts e mocks de teste |

## Riscos remanescentes

| Risco | Mitigação |
|---|---|
| Smoke manual depende de admin operacional → pode atrasar feedback | Logar como admin Ariel Lorencini criado no Plan 2 |
| Sync engine retries sem cap explícito | Aceito Plan 4 backlog |
| Bundle size cresce com mais features | Code splitting em Plan 4 |

## Commits incluídos (resumo)

- Phase F+G: 9 commits (`8ebface` → `6a210f7`)
- Phase H: 10 commits (`e1f8108` → `48bac21`)
- Phases I+J: 2 commits (`1a7d92f`, `a6bb733`)
- Phases K+L+M: 4 commits (`8c409c5`, `e4c41a2`, `ea23ac3`, `3d30c1c`)
- Phase N: 9 commits (`8fe92f6` → `3098072`)
- Cleanup: 1 commit (`2ac1ebe`)
- Total: **35 commits** desde início do Plan 3
