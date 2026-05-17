# Design: Famílias — Vinculação, Presença e Cesta

**Data:** 2026-04-14
**Status:** Aprovado

---

## Contexto

O app controla presença e entrega de cestas básicas de um posto de assistência social. Muitas pessoas assistidas pertencem ao mesmo núcleo familiar (pai, mãe, filhos, gestante). O objetivo é:

1. Agrupar membros da mesma família
2. Calcular presença familiar (qualquer membro presente = família presente)
3. Exibir famílias e indivíduos no ranking de forma comparável
4. Registrar entrega de cesta pra família inteira de uma vez

---

## Modelo de Dados

### Nova tabela: `familias`
```sql
CREATE TABLE familias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Alteração em `pessoas`
```sql
ALTER TABLE pessoas ADD COLUMN familia_id UUID REFERENCES familias(id) ON DELETE SET NULL;
```

### IndexedDB
- Nova store `familias` com índices: `nome` (unique: false), `ativo`
- Sem alteração de versão necessária além do bump de `DB_VERSION`

---

## Funcionalidades

### 1. Cadastros — Nova aba "Famílias"

**Tab bar:** Pessoas | Itens | **Famílias**

**Lista de famílias:**
- Card com nome da família + lista de membros (nomes separados por vírgula)
- Botões ✏️ editar e 🗑️ excluir
- Botão "+ CADASTRAR FAMÍLIA"

**Formulário (modal):**
- Campo: Nome da família *
- Campo de busca: "Buscar pessoa..." — filtra pessoas cadastradas em tempo real
- Botão `+` adiciona pessoa à lista de membros
- Lista de membros adicionados com botão ✕ pra remover cada um
- Ao salvar: cria/atualiza registro em `familias`, atualiza `familia_id` nas pessoas adicionadas e limpa `familia_id` das removidas

**Card de pessoa no Cadastros:**
- Linha abaixo do nome mostra `👨‍👩‍👧 Família <nome>` se vinculada
- Ao editar pessoa: campo select "Família" (opcional) com opções das famílias cadastradas
- Ao excluir família: membros mantêm seus dados, `familia_id` passa a `null` (via `ON DELETE SET NULL`)

---

### 2. Ranking — Lista única mista

**Cálculo de presença familiar:**
- Para cada chamada no período, a família é considerada "presente" se **qualquer membro** estiver presente
- Percentual = chamadas com ao menos 1 membro presente / total de chamadas no período

**Renderização:**
- Famílias e indivíduos na mesma lista ordenada por % decrescente
- **Família:** card com borda amarela esquerda (`border-left: 3px solid var(--yellow)`) + ícone 👨‍👩‍👧 + nome + linha de membros abaixo + contador `🧺 N entregas`
- **Indivíduo sem família:** card padrão atual com ícone 👤

**Contador de cestas para família:**
- Conta **datas distintas** em que qualquer membro recebeu cesta (não soma de registros individuais)
- Ex: 3 membros receberam em 01/mar → conta como 1 entrega

**Botão "Entregar cesta família":**
- Cria um registro `cestas` para **cada membro** da família na data de hoje
- Após salvar, botão muda para "Entregue hoje" (disabled) para a família inteira
- **"Entregue hoje"** (disabled) é exibido se **qualquer membro** já tiver recebido cesta na data de hoje — verificado via `cestasInfo` no carregamento do ranking

---

### 3. Sync

- `familias` adicionada ao pull/push da fila de sync (`sync_queue`)
- Pull: incluir `familias` no loop de `pullChanges()` em `sync.js`
- Push: `upsert` com `onConflict: 'id'`

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `js/db.js` | Nova store `familias`, funções CRUD, bump `DB_VERSION` |
| `js/cadastro.js` | Nova aba Famílias, formulário, campo família no form de pessoa |
| `js/ranking.js` | Lógica de presença familiar, render misto, botão cesta família |
| `js/sync.js` | Incluir `familias` no pull |
| `supabase/schema.sql` | Tabela `familias`, coluna `familia_id` em `pessoas` |
| `supabase/migration-v5-familias.sql` | Novo arquivo de migration |
| `css/styles.css` | Estilos: card família (borda amarela), badge membros |
| `sw.js` | Bump cache v11 → v12 |

---

## Verificação

- Criar família "Silva" com 3 membros → aparece na aba Famílias e nos cards das pessoas
- Na chamada: marcar João Silva como presente → ranking mostra Família Silva com presença
- No ranking: Família Silva aparece com % calculado, misturado com indivíduos
- Clicar "Entregar cesta família" → cria 3 registros de cestas (1 por membro) → contador mostra "1 entrega"
- Próxima entrega na mesma data → não duplica (upsert por pessoa+data)
- Sync: famílias aparecem no Supabase após push
