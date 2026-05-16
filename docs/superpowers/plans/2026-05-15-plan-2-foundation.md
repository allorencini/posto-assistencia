# Plan 2 — Foundation (React + Supabase + Auth + Data Layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levantar app React vazio porém funcional na branch `refactor/react-lgpd` com Supabase backend completo (schemas + RLS + Edge Functions), auth com RBAC, shell de navegação, idle timeout e data layer offline-first com sync engine.

**Architecture:** Vite SPA com React 19 + TypeScript. Backend Supabase (Postgres + Auth + Edge Functions). Data layer: Dexie (IndexedDB) + TanStack Query + queue manual. State: Zustand. Forms: RHF + Zod. PWA via vite-plugin-pwa. Headers segurança e CSP via Vercel.

**Tech Stack:** Vite 6, React 19, TypeScript, Tailwind v4, shadcn/ui (Radix), TanStack Query v5, Zustand, React Router v7, Dexie v4, React Hook Form, Zod, Vitest, Playwright, Biome, vite-plugin-pwa, @supabase/supabase-js v2.

**Spec:** [docs/superpowers/specs/2026-05-15-presenca-react-lgpd-design.md](../specs/2026-05-15-presenca-react-lgpd-design.md) — Fases 1-4.

**Branch:** `refactor/react-lgpd`. Plan 1 (hotfix) já mergeado em `main` antes deste plan começar.

**Pré-requisito:** Plan 1 concluído. Nova anon key Supabase em mãos. Acesso owner ao Supabase project. Node 22+. pnpm 9+.

---

## Estrutura do plano

- **Phase A** (Tasks 1-10): Scaffolding Vite + deps + lint + CI
- **Phase B** (Tasks 11-22): Supabase backend (migrations + RLS + Edge Functions + seed)
- **Phase C** (Tasks 23-34): Auth + shell + routing + idle
- **Phase D** (Tasks 35-44): Data layer (Dexie + sync engine + hooks)
- **Phase E** (Tasks 45-46): Smoke test + handoff

---

## Phase A — Scaffolding

### Task 1: Confirmar branch e estado limpo

**Files:**
- Nenhum modificado

- [ ] **Step 1: Checkout branch**

```bash
cd c:/projects/presenca
git checkout refactor/react-lgpd
git pull --rebase origin main
```

Expected: branch atualizada com hotfix do Plan 1.

- [ ] **Step 2: Verificar working tree limpo**

```bash
git status
```

Expected: `nothing to commit`.

---

### Task 2: Init Vite + React + TypeScript em subfolder temporária

**Files:**
- Create: `_scaffold/` (temporário)

- [ ] **Step 1: Scaffold em pasta temporária**

```bash
pnpm create vite@latest _scaffold -- --template react-ts
```

Aceitar defaults. Não rodar `pnpm install` ainda.

Expected: pasta `_scaffold/` criada com Vite 6 + React 19 + TS.

- [ ] **Step 2: Mover conteúdo pra raiz, preservar arquivos existentes**

```bash
# Move arquivos novos sem sobrescrever index.html antigo
mv _scaffold/package.json ./package.json
mv _scaffold/tsconfig*.json ./
mv _scaffold/vite.config.ts ./
mv _scaffold/src ./_src_scaffold
mv _scaffold/public ./_public_scaffold
mv _scaffold/.gitignore ./.gitignore.new
mv _scaffold/eslint.config.js ./ 2>/dev/null || true
rm -rf _scaffold
```

- [ ] **Step 3: Mesclar .gitignore**

Substituir `.gitignore` antigo (3 linhas) por novo com adições:

```
# Original
node_modules/
.env
.DS_Store
Thumbs.db

# Vite
dist/
.vite/

# Local env
.env.local
.env.*.local

# Vercel
.vercel

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# IDE
.idea/
.vscode/

# Tests
coverage/
playwright-report/
test-results/
```

```bash
rm .gitignore.new
```

- [ ] **Step 4: Mover index.html antigo pra `legacy/`**

```bash
mkdir -p legacy
mv index.html legacy/index.html
mv js legacy/js
mv css legacy/css
mv icons legacy/icons
mv manifest.json legacy/manifest.json
mv sw.js legacy/sw.js
```

Legado fica pra referência durante migração feature-by-feature.

- [ ] **Step 5: Mover scaffold src/public pra lugar final**

```bash
mv _src_scaffold src
mv _public_scaffold public
```

- [ ] **Step 6: Commit do scaffold inicial**

```bash
git add .
git commit -m "chore: scaffold Vite + React 19 + TypeScript, move vanilla app to legacy/"
```

---

### Task 3: Instalar deps principais

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
pnpm add react@^19 react-dom@^19 \
  react-router-dom@^7 \
  @tanstack/react-query@^5 \
  zustand@^5 \
  dexie@^4 \
  react-hook-form@^7 \
  zod@^3 \
  @hookform/resolvers@^3 \
  @supabase/supabase-js@^2 \
  date-fns@^4 \
  clsx@^2 \
  tailwind-merge@^2 \
  class-variance-authority@^0.7 \
  lucide-react@^0.460 \
  sonner@^1
```

- [ ] **Step 2: Install dev deps**

```bash
pnpm add -D \
  typescript@~5.7 \
  @types/react@^19 \
  @types/react-dom@^19 \
  @types/node@^22 \
  vite@^6 \
  @vitejs/plugin-react@^4 \
  vite-plugin-pwa@^0.21 \
  tailwindcss@next \
  @tailwindcss/vite@next \
  @biomejs/biome@^1.9 \
  vitest@^2 \
  @vitest/ui@^2 \
  @testing-library/react@^16 \
  @testing-library/jest-dom@^6 \
  @testing-library/user-event@^14 \
  jsdom@^25 \
  @playwright/test@^1 \
  fake-indexeddb@^6
```

- [ ] **Step 3: Remove eslint (substituído por Biome)**

```bash
pnpm remove eslint @types/eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals 2>/dev/null
rm -f eslint.config.js
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git rm -f eslint.config.js 2>/dev/null || true
git commit -m "chore: install React 19 stack deps (router, query, zustand, dexie, supabase, tailwind v4, biome)"
```

---

### Task 4: Configurar Tailwind v4 + shadcn/ui base

**Files:**
- Create: `src/styles/globals.css`
- Modify: `vite.config.ts`
- Modify: `src/main.tsx`
- Modify: `tsconfig.json`
- Modify: `tsconfig.app.json`
- Create: `components.json`
- Create: `src/lib/cn.ts`

- [ ] **Step 1: Tailwind config via Vite plugin (v4 não usa tailwind.config.js)**

`vite.config.ts` completo:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Presença',
        short_name: 'Presença',
        description: 'Controle de presença, cestas e doações',
        theme_color: '#0f3460',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
```

- [ ] **Step 2: Criar `src/styles/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-bg: #0a0a0a;
  --color-bg-card: #111827;
  --color-bg-nav: #1f2937;
  --color-text: #f9fafb;
  --color-text-secondary: #d1d5db;
  --color-text-muted: #9ca3af;
  --color-border: #1f2937;
  --color-primary: #0f3460;
  --color-red: #ef4444;
  --color-green: #22c55e;
  --color-yellow: #eab308;
}

@layer base {
  * {
    box-sizing: border-box;
  }

  body {
    background: var(--color-bg);
    color: var(--color-text);
    font-family: system-ui, -apple-system, sans-serif;
    margin: 0;
    -webkit-tap-highlight-color: transparent;
  }

  html, body, #root {
    height: 100%;
    overscroll-behavior: none;
  }
}
```

- [ ] **Step 3: Importar globals em `src/main.tsx`**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: tsconfig path alias**

Editar `tsconfig.app.json` na seção `compilerOptions`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Criar helper `src/lib/cn.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: Criar `components.json` (shadcn/ui config)**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/cn",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 7: Limpar src/ default Vite (App.tsx etc)**

Substituir `src/App.tsx`:

```typescript
export default function App() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Presença</h1>
      <p>Scaffold em andamento.</p>
    </div>
  );
}
```

Remover assets default:

```bash
rm -f src/App.css src/index.css src/assets/react.svg
```

- [ ] **Step 8: Verificar build**

```bash
pnpm run build
```

Expected: build success, gera `dist/`.

- [ ] **Step 9: Verificar dev**

```bash
pnpm run dev
```

Abrir `http://localhost:5173`. Esperado: heading "Presença". Sem erros no console. Ctrl+C pra parar.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: configure Tailwind v4 + Vite PWA plugin + path aliases + shadcn config"
```

---

### Task 5: Biome lint+format config

**Files:**
- Create: `biome.json`
- Modify: `package.json`

- [ ] **Step 1: Criar `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "ignore": ["dist", "node_modules", "legacy", "supabase/functions/*/deno.lock"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noNonNullAssertion": "off"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "all",
      "arrowParentheses": "always"
    }
  }
}
```

- [ ] **Step 2: Adicionar scripts em `package.json`**

Atualizar seção `scripts`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "biome check src",
  "lint:fix": "biome check --write src",
  "format": "biome format --write src",
  "typecheck": "tsc -b --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "test:e2e": "playwright test",
  "supabase:types": "supabase gen types typescript --project-id hhtxaeauuutmuwwkotgf > src/types/supabase.ts"
}
```

- [ ] **Step 3: Rodar lint inicial**

```bash
pnpm run lint:fix
```

Expected: zero erros após fix.

- [ ] **Step 4: Commit**

```bash
git add biome.json package.json
git commit -m "chore: add Biome lint+format config and package.json scripts"
```

---

### Task 6: Vercel config + headers segurança

**Files:**
- Modify: `vercel.json`
- Create: `.env.example`

- [ ] **Step 1: Substituir `vercel.json`**

```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "pnpm install --frozen-lockfile",
  "rewrites": [
    { "source": "/((?!api/|assets/|icons/|.*\\..*).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Criar `.env.example`**

```bash
# Cliente (build-time, públicas por design)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_DPO_NOME="Nome do DPO"
VITE_DPO_EMAIL=dpo@exemplo.com
VITE_APP_VERSION=dev

# Local dev: copie para .env.local (gitignored)
```

- [ ] **Step 3: Criar `.env.local` localmente (não commit)**

```bash
cp .env.example .env.local
# Editar .env.local com valores reais da nova key Supabase (Plan 1 task 3)
```

- [ ] **Step 4: Commit**

```bash
git add vercel.json .env.example
git commit -m "chore: configure Vercel build + security headers + .env.example"
```

---

### Task 7: shadcn/ui — instalar componentes base

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/checkbox.tsx`

- [ ] **Step 1: Inicializar shadcn**

```bash
pnpm dlx shadcn@latest init -y -d
```

Aceitar defaults. Vai criar `src/components/ui/` vazio.

- [ ] **Step 2: Adicionar componentes**

```bash
pnpm dlx shadcn@latest add button input label dialog select checkbox toast
```

Expected: arquivos criados em `src/components/ui/`.

- [ ] **Step 3: Verificar build**

```bash
pnpm run build
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add shadcn/ui base components (button, input, dialog, select, checkbox, toast)"
```

---

### Task 8: Env vars typed via Zod

**Files:**
- Create: `src/lib/env.ts`
- Test: `src/lib/env.test.ts`

- [ ] **Step 1: Escrever teste falhante**

