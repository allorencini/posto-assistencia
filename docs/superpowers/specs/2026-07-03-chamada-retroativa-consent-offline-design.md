# Design: Chamada retroativa + Consentimento LGPD offline-friendly

**Data:** 2026-07-03
**Status:** Aprovado

## Contexto

Duas dores operacionais no uso real do app no Posto (internet ruim no local):

1. **Chamada retroativa** — sábados em que a chamada não foi marcada no dia precisam ser registrados depois. Hoje a aba Chamada trabalha exclusivamente com a data de hoje (`todayISO()` hardcoded em `chamada-page.tsx`). O Histórico permite *editar* presenças de uma chamada existente (`ChamadaEditDialog`, admin), mas não existe caminho para *criar* uma chamada de data passada.

2. **Consentimento LGPD travando o cadastro** — o fluxo atual (botão "Capturar consentimento" → `ConsentModal`) depende de rede no caminho crítico: `useActiveConsentTerm()` busca o termo direto do Supabase a cada abertura, com cache apenas em memória (react-query). Com internet ruim, o modal fica em "Carregando termo..." indefinidamente e o cadastro não pode ser salvo (zod exige `consent_declarado === true`). A *gravação* do consent já é offline-first (fila `sync_queue`, commit `9e29f77`) — o gargalo é só o fetch do texto do termo.

## Decisões de produto

- Seletor de data na aba Chamada disponível para **todos os operadores** (não só admin), com sinalização visual forte para data ≠ hoje.
- Consent vira **checkbox inline** no formulário de cadastro (um toque), com termo expansível para leitura ao titular. Modal eliminado.

---

## Feature 1 — Chamada retroativa (seletor de data na aba Chamada)

### UX

- `ChamadaPage` ganha estado `selectedDate`, default = hoje. Input `type="date"` com `max = hoje` no cabeçalho da página.
- Quando `selectedDate !== hoje`: banner âmbar destacado — "Chamada retroativa — {dia da semana} {DD/MM/AAAA}" — acima da lista.
- Ao montar a página, sempre inicia em hoje. A seleção não persiste entre navegações.
- Datas futuras bloqueadas pelo `max` do input.

### Comportamento

- Toda referência a `today` na página passa a usar `selectedDate`:
  - chamada existente: `chamadas.find(c => c.data === selectedDate)`;
  - criação lazy no primeiro toggle: `getOrCreate.mutateAsync(selectedDate)`;
  - faixa histórica P/F (últimas 4 chamadas) relativa à data selecionada: `c.data < selectedDate`;
  - ordenação "sem presença recente vai pro fim" idem (deriva da faixa histórica).
- Trocar a data zera `chamadaId` local e o `creatingRef` (promise de criação em voo não pode vazar para outra data).
- Presenças marcadas em data retroativa seguem o mesmo caminho offline-first de hoje: Dexie + `sync_queue`.

### Sync — endurecimento contra corrida de ID (crítico)

**Risco identificado:** o push de `chamadas` usa `upsert onConflict: 'data'`. Se um device cria localmente uma chamada para a data D com UUID novo, mas o servidor já tem uma chamada para D (criada por outro device e ainda não puxada), o upsert tenta reescrever o PK `id` da linha existente. Com presenças já apontando para o id antigo, o update viola FK → o item falha 5 vezes → `runSync` descarta o item como órfão (`MAX_ATTEMPTS`) → **perda silenciosa da chamada e das presenças retroativas**. Datas passadas têm probabilidade maior de já existirem no servidor, então o retro amplia essa janela.

**Mitigação — lookup server-first no get-or-create:**

`useGetOrCreateChamada`, antes de criar chamada nova para a data D:

1. Dedupe/lookup local (comportamento atual, intacto): achou no Dexie → retorna.
2. **Novo passo:** se `navigator.onLine`, consulta o servidor — `select id, data, criado_em from chamadas where data = D limit 1`:
   - achou → `db.chamadas.put(row)` e retorna o registro do servidor (id canônico reutilizado; nada enfileirado);
   - não achou, ou query falhou (timeout/rede instável) → segue para o passo 3 sem bloquear.
3. Cria local com UUID novo + enfileira na `sync_queue` (comportamento atual, intacto).

- Online → corrida eliminada de forma determinística.
- Offline → comportamento idêntico ao atual; corrida residual só se dois devices offline criarem a mesma data retroativa (aceito — janela mínima, mesmo perfil da corrida já existente para a chamada de hoje).
- A consulta ao servidor deve ter timeout curto (falha rápida ≠ travar o primeiro toggle); em caso de erro, degrada para criação local.
- `onConflict: 'data'` permanece como rede de segurança final no push.

