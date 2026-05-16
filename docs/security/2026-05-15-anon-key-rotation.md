# Incidente: Rotação de anon key Supabase

**Data:** 2026-05-15
**Severidade:** Médio (anon key é pública por design, mas combinada com RLS `USING (true)` permitia leitura/escrita total dos dados de pessoas/famílias/presenças/cestas/itens/pedidos).
**Trigger:** Auditoria pré-refactor para LGPD/segurança identificou que `js/supabase-config.js:4` continha anon JWT versionado no git desde 2024-04-10.

## Impacto

- Anon JWT estava acessível via histórico do git público
- RLS no Supabase configurado com `USING (true)` para todas as tabelas com PII
- Combinação permitia leitura/escrita irrestrita por qualquer um com a key
- Dados expostos: nome, telefone, endereço completo, observações de visita social (LGPD Art. 5 II — dado sensível possível), histórico de presença e entrega de cestas

## Ação corretiva (Plan 1)

1. Tag de rollback `v-legacy-pre-rotation` criada
2. Branch novo `refactor/react-lgpd` já existia (refactor em andamento) — sem mexer
3. Anon legacy JWT substituído por **publishable API key** (`sb_publishable_*`) — novo formato Supabase
4. `js/supabase-config.js:4` atualizado com publishable key
5. SW cache version bumpada de v26 → v27 (força refresh dos PWAs instalados)
6. Commit `261c535` em `main`, push, Vercel deploy automático
7. Smoke produção validado: cadastrar/excluir pessoa funcional, Network requests 200/201
8. **Legacy JWT-based API keys desabilitadas** via Supabase dashboard → anon JWT vazada agora retorna erro de auth

## Observações técnicas relevantes

- A coluna `excluir_ranking` em `pessoas` não tinha sido aplicada no schema produção (commit `aa4a96f` introduziu no client). Erro PGRST204 surgiu durante smoke, foi resolvido executando `ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS excluir_ranking BOOLEAN DEFAULT FALSE; NOTIFY pgrst, 'reload schema';`. Problema pré-existente, não relacionado à rotação — mas documentado aqui pra trilha completa.
- JWT signing key também havia sido migrada de HS256 para ES256 em outra ocasião (legacy HS256 ainda lista como "previously used" no dashboard).

## Limitações remanescentes

- Histórico git ainda contém o anon JWT antigo. **Mitigação:** já está desabilitado no servidor — qualquer tentativa de uso retorna 401. Sem valor pra atacante.
- RLS continua `USING (true)` em todas as tabelas. Endurecimento (RLS por papel admin/operador) chega no Plan 2 quando auth está implementada.
- Anon REST API continua acessível de qualquer origem (limitação Supabase free tier — sem CORS restritivo nativo).

## Ação preventiva (Plan 2 — em andamento)

- Auth obrigatório com Supabase Auth (email + senha)
- RLS por papel substitui `USING (true)`
- Publishable key passa a exigir JWT user-scoped pra qualquer operação útil
- Audit log automático via Postgres triggers (Art. 37 LGPD)
- Anonimização automática após 5 anos sem atividade (cron mensal)

Spec completo: [docs/superpowers/specs/2026-05-15-presenca-react-lgpd-design.md](../superpowers/specs/2026-05-15-presenca-react-lgpd-design.md)
Plano em execução: [docs/superpowers/plans/2026-05-15-plan-2-foundation.md](../superpowers/plans/2026-05-15-plan-2-foundation.md)

## Verificação

- ✅ Tag `v-legacy-pre-rotation` criada e pushed
- ✅ Publishable key aplicada em `js/supabase-config.js`
- ✅ SW bumpado v26 → v27, propagou para PWAs instalados
- ✅ Smoke produção OK (cadastro + exclusão funcional)
- ✅ Legacy JWT-based API keys desabilitadas no Supabase
- ✅ App vanilla continua operacional com nova publishable key