`src/lib/env.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('env', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws if VITE_SUPABASE_URL is missing', async () => {
    vi.stubGlobal('import', { meta: { env: {} } });
    await expect(import('./env')).rejects.toThrow(/VITE_SUPABASE_URL/);
  });

  it('parses valid env', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'eyJtest');
    vi.stubEnv('VITE_DPO_NOME', 'Test DPO');
    vi.stubEnv('VITE_DPO_EMAIL', 'dpo@test.com');
    vi.stubEnv('VITE_APP_VERSION', 'dev');
    const { env } = await import('./env');
    expect(env.SUPABASE_URL).toBe('https://test.supabase.co');
    expect(env.DPO_EMAIL).toBe('dpo@test.com');
  });
});
```

- [ ] **Step 2: Rodar test pra confirmar falha**

```bash
pnpm test src/lib/env.test.ts
```

Expected: FAIL (`./env` module not found).

- [ ] **Step 3: Implementar `src/lib/env.ts`**

```typescript
import { z } from 'zod';

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  DPO_NOME: z.string().min(1),
  DPO_EMAIL: z.string().email(),
  APP_VERSION: z.string().default('dev'),
});

const raw = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  DPO_NOME: import.meta.env.VITE_DPO_NOME,
  DPO_EMAIL: import.meta.env.VITE_DPO_EMAIL,
  APP_VERSION: import.meta.env.VITE_APP_VERSION,
};

const parsed = EnvSchema.safeParse(raw);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
```

- [ ] **Step 4: Rodar test pra confirmar pass**

```bash
pnpm test src/lib/env.test.ts
```

Expected: PASS.

- [ ] **Step 5: Configurar vitest**

Criar `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Criar `src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

- [ ] **Step 6: Rerun com setup**

```bash
pnpm test
```

Expected: env.test.ts PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/env.ts src/lib/env.test.ts src/test-setup.ts vitest.config.ts
git commit -m "feat: add typed env validation with Zod + vitest setup"
```

---

### Task 9: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Criar workflow**

```yaml
name: CI

on:
  push:
    branches: [main, refactor/react-lgpd]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm run lint

      - name: Typecheck
        run: pnpm run typecheck

      - name: Unit tests
        run: pnpm test
        env:
          VITE_SUPABASE_URL: https://test.supabase.co
          VITE_SUPABASE_ANON_KEY: eyJtest_ci
          VITE_DPO_NOME: CI DPO
          VITE_DPO_EMAIL: ci@test.com
          VITE_APP_VERSION: ci

      - name: Build
        run: pnpm run build
        env:
          VITE_SUPABASE_URL: https://test.supabase.co
          VITE_SUPABASE_ANON_KEY: eyJtest_ci
          VITE_DPO_NOME: CI DPO
          VITE_DPO_EMAIL: ci@test.com
          VITE_APP_VERSION: ci

      - name: Audit deps
        run: pnpm audit --audit-level=high || true
```

- [ ] **Step 2: Commit + push pra acionar CI**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions for lint, typecheck, test, build, audit"
git push origin refactor/react-lgpd
```

Expected: GH Actions roda, todas etapas verdes.

---

### Task 10: Preview Vercel funcional

**Files:**
- Nenhum modificado (config via dashboard Vercel)

- [ ] **Step 1: Conectar branch ao Vercel se necessário**

Vercel dashboard → projeto → Settings → Git → ativar deploys de `refactor/react-lgpd`.

- [ ] **Step 2: Configurar env vars no Vercel (Preview)**

Settings → Environment Variables. Para escopo `Preview`:

- `VITE_SUPABASE_URL` = `https://hhtxaeauuutmuwwkotgf.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = (key nova do Plan 1)
- `VITE_DPO_NOME` = (a definir, usar `Coordenação`)
- `VITE_DPO_EMAIL` = (a definir, usar contato igreja)
- `VITE_APP_VERSION` = `dev`

- [ ] **Step 3: Trigger deploy**

Push trivial:

```bash
git commit --allow-empty -m "chore: trigger Vercel preview deploy"
git push
```

- [ ] **Step 4: Verificar preview URL**

URL aparece em GH PR ou Vercel dashboard. Abrir, esperado: heading "Presença" renderiza.

DevTools → Network: sem 401, sem CSP violations.

---

## Phase B — Supabase backend

### Task 11: Estrutura `supabase/` + migration init

**Files:**
- Move: `supabase/schema.sql` → `legacy/supabase/schema.sql`
- Move: `supabase/migration-v*.sql` → `legacy/supabase/`
- Create: `supabase/migrations/001_init_baseline.sql`

- [ ] **Step 1: Mover legados**

```bash
mkdir -p legacy/supabase
mv supabase/schema.sql legacy/supabase/
mv supabase/migration-v*.sql legacy/supabase/
mkdir -p supabase/migrations
mkdir -p supabase/functions
```

- [ ] **Step 2: Criar migration baseline (idempotente, reflete estado atual)**

`supabase/migrations/001_init_baseline.sql`:

```sql
-- Idempotent baseline of current schema. Safe to run on existing DB.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS familias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pessoas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  grupo TEXT NOT NULL CHECK (grupo IN ('evangelizacao','mocidade','adulto','gestante')),
  familia_id UUID REFERENCES familias(id) ON DELETE SET NULL,
  telefone TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cep TEXT,
  visitada BOOLEAN NOT NULL DEFAULT FALSE,
  apta_cesta BOOLEAN,
  visita_obs TEXT,
  excluir_ranking BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chamadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL UNIQUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamada_id UUID NOT NULL REFERENCES chamadas(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  presente BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chamada_id, pessoa_id)
);

