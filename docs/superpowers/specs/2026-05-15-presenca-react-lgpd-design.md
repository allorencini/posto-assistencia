# Presença — Refactor React + LGPD + Security Design

**Data:** 2026-05-15
**Branch:** `refactor/react-lgpd`
**Status:** Spec aprovado, aguardando review final do usuário antes de plano de implementação

## Goal

Reescrever o PWA Presença (vanilla JS + IndexedDB + Supabase) em React mantendo offline-first, adicionando autenticação multiusuário com RBAC (Admin + Operador), compliance com LGPD (consentimento, retenção, audit trail, direitos do titular) e hardening de segurança (RLS restritivo, headers HTTP, secrets via Vercel env, idle timeout).

## Não-objetivos

- Reescrever lógica de negócio (chamada, ranking, cestas, pedidos) — preservar comportamento atual
- Migrar dados históricos pra novo modelo (mantém schema compatível)
- Criptografar IndexedDB local (decidido: só limpar no logout/idle)
- Multi-tenant (1 igreja por deploy)

## Decisões coletadas no brainstorming

| Tópico | Decisão | Motivo |
|---|---|---|
| Papéis | Admin + Operador | RBAC simples, atende LGPD com menor privilégio |
| Offline | Offline-first mantido | WiFi instável em igreja, comportamento atual valorizado |
| Stack frontend | Vite 6 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + TanStack Query v5 + Zustand + React Router v7 + Dexie v4 + RHF + Zod + Vitest + Playwright + Biome | Encaixe natural offline-first, melhor DX, tipos compartilhados |
| Auth | Supabase Auth email + senha, admin reseta manualmente | Familiar, sem custo SMS, controle pelo admin |
| Consent | Voluntário declara verbal + checkbox + log versionado | Art. 7 §6 LGPD, baixo atrito UX |
| Retenção | Anonimizar após 5 anos sem atividade (cron mensal) | Prazo prescricional civil, mantém estatística |
| Audit | Só mutações (INSERT/UPDATE/DELETE) | Atende Art. 37 sem inchar tabela |
| Storage local | IndexedDB em claro, limpa no logout + idle 15min | Simplicidade UX, trade-off aceito |
| Migração | Branch nova, big bang, Vercel preview valida | Tamanho do projeto justifica |
| Hosting | Vercel (atual) | Já configurado, preview URLs, env vars |

## Arquitetura geral

```
┌─────────────────────────────────────────┐
│  Vercel (static hosting)                │
│  React SPA (Vite build) + Service Worker│
│  Rotas:                                 │
│   /login   /privacidade (públicas)      │
│   /chamada /cadastro /historico         │
│   /ranking /estoque /pedidos            │
│   /admin/* (admin only)                 │
└─────────────────────────────────────────┘
                  │ HTTPS, anon key + JWT
                  ▼
┌─────────────────────────────────────────┐
│  Supabase                               │
│  ├─ Postgres (schema + RLS por papel)  │
│  ├─ Auth (email+senha, no self-reset)   │
│  └─ Edge Functions (Deno):              │
│     ├─ anonymize-inactive (cron mensal) │
│     ├─ admin-create-user                │
│     ├─ admin-reset-password             │
│     └─ export-pessoa-lgpd               │
└─────────────────────────────────────────┘
```

### Princípio de isolamento

- Cada `features/<x>/` autônoma. Importa só de `lib/`, `hooks/`, `components/`. Nunca de outra feature.
- `lib/` = primitivas (supabase, db, sync, audit, consent, idle). Não importa de `features/`.
- Schemas Zod compartilhados client+server (mesma fonte).
- Tipos Postgres regenerados via `supabase gen types` → `src/types/supabase.ts`.

## Estrutura de arquivos