Sem mudança de schema (local ou servidor).

---

## Feature 2 — Consentimento LGPD offline (checkbox inline + cache do termo)

### Cache local do termo

- Nova tabela Dexie `consent_terms` (store `'id'`) — bump da versão do banco local (v1 → v2). Dexie migra stores aditivos automaticamente.
- Nova função de cache (ex.: `refreshConsentTermCache()` em `lib/`): busca o termo ativo no Supabase (`ativo = true`, mais recente) e faz `put` no Dexie. Fire-and-forget, erros silenciosos (log apenas).
- Disparo: na inicialização do app autenticado (login/boot) e no evento `online`. Fora do pull genérico do `sync.ts` (dado de referência read-only; shape e cadência diferentes).
- `useActiveConsentTerm` reescrito: lê do Dexie primeiro (resposta imediata, funciona offline); dispara refresh em background quando online (stale-while-revalidate manual). Estados possíveis: `term` (cacheado), `null` + carregando (primeiro uso online), `null` definitivo (nunca sincronizou e offline).

### UX no formulário (`PessoaForm`, só cadastro novo)

- Remove o botão "Capturar consentimento LGPD" e o `ConsentModal`.
- No lugar, seção inline:
  - Checkbox: "Li o termo ao titular dos dados e ele(a) consentiu verbalmente com o tratamento." — bound a `consent_declarado` (react-hook-form `Controller`).
  - Link/toggle "Ver termo (v{versao})" — expande o texto do termo ali mesmo (collapsible), para leitura ao titular.
- Validação zod intocada: `consent_declarado.refine(v => v === true)` continua bloqueando submit sem consent.
- No submit de pessoa nova: consent enfileirado via `useRegisterConsent` com `consent_term_id` = id do termo cacheado (trilha LGPD preservada; FK NOT NULL no servidor exige o id).
- **Edge — sem termo disponível** (device nunca conectou + offline): checkbox desabilitado + aviso "Termo de consentimento indisponível — conecte à internet uma vez para baixá-lo". Cadastro segue bloqueado nesse caso raro; após a primeira conexão o problema não volta.
- Workarounds de dialog aninhado no `PessoaForm` (`onPointerDownOutside`/`onInteractOutside`, commit `d8c7eda`) removidos junto com o modal — código morto.
- `ConsentModal.tsx` e `use-consent-term.ts` (versão fetch-only) deletados/substituídos.

### Fluxo de edição

- Pessoa existente: seção de consent continua não aparecendo (comportamento atual, `!pessoaId`).

---

## Fora de escopo

- Botão de chamada retroativa no Histórico (opção B) — descartado; a opção A cobre o fluxo.
- Restrição de datas a sábados — qualquer data passada é válida (eventos especiais existem).
- Backfill/consentimento pendente para device offline sem termo cacheado — complexidade não justificada pela raridade.
- Mudanças no schema do servidor.

## Testes

- **Feature 1:**
  - Unit (`use-chamada`): get-or-create com lookup server-first — acha no servidor → reusa id, nada enfileirado; offline/erro → cria local + enfileira; dedupe local intacto.
  - Unit/component (`chamada-page`): troca de data reseta `chamadaId`/`creatingRef`; banner aparece quando data ≠ hoje; faixa histórica relativa à data selecionada.
- **Feature 2:**
  - Unit (`refreshConsentTermCache` + hook): popula Dexie online; hook retorna termo do cache offline; estado "indisponível" quando cache vazio + offline.
  - Component (`pessoa-form`): checkbox habilitado com termo cacheado; submit registra consent com term id do cache; checkbox desabilitado + aviso sem termo; zod bloqueia submit sem check.
- E2E existentes: revisar os que passam pelo fluxo de consent (modal não existe mais).

## Riscos

| Risco | Mitigação |
|---|---|
| Operador marca presença em data errada sem perceber | Banner âmbar + reset para hoje ao montar a página |
| Corrida de ID chamada retroativa (2 devices) | Lookup server-first quando online; residual offline aceito |
| Termo desatualizado no cache (admin publica v nova) | Refresh em background no boot + `online`; janela de staleness curta e aceitável (termo muda raramente) |
| Device novo usado 100% offline no primeiro cadastro | Checkbox desabilitado com aviso claro; caso raro |