CREATE TABLE IF NOT EXISTS cestas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('alimento-doacao','alimento-interno','limpeza')),
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES pessoas(id) ON DELETE SET NULL,
  familia_id UUID REFERENCES familias(id) ON DELETE SET NULL,
  item TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','atendido')),
  solicitado_em DATE NOT NULL DEFAULT CURRENT_DATE,
  atendido_em DATE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (pessoa_id IS NOT NULL OR familia_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_presencas_chamada ON presencas(chamada_id);
CREATE INDEX IF NOT EXISTS idx_presencas_pessoa ON presencas(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_chamadas_data ON chamadas(data);
CREATE INDEX IF NOT EXISTS idx_pessoas_grupo ON pessoas(grupo);
CREATE INDEX IF NOT EXISTS idx_cestas_pessoa ON cestas(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_cestas_data ON cestas(data);
CREATE INDEX IF NOT EXISTS idx_itens_categoria ON itens(categoria);
CREATE INDEX IF NOT EXISTS idx_pedidos_pessoa ON pedidos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_familia ON pedidos(familia_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);

CREATE OR REPLACE FUNCTION update_atualizado_em() RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER pessoas_atualizado BEFORE UPDATE ON pessoas FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER familias_atualizado BEFORE UPDATE ON familias FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER presencas_atualizado BEFORE UPDATE ON presencas FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER cestas_atualizado BEFORE UPDATE ON cestas FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER itens_atualizado BEFORE UPDATE ON itens FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER pedidos_atualizado BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

- [ ] **Step 2: Aplicar migration no Supabase**

Via SQL Editor do dashboard, copiar/colar conteúdo do arquivo e executar.

Expected: `Success. No rows returned`. Tabelas existem (já existiam), nada quebra.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_init_baseline.sql
git rm -r legacy/supabase 2>/dev/null || true
git add legacy/supabase
git commit -m "feat(db): add baseline idempotent migration reflecting current schema"
```

---

### Task 12: Migration — app_users + RBAC

**Files:**
- Create: `supabase/migrations/002_app_users_rbac.sql`

- [ ] **Step 1: Criar migration**

```sql
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('admin','operador')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por UUID REFERENCES app_users(id),
  ultimo_login_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_app_users_papel ON app_users(papel);
CREATE INDEX IF NOT EXISTS idx_app_users_ativo ON app_users(ativo);

-- Helper function pra checar papel do user atual
CREATE OR REPLACE FUNCTION current_app_user_papel() RETURNS TEXT AS $$
  SELECT papel FROM app_users WHERE id = auth.uid() AND ativo = TRUE LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION current_app_user_papel() TO authenticated;
```

- [ ] **Step 2: Aplicar via SQL Editor**

Copy/paste/run no dashboard.

Expected: `Success`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_app_users_rbac.sql
git commit -m "feat(db): add app_users table with role check helper function"
```

---

### Task 13: Migration — consent + audit_log

**Files:**
- Create: `supabase/migrations/003_consent_audit.sql`

- [ ] **Step 1: Criar migration**

```sql
CREATE TABLE IF NOT EXISTS consent_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  versao TEXT NOT NULL UNIQUE,
  texto TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por UUID REFERENCES app_users(id)
);

CREATE TABLE IF NOT EXISTS pessoa_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  consent_term_id UUID NOT NULL REFERENCES consent_terms(id),
  declarado_por UUID NOT NULL REFERENCES app_users(id),
  metodo TEXT NOT NULL DEFAULT 'verbal' CHECK (metodo IN ('verbal','escrito')),
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revogado_em TIMESTAMPTZ,
  revogado_por UUID REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_pessoa_consents_pessoa ON pessoa_consents(pessoa_id);

CREATE TABLE IF NOT EXISTS audit_log (
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

CREATE INDEX IF NOT EXISTS idx_audit_registro ON audit_log(tabela, registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_log(usuario_id, ocorrido_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ocorrido ON audit_log(ocorrido_em DESC);

-- Trigger automático
CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
DECLARE
  diff_jsonb JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    diff_jsonb := jsonb_build_object('depois', row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    diff_jsonb := jsonb_build_object('antes', row_to_json(OLD), 'depois', row_to_json(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    diff_jsonb := jsonb_build_object('antes', row_to_json(OLD));
  END IF;

  INSERT INTO audit_log(tabela, registro_id, operacao, usuario_id, diff)
  VALUES (
    TG_TABLE_NAME,
    COALESCE((NEW).id, (OLD).id),
    TG_OP,
    auth.uid(),
    diff_jsonb
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER pessoas_audit AFTER INSERT OR UPDATE OR DELETE ON pessoas FOR EACH ROW EXECUTE FUNCTION audit_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER familias_audit AFTER INSERT OR UPDATE OR DELETE ON familias FOR EACH ROW EXECUTE FUNCTION audit_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER presencas_audit AFTER INSERT OR UPDATE OR DELETE ON presencas FOR EACH ROW EXECUTE FUNCTION audit_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER cestas_audit AFTER INSERT OR UPDATE OR DELETE ON cestas FOR EACH ROW EXECUTE FUNCTION audit_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER pedidos_audit AFTER INSERT OR UPDATE OR DELETE ON pedidos FOR EACH ROW EXECUTE FUNCTION audit_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER app_users_audit AFTER INSERT OR UPDATE OR DELETE ON app_users FOR EACH ROW EXECUTE FUNCTION audit_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

- [ ] **Step 2: Aplicar via SQL Editor**

Run no dashboard.

Expected: `Success`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_consent_audit.sql
git commit -m "feat(db): add consent_terms, pessoa_consents, audit_log + auto-audit triggers"
```

---

### Task 14: Migration — lgpd_requests + anonimização cols

**Files:**
- Create: `supabase/migrations/004_lgpd_requests.sql`
- Create: `supabase/migrations/005_anonimizacao.sql`

- [ ] **Step 1: Criar `004_lgpd_requests.sql`**

```sql
CREATE TABLE IF NOT EXISTS lgpd_requests (
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

CREATE INDEX IF NOT EXISTS idx_lgpd_requests_pessoa ON lgpd_requests(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_lgpd_requests_status ON lgpd_requests(status);
```

- [ ] **Step 2: Criar `005_anonimizacao.sql`**

```sql
ALTER TABLE pessoas
  ADD COLUMN IF NOT EXISTS anonimizado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anonimizado_por UUID REFERENCES app_users(id);

CREATE INDEX IF NOT EXISTS idx_pessoas_anonimizado ON pessoas(anonimizado_em) WHERE anonimizado_em IS NOT NULL;
```

- [ ] **Step 3: Aplicar ambas via SQL Editor**

Run cada uma.

Expected: `Success`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/004_lgpd_requests.sql supabase/migrations/005_anonimizacao.sql
git commit -m "feat(db): add lgpd_requests table + anonimizado_em/por columns in pessoas"
```

---

### Task 15: Migration — RLS policies + view pessoas_operador + enforce trigger

**Files:**
- Create: `supabase/migrations/006_rls_policies.sql`

- [ ] **Step 1: Criar migration**

```sql
-- ===== Drop policies antigas (USING true) =====
DROP POLICY IF EXISTS "Allow all access to pessoas" ON pessoas;
DROP POLICY IF EXISTS "Allow all access to chamadas" ON chamadas;
DROP POLICY IF EXISTS "Allow all access to presencas" ON presencas;
DROP POLICY IF EXISTS "Allow all access to cestas" ON cestas;
DROP POLICY IF EXISTS "Allow all access to itens" ON itens;
DROP POLICY IF EXISTS "Allow all access to pedidos" ON pedidos;
DROP POLICY IF EXISTS "Allow all access to familias" ON familias;

-- ===== Habilitar RLS em todas =====
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoa_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgpd_requests ENABLE ROW LEVEL SECURITY;

-- ===== app_users =====
CREATE POLICY app_users_admin_all ON app_users FOR ALL TO authenticated
  USING (current_app_user_papel() = 'admin')
  WITH CHECK (current_app_user_papel() = 'admin');

CREATE POLICY app_users_self_read ON app_users FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ===== pessoas =====
CREATE POLICY pessoas_admin_all ON pessoas FOR ALL TO authenticated
  USING (current_app_user_papel() = 'admin')
  WITH CHECK (current_app_user_papel() = 'admin');

CREATE POLICY pessoas_operador_select ON pessoas FOR SELECT TO authenticated
  USING (current_app_user_papel() = 'operador');

CREATE POLICY pessoas_operador_insert ON pessoas FOR INSERT TO authenticated
  WITH CHECK (
    current_app_user_papel() = 'operador'
    AND visita_obs IS NULL AND apta_cesta IS NULL
    AND visitada = FALSE
    AND rua IS NULL AND numero IS NULL AND complemento IS NULL
    AND bairro IS NULL AND cep IS NULL
  );

CREATE POLICY pessoas_operador_update ON pessoas FOR UPDATE TO authenticated
  USING (current_app_user_papel() = 'operador')
  WITH CHECK (current_app_user_papel() = 'operador');

CREATE POLICY pessoas_operador_delete ON pessoas FOR DELETE TO authenticated
  USING (current_app_user_papel() = 'operador');

-- Trigger reverte campos protegidos em UPDATE pra operador
CREATE OR REPLACE FUNCTION enforce_operador_fields() RETURNS TRIGGER AS $$
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
    NEW.anonimizado_em := OLD.anonimizado_em;
    NEW.anonimizado_por := OLD.anonimizado_por;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER pessoas_enforce_fields BEFORE UPDATE ON pessoas FOR EACH ROW EXECUTE FUNCTION enforce_operador_fields();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- View pra operador (campos mascarados)
CREATE OR REPLACE VIEW pessoas_operador AS
  SELECT id, nome, grupo, familia_id, telefone, ativo, excluir_ranking,
         anonimizado_em, criado_em, atualizado_em
  FROM pessoas
  WHERE anonimizado_em IS NULL;

GRANT SELECT ON pessoas_operador TO authenticated;

-- ===== familias =====
CREATE POLICY familias_all_authenticated ON familias FOR ALL TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'))
  WITH CHECK (current_app_user_papel() IN ('admin','operador'));

-- ===== chamadas =====
CREATE POLICY chamadas_select ON chamadas FOR SELECT TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'));

CREATE POLICY chamadas_admin_write ON chamadas FOR INSERT TO authenticated
  WITH CHECK (current_app_user_papel() IN ('admin','operador'));

CREATE POLICY chamadas_admin_delete ON chamadas FOR DELETE TO authenticated
  USING (current_app_user_papel() = 'admin');

-- ===== presencas =====
CREATE POLICY presencas_select ON presencas FOR SELECT TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'));

CREATE POLICY presencas_insert ON presencas FOR INSERT TO authenticated
  WITH CHECK (
    current_app_user_papel() = 'admin'
    OR (
      current_app_user_papel() = 'operador'
      AND (SELECT data FROM chamadas WHERE id = chamada_id) = CURRENT_DATE
    )
  );

CREATE POLICY presencas_update ON presencas FOR UPDATE TO authenticated
  USING (
    current_app_user_papel() = 'admin'
    OR (
      current_app_user_papel() = 'operador'
      AND (SELECT data FROM chamadas WHERE id = chamada_id) = CURRENT_DATE
    )
  );

CREATE POLICY presencas_delete ON presencas FOR DELETE TO authenticated
  USING (current_app_user_papel() = 'admin');

-- ===== cestas =====
CREATE POLICY cestas_all_authenticated ON cestas FOR ALL TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'))
  WITH CHECK (current_app_user_papel() IN ('admin','operador'));

-- ===== itens =====
CREATE POLICY itens_all_authenticated ON itens FOR ALL TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'))
  WITH CHECK (current_app_user_papel() IN ('admin','operador'));

-- ===== pedidos =====
CREATE POLICY pedidos_all_authenticated ON pedidos FOR ALL TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'))
  WITH CHECK (current_app_user_papel() IN ('admin','operador'));

-- ===== consent_terms =====
CREATE POLICY consent_terms_select ON consent_terms FOR SELECT TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'));

CREATE POLICY consent_terms_admin_write ON consent_terms FOR INSERT TO authenticated
  WITH CHECK (current_app_user_papel() = 'admin');

CREATE POLICY consent_terms_admin_update ON consent_terms FOR UPDATE TO authenticated
  USING (current_app_user_papel() = 'admin');

-- ===== pessoa_consents =====
CREATE POLICY pessoa_consents_select ON pessoa_consents FOR SELECT TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'));

CREATE POLICY pessoa_consents_insert ON pessoa_consents FOR INSERT TO authenticated
  WITH CHECK (current_app_user_papel() IN ('admin','operador'));

CREATE POLICY pessoa_consents_update ON pessoa_consents FOR UPDATE TO authenticated
  USING (current_app_user_papel() IN ('admin','operador'));

-- ===== audit_log =====
CREATE POLICY audit_select_admin ON audit_log FOR SELECT TO authenticated
  USING (current_app_user_papel() = 'admin');
-- Sem INSERT/UPDATE/DELETE policy: só trigger SECURITY DEFINER escreve

-- ===== lgpd_requests =====
CREATE POLICY lgpd_requests_admin_all ON lgpd_requests FOR ALL TO authenticated
  USING (current_app_user_papel() = 'admin')
  WITH CHECK (current_app_user_papel() = 'admin');
```

- [ ] **Step 2: Aplicar via SQL Editor**

Run.

Expected: `Success`.

- [ ] **Step 3: Smoke test — anon não consegue mais ler**

```bash
curl -s "https://hhtxaeauuutmuwwkotgf.supabase.co/rest/v1/pessoas?select=id&limit=1" \
  -H "apikey: <ANON_KEY>"
```

Expected: `[]` (lista vazia — RLS bloqueia) OU erro de permissão. NÃO deve mais retornar dados sem JWT user.

**Atenção:** app vanilla legacy (em `main`) vai quebrar a partir daqui. Plano: app vanilla ainda usa `main`, branch refactor tem schema novo. Migration aplicada no Supabase impacta os dois. **Mitigação:** apenas aplicar este migration depois que decisão de cut-over for tomada, OU temporariamente manter policy permissiva pra `chamadas/pessoas/etc` pra anon role durante transição. Decisão recomendada: aplicar agora, app vanilla legacy mostra erro de permissão, voluntários usam preview do refactor enquanto cresce.

Se for crítico manter vanilla rodando durante refactor:

```sql
-- Policy temporária ANON (apagar antes do cutover final)
CREATE POLICY pessoas_anon_legacy_temp ON pessoas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY familias_anon_legacy_temp ON familias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY chamadas_anon_legacy_temp ON chamadas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY presencas_anon_legacy_temp ON presencas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY cestas_anon_legacy_temp ON cestas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY itens_anon_legacy_temp ON itens FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY pedidos_anon_legacy_temp ON pedidos FOR ALL TO anon USING (true) WITH CHECK (true);
```

Adicionar ao migration `006`, marcado pra remoção no Plan 4 (cutover).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/006_rls_policies.sql
git commit -m "feat(db): add full RLS policies (admin + operador) + pessoas_operador view + enforce trigger"
```

---

### Task 16: Migration — primeiro consent term

**Files:**
- Create: `supabase/migrations/007_seed_consent_term.sql`

- [ ] **Step 1: Criar migration seed**

```sql
INSERT INTO consent_terms (versao, texto, ativo, criado_em)
VALUES (
  '2026-05-15-v1',
  'Eu, titular dos dados pessoais, autorizo a igreja a tratar meus dados (nome, telefone, endereço e informações de visita social) para a finalidade de organização de assistência social, controle de presença em cultos e entrega de cestas básicas. Os dados serão mantidos enquanto necessário para esta finalidade ou até minha solicitação de exclusão. Tenho direito de acesso, correção, anonimização ou eliminação conforme LGPD (Lei 13.709/2018). Em caso de dúvidas, contatar o DPO da igreja.',
  TRUE,
  NOW()
)
ON CONFLICT (versao) DO NOTHING;
```

- [ ] **Step 2: Aplicar via SQL Editor**

Run.

Expected: 1 row inserted ou 0 se já existe.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_seed_consent_term.sql
git commit -m "feat(db): seed initial consent term v1"
```

---

### Task 17: Edge Function — anonymize-inactive

**Files:**
- Create: `supabase/functions/anonymize-inactive/index.ts`
- Create: `supabase/functions/anonymize-inactive/deno.json`

- [ ] **Step 1: Criar `index.ts`**

```typescript
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CUTOFF_YEARS = 5;

Deno.serve(async () => {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - CUTOFF_YEARS);
  const cutoffISO = cutoff.toISOString();

  const { data: inactives, error } = await supabase.rpc('find_inactive_pessoas', {
    cutoff_date: cutoffISO,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const ids: string[] = (inactives || []).map((p: any) => p.id);
  let anonymized = 0;

  for (const id of ids) {
    const { error: upErr } = await supabase
      .from('pessoas')
      .update({
        nome: 'ANONIMIZADO',
        telefone: null,
        rua: null,
        numero: null,
        complemento: null,
        bairro: null,
        cep: null,
        visita_obs: null,
        apta_cesta: null,
        anonimizado_em: new Date().toISOString(),
      })
      .eq('id', id);

    if (!upErr) anonymized++;
  }

  return new Response(JSON.stringify({ checked: ids.length, anonymized }), {
    headers: { 'content-type': 'application/json' },
  });
});
```

- [ ] **Step 2: Criar `deno.json`**

```json
{
  "imports": {
    "@supabase/supabase-js": "jsr:@supabase/supabase-js@2"
  }
}
```

- [ ] **Step 3: Adicionar função RPC `find_inactive_pessoas` ao DB**

Criar `supabase/migrations/008_find_inactive_pessoas.sql`:

```sql
CREATE OR REPLACE FUNCTION find_inactive_pessoas(cutoff_date TIMESTAMPTZ)
RETURNS TABLE (id UUID)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT p.id FROM pessoas p
  WHERE p.atualizado_em < cutoff_date
    AND p.anonimizado_em IS NULL
    AND NOT EXISTS (SELECT 1 FROM presencas WHERE pessoa_id = p.id AND atualizado_em >= cutoff_date)
    AND NOT EXISTS (SELECT 1 FROM cestas WHERE pessoa_id = p.id AND atualizado_em >= cutoff_date)
    AND NOT EXISTS (SELECT 1 FROM pedidos WHERE pessoa_id = p.id AND atualizado_em >= cutoff_date);
$$;

REVOKE EXECUTE ON FUNCTION find_inactive_pessoas(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_inactive_pessoas(TIMESTAMPTZ) TO service_role;
```

Aplicar no SQL Editor.

- [ ] **Step 4: Deploy function (via Supabase CLI)**

Pré-requisito: `supabase` CLI instalado e logado (`supabase login`).

```bash
supabase functions deploy anonymize-inactive --project-ref hhtxaeauuutmuwwkotgf
```

Expected: deploy success.

- [ ] **Step 5: Agendar cron mensal**

Via SQL Editor:

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

**Nota:** requer extension `pg_cron` e `pg_net` habilitadas (Database → Extensions). Habilite se ainda não estão. `current_setting('app.service_role_key')` precisa ser definido em Supabase project settings; alternativa simples: hardcoded via secret no momento da criação do cron.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/anonymize-inactive/ supabase/migrations/008_find_inactive_pessoas.sql
git commit -m "feat(edge): add anonymize-inactive function with monthly cron schedule"
```

---

### Task 18: Edge Function — admin-create-user

**Files:**
- Create: `supabase/functions/admin-create-user/index.ts`
- Create: `supabase/functions/admin-create-user/deno.json`

- [ ] **Step 1: Criar `index.ts`**

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const Schema = z.object({
  email: z.string().email(),
  nome: z.string().min(2).max(200),
  papel: z.enum(['admin', 'operador']),
  senha_temporaria: z.string().min(8),
});

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const auth = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth) return new Response('Missing auth', { status: 401 });

  const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(auth);
  if (userErr || !user) return new Response('Invalid token', { status: 401 });

  const { data: callerApp } = await supabaseAdmin
    .from('app_users')
    .select('papel')
    .eq('id', user.id)
    .single();

  if (callerApp?.papel !== 'admin') {
    return new Response('Forbidden: not admin', { status: 403 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 });
  }
  const { email, nome, papel, senha_temporaria } = parsed.data;

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha_temporaria,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    return new Response(JSON.stringify({ error: createErr?.message }), { status: 400 });
  }

  const { error: insertErr } = await supabaseAdmin
    .from('app_users')
    .insert({
      id: created.user.id,
      nome,
      papel,
      criado_por: user.id,
    });

  if (insertErr) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ id: created.user.id, email, nome, papel }), {
    headers: { 'content-type': 'application/json' },
  });
});
```

- [ ] **Step 2: deno.json**

```json
{
  "imports": {
    "@supabase/supabase-js": "jsr:@supabase/supabase-js@2",
    "zod": "npm:zod@3"
  }
}
```

- [ ] **Step 3: Deploy**

```bash
supabase functions deploy admin-create-user --project-ref hhtxaeauuutmuwwkotgf
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/admin-create-user/
git commit -m "feat(edge): add admin-create-user function with role check"
```

---

### Task 19: Edge Function — admin-reset-password

**Files:**
- Create: `supabase/functions/admin-reset-password/index.ts`
- Create: `supabase/functions/admin-reset-password/deno.json`

- [ ] **Step 1: Criar `index.ts`**

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const Schema = z.object({
  target_user_id: z.string().uuid(),
  nova_senha: z.string().min(8),
});

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const auth = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth) return new Response('Missing auth', { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(auth);
  if (!user) return new Response('Invalid token', { status: 401 });

  const { data: callerApp } = await supabaseAdmin
    .from('app_users').select('papel').eq('id', user.id).single();

  if (callerApp?.papel !== 'admin') return new Response('Forbidden', { status: 403 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(parsed.data.target_user_id, {
    password: parsed.data.nova_senha,
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  });
});
```