```
presenca/
├─ .env.example                    # docs vars públicas
├─ biome.json                      # lint+format único
├─ index.html
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
├─ vite.config.ts                  # PWA plugin + bundle config
├─ vercel.json                     # headers CSP + rewrites SPA
├─ manifest.json
├─ public/
│  ├─ icons/                       # 192, 512, maskable
│  └─ sw.js                        # gerado por vite-plugin-pwa
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ LGPD.md                      # política, RPO, DPO, base legal
│  ├─ DEPLOY.md
│  └─ superpowers/
│     └─ specs/2026-05-15-presenca-react-lgpd-design.md
├─ supabase/
│  ├─ migrations/                  # incrementais
│  │  ├─ 001_init.sql
│  │  ├─ 002_app_users_rbac.sql
│  │  ├─ 003_consent_audit.sql
│  │  ├─ 004_lgpd_requests.sql
│  │  ├─ 005_anonimizacao.sql
│  │  └─ 006_rls_policies.sql
│  └─ functions/
│     ├─ anonymize-inactive/index.ts
│     ├─ admin-create-user/index.ts
│     ├─ admin-reset-password/index.ts
│     └─ export-pessoa-lgpd/index.ts
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ app/
│  │  ├─ providers.tsx             # QueryClient + Auth + Theme
│  │  ├─ router.tsx                # rotas
│  │  └─ shell.tsx                 # layout shell (bottom-nav, idle, sync indicator)
│  ├─ features/
│  │  ├─ auth/
│  │  │  ├─ login.tsx
│  │  │  ├─ useAuth.ts             # store Zustand + Supabase
│  │  │  ├─ require-role.tsx
│  │  │  └─ idle-timeout.ts
│  │  ├─ chamada/
│  │  ├─ cadastro/
│  │  │  ├─ pessoa-form.tsx
│  │  │  ├─ consent-modal.tsx
│  │  │  ├─ familia-form.tsx
│  │  │  └─ item-form.tsx
│  │  ├─ historico/
│  │  ├─ ranking/
│  │  ├─ estoque/
│  │  ├─ pedidos/
│  │  └─ admin/
│  │     ├─ users/
│  │     ├─ audit/
│  │     ├─ lgpd/
│  │     └─ consent-terms/
│  ├─ lib/
│  │  ├─ supabase.ts
│  │  ├─ db.ts                     # Dexie schema
│  │  ├─ sync.ts                   # queue + push/pull
│  │  ├─ audit.ts
│  │  ├─ consent.ts
│  │  ├─ idle.ts
│  │  ├─ format.ts
│  │  └─ env.ts                    # validate env on boot
│  ├─ components/
│  │  ├─ ui/                       # shadcn/ui gerado
│  │  ├─ search-input.tsx          # static-input DOM-filter
│  │  ├─ filter-pills.tsx
│  │  ├─ empty-state.tsx
│  │  ├─ confirm-dialog.tsx
│  │  ├─ sync-status.tsx
│  │  └─ role-guard.tsx
│  ├─ hooks/
│  │  ├─ use-pessoas.ts
│  │  ├─ use-familias.ts
│  │  ├─ use-chamada.ts
│  │  ├─ use-presencas.ts
│  │  ├─ use-cestas.ts
│  │  ├─ use-itens.ts
│  │  ├─ use-pedidos.ts
│  │  ├─ use-audit-log.ts
│  │  └─ use-toast.ts
│  ├─ types/
│  │  ├─ supabase.ts               # gerado
│  │  └─ domain.ts
│  ├─ schemas/                     # Zod
│  │  ├─ pessoa.ts
│  │  ├─ familia.ts
│  │  ├─ item.ts
│  │  ├─ pedido.ts
│  │  └─ user.ts
│  └─ styles/globals.css
└─ tests/
   ├─ e2e/                         # Playwright
   └─ unit/                        # Vitest
```

## Auth & RBAC

### Schema `app_users`

```sql
CREATE TABLE app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('admin', 'operador')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por UUID REFERENCES app_users(id),
  ultimo_login_em TIMESTAMPTZ
);
```

### Permissões por papel

