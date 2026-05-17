# Plan 1 — Security Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Invalidar anon key potencialmente exposta no histórico do git e endurecer config Supabase atual antes do refactor React começar.

**Architecture:** Opera em `main` (sem refactor). Rotaciona JWT secret no Supabase (invalida key vazada), aplica nova key no client, restringe origens permitidas, valida que app vanilla continua funcionando.

**Tech Stack:** Supabase Dashboard, Git tags, Vercel deploy automático.

**Spec:** [docs/superpowers/specs/2026-05-15-presenca-react-lgpd-design.md](../specs/2026-05-15-presenca-react-lgpd-design.md) — Fase 0.

**Branch:** `main` (hotfix direto). NÃO usar `refactor/react-lgpd` para isto.

---

## Pré-requisitos

- Acesso de owner ao projeto Supabase `hhtxaeauuutmuwwkotgf`
- Acesso ao Vercel project linkado a `main`
- Backup mental: nenhum usuário logado no app atual (sem auth), então rotação não desloga ninguém

---

## Task 1: Garantir branch correta e capturar baseline

**Files:**
- Read: `js/supabase-config.js`
- Read: `supabase/schema.sql`

- [ ] **Step 1: Confirmar working tree limpo em `main`**

```bash
cd c:/projects/presenca
git checkout main
git status
```

Expected: `nothing to commit, working tree clean`. Se houver alterações pendentes, stashar antes (`git stash push -m "pre-hotfix"`).

- [ ] **Step 2: Capturar anon key e URL atuais**

Abrir `js/supabase-config.js`, copiar valores de `SUPABASE_URL` e `SUPABASE_ANON_KEY` para log local (não commit).

Expected: URL `https://hhtxaeauuutmuwwkotgf.supabase.co`, ANON_KEY começa com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

- [ ] **Step 3: Sem commit nesta task**

Captura é só local. Não cria arquivo no repo (key não vai pro log).

---

## Task 2: Tag de rollback

**Files:**
- Nenhum modificado

- [ ] **Step 1: Criar tag de estado pré-rotação**

```bash
git tag -a v-legacy-pre-rotation -m "State before Supabase anon key rotation hotfix (Plan 1)"
git push origin v-legacy-pre-rotation
```

Expected: `* [new tag] v-legacy-pre-rotation -> v-legacy-pre-rotation`

Permite reverter código se a rotação quebrar algo.

---

## Task 3: Rotacionar JWT secret no Supabase Dashboard

**Files:**
- Nenhum modificado (ação no dashboard externo)

- [ ] **Step 1: Acessar Supabase Dashboard**

URL: https://supabase.com/dashboard/project/hhtxaeauuutmuwwkotgf/settings/api

- [ ] **Step 2: Anotar nova anon key ANTES de rotacionar**

Tela de API mostra dois campos: `anon (public)` e `service_role (secret)`. NÃO copie service_role.

Antes de clicar em rotacionar, anote num lugar temporário (não committed):
- ANON_KEY_ATUAL (que será invalidada)

- [ ] **Step 3: Clicar em "Reset JWT secret"**

Settings → API → seção "JWT Settings" → botão "Generate new secret" (ou "Reset JWT secret").

Dashboard confirma com modal: aceite. **Atenção:** isto invalida TODOS os JWTs (anon + qualquer service tokens). Service_role key permanece, mas com novo secret de assinatura.

Expected: Dashboard regenera as keys. Nova `anon (public)` key aparece na tela.

- [ ] **Step 4: Copiar nova anon key**

Botão "Copy" ao lado de `anon (public)`. Salvar temporariamente em editor local (não commit ainda).

- [ ] **Step 5: Verificar que key antiga não funciona mais**

Via curl (use o terminal, key antiga e key nova lado a lado):

```bash
curl -s "https://hhtxaeauuutmuwwkotgf.supabase.co/rest/v1/pessoas?select=id&limit=1" \
  -H "apikey: <ANON_KEY_ANTIGA>"
```

Expected: `{"message":"Invalid API key"}` ou erro 401. Confirma rotação efetiva.

---

## Task 4: Restringir origens permitidas no Supabase

**Files:**
- Nenhum no repo (ação no dashboard)

- [ ] **Step 1: Acessar URL Configuration**

Dashboard → Authentication → URL Configuration

- [ ] **Step 2: Adicionar Site URL e Redirect URLs**