- [ ] **Step 2: deno.json (mesmo formato da task 18)**

```json
{
  "imports": {
    "@supabase/supabase-js": "jsr:@supabase/supabase-js@2",
    "zod": "npm:zod@3"
  }
}
```

- [ ] **Step 3: Deploy + commit**

```bash
supabase functions deploy admin-reset-password --project-ref hhtxaeauuutmuwwkotgf
git add supabase/functions/admin-reset-password/
git commit -m "feat(edge): add admin-reset-password function"
```

---

### Task 20: Edge Function — export-pessoa-lgpd

**Files:**
- Create: `supabase/functions/export-pessoa-lgpd/index.ts`
- Create: `supabase/functions/export-pessoa-lgpd/deno.json`

- [ ] **Step 1: Criar `index.ts`**

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const Schema = z.object({ pessoa_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const auth = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth) return new Response('Missing auth', { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(auth);
  if (!user) return new Response('Invalid token', { status: 401 });

  const { data: callerApp } = await supabaseAdmin
    .from('app_users').select('papel').eq('id', user.id).single();
  if (callerApp?.papel !== 'admin') return new Response('Forbidden', { status: 403 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 });
  }

  const { pessoa_id } = parsed.data;

  const [pessoa, familia, presencas, cestas, pedidos, consents] = await Promise.all([
    supabaseAdmin.from('pessoas').select('*').eq('id', pessoa_id).single(),
    supabaseAdmin.from('pessoas').select('familia_id').eq('id', pessoa_id).single()
      .then(async ({ data }) => {
        if (!data?.familia_id) return null;
        const { data: f } = await supabaseAdmin.from('familias').select('*').eq('id', data.familia_id).single();
        return f;
      }),
    supabaseAdmin.from('presencas').select('*').eq('pessoa_id', pessoa_id),
    supabaseAdmin.from('cestas').select('*').eq('pessoa_id', pessoa_id),
    supabaseAdmin.from('pedidos').select('*').eq('pessoa_id', pessoa_id),
    supabaseAdmin.from('pessoa_consents').select('*').eq('pessoa_id', pessoa_id),
  ]);

  if (!pessoa.data) return new Response('Not found', { status: 404 });

  const payload = {
    exportado_em: new Date().toISOString(),
    exportado_por: user.id,
    pessoa: pessoa.data,
    familia: familia,
    presencas: presencas.data || [],
    cestas: cestas.data || [],
    pedidos: pedidos.data || [],
    consents: consents.data || [],
  };

  // Audit
  await supabaseAdmin.from('audit_log').insert({
    tabela: 'pessoas',
    registro_id: pessoa_id,
    operacao: 'EXPORT',
    usuario_id: user.id,
    diff: { exportado: true },
  });

  // Open lgpd_request
  await supabaseAdmin.from('lgpd_requests').insert({
    pessoa_id,
    pessoa_nome_snapshot: pessoa.data.nome,
    tipo: 'acesso',
    status: 'concluido',
    solicitado_por: user.id,
    concluido_em: new Date().toISOString(),
    concluido_por: user.id,
  });

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="pessoa-${pessoa_id}.json"`,
    },
  });
});
```

- [ ] **Step 2: deno.json**

```json
{
  "imports": {
    "@supabase/supabase-js": "jsr:@supabase/supabase-js@2",
    "zod": "npm:zod@3"
  }
}
```

- [ ] **Step 3: Deploy**

```bash
supabase functions deploy export-pessoa-lgpd --project-ref hhtxaeauuutmuwwkotgf
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/export-pessoa-lgpd/
git commit -m "feat(edge): add export-pessoa-lgpd function with audit + lgpd_request"
```

---

### Task 21: Seed primeiro admin user

**Files:**
- Create: `supabase/migrations/009_seed_admin.sql` (template, valores reais via dashboard)

- [ ] **Step 1: Criar template migration**

```sql
-- TEMPLATE: substitua valores antes de rodar manualmente
-- Crie primeiro o user no Supabase Auth (dashboard ou API), depois rode:
--
-- INSERT INTO app_users (id, nome, papel, ativo, criado_em)
-- VALUES (
--   '<auth.users.id-do-pastor>',
--   '<Nome do Pastor>',
--   'admin',
--   TRUE,
--   NOW()
-- )
-- ON CONFLICT (id) DO NOTHING;
--
-- (Não comitar valores reais — dependem do dashboard)
```

- [ ] **Step 2: Criar primeiro admin manualmente via Supabase Dashboard**

1. Dashboard → Authentication → Users → "Add user"
2. Email do pastor/coordenador
3. Senha temporária forte (gerar via `openssl rand -base64 16`)
4. Confirmar email automaticamente
5. Copiar UUID gerado

- [ ] **Step 3: Inserir em app_users via SQL Editor**

```sql
INSERT INTO app_users (id, nome, papel, ativo, criado_em)
VALUES (
  '<uuid-copiado-do-passo-2>',
  'Pastor Fulano',
  'admin',
  TRUE,
  NOW()
);
```

- [ ] **Step 4: Comunicar senha temporária ao admin (canal seguro, fora do repo)**

- [ ] **Step 5: Commit do template**

```bash
git add supabase/migrations/009_seed_admin.sql
git commit -m "feat(db): add template migration for first admin seed (manual values)"
```

---

### Task 22: Gerar tipos TypeScript do Supabase

**Files:**
- Create: `src/types/supabase.ts`

- [ ] **Step 1: Logar no Supabase CLI se ainda não**

```bash
supabase login
```

- [ ] **Step 2: Gerar tipos**

```bash
mkdir -p src/types
pnpm run supabase:types
```

Expected: `src/types/supabase.ts` criado com `Database` type e schemas.

- [ ] **Step 3: Verificar build**

```bash
pnpm run typecheck
```

Expected: zero erros.

- [ ] **Step 4: Commit**

```bash
git add src/types/supabase.ts
git commit -m "feat(types): generate Supabase Postgres types"
```

---

## Phase C — Auth + shell

### Task 23: Supabase client singleton

**Files:**
- Create: `src/lib/supabase.ts`
- Test: `src/lib/supabase.test.ts`

- [ ] **Step 1: Teste falhante**

`src/lib/supabase.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'eyJtest');
vi.stubEnv('VITE_DPO_NOME', 'T');
vi.stubEnv('VITE_DPO_EMAIL', 't@t.com');
vi.stubEnv('VITE_APP_VERSION', 't');

describe('supabase client', () => {
  it('exports a typed client singleton', async () => {
    const { supabase } = await import('./supabase');
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });
});
```

- [ ] **Step 2: Implementar `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { env } from './env';

export const supabase = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  },
);
```

- [ ] **Step 3: Run test**

```bash
pnpm test src/lib/supabase.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts src/lib/supabase.test.ts
git commit -m "feat(lib): add Supabase client singleton with typed Database schema"
```

---

### Task 24: Auth store (Zustand)

**Files:**
- Create: `src/features/auth/useAuth.ts`
- Test: `src/features/auth/useAuth.test.ts`

- [ ] **Step 1: Teste falhante**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuth } from './useAuth';

describe('useAuth store', () => {
  beforeEach(() => {
    useAuth.setState({ user: null, papel: null, loading: false });
  });

  it('initial state is logged out', () => {
    const { user, papel } = useAuth.getState();
    expect(user).toBeNull();
    expect(papel).toBeNull();
  });

  it('setSession populates user and papel', () => {
    useAuth.getState().setSession({ id: 'u1', email: 't@t.com' } as any, 'admin');
    const s = useAuth.getState();
    expect(s.user?.id).toBe('u1');
    expect(s.papel).toBe('admin');
  });

  it('clear resets state', () => {
    useAuth.getState().setSession({ id: 'u1', email: 't@t.com' } as any, 'admin');
    useAuth.getState().clear();
    expect(useAuth.getState().user).toBeNull();
  });
});
```

- [ ] **Step 2: Implementar**

```typescript
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

export type Papel = 'admin' | 'operador';

interface AuthState {
  user: User | null;
  papel: Papel | null;
  loading: boolean;
  setSession: (user: User, papel: Papel) => void;
  clear: () => void;
  setLoading: (v: boolean) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  papel: null,
  loading: true,
  setSession: (user, papel) => set({ user, papel, loading: false }),
  clear: () => set({ user: null, papel: null, loading: false }),
  setLoading: (loading) => set({ loading }),
}));
```

- [ ] **Step 3: Run test**

```bash
pnpm test src/features/auth/useAuth.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
mkdir -p src/features/auth
git add src/features/auth/useAuth.ts src/features/auth/useAuth.test.ts
git commit -m "feat(auth): add Zustand auth store"
```

---

### Task 25: Auth bootstrap (carrega sessão existente + papel)

**Files:**
- Create: `src/features/auth/bootstrap.ts`

- [ ] **Step 1: Criar arquivo**

```typescript
import { supabase } from '@/lib/supabase';
import { useAuth, type Papel } from './useAuth';