| Aba/Operação | Admin | Operador |
|---|---|---|
| Chamada | ✅ | ✅ |
| Cadastro pessoas (campos básicos: nome, grupo, telefone, família) | ✅ | ✅ |
| Endereço completo + `visita_obs` + `apta_cesta` | ✅ | ❌ (mascarado) |
| Famílias CRUD | ✅ | ✅ |
| Estoque CRUD | ✅ | ✅ |
| Cestas entregar | ✅ | ✅ |
| Pedidos CRUD | ✅ | ✅ |
| Histórico ler | ✅ | ✅ |
| Histórico editar (alterar presença de datas passadas, deletar chamada) | ✅ | ❌ |

Definição: "Histórico editar" = mudar `presente=true/false` em `presencas` de chamadas com `data < CURRENT_DATE` OU deletar uma chamada inteira. Operador só pode editar presença da chamada do dia (`data = CURRENT_DATE`).

RLS enforça via:

```sql
CREATE POLICY presencas_operador_update_today_only ON presencas FOR UPDATE TO authenticated
  USING (
    (SELECT papel FROM app_users WHERE id = auth.uid()) = 'admin'
    OR (
      (SELECT papel FROM app_users WHERE id = auth.uid()) = 'operador'
      AND (SELECT data FROM chamadas WHERE id = chamada_id) = CURRENT_DATE
    )
  );
```
| Ranking | ✅ | ✅ |
| Gestão usuários | ✅ | ❌ |
| Audit log | ✅ | ❌ |
| Export/anonimizar pessoa | ✅ | ❌ |

### Enforcement em 2 camadas

1. **Cliente** (React): `<RequireRole role="admin">` wrapper, botões escondidos. UX.
2. **Server** (Postgres RLS): policy checa `(SELECT papel FROM app_users WHERE id = auth.uid())`. Source of truth.

### View pra mascarar campos sensíveis

```sql
CREATE VIEW pessoas_operador AS
  SELECT id, nome, grupo, familia_id, telefone, ativo, excluir_ranking,
         criado_em, atualizado_em
  FROM pessoas;
-- Endereço, visita_obs, apta_cesta ficam fora.
```

Operador consome `pessoas_operador`. Admin consome `pessoas` direto.

### Login flow

1. Email + senha
2. Supabase retorna JWT
3. App busca `app_users.papel`, armazena em Zustand
4. Sem self-service "esqueci senha". Admin reseta via Edge Function

### Idle timeout

- 15min sem interação → logout automático + clear IndexedDB
- Modal aviso aos 13min: "você será desconectado em 2min [continuar]"

### Primeira instalação

Migration cria primeiro admin via SQL seed manual (email do pastor, senha temporária). Pastor loga, troca senha, cria operadores.

## LGPD compliance

### Tabelas novas

```sql
-- Termo de consentimento versionado
CREATE TABLE consent_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  versao TEXT NOT NULL UNIQUE,
  texto TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por UUID REFERENCES app_users(id)
);

-- Registro do consentimento por pessoa
CREATE TABLE pessoa_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  consent_term_id UUID NOT NULL REFERENCES consent_terms(id),
  declarado_por UUID NOT NULL REFERENCES app_users(id),
  metodo TEXT NOT NULL DEFAULT 'verbal',
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revogado_em TIMESTAMPTZ,
  revogado_por UUID REFERENCES app_users(id)
);

-- Audit trail (Art. 37)
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  tabela TEXT NOT NULL,
  registro_id UUID NOT NULL,
  operacao TEXT NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE','ANONIMIZAR','EXPORT')),
  usuario_id UUID REFERENCES app_users(id),
  diff JSONB,
  ip TEXT,
  user_agent TEXT,
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_registro ON audit_log(tabela, registro_id);
CREATE INDEX idx_audit_usuario ON audit_log(usuario_id, ocorrido_em DESC);
CREATE INDEX idx_audit_ocorrido ON audit_log(ocorrido_em DESC);

-- Direitos do titular (Art. 18)
CREATE TABLE lgpd_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES pessoas(id) ON DELETE SET NULL,
  pessoa_nome_snapshot TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('confirmacao','acesso','correcao','anonimizacao','eliminacao','portabilidade','revogacao')),
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','concluido','rejeitado')),
  solicitado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  solicitado_por UUID REFERENCES app_users(id),
  concluido_em TIMESTAMPTZ,
  concluido_por UUID REFERENCES app_users(id),
  observacao TEXT,
  resultado_arquivo TEXT
);

-- Coluna nova em pessoas
ALTER TABLE pessoas ADD COLUMN anonimizado_em TIMESTAMPTZ;
ALTER TABLE pessoas ADD COLUMN anonimizado_por UUID REFERENCES app_users(id);
```