Site URL: URL de produção (ex: `https://presenca.vercel.app` ou domínio customizado).

Em "Additional Redirect URLs" adicionar:
- `http://localhost:5173/**` (dev)
- `http://localhost:3000/**` (dev alternativo)
- URL de preview Vercel se aplicável: `https://*-<team>.vercel.app/**`

Expected: configuração salva. Restringe redirects de auth, mas anon REST API permanece acessível de qualquer origem (limitação Supabase free tier — CORS não bloqueia anon REST sem custom Postgres function).

**Nota:** restrição real do CORS para REST anon exige Pro plan ou edge function proxy. Aceito como limitação Plan 1; resolvido no Plan 2 quando auth obriga JWT user-scoped.

---

## Task 5: Atualizar `supabase-config.js` com nova key

**Files:**
- Modify: `js/supabase-config.js:4`

- [ ] **Step 1: Editar arquivo com nova key**

Substituir o valor de `SUPABASE_ANON_KEY` pela nova key copiada na Task 3. URL permanece igual.

Após edit, o conteúdo deve ser:

```javascript
// Supabase client setup
const SUPABASE_URL = 'https://hhtxaeauuutmuwwkotgf.supabase.co';
const SUPABASE_ANON_KEY = '<NOVA_KEY_AQUI>';

let supabase = null;

export async function getSupabase() {
  if (supabase) return supabase;
  const { createClient } = await import(
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
  );
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

export function isConfigured() {
  return !SUPABASE_URL.includes('YOUR_PROJECT_ID');
}
```

- [ ] **Step 2: Bump SW cache version pra forçar refresh nos clients**

Arquivo `sw.js`, linha 1:

```javascript
const CACHE_NAME = 'presenca-v27';
```

(Bumpar de v26 → v27. Garante que clients PWA peguem o novo `supabase-config.js`.)

---

## Task 6: Smoke test local

**Files:**
- Nenhum modificado

- [ ] **Step 1: Servir app localmente**

```bash
cd c:/projects/presenca
npx serve -p 5173 .
```

Expected: servidor rodando em `http://localhost:5173`.

- [ ] **Step 2: Abrir DevTools e fazer ações básicas**

Browser → `http://localhost:5173` → DevTools → Console + Network.

Ações a executar:
1. Trocar aba (Cadastro / Chamada / Histórico / Ranking / Estoque / Pedidos)
2. Cadastrar uma pessoa de teste
3. Marcar presença
4. Deletar a pessoa de teste

Validações:
- Network requests pra `*.supabase.co` retornam 200/201 (não 401)
- Console sem erros
- IndexedDB atualiza (Application → Storage → IndexedDB → presenca-db)

Se algo der 401: nova key não foi propagada corretamente. Verificar `supabase-config.js`.

- [ ] **Step 3: Sem commit nesta task** (só testar)

---

## Task 7: Commitar e fazer push

**Files:**
- Modify: `js/supabase-config.js`
- Modify: `sw.js`

- [ ] **Step 1: Stage e commit**

```bash
git add js/supabase-config.js sw.js
git commit -m "fix(security): rotate Supabase anon key after potential exposure

JWT secret rotated via Supabase dashboard, invalidating prior anon key
present in git history. New key applied to client config. SW cache
version bumped to force refresh on existing PWA installs."
```

- [ ] **Step 2: Push para `main`**

```bash
git push origin main
```

Expected: Vercel inicia deploy automático em `main`.

---

## Task 8: Verificar deploy produção

**Files:**
- Nenhum modificado

- [ ] **Step 1: Aguardar Vercel deploy**

Acompanhar em https://vercel.com/<team>/presenca/deployments (substituir `<team>`).

Expected: Deploy verde em ~1-2min.

- [ ] **Step 2: Hard reload da app em produção**

URL produção → Ctrl+Shift+R (força bypass do SW cache).

Validações idênticas à Task 6 (cadastro/chamada/delete + Network 200).

- [ ] **Step 3: Verificar SW atualizado**

DevTools → Application → Service Workers. Esperado: `presenca-v27` ativo. Se mostrar v26, clicar "Update" e "skipWaiting" e recarregar.

- [ ] **Step 4: Smoke remoto via curl**

```bash
curl -s "https://hhtxaeauuutmuwwkotgf.supabase.co/rest/v1/pessoas?select=id&limit=1" \
  -H "apikey: <NOVA_ANON_KEY>" | head -c 200
```