export async function bootstrapAuth() {
  useAuth.setState({ loading: true });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    useAuth.getState().clear();
    return;
  }

  const { data: appUser, error } = await supabase
    .from('app_users')
    .select('papel, ativo')
    .eq('id', session.user.id)
    .single();

  if (error || !appUser || !appUser.ativo) {
    await supabase.auth.signOut();
    useAuth.getState().clear();
    return;
  }

  useAuth.getState().setSession(session.user, appUser.papel as Papel);

  // Atualiza ultimo_login_em (fire-and-forget)
  supabase.from('app_users').update({ ultimo_login_em: new Date().toISOString() })
    .eq('id', session.user.id);

  // Listen pra mudanças de auth
  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    if (!newSession) {
      useAuth.getState().clear();
      return;
    }
    const { data: u } = await supabase
      .from('app_users')
      .select('papel, ativo')
      .eq('id', newSession.user.id)
      .single();
    if (u?.ativo) {
      useAuth.getState().setSession(newSession.user, u.papel as Papel);
    } else {
      await supabase.auth.signOut();
      useAuth.getState().clear();
    }
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/auth/bootstrap.ts
git commit -m "feat(auth): add bootstrap to load existing session + role"
```

---

### Task 26: Login page

**Files:**
- Create: `src/features/auth/login.tsx`
- Create: `src/schemas/login.ts`

- [ ] **Step 1: Schema Zod**

`src/schemas/login.ts`:

```typescript
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
});