### Audit trigger automático

```sql
CREATE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log(tabela, registro_id, operacao, usuario_id, diff, ip)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE TG_OP
      WHEN 'INSERT' THEN jsonb_build_object('depois', row_to_json(NEW))
      WHEN 'UPDATE' THEN jsonb_build_object('antes', row_to_json(OLD), 'depois', row_to_json(NEW))
      WHEN 'DELETE' THEN jsonb_build_object('antes', row_to_json(OLD))
    END,
    current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER pessoas_audit AFTER INSERT OR UPDATE OR DELETE ON pessoas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
-- idem familias, presencas, cestas, pedidos, app_users
```

### Anonimização

Edge Function `anonymize-inactive` agendada via cron mensal:

```typescript
const cutoff = subYears(new Date(), 5);
const inactives = await sql`
  SELECT p.id FROM pessoas p
  WHERE p.atualizado_em < ${cutoff}
    AND p.anonimizado_em IS NULL
    AND NOT EXISTS (SELECT 1 FROM presencas WHERE pessoa_id = p.id AND atualizado_em >= ${cutoff})
    AND NOT EXISTS (SELECT 1 FROM cestas WHERE pessoa_id = p.id AND atualizado_em >= ${cutoff})
    AND NOT EXISTS (SELECT 1 FROM pedidos WHERE pessoa_id = p.id AND atualizado_em >= ${cutoff})
`;

for (const { id } of inactives) {
  await sql`
    UPDATE pessoas SET
      nome = 'ANONIMIZADO',
      telefone = NULL, rua = NULL, numero = NULL, complemento = NULL,
      bairro = NULL, cep = NULL, visita_obs = NULL, apta_cesta = NULL,
      anonimizado_em = NOW()
    WHERE id = ${id}
  `;
}
```

### Painel `/admin/lgpd`

Busca pessoa por nome/telefone, ações:

- Confirmar existência
- Exportar dados (JSON) → audita EXPORT, abre `lgpd_request`
- Corrigir dados
- Anonimizar agora (confirmação dupla)
- Revogar consentimento
- Ver histórico (audit_log filtrado por registro_id)

### Política de privacidade

Rota `/privacidade` (sem auth), markdown estático. Sumário: controlador, finalidade, dado tratado, base legal, retenção, direitos, DPO.

DPO via env: `VITE_DPO_NOME`, `VITE_DPO_EMAIL`.

## Security hardening

### Secrets

```
Vercel env (build-time, públicos por design):
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY
  VITE_DPO_NOME
  VITE_DPO_EMAIL
  VITE_APP_VERSION

Supabase env (server-only):
  SUPABASE_SERVICE_ROLE_KEY    # Edge Functions
  SMTP_PASSWORD                # Auth

Local dev (.env.local, .gitignored):
  VITE_SUPABASE_URL=...
  VITE_SUPABASE_ANON_KEY=...
```

### Headers HTTP (`vercel.json`)

```json
{
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
      { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'" }
    ]}
  ]
}
```

### RLS policies (substituem `USING (true)`)