Expected: array JSON com 1 registro (ou `[]` se vazio).

---

## Task 9: Documentar incidente

**Files:**
- Create: `docs/security/2026-05-15-anon-key-rotation.md`

- [ ] **Step 1: Criar entry de incidente**

Conteúdo:

```markdown
# Incidente: Rotação de anon key Supabase

**Data:** 2026-05-15
**Severidade:** Médio (anon key é pública por design, mas combinada com RLS `USING (true)` permitia leitura/escrita total)
**Trigger:** Auditoria pré-refactor para LGPD/security identificou que `js/supabase-config.js` continha anon key versionada no git desde 2024-04-10.

## Impacto

- Anon key estava acessível via histórico do git público
- RLS no Supabase configurado com `USING (true)` para todas as tabelas
- Combinação permitia leitura/escrita irrestrita por qualquer um com a key

## Ação corretiva (Plan 1)

1. JWT secret rotacionado via Supabase Dashboard
2. Nova anon key aplicada no client (`js/supabase-config.js`)
3. SW cache bumpado pra v27 forçando refresh dos PWAs
4. URL Configuration atualizada com Site URL produção
5. Tag `v-legacy-pre-rotation` criada para rollback

## Limitações remanescentes

- Anon REST API continua acessível de qualquer origem (limitação Supabase free, sem CORS restritivo nativo)
- RLS continua `USING (true)` até Plan 2 implementar auth + RBAC
- Histórico git ainda contém a key antiga (já invalidada, sem valor)

## Ação preventiva (Plan 2)

- Auth obrigatório com Supabase Auth
- RLS por papel (admin/operador) substitui `USING (true)`
- Anon key passa a exigir JWT válido pra qualquer operação

## Verificação

- ✅ Key antiga retorna 401 em requests
- ✅ Nova key autentica REST API
- ✅ App em produção funciona normalmente
```

- [ ] **Step 2: Commit doc do incidente**

```bash
git add docs/security/2026-05-15-anon-key-rotation.md
git commit -m "docs(security): document anon key rotation incident"
git push origin main
```

---

## Definition of Done

- [x] JWT secret rotacionado no Supabase
- [x] Key antiga retorna 401
- [x] Nova key em `js/supabase-config.js`
- [x] SW bumpado pra v27
- [x] Smoke local OK
- [x] Smoke produção OK
- [x] Tag `v-legacy-pre-rotation` criada
- [x] Incidente documentado em `docs/security/`
- [x] Push `main` ok, Vercel deploy verde

## Rollback se algo quebrar

Se nova key não funcionar ou app der erro:

```bash
git revert <commit-hash-do-step-7>
git push origin main
```

Vercel re-deploya com key antiga. **Mas:** key antiga foi invalidada pelo JWT reset. Para rollback real: re-rotacionar JWT (novo reset) e atualizar `supabase-config.js` com a key resultante.

Cenário mais seguro: testar bem no local (Task 6) antes do push.

## Itens da Fase 0 deferidos para Plan 2

Spec da Fase 0 (linha "Aplicar RLS restritivo provisório") propôs restringir policies durante a janela do refactor. **Deferido por incompatibilidade técnica:**

- App vanilla atual não tem auth → `auth.uid()` em qualquer policy retorna NULL
- Policy `USING (auth.uid() IS NOT NULL)` bloquearia 100% das operações → app quebra
- Policy read-only no anon role bloquearia cadastro/chamada → app quebra
- Soluções intermediárias (Origin check via header em Postgres function) são frágeis e não nativas

**Mitigação real veio com rotação da key.** Hardening completo de RLS chega no Plan 2 quando auth está no lugar e cada request carrega JWT user-scoped.

Aceito risco residual: anon key nova ainda permite full CRUD via RLS `USING (true)`, mas:
- Key não está mais em git (foi rotacionada, antiga inválida)
- Janela curta até Plan 2 (semanas, não meses)
- Sem auth atual, qualquer endurecimento quebra app em produção

## Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Nova key digitada errada → app quebra | Baixa | Copy/paste direto do dashboard; Task 6 smoke local antes do push |
| SW antigo continua servindo `supabase-config.js` cacheado | Média | Bump CACHE_NAME força refresh; usuários podem precisar hard reload |
| Algum integration externo usava anon key antiga | Baixa (app não tem integrações externas) | N/A |
| Reset JWT desloga alguém | N/A (sem auth atual) | N/A |