export type LoginInput = z.infer<typeof LoginSchema>;
```

- [ ] **Step 2: Login page**

`src/features/auth/login.tsx`:

```typescript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { LoginSchema, type LoginInput } from '@/schemas/login';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, type Papel } from './useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (input: LoginInput) => {
    setError(null);
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.senha,
    });
    if (authErr || !data.user) {
      setError(authErr?.message ?? 'Falha no login');
      return;
    }
    const { data: appUser, error: appErr } = await supabase
      .from('app_users')
      .select('papel, ativo')
      .eq('id', data.user.id)
      .single();
    if (appErr || !appUser || !appUser.ativo) {
      await supabase.auth.signOut();
      setError('Usuário sem permissão de acesso');
      return;
    }
    useAuth.getState().setSession(data.user, appUser.papel as Papel);
    navigate('/chamada', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6"
      >
        <h1 className="text-2xl font-semibold">Presença</h1>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email && <p className="text-sm text-[var(--color-red)]">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" type="password" autoComplete="current-password" {...register('senha')} />
          {errors.senha && <p className="text-sm text-[var(--color-red)]">{errors.senha.message}</p>}
        </div>

        {error && <p className="text-sm text-[var(--color-red)]">{error}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
mkdir -p src/schemas
git add src/schemas/login.ts src/features/auth/login.tsx
git commit -m "feat(auth): add login page with email+senha"
```

---

### Task 27: RequireRole component + logout helper

**Files:**
- Create: `src/features/auth/require-role.tsx`
- Create: `src/features/auth/logout.ts`

- [ ] **Step 1: `require-role.tsx`**

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth, type Papel } from './useAuth';
import type { ReactNode } from 'react';

interface Props {
  role?: Papel | Papel[];
  children: ReactNode;
}

export function RequireRole({ role, children }: Props) {
  const { user, papel, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  }

  if (!user || !papel) {
    return <Navigate to="/login" replace />;
  }

  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(papel)) {
      return <Navigate to="/chamada" replace />;
    }
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: `logout.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { db } from '@/lib/db';

export async function logout() {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore — limpa local sempre
  }
  try {
    await db.delete();
  } catch {
    // ignore
  }
  try {
    sessionStorage.clear();
    localStorage.clear();
  } catch {
    // ignore
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    // ignore
  }
  useAuth.getState().clear();
  window.location.href = '/login';
}
```

**Nota:** `db` ainda não existe (criado na Task 35). Import vai falhar até lá. Aceitar erro até Phase D.

- [ ] **Step 3: Commit (build temporariamente quebrado, normal nesta fase)**

```bash
git add src/features/auth/require-role.tsx src/features/auth/logout.ts
git commit -m "feat(auth): add RequireRole guard + logout helper (db.delete pending)"
```

---

### Task 28: Idle timeout (15min)

**Files:**
- Create: `src/lib/idle.ts`
- Create: `src/features/auth/idle-timeout.ts`
- Test: `src/lib/idle.test.ts`

- [ ] **Step 1: Teste falhante**

`src/lib/idle.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('idle detector', () => {
  it('fires callback after idle period', async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const { startIdleDetector } = await import('./idle');
    const stop = startIdleDetector(1000, cb);
    vi.advanceTimersByTime(1100);
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
    vi.useRealTimers();
  });

  it('resets timer on activity', async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const { startIdleDetector } = await import('./idle');
    const stop = startIdleDetector(1000, cb);
    vi.advanceTimersByTime(500);
    window.dispatchEvent(new Event('mousemove'));
    vi.advanceTimersByTime(600);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Implementar `src/lib/idle.ts`**

```typescript
const EVENTS = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];

export function startIdleDetector(idleMs: number, onIdle: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;

  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(onIdle, idleMs);
  };

  EVENTS.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
  document.addEventListener('visibilitychange', reset);

  reset();

  return () => {
    clearTimeout(timer);
    EVENTS.forEach((ev) => window.removeEventListener(ev, reset));
    document.removeEventListener('visibilitychange', reset);
  };
}
```

- [ ] **Step 3: Run test**

```bash
pnpm test src/lib/idle.test.ts
```

Expected: PASS.

- [ ] **Step 4: Criar `src/features/auth/idle-timeout.ts`**

```typescript
import { useEffect } from 'react';
import { startIdleDetector } from '@/lib/idle';
import { logout } from './logout';
import { useAuth } from './useAuth';

const IDLE_MS = 15 * 60 * 1000;

export function useIdleLogout() {
  const user = useAuth((s) => s.user);
  useEffect(() => {
    if (!user) return;
    const stop = startIdleDetector(IDLE_MS, () => {
      logout();
    });
    return stop;
  }, [user]);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/idle.ts src/lib/idle.test.ts src/features/auth/idle-timeout.ts
git commit -m "feat(auth): add idle detector with 15min auto-logout hook"
```

---

### Task 29: App providers (QueryClient + Toaster)

**Files:**
- Create: `src/app/providers.tsx`
- Create: `src/lib/query.ts`

- [ ] **Step 1: `src/lib/query.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

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
    mutations: {
      networkMode: 'offlineFirst',
      retry: false,
    },
  },
});
```

- [ ] **Step 2: `src/app/providers.tsx`**

```typescript
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" theme="dark" />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
mkdir -p src/app
git add src/lib/query.ts src/app/providers.tsx
git commit -m "feat(app): add QueryClient + sonner Toaster providers"
```

---

### Task 30: Router

**Files:**
- Create: `src/app/router.tsx`
- Create: `src/pages/privacidade.tsx`
- Create: `src/pages/not-found.tsx`
- Create stubs: `src/pages/chamada.tsx`, `cadastro.tsx`, `historico.tsx`, `ranking.tsx`, `estoque.tsx`, `pedidos.tsx`, `admin.tsx`

- [ ] **Step 1: Stubs das pages (placeholder)**

`src/pages/chamada.tsx`:

```typescript
export function ChamadaPage() {
  return <div className="p-6"><h1 className="text-2xl">Chamada</h1><p>Em construção.</p></div>;
}
```

Criar arquivos similares para cadastro, historico, ranking, estoque, pedidos, admin.

- [ ] **Step 2: `src/pages/privacidade.tsx`**

```typescript
import { env } from '@/lib/env';

export function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl p-6 prose prose-invert">
      <h1>Política de Privacidade</h1>
      <p>
        Esta aplicação trata dados pessoais de assistidos da assistência social
        (nome, telefone, endereço, observações de visita) conforme a Lei
        13.709/2018 (LGPD).
      </p>
      <h2>Finalidade</h2>
      <p>
        Organização de assistência social, controle de presença em cultos,
        registro de entrega de cestas básicas e atendimento de pedidos de
        doação.
      </p>
      <h2>Base legal</h2>
      <p>
        Consentimento (Art. 7º, I LGPD) capturado verbalmente pelo voluntário
        e registrado no sistema com versão do termo, autor e data.
      </p>
      <h2>Retenção</h2>
      <p>
        Dados pessoais são anonimizados automaticamente após 5 anos sem
        atividade (presença/cesta/pedido).
      </p>
      <h2>Direitos do titular</h2>
      <ul>
        <li>Confirmar existência de tratamento</li>
        <li>Acessar dados</li>
        <li>Corrigir dados</li>
        <li>Anonimizar ou eliminar</li>
        <li>Portabilidade (exportação JSON)</li>
        <li>Revogar consentimento</li>
      </ul>
      <p>Para exercer estes direitos, contate o DPO:</p>
      <p>
        <strong>{env.DPO_NOME}</strong>
        <br />
        <a href={`mailto:${env.DPO_EMAIL}`}>{env.DPO_EMAIL}</a>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: `src/pages/not-found.tsx`**

```typescript
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl">Página não encontrada</h1>
      <Link to="/chamada" className="text-[var(--color-primary)] underline">
        Voltar
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: `src/app/router.tsx`**

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoginPage } from '@/features/auth/login';
import { RequireRole } from '@/features/auth/require-role';
import { AppShell } from './shell';
import { ChamadaPage } from '@/pages/chamada';
import { CadastroPage } from '@/pages/cadastro';
import { HistoricoPage } from '@/pages/historico';
import { RankingPage } from '@/pages/ranking';
import { EstoquePage } from '@/pages/estoque';
import { PedidosPage } from '@/pages/pedidos';
import { AdminPage } from '@/pages/admin';
import { PrivacidadePage } from '@/pages/privacidade';
import { NotFoundPage } from '@/pages/not-found';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/privacidade', element: <PrivacidadePage /> },
  {
    path: '/',
    element: (
      <RequireRole>
        <AppShell />
      </RequireRole>
    ),
    children: [
      { index: true, element: <ChamadaPage /> },
      { path: 'chamada', element: <ChamadaPage /> },
      { path: 'cadastro', element: <CadastroPage /> },
      { path: 'historico', element: <HistoricoPage /> },
      { path: 'ranking', element: <RankingPage /> },
      { path: 'estoque', element: <EstoquePage /> },
      { path: 'pedidos', element: <PedidosPage /> },
      {
        path: 'admin/*',
        element: (
          <RequireRole role="admin">
            <AdminPage />
          </RequireRole>
        ),
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 5: Commit**

```bash
mkdir -p src/pages
git add src/pages/ src/app/router.tsx
git commit -m "feat(app): add router with public + protected routes, page stubs"
```

---

### Task 31: AppShell (bottom nav + idle wiring + sync status placeholder)

**Files:**
- Create: `src/app/shell.tsx`
- Create: `src/components/sync-status.tsx`

- [ ] **Step 1: `src/components/sync-status.tsx` (placeholder, conecta na Phase D)**

```typescript
export function SyncStatus() {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return (
    <div
      className="fixed right-3 top-3 z-50 size-3 rounded-full"
      style={{ background: online ? 'var(--color-green)' : 'var(--color-red)' }}
      title={online ? 'Online' : 'Offline'}
    />
  );
}
```

- [ ] **Step 2: `src/app/shell.tsx`**

```typescript
import { NavLink, Outlet } from 'react-router-dom';
import { Users, CheckSquare, History, Trophy, Package, Gift, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { useIdleLogout } from '@/features/auth/idle-timeout';
import { logout } from '@/features/auth/logout';
import { SyncStatus } from '@/components/sync-status';
import { cn } from '@/lib/cn';

const tabs = [
  { to: '/chamada', label: 'Chamada', icon: CheckSquare, role: undefined },
  { to: '/cadastro', label: 'Cadastros', icon: Users, role: undefined },
  { to: '/historico', label: 'Histórico', icon: History, role: undefined },
  { to: '/ranking', label: 'Ranking', icon: Trophy, role: undefined },
  { to: '/estoque', label: 'Estoque', icon: Package, role: undefined },
  { to: '/pedidos', label: 'Pedidos', icon: Gift, role: undefined },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, role: 'admin' as const },
];

export function AppShell() {
  useIdleLogout();
  const papel = useAuth((s) => s.papel);

  const visibleTabs = tabs.filter((t) => !t.role || t.role === papel);

  return (
    <div className="flex h-screen flex-col">
      <SyncStatus />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 flex items-stretch justify-around border-t border-[var(--color-border)] bg-[var(--color-bg-nav)] pb-[env(safe-area-inset-bottom)]">
        {visibleTabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-xs text-[var(--color-text-muted)]',
                isActive && 'text-[var(--color-text)]',
              )
            }
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => logout()}
          className="flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-xs text-[var(--color-text-muted)]"
          type="button"
          aria-label="Sair"
        >
          <LogOut className="size-5" />
          <span>Sair</span>
        </button>
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/shell.tsx src/components/sync-status.tsx
git commit -m "feat(app): add AppShell with bottom nav + idle wiring + role-filtered tabs"
```

---

### Task 32: App.tsx final wiring

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Substituir App.tsx**

```typescript
import { useEffect, useState } from 'react';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';
import { bootstrapAuth } from './features/auth/bootstrap';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bootstrapAuth().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  }

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
pnpm run typecheck
```

Pode haver erro em `logout.ts` por `db` não existir. Workaround temporário: deixar `db.delete()` em try/catch e silenciar lint. Aceitar até Task 35 onde `db` é criado.

Se erro de import, comentar `import { db } from '@/lib/db';` em `logout.ts` temporariamente.

- [ ] **Step 3: Run dev**

```bash
pnpm run dev
```

Abrir `http://localhost:5173`. Deve redirecionar pra `/login`. Tentar login com admin criado na Task 21. Esperado: navega pra `/chamada`. Bottom nav visível, tab "Admin" visível (papel admin). Logout funciona.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): wire bootstrap + providers + router in App entry"
```

---

### Task 33: Smoke tests E2E mínimos (login flow)

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/login.spec.ts`

- [ ] **Step 1: `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: `tests/e2e/login.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('redirects to login when not authenticated', async ({ page }) => {
  await page.goto('/chamada');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('h1')).toContainText('Presença');
});

test('login form shows validation errors', async ({ page }) => {
  await page.goto('/login');
  await page.click('button[type=submit]');
  await expect(page.getByText('Email inválido')).toBeVisible();
});

test('privacidade page is public', async ({ page }) => {
  await page.goto('/privacidade');
  await expect(page.locator('h1')).toContainText('Política de Privacidade');
});
```

- [ ] **Step 3: Install browsers**

```bash
pnpm exec playwright install chromium
```

- [ ] **Step 4: Run e2e**

```bash
pnpm run test:e2e
```

Expected: 3 testes passam.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/login.spec.ts
git commit -m "test(e2e): add Playwright config and login smoke tests"
```

---

### Task 34: Atualizar CI com E2E e env vars de teste

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Adicionar job E2E**

Adicionar ao final do `ci.yml`:

```yaml
  e2e:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - name: E2E
        run: pnpm run test:e2e
        env:
          VITE_SUPABASE_URL: https://test.supabase.co
          VITE_SUPABASE_ANON_KEY: eyJtest_ci
          VITE_DPO_NOME: CI DPO
          VITE_DPO_EMAIL: ci@test.com
          VITE_APP_VERSION: ci
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add e2e job with Playwright"
```

---

## Phase D — Data layer

### Task 35: Dexie schema

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/types/domain.ts`
- Test: `src/lib/db.test.ts`

- [ ] **Step 1: Tipos de domínio**

`src/types/domain.ts`:

```typescript
export type Grupo = 'evangelizacao' | 'mocidade' | 'adulto' | 'gestante';
export type Categoria = 'alimento-doacao' | 'alimento-interno' | 'limpeza';
export type PedidoStatus = 'pendente' | 'atendido';

export interface Pessoa {
  id: string;
  nome: string;
  grupo: Grupo;
  familia_id: string | null;
  telefone: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  visitada: boolean;
  apta_cesta: boolean | null;
  visita_obs: string | null;
  excluir_ranking: boolean;
  ativo: boolean;
  anonimizado_em: string | null;
  anonimizado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Familia {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Chamada {
  id: string;
  data: string;
  criado_em: string;
}

export interface Presenca {
  id: string;
  chamada_id: string;
  pessoa_id: string;
  presente: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Cesta {
  id: string;
  pessoa_id: string;
  data: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Item {
  id: string;
  nome: string;
  categoria: Categoria;
  quantidade: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Pedido {
  id: string;
  pessoa_id: string | null;
  familia_id: string | null;
  item: string;
  quantidade: number;
  observacao: string | null;
  status: PedidoStatus;
  solicitado_em: string;
  atendido_em: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface SyncQueueItem {
  id?: number;
  table: 'pessoas' | 'familias' | 'chamadas' | 'presencas' | 'cestas' | 'itens' | 'pedidos' | 'pessoa_consents';
  operation: 'upsert' | 'delete';
  data: any;
  user_id: string;
  attempts: number;
  last_error?: string;
  attempted_at?: number;
  timestamp: number;
}
```

- [ ] **Step 2: Teste falhante**

`src/lib/db.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';

describe('db (Dexie)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('puts and gets pessoa', async () => {
    await db.pessoas.put({
      id: 'p1', nome: 'TEST', grupo: 'adulto', familia_id: null,
      telefone: null, rua: null, numero: null, complemento: null,
      bairro: null, cep: null, visitada: false, apta_cesta: null,
      visita_obs: null, excluir_ranking: false, ativo: true,
      anonimizado_em: null, anonimizado_por: null,
      criado_em: '2026-05-15T00:00:00Z', atualizado_em: '2026-05-15T00:00:00Z',
    });
    const found = await db.pessoas.get('p1');
    expect(found?.nome).toBe('TEST');
  });

  it('enqueues sync item', async () => {
    await db.sync_queue.add({
      table: 'pessoas',
      operation: 'upsert',
      data: { id: 'p1' },
      user_id: 'u1',
      attempts: 0,
      timestamp: Date.now(),
    });
    const all = await db.sync_queue.toArray();
    expect(all).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Implementar `src/lib/db.ts`**

```typescript
import Dexie, { type Table } from 'dexie';
import type {
  Pessoa, Familia, Chamada, Presenca, Cesta, Item, Pedido, SyncQueueItem,
} from '@/types/domain';

export class PresencaDB extends Dexie {
  pessoas!: Table<Pessoa, string>;
  familias!: Table<Familia, string>;
  chamadas!: Table<Chamada, string>;
  presencas!: Table<Presenca, string>;
  cestas!: Table<Cesta, string>;
  itens!: Table<Item, string>;
  pedidos!: Table<Pedido, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super('presenca-db');
    this.version(1).stores({
      pessoas: 'id, grupo, ativo, familia_id, excluir_ranking, anonimizado_em',
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

- [ ] **Step 4: Reabrir `src/features/auth/logout.ts` e descomentar import**

(Se foi comentado na Task 32, agora pode descomentar.)

- [ ] **Step 5: Run test**

```bash
pnpm test src/lib/db.test.ts
```

Expected: PASS (com fake-indexeddb do test-setup.ts).

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.ts src/lib/db.test.ts src/types/domain.ts
git commit -m "feat(db): add Dexie schema with all entity tables + sync_queue"
```

---

### Task 36: Sync engine — enqueue + push

**Files:**
- Create: `src/lib/sync.ts`
- Test: `src/lib/sync.test.ts`

- [ ] **Step 1: Teste enqueue**

`src/lib/sync.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from './db';

describe('sync engine', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('enqueueSync adds item to sync_queue', async () => {
    const { enqueueSync } = await import('./sync');
    await enqueueSync({
      table: 'pessoas',
      operation: 'upsert',
      data: { id: 'p1' },
      user_id: 'u1',
    });
    const queue = await db.sync_queue.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0].table).toBe('pessoas');
    expect(queue[0].attempts).toBe(0);
  });
});
```

- [ ] **Step 2: Implementar `src/lib/sync.ts`**

```typescript
import { db } from './db';
import { supabase } from './supabase';
import type { SyncQueueItem } from '@/types/domain';

let inProgress = false;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

export async function enqueueSync(
  item: Omit<SyncQueueItem, 'id' | 'attempts' | 'timestamp'>,
): Promise<void> {
  await db.sync_queue.add({
    ...item,
    attempts: 0,
    timestamp: Date.now(),
  });
  scheduleSync();
}

export function scheduleSync(): void {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void runSync();
  }, 500);
}

export async function runSync(): Promise<void> {
  if (inProgress) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  inProgress = true;

  try {
    const queue = await db.sync_queue.orderBy('timestamp').toArray();
    for (const item of queue) {
      try {
        if (item.operation === 'delete') {
          const { error } = await supabase.from(item.table).delete().eq('id', item.data.id);
          if (error) throw error;
        } else {
          const onConflict = item.table === 'presencas'
            ? 'chamada_id,pessoa_id'
            : item.table === 'chamadas'
            ? 'data'
            : 'id';
          const { error } = await supabase.from(item.table).upsert(item.data, { onConflict });
          if (error) throw error;
        }
        await db.sync_queue.delete(item.id!);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await db.sync_queue.update(item.id!, {
          attempts: item.attempts + 1,
          last_error: message,
          attempted_at: Date.now(),
        });
      }
    }
    await pullChanges();
  } finally {
    inProgress = false;
  }
}

async function pullChanges(): Promise<void> {
  const tables: SyncQueueItem['table'][] = [
    'familias', 'pessoas', 'chamadas', 'presencas', 'cestas', 'itens', 'pedidos',
  ];

  for (const tableName of tables) {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error || !data) continue;
    const table = (db as any)[tableName];
    if (!table) continue;
    await db.transaction('rw', table, async () => {
      for (const row of data) {
        const local = await table.get(row.id);
        const localTs = local?.atualizado_em ?? '';
        if (!local || row.atualizado_em >= localTs) {
          await table.put(row);
        }
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', scheduleSync);
  setInterval(scheduleSync, 30_000);
}
```

- [ ] **Step 3: Run test**

```bash
pnpm test src/lib/sync.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sync.ts src/lib/sync.test.ts
git commit -m "feat(sync): add enqueue + push/pull engine with debounce + online detection"
```

---

### Task 37: SyncStatus component conectado

**Files:**
- Modify: `src/components/sync-status.tsx`

- [ ] **Step 1: Substituir placeholder**

```typescript
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

export function SyncStatus() {
  const online = useOnline();
  const queueCount = useLiveQuery(() => db.sync_queue.count(), [], 0);

  let color = 'var(--color-text-muted)';
  let title = 'Offline';
  if (online && queueCount === 0) {
    color = 'var(--color-green)';
    title = 'Sincronizado';
  } else if (online && queueCount > 0) {
    color = 'var(--color-yellow)';
    title = `Sincronizando (${queueCount})`;
  } else if (!online && queueCount > 0) {
    color = 'var(--color-red)';
    title = `Offline com ${queueCount} pendentes`;
  }

  return (
    <div
      className="fixed right-3 top-3 z-50 size-3 rounded-full"
      style={{ background: color }}
      title={title}
    />
  );
}
```

- [ ] **Step 2: Instalar dexie-react-hooks**

```bash
pnpm add dexie-react-hooks
```

- [ ] **Step 3: Build check**

```bash
pnpm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/components/sync-status.tsx package.json pnpm-lock.yaml
git commit -m "feat(ui): connect SyncStatus to dexie-react-hooks for live queue count"
```

---

### Task 38-44: Hooks por entidade (template TDD)

Cada hook segue mesmo padrão: query lê local, mutation grava local + enqueue. Mostrar 1 template completo (`use-pessoas`) e replicar para os demais.

---

### Task 38: `use-pessoas.ts`

**Files:**
- Create: `src/hooks/use-pessoas.ts`
- Test: `src/hooks/use-pessoas.test.ts`

- [ ] **Step 1: Teste falhante**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { db } from '@/lib/db';
import { usePessoas, useSavePessoa } from './use-pessoas';
import { useAuth } from '@/features/auth/useAuth';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('use-pessoas', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAuth.setState({ user: { id: 'u1' } as any, papel: 'admin', loading: false });
  });

  it('returns empty list initially', async () => {
    const { result } = renderHook(() => usePessoas(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('saves pessoa locally + enqueues sync', async () => {
    const { result } = renderHook(() => useSavePessoa(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ nome: 'TEST', grupo: 'adulto' });
    });
    const all = await db.pessoas.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].nome).toBe('TEST');
    const queue = await db.sync_queue.toArray();
    expect(queue).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Implementar**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import { useAuth } from '@/features/auth/useAuth';
import type { Pessoa } from '@/types/domain';

export function usePessoas() {
  return useQuery({
    queryKey: ['pessoas'],
    queryFn: async () => {
      const all = await db.pessoas.toArray();
      return all.filter((p) => p.ativo !== false && !p.anonimizado_em);
    },
  });
}

export function usePessoa(id: string | null | undefined) {
  return useQuery({
    queryKey: ['pessoa', id],
    queryFn: async () => {
      if (!id) return null;
      return await db.pessoas.get(id);
    },
    enabled: !!id,
  });
}

export function useSavePessoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Pessoa>) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();
      const existing = input.id ? await db.pessoas.get(input.id) : undefined;
      const pessoa: Pessoa = {
        id: input.id ?? crypto.randomUUID(),
        nome: (input.nome ?? '').toUpperCase(),
        grupo: input.grupo ?? 'adulto',
        familia_id: input.familia_id ?? null,
        telefone: input.telefone ?? null,
        rua: input.rua ?? null,
        numero: input.numero ?? null,
        complemento: input.complemento ?? null,
        bairro: input.bairro ?? null,
        cep: input.cep ?? null,
        visitada: input.visitada ?? false,
        apta_cesta: input.apta_cesta ?? null,
        visita_obs: input.visita_obs ?? null,
        excluir_ranking: input.excluir_ranking ?? false,
        ativo: input.ativo ?? true,
        anonimizado_em: existing?.anonimizado_em ?? null,
        anonimizado_por: existing?.anonimizado_por ?? null,
        criado_em: existing?.criado_em ?? now,
        atualizado_em: now,
      };

      await db.transaction('rw', db.pessoas, db.sync_queue, async () => {
        await db.pessoas.put(pessoa);
        await enqueueSync({
          table: 'pessoas',
          operation: 'upsert',
          data: pessoa,
          user_id: user.id,
        });
      });

      return pessoa;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pessoas'] });
    },
  });
}

export function useDeletePessoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.pessoas.get(id);
      if (!existing) return;

      const updated: Pessoa = {
        ...existing,
        ativo: false,
        atualizado_em: new Date().toISOString(),
      };

      await db.transaction('rw', db.pessoas, db.sync_queue, async () => {
        await db.pessoas.put(updated);
        await enqueueSync({
          table: 'pessoas',
          operation: 'upsert',
          data: updated,
          user_id: user.id,
        });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pessoas'] }),
  });
}
```

- [ ] **Step 3: Run test**

```bash
pnpm test src/hooks/use-pessoas.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
mkdir -p src/hooks
git add src/hooks/use-pessoas.ts src/hooks/use-pessoas.test.ts
git commit -m "feat(hooks): add use-pessoas with query + save + delete (soft) hooks"
```

---

### Task 39: `use-familias.ts`

**Files:**
- Create: `src/hooks/use-familias.ts`

- [ ] **Step 1: Implementar**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import { useAuth } from '@/features/auth/useAuth';
import type { Familia } from '@/types/domain';

export function useFamilias() {
  return useQuery({
    queryKey: ['familias'],
    queryFn: async () => {
      const all = await db.familias.toArray();
      return all.filter((f) => f.ativo !== false);
    },
  });
}

export function useFamilia(id: string | null | undefined) {
  return useQuery({
    queryKey: ['familia', id],
    queryFn: async () => (id ? await db.familias.get(id) : null),
    enabled: !!id,
  });
}

export function useSaveFamilia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Familia>) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const now = new Date().toISOString();
      const existing = input.id ? await db.familias.get(input.id) : undefined;
      const familia: Familia = {
        id: input.id ?? crypto.randomUUID(),
        nome: (input.nome ?? '').toUpperCase(),
        ativo: input.ativo ?? true,
        criado_em: existing?.criado_em ?? now,
        atualizado_em: now,
      };
      await db.transaction('rw', db.familias, db.sync_queue, async () => {
        await db.familias.put(familia);
        await enqueueSync({
          table: 'familias',
          operation: 'upsert',
          data: familia,
          user_id: user.id,
        });
      });
      return familia;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['familias'] }),
  });
}

export function useDeleteFamilia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.familias.get(id);
      if (!existing) return;
      const updated: Familia = { ...existing, ativo: false, atualizado_em: new Date().toISOString() };
      await db.transaction('rw', db.familias, db.sync_queue, async () => {
        await db.familias.put(updated);
        await enqueueSync({ table: 'familias', operation: 'upsert', data: updated, user_id: user.id });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['familias'] }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-familias.ts
git commit -m "feat(hooks): add use-familias with query + save + delete hooks"
```

---

### Task 40: `use-chamada.ts`

**Files:**
- Create: `src/hooks/use-chamada.ts`

- [ ] **Step 1: Implementar**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import { useAuth } from '@/features/auth/useAuth';
import type { Chamada } from '@/types/domain';

export function useChamadas() {
  return useQuery({
    queryKey: ['chamadas'],
    queryFn: async () => await db.chamadas.toArray(),
  });
}

export function useChamadaByData(data: string | null | undefined) {
  return useQuery({
    queryKey: ['chamada', data],
    queryFn: async () => {
      if (!data) return null;
      const all = await db.chamadas.where('data').equals(data).toArray();
      return all[0] ?? null;
    },
    enabled: !!data,
  });
}

export function useGetOrCreateChamada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: string): Promise<Chamada> => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');

      const existing = await db.chamadas.where('data').equals(data).first();
      if (existing) return existing;

      const now = new Date().toISOString();
      const chamada: Chamada = {
        id: `chamada-${data}`,
        data,
        criado_em: now,
      };
      await db.transaction('rw', db.chamadas, db.sync_queue, async () => {
        await db.chamadas.put(chamada);
        await enqueueSync({
          table: 'chamadas',
          operation: 'upsert',
          data: chamada,
          user_id: user.id,
        });
      });
      return chamada;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chamadas'] }),
  });
}

export function useDeleteChamada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const presencas = await db.presencas.where('chamada_id').equals(id).toArray();
      await db.transaction('rw', db.chamadas, db.presencas, db.sync_queue, async () => {
        await db.chamadas.delete(id);
        await db.sync_queue.add({
          table: 'chamadas',
          operation: 'delete',
          data: { id },
          user_id: user.id,
          attempts: 0,
          timestamp: Date.now(),
        });
        for (const p of presencas) {
          await db.presencas.delete(p.id);
          await db.sync_queue.add({
            table: 'presencas',
            operation: 'delete',
            data: { id: p.id },
            user_id: user.id,
            attempts: 0,
            timestamp: Date.now(),
          });
        }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chamadas'] });
      qc.invalidateQueries({ queryKey: ['presencas'] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-chamada.ts
git commit -m "feat(hooks): add use-chamada with get-or-create + delete (cascade presencas)"
```

---

### Task 41: `use-presencas.ts`

**Files:**
- Create: `src/hooks/use-presencas.ts`

- [ ] **Step 1: Implementar**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import { useAuth } from '@/features/auth/useAuth';
import type { Presenca } from '@/types/domain';

export function usePresencasByChamada(chamadaId: string | null | undefined) {
  return useQuery({
    queryKey: ['presencas', 'chamada', chamadaId],
    queryFn: async () => {
      if (!chamadaId) return [];
      return await db.presencas.where('chamada_id').equals(chamadaId).toArray();
    },
    enabled: !!chamadaId,
  });
}

export function useAllPresencas() {
  return useQuery({
    queryKey: ['presencas', 'all'],
    queryFn: async () => await db.presencas.toArray(),
  });
}

export function useSavePresenca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { chamada_id: string; pessoa_id: string; presente: boolean }) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const now = new Date().toISOString();
      const id = `presenca-${input.chamada_id}-${input.pessoa_id}`;
      const existing = await db.presencas.get(id);
      const presenca: Presenca = {
        id,
        chamada_id: input.chamada_id,
        pessoa_id: input.pessoa_id,
        presente: input.presente,
        criado_em: existing?.criado_em ?? now,
        atualizado_em: now,
      };
      await db.transaction('rw', db.presencas, db.sync_queue, async () => {
        await db.presencas.put(presenca);
        await enqueueSync({
          table: 'presencas',
          operation: 'upsert',
          data: presenca,
          user_id: user.id,
        });
      });
      return presenca;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['presencas', 'chamada', variables.chamada_id] });
      qc.invalidateQueries({ queryKey: ['presencas', 'all'] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-presencas.ts
git commit -m "feat(hooks): add use-presencas with deterministic IDs + save mutation"
```

---

### Task 42: `use-cestas.ts`

**Files:**
- Create: `src/hooks/use-cestas.ts`

- [ ] **Step 1: Implementar**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import { useAuth } from '@/features/auth/useAuth';
import type { Cesta } from '@/types/domain';

export function useCestas() {
  return useQuery({
    queryKey: ['cestas'],
    queryFn: async () => {
      const all = await db.cestas.toArray();
      return all.filter((c) => c.ativo !== false);
    },
  });
}

export function useSaveCesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pessoa_id: string; data: string }) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const now = new Date().toISOString();
      const cesta: Cesta = {
        id: crypto.randomUUID(),
        pessoa_id: input.pessoa_id,
        data: input.data,
        ativo: true,
        criado_em: now,
        atualizado_em: now,
      };
      await db.transaction('rw', db.cestas, db.sync_queue, async () => {
        await db.cestas.put(cesta);
        await enqueueSync({
          table: 'cestas',
          operation: 'upsert',
          data: cesta,
          user_id: user.id,
        });
      });
      return cesta;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cestas'] }),
  });
}