```sql
-- Admin: tudo em pessoas
CREATE POLICY pessoas_admin_all ON pessoas FOR ALL TO authenticated
  USING ((SELECT papel FROM app_users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT papel FROM app_users WHERE id = auth.uid()) = 'admin');

-- Operador: insert sem campos sensíveis
CREATE POLICY pessoas_operador_insert ON pessoas FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT papel FROM app_users WHERE id = auth.uid()) = 'operador'
    AND visita_obs IS NULL AND apta_cesta IS NULL
  );

-- Operador: update via BEFORE UPDATE trigger que reverte campos protegidos
CREATE FUNCTION enforce_operador_fields() RETURNS TRIGGER AS $$
DECLARE
  papel_user TEXT;
BEGIN
  SELECT papel INTO papel_user FROM app_users WHERE id = auth.uid();
  IF papel_user = 'operador' THEN
    NEW.visita_obs := OLD.visita_obs;
    NEW.apta_cesta := OLD.apta_cesta;
    NEW.visitada := OLD.visitada;
    NEW.rua := OLD.rua;
    NEW.numero := OLD.numero;
    NEW.complemento := OLD.complemento;
    NEW.bairro := OLD.bairro;
    NEW.cep := OLD.cep;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER pessoas_enforce_fields BEFORE UPDATE ON pessoas
  FOR EACH ROW EXECUTE FUNCTION enforce_operador_fields();

-- audit_log: SELECT só admin, INSERT só via trigger
CREATE POLICY audit_select_admin ON audit_log FOR SELECT TO authenticated
  USING ((SELECT papel FROM app_users WHERE id = auth.uid()) = 'admin');

-- app_users
CREATE POLICY app_users_admin_all ON app_users FOR ALL TO authenticated
  USING ((SELECT papel FROM app_users WHERE id = auth.uid()) = 'admin');
CREATE POLICY app_users_self_read ON app_users FOR SELECT TO authenticated
  USING (id = auth.uid());
```

### Validação input

Zod em todas as forms (RHF + server). Schema compartilhado:

```typescript
export const PessoaSchema = z.object({
  nome: z.string().min(2).max(200).transform(s => s.trim().toUpperCase()),
  grupo: z.enum(['evangelizacao', 'mocidade', 'adulto', 'gestante']),
  telefone: z.string().regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/).optional().nullable(),
  cep: z.string().regex(/^\d{5}-?\d{3}$/).optional().nullable(),
});
```

### Rate limiting

- Supabase Auth: 5 falhas/min/IP nativo
- Edge Functions admin: `@upstash/ratelimit` free tier, 10 req/min por user

### CI security

- Biome lint (substitui ESLint+Prettier)
- `pnpm audit --audit-level=high` fail no CI
- Renovate bot auto-PRs
- Lockfile commitado obrigatório

### Logout completo

```typescript
async function logout() {
  await supabase.auth.signOut();
  await db.delete();
  sessionStorage.clear();
  localStorage.clear();
  await Promise.all((await caches.keys()).map(k => caches.delete(k)));
  window.location.href = '/login';
}
```

### Idle detection

- Listeners: `mousemove`, `keydown`, `touchstart`, `visibilitychange`
- Debounce 1s, reset timer
- 13min: modal aviso
- 15min: logout()

## Data layer (offline-first + auth)

### Dexie schema (`src/lib/db.ts`)

```typescript
import Dexie, { Table } from 'dexie';

export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: 'upsert' | 'delete';
  data: any;
  user_id: string;
  attempts: number;
  last_error?: string;
  attempted_at?: number;
  timestamp: number;
}

export class PresencaDB extends Dexie {
  pessoas!: Table<Pessoa, string>;
  familias!: Table<any, string>;
  chamadas!: Table<any, string>;
  presencas!: Table<Presenca, string>;
  cestas!: Table<any, string>;
  itens!: Table<any, string>;
  pedidos!: Table<any, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super('presenca-db');
    this.version(1).stores({
      pessoas: 'id, grupo, ativo, familia_id, excluir_ranking',
      familias: 'id, ativo',
      chamadas: 'id, data',
      presencas: 'id, chamada_id, pessoa_id, [chamada_id+pessoa_id]',
      cestas: 'id, pessoa_id, data, ativo',
      itens: 'id, categoria, ativo',
      pedidos: 'id, pessoa_id, familia_id, status, ativo',
      sync_queue: '++id, timestamp, table',
    });
  }
}

export const db = new PresencaDB();
```

### TanStack Query setup

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      networkMode: 'offlineFirst',
      retry: (count, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return count < 3;
      },
    },
    mutations: { networkMode: 'offlineFirst', retry: false },
  },
});
```

### Sync engine (`src/lib/sync.ts`)

```typescript
let inProgress = false;
let debounceTimer: any;