export function useDeleteCesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.cestas.get(id);
      if (!existing) return;
      const updated: Cesta = { ...existing, ativo: false, atualizado_em: new Date().toISOString() };
      await db.transaction('rw', db.cestas, db.sync_queue, async () => {
        await db.cestas.put(updated);
        await enqueueSync({ table: 'cestas', operation: 'upsert', data: updated, user_id: user.id });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cestas'] }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-cestas.ts
git commit -m "feat(hooks): add use-cestas with save + soft-delete"
```

---

### Task 43: `use-itens.ts`

**Files:**
- Create: `src/hooks/use-itens.ts`

- [ ] **Step 1: Implementar**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import { useAuth } from '@/features/auth/useAuth';
import type { Item } from '@/types/domain';

export function useItens() {
  return useQuery({
    queryKey: ['itens'],
    queryFn: async () => {
      const all = await db.itens.toArray();
      return all.filter((i) => i.ativo !== false);
    },
  });
}

export function useItem(id: string | null | undefined) {
  return useQuery({
    queryKey: ['item', id],
    queryFn: async () => (id ? await db.itens.get(id) : null),
    enabled: !!id,
  });
}

export function useSaveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Item>) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const now = new Date().toISOString();
      const existing = input.id ? await db.itens.get(input.id) : undefined;
      const item: Item = {
        id: input.id ?? crypto.randomUUID(),
        nome: (input.nome ?? '').toUpperCase(),
        categoria: input.categoria ?? 'alimento-doacao',
        quantidade: Math.max(0, input.quantidade ?? 0),
        ativo: input.ativo ?? true,
        criado_em: existing?.criado_em ?? now,
        atualizado_em: now,
      };
      await db.transaction('rw', db.itens, db.sync_queue, async () => {
        await db.itens.put(item);
        await enqueueSync({ table: 'itens', operation: 'upsert', data: item, user_id: user.id });
      });
      return item;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itens'] }),
  });
}

export function useUpdateItemQuantidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantidade }: { id: string; quantidade: number }) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.itens.get(id);
      if (!existing) return;
      const updated: Item = {
        ...existing,
        quantidade: Math.max(0, quantidade),
        atualizado_em: new Date().toISOString(),
      };
      await db.transaction('rw', db.itens, db.sync_queue, async () => {
        await db.itens.put(updated);
        await enqueueSync({ table: 'itens', operation: 'upsert', data: updated, user_id: user.id });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itens'] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.itens.get(id);
      if (!existing) return;
      const updated: Item = { ...existing, ativo: false, atualizado_em: new Date().toISOString() };
      await db.transaction('rw', db.itens, db.sync_queue, async () => {
        await db.itens.put(updated);
        await enqueueSync({ table: 'itens', operation: 'upsert', data: updated, user_id: user.id });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itens'] }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-itens.ts
git commit -m "feat(hooks): add use-itens with save + update quantidade + soft-delete"
```

---

### Task 44: `use-pedidos.ts`

**Files:**
- Create: `src/hooks/use-pedidos.ts`

- [ ] **Step 1: Implementar**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import { useAuth } from '@/features/auth/useAuth';
import type { Pedido } from '@/types/domain';

function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function usePedidos() {
  return useQuery({
    queryKey: ['pedidos'],
    queryFn: async () => {
      const all = await db.pedidos.toArray();
      return all.filter((p) => p.ativo !== false);
    },
  });
}

export function usePedido(id: string | null | undefined) {
  return useQuery({
    queryKey: ['pedido', id],
    queryFn: async () => (id ? await db.pedidos.get(id) : null),
    enabled: !!id,
  });
}

export function useSavePedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Pedido>) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const now = new Date().toISOString();
      const existing = input.id ? await db.pedidos.get(input.id) : undefined;
      const pedido: Pedido = {
        id: input.id ?? crypto.randomUUID(),
        pessoa_id: input.pessoa_id ?? null,
        familia_id: input.familia_id ?? null,
        item: (input.item ?? '').toUpperCase(),
        quantidade: input.quantidade ?? 1,
        observacao: input.observacao ?? null,
        status: input.status ?? 'pendente',
        solicitado_em: input.solicitado_em ?? todayDate(),
        atendido_em: input.atendido_em ?? null,
        ativo: input.ativo ?? true,
        criado_em: existing?.criado_em ?? now,
        atualizado_em: now,
      };
      await db.transaction('rw', db.pedidos, db.sync_queue, async () => {
        await db.pedidos.put(pedido);
        await enqueueSync({ table: 'pedidos', operation: 'upsert', data: pedido, user_id: user.id });
      });
      return pedido;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  });
}

export function useAtenderPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.pedidos.get(id);
      if (!existing) return;
      const updated: Pedido = {
        ...existing,
        status: 'atendido',
        atendido_em: todayDate(),
        atualizado_em: new Date().toISOString(),
      };
      await db.transaction('rw', db.pedidos, db.sync_queue, async () => {
        await db.pedidos.put(updated);
        await enqueueSync({ table: 'pedidos', operation: 'upsert', data: updated, user_id: user.id });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  });
}

export function useDeletePedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.pedidos.get(id);
      if (!existing) return;
      const updated: Pedido = { ...existing, ativo: false, atualizado_em: new Date().toISOString() };
      await db.transaction('rw', db.pedidos, db.sync_queue, async () => {
        await db.pedidos.put(updated);
        await enqueueSync({ table: 'pedidos', operation: 'upsert', data: updated, user_id: user.id });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-pedidos.ts
git commit -m "feat(hooks): add use-pedidos with save + atender + soft-delete"
```

---

## Phase E — Smoke test + handoff

### Task 45: Smoke completo manual

**Files:**
- Nenhum modificado

- [ ] **Step 1: Dev local**

```bash
pnpm run dev
```

- [ ] **Step 2: Checklist manual**

- [ ] Login com admin (Task 21) funciona
- [ ] Bottom nav mostra "Admin" pra admin
- [ ] Navegar entre todas as tabs (vazias mas renderizam stubs)
- [ ] Logout limpa IndexedDB (DevTools → Application → IndexedDB → presenca-db: deve sumir após logout)
- [ ] Idle timeout (alterar `IDLE_MS` em `idle-timeout.ts` pra `10_000` temporariamente pra testar) desloga em 10s sem interação
- [ ] Reverter `IDLE_MS` pra `15 * 60 * 1000`
- [ ] `/privacidade` acessível sem login

- [ ] **Step 3: Run all tests**

```bash
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run test:e2e
```

Expected: tudo verde.

- [ ] **Step 4: Build prod**

```bash
pnpm run build
pnpm run preview
```

Acessar `http://localhost:4173`, repetir smoke. Build size razoável (<500KB gzipped).

---

### Task 46: Push final + handoff

**Files:**
- Create: `docs/superpowers/plans/2026-05-15-plan-2-foundation-handoff.md`

- [ ] **Step 1: Doc de handoff**

```markdown
# Plan 2 — Handoff

**Status:** Concluído
**Branch:** `refactor/react-lgpd`
**Próximo:** Plan 3 (features migradas) — escrever quando hora chegar

## Estado entregue

- Vite + React 19 + TypeScript scaffold
- Tailwind v4 + shadcn/ui base
- Supabase backend: 9 migrations aplicadas (idempotentes), RLS por papel, 4 Edge Functions, cron anonimização
- Auth: login email+senha, RBAC admin/operador via app_users, idle 15min, logout completo
- Data layer: Dexie + TanStack Query + sync engine offline-first
- Hooks: pessoas, familias, chamada, presencas, cestas, itens, pedidos
- E2E mínimo: login redirects, privacidade public

## Próximos passos (Plan 3)

Migrar features uma a uma (Chamada → Cadastro → Histórico → Ranking → Estoque → Pedidos).

Referência do código vanilla: `legacy/js/*`.

## Anti-regressão crítico

- RLS em produção restritivo. Vanilla legacy (em `main`) só funciona se policies temp `anon_legacy_temp` da migration 006 estiverem ativas.
- Anon key rotacionada no Plan 1. Nova key em `.env.local` (dev) e Vercel env (preview/prod).
```

- [ ] **Step 2: Commit + push**

```bash
git add docs/superpowers/plans/2026-05-15-plan-2-foundation-handoff.md
git commit -m "docs: add Plan 2 handoff doc"
git push origin refactor/react-lgpd
```

- [ ] **Step 3: Verificar preview Vercel funcional**

URL preview da branch → login com admin → navegar tabs → logout. Esperado: tudo OK.

---

## Definition of Done (Plan 2)

- [x] Vite + React + TS scaffold funcional
- [x] Tailwind v4 + shadcn/ui base
- [x] CI verde (lint + typecheck + test + e2e + build)
- [x] Supabase: 9 migrations aplicadas (001-009)
- [x] 4 Edge Functions deployadas (anonymize, create-user, reset-password, export)
- [x] RLS policies admin + operador
- [x] Cron mensal anonimização agendado
- [x] Login admin funcional
- [x] Idle timeout 15min testado
- [x] Logout limpa IndexedDB + caches
- [x] Data layer Dexie + sync engine + 7 hooks
- [x] Preview Vercel acessível e funcional
- [x] Doc de handoff commitada

## Riscos remanescentes pra Plan 3+

| Risco | Mitigação |
|---|---|
| Vanilla legacy quebra em prod se policies `anon_legacy_temp` removidas cedo | Manter até cutover (Plan 4) |
| Sync engine tem race condition em queue grande | Mitigar com retry cap + UI alerta admin (Plan 3 backlog) |
| Edge Function `anonymize-inactive` não tem tests automatizados | Aceito; valida via execução manual no cron |
| Primeiro admin senha temporária pode vazar | Comunicar via canal cifrado, exigir troca no 1º login (Plan 3 add `/conta` page) |