export async function enqueueSync(item: Omit<SyncQueueItem, 'id' | 'attempts' | 'timestamp'>) {
  await db.sync_queue.add({ ...item, attempts: 0, timestamp: Date.now() });
  scheduleSync();
}

export function scheduleSync() {
  if (!navigator.onLine) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runSync, 500);
}

async function runSync() {
  if (inProgress || !navigator.onLine) return;
  inProgress = true;
  try {
    const queue = await db.sync_queue.orderBy('timestamp').toArray();
    for (const item of queue) {
      try {
        if (item.operation === 'delete') {
          const { error } = await supabase.from(item.table).delete().eq('id', item.data.id);
          if (error) throw error;
        } else {
          const onConflict = item.table === 'presencas' ? 'chamada_id,pessoa_id'
            : item.table === 'chamadas' ? 'data' : 'id';
          const { error } = await supabase.from(item.table).upsert(item.data, { onConflict });
          if (error) throw error;
        }
        await db.sync_queue.delete(item.id!);
      } catch (err: any) {
        await db.sync_queue.update(item.id!, {
          attempts: item.attempts + 1,
          last_error: err.message,
          attempted_at: Date.now(),
        });
      }
    }
    await pullChanges();
  } finally {
    inProgress = false;
  }
}

async function pullChanges() {
  const tables = ['familias', 'pessoas', 'chamadas', 'presencas', 'cestas', 'itens', 'pedidos'];
  for (const t of tables) {
    const { data } = await supabase.from(t).select('*');
    if (!data) continue;
    await db.transaction('rw', db[t as any], async () => {
      for (const row of data) {
        const local = await (db[t as any] as Table).get(row.id);
        const localTs = local?.atualizado_em ?? '';
        if (!local || row.atualizado_em >= localTs) {
          await (db[t as any] as Table).put(row);
        }
      }
    });
  }
}

window.addEventListener('online', scheduleSync);
setInterval(scheduleSync, 30_000);
```

### Conflict resolution

Last-write-wins via `atualizado_em` (mantém comportamento atual).

### Sync status indicator

`<SyncStatus />` no shell: ● verde (online, queue vazia), ● amarelo (sync em andamento), ● vermelho (offline + queue pendente), ● cinza (offline).

## Plano de migração (fases)

### Fase 0 — Hotfix em `main` antes do refactor

Crítico. Roda em `main` direto. Encerra exposição enquanto refactor anda.

1. Aplicar RLS restritivo provisório (read-only anon ou bloquear total durante janela curta)
2. Rotacionar anon key Supabase
3. Atualizar `supabase-config.js` em `main` com nova key
4. Deploy hotfix
5. **Resultado:** key vazada está invalidada

### Fase 1 — Scaffolding

1. `git checkout refactor/react-lgpd`
2. `pnpm create vite . --template react-ts` (workflow: scaffold em tmp, mergea)
3. Instalar deps: Tailwind v4, shadcn/ui init, TanStack Query, Zustand, React Router v7, Dexie, RHF, Zod, Vitest, Playwright, Biome, vite-plugin-pwa, supabase-js
4. `.env.example`, `vercel.json` headers CSP, `vite.config.ts` PWA
5. CI: GitHub Action — lint, typecheck, test, build
6. `tsconfig` strict mode
7. **Saída:** app vazio + login fake, preview Vercel ok

### Fase 2 — Supabase backend

1. Migrations: `app_users`, `consent_terms`, `pessoa_consents`, `audit_log`, `lgpd_requests`, coluna `anonimizado_em`
2. RLS policies novas
3. Triggers audit + enforce_operador_fields
4. View `pessoas_operador`
5. Edge Functions: admin-create-user, admin-reset-password, anonymize-inactive, export-pessoa-lgpd
6. Seed: 1 admin manual SQL
7. `pnpm supabase gen types`
8. **Saída:** backend completo deployado

### Fase 3 — Auth + shell

1. `lib/supabase.ts`, `lib/env.ts`
2. `features/auth/`: login, useAuth Zustand, RequireRole, idle-timeout
3. `app/router.tsx`: públicas + protegidas
4. `app/shell.tsx`: bottom-nav, sync-status, logout
5. `/privacidade` markdown
6. **Saída:** login + nav + logout funcionando

### Fase 4 — Data layer

1. `lib/db.ts`, `lib/sync.ts`, `hooks/use-*`
2. `components/sync-status.tsx`
3. **Saída:** infra pronta

### Fase 5 — Features migradas (1 PR cada)

5.1 Cadastro pessoas + consent modal
5.2 Cadastro famílias
5.3 Cadastro itens
5.4 Chamada
5.5 Histórico
5.6 Ranking
5.7 Estoque
5.8 Pedidos

### Fase 6 — Admin LGPD

1. `/admin/usuarios`
2. `/admin/audit`
3. `/admin/lgpd`
4. `/admin/termos`

### Fase 7 — Polimento

1. E2E happy path
2. Lighthouse PWA
3. CSP rigorosa
4. README + LGPD.md

### Fase 8 — Cutover

1. Backup banco prod
2. Migrations aplicadas
3. Preview validado pelo pastor
4. Merge → main
5. Vercel promove
6. SW novo invalida cache antigo (CACHE_NAME bump pra `presenca-v100-react`)
7. Comunicado voluntários com link login + senha temp
8. Tag `v-legacy-final` antes do merge

### Rollback plan

- Bug crítico → `git revert <merge>` → Vercel auto-deploy → vanilla volta
- Dados novos no React podem ficar órfãos no vanilla. SQL manual ou aceita perda 1-dia.

### Estimativa

| Fase | Esforço |
|---|---|
| 0 | 1h |
| 1 | 2h |
| 2 | 4h |
| 3 | 3h |
| 4 | 3h |
| 5 | 8h |
| 6 | 4h |
| 7 | 2h |
| 8 | 1h |
| **Total** | **~28h** |

## Tests

### Unit (Vitest)

- Hooks: mockam Dexie + Supabase, asserta efeito em store/queue
- Schemas Zod: edge cases (campos vazios, regex inválidos)
- Sync engine: queue, retry, conflict resolution

### E2E (Playwright)

- `login.spec.ts`: login admin → bottom-nav visível com /admin
- `login.spec.ts`: login operador → /admin escondido
- `chamada.spec.ts`: marcar presença, refletir contador
- `cadastro.spec.ts`: criar pessoa exige consent
- `admin-lgpd.spec.ts`: export gera arquivo, anonimizar zera PII e audita

### Manual (smoke pré-merge)

Checklist com pastor antes do cutover: login, criar pessoa, marcar presença, entregar cesta, criar pedido, anonimizar, ver audit.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Anon key vazada continua válida pós-refactor | Rotacionar na fase 0 |
| Operador acessa endpoint REST direto bypassando view | RLS server-side bloqueia, não confia em client |
| Audit trigger falha silenciosamente | Trigger é `SECURITY DEFINER`, INSERT obrigatório pra commit |
| User offline faz mutação, troca user, mutação aplica como user errado | Logout limpa queue + IndexedDB; queue carrega user_id mas mutação só pusha se user atual === user da mutação |
| Bug crítico pós-cutover | Tag legacy + revert merge + Vercel rollback (5min) |
| Mutações offline acumulam (operador sem WiFi 2h) | Queue persiste em IndexedDB, sync ao voltar; max attempts=5, depois mostra erro pro user |
| Migration incompatível com dados existentes | Migrations idempotentes (`IF NOT EXISTS`), backup antes |

## Open questions (fora do escopo deste design)

- Backup formal: Supabase Pro auto-backup OU exportar pg_dump semanal pra Storage? (Decidir antes da fase 8)
- DPO nominal: quem é? Pastor? Coordenador? (Definir antes de publicar /privacidade)
- Termo de consentimento v1: texto formal precisa de validação jurídica externa (recomendado contratar advogado pra revisar antes do go-live)
