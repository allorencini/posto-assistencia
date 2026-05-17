# Plan 3 — Features Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar 7 features do app vanilla legacy (Cadastro, Chamada, Histórico, Ranking, Estoque, Pedidos) + painel Admin LGPD para React. Substitui páginas stub criadas no Plan 2 por implementações funcionais. Preserva comportamento atual + adiciona captura de consentimento + integra audit log.

**Architecture:** Cada feature em `src/features/<x>/` com page principal + componentes locais + schemas Zod + reuso dos hooks Dexie+TanStack Query criados no Plan 2. UI via shadcn/ui + Tailwind. Forms via RHF + Zod. Logout limpa IndexedDB já implementado.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, Zustand, Dexie, React Hook Form, Zod, shadcn/ui (Radix), Tailwind v4, sonner toast, lucide-react icons. Tudo já instalado no Plan 2.

**Spec:** [docs/superpowers/specs/2026-05-15-presenca-react-lgpd-design.md](../specs/2026-05-15-presenca-react-lgpd-design.md) — Fases 5-6.

**Branch:** `refactor/react-lgpd` (continua do Plan 2).

**Pré-requisitos:**
- Plan 2 concluído (migrations aplicadas, Edge Functions deployed, auth funcional)
- App login OK, navega tabs stub
- `pnpm run lint && pnpm run typecheck && pnpm test && pnpm run build` todos passam

**Referência:** Lógica vanilla em `legacy/js/*.js`. Converter pra TSX preservando UX (busca DOM-filter, accordion, etc).

---

## Estrutura do plano

- **Phase F** — Schemas Zod compartilhados (Tasks 1-5)
- **Phase G** — Componentes UI reutilizáveis (Tasks 6-9)
- **Phase H** — Cadastro: pessoas + famílias + itens (Tasks 10-22)
- **Phase I** — Chamada (Tasks 23-25)
- **Phase J** — Histórico (Tasks 26-29)
- **Phase K** — Ranking (Tasks 30-32)
- **Phase L** — Estoque (Tasks 33-35)
- **Phase M** — Pedidos (Tasks 36-39)
- **Phase N** — Admin: usuários + audit + LGPD + termos (Tasks 40-50)
- **Phase O** — Smoke test + handoff (Tasks 51-52)

---

## Phase F — Schemas Zod

### Task 1: schema pessoa

**Files:**
- Create: `src/schemas/pessoa.ts`

- [ ] **Step 1: Criar schema**

```typescript
import { z } from 'zod';

export const GRUPOS = ['evangelizacao', 'mocidade', 'adulto', 'gestante'] as const;

export const PessoaInputSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório (mínimo 2 caracteres)').max(200).transform((s) => s.trim().toUpperCase()),
  grupo: z.enum(GRUPOS),
  telefone: z.string().regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, 'Telefone inválido').optional().or(z.literal('')),
  familia_id: z.string().uuid().nullable().optional().or(z.literal('')),
  rua: z.string().max(200).optional().or(z.literal('')),
  numero: z.string().max(20).optional().or(z.literal('')),
  complemento: z.string().max(100).optional().or(z.literal('')),
  bairro: z.string().max(100).optional().or(z.literal('')),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional().or(z.literal('')),
  visitada: z.boolean().default(false),
  apta_cesta: z.boolean().nullable().optional(),
  visita_obs: z.string().max(500).nullable().optional(),
  excluir_ranking: z.boolean().default(false),
  consent_declarado: z.boolean().refine((v) => v === true, { message: 'Captura de consentimento obrigatória' }),
});

export type PessoaInput = z.infer<typeof PessoaInputSchema>;
```

- [ ] **Step 2: Commit**

```bash
cd c:/projects/presenca
git add src/schemas/pessoa.ts
git commit -m "feat(schemas): add pessoa zod schema with consent requirement"
```

---

### Task 2: schema familia

**Files:**
- Create: `src/schemas/familia.ts`

- [ ] **Step 1: Criar**

```typescript
import { z } from 'zod';

export const FamiliaInputSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório').max(200).transform((s) => s.trim().toUpperCase()),
  membros: z.array(z.object({ id: z.string().uuid(), nome: z.string() })).default([]),
});

export type FamiliaInput = z.infer<typeof FamiliaInputSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/schemas/familia.ts
git commit -m "feat(schemas): add familia zod schema with members"
```

---

### Task 3: schema item

**Files:**
- Create: `src/schemas/item.ts`

- [ ] **Step 1: Criar**

```typescript
import { z } from 'zod';

export const CATEGORIAS = ['alimento-doacao', 'alimento-interno', 'limpeza'] as const;

export const ItemInputSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório').max(200).transform((s) => s.trim().toUpperCase()),
  categoria: z.enum(CATEGORIAS),
  quantidade: z.coerce.number().int().min(0).default(0),
});

export type ItemInput = z.infer<typeof ItemInputSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/schemas/item.ts
git commit -m "feat(schemas): add item zod schema"
```

---

### Task 4: schema pedido

**Files:**
- Create: `src/schemas/pedido.ts`

- [ ] **Step 1: Criar**

```typescript
import { z } from 'zod';

export const PedidoInputSchema = z.object({
  pessoa_id: z.string().uuid().nullable().optional(),
  familia_id: z.string().uuid().nullable().optional(),
  item: z.string().min(2, 'Item obrigatório').max(200).transform((s) => s.trim().toUpperCase()),
  quantidade: z.coerce.number().int().min(1).default(1),
  observacao: z.string().max(500).nullable().optional(),
}).refine((v) => !!v.pessoa_id || !!v.familia_id, {
  message: 'Selecione destinatário (pessoa ou família)',
  path: ['pessoa_id'],
});

export type PedidoInput = z.infer<typeof PedidoInputSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/schemas/pedido.ts
git commit -m "feat(schemas): add pedido zod schema"
```

---

### Task 5: schema admin (criação user)

**Files:**
- Create: `src/schemas/admin-user.ts`

- [ ] **Step 1: Criar**

```typescript
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  nome: z.string().min(2).max(200),
  papel: z.enum(['admin', 'operador']),
  senha_temporaria: z.string().min(8, 'Mínimo 8 caracteres').max(72),
});

export const ResetPasswordSchema = z.object({
  target_user_id: z.string().uuid(),
  nova_senha: z.string().min(8).max(72),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/schemas/admin-user.ts
git commit -m "feat(schemas): add admin user creation + password reset schemas"
```

---

## Phase G — Componentes UI reutilizáveis

### Task 6: SearchInput (DOM-filter, mantém keyboard mobile)

**Files:**
- Create: `src/components/search-input.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface Props {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function SearchInput({ placeholder = 'Buscar...', value, onChange, className }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.value !== value) ref.current.value = value;
  }, [value]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
      <input
        ref={ref}
        type="text"
        autoComplete="off"
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--color-primary)]"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/search-input.tsx
git commit -m "feat(ui): add SearchInput component (preserves mobile keyboard)"
```

---

### Task 7: FilterPills

**Files:**
- Create: `src/components/filter-pills.tsx`

- [ ] **Step 1: Criar**

```typescript
import { cn } from '@/lib/cn';

interface Option { value: string; label: string }
interface Props {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function FilterPills({ options, value, onChange, className }: Props) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-full border px-3 py-1 text-sm transition-colors',
            value === opt.value
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
              : 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-muted)]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/filter-pills.tsx
git commit -m "feat(ui): add FilterPills component"
```

---

### Task 8: EmptyState

**Files:**
- Create: `src/components/empty-state.tsx`

- [ ] **Step 1: Criar**

```typescript
import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title = 'Nada por aqui', description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {icon && <div className="text-4xl">{icon}</div>}
      <div className="space-y-1">
        <h3 className="text-lg font-medium">{title}</h3>
        {description && <p className="text-sm text-[var(--color-text-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/empty-state.tsx
git commit -m "feat(ui): add EmptyState component"
```

---

### Task 9: ConfirmDialog

**Files:**
- Create: `src/components/confirm-dialog.tsx`

- [ ] **Step 1: Criar**

```typescript
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open, onOpenChange, title, description,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'default', onConfirm, loading,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/confirm-dialog.tsx
git commit -m "feat(ui): add ConfirmDialog component"
```

---

## Phase H — Cadastro

### Task 10: useConsentTerm hook (busca termo ativo)

**Files:**
- Create: `src/hooks/use-consent-term.ts`

- [ ] **Step 1: Criar**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useActiveConsentTerm() {
  return useQuery({
    queryKey: ['consent_term', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consent_terms')
        .select('id, versao, texto')
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-consent-term.ts
git commit -m "feat(hooks): add use-consent-term for active term lookup"
```

---

### Task 11: usePessoaConsent (registra captura)

**Files:**
- Create: `src/hooks/use-pessoa-consent.ts`

- [ ] **Step 1: Criar**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';

interface RegisterArgs {
  pessoa_id: string;
  consent_term_id: string;
  metodo?: 'verbal' | 'escrito';
}

export function useRegisterConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: RegisterArgs) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('pessoa_consents')
        .insert({
          pessoa_id: args.pessoa_id,
          consent_term_id: args.consent_term_id,
          declarado_por: user.id,
          metodo: args.metodo ?? 'verbal',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pessoa_consents', vars.pessoa_id] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-pessoa-consent.ts
git commit -m "feat(hooks): add use-register-consent mutation"
```

---

### Task 12: ConsentModal

**Files:**
- Create: `src/features/cadastro/consent-modal.tsx`

- [ ] **Step 1: Criar**

```typescript
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useActiveConsentTerm } from '@/hooks/use-consent-term';
import { useState } from 'react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAccept: (termId: string) => void;
}

export function ConsentModal({ open, onOpenChange, onAccept }: Props) {
  const { data: term, isLoading } = useActiveConsentTerm();
  const [checked, setChecked] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setChecked(false); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Captura de consentimento — LGPD</DialogTitle>
          <DialogDescription>
            Leia o termo abaixo para o titular dos dados. Marque a confirmação após a leitura e consentimento verbal.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-4 text-sm text-[var(--color-text-muted)]">Carregando termo...</div>
        ) : !term ? (
          <div className="py-4 text-sm text-[var(--color-red)]">Nenhum termo ativo encontrado.</div>
        ) : (
          <>
            <div className="max-h-72 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-sm leading-relaxed">
              <p className="mb-2 text-xs text-[var(--color-text-muted)]">Versão: {term.versao}</p>
              <p>{term.texto}</p>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => setChecked(v === true)}
                id="consent-check"
                className="mt-1"
              />
              <span>Li o termo acima ao titular dos dados e ele(a) consentiu verbalmente com o tratamento.</span>
            </label>
          </>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!checked || !term}
            onClick={() => {
              if (term) {
                onAccept(term.id);
                setChecked(false);
              }
            }}
          >
            Confirmar consentimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/cadastro/consent-modal.tsx
git commit -m "feat(cadastro): add ConsentModal for LGPD consent capture"
```

---

### Task 13: PessoaForm (modal create/edit pessoa)

**Files:**
- Create: `src/features/cadastro/pessoa-form.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { PessoaInputSchema, type PessoaInput, GRUPOS } from '@/schemas/pessoa';
import { useSavePessoa, usePessoa } from '@/hooks/use-pessoas';
import { useFamilias } from '@/hooks/use-familias';
import { useRegisterConsent } from '@/hooks/use-pessoa-consent';
import { useAuth } from '@/features/auth/useAuth';
import { ConsentModal } from './consent-modal';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pessoaId?: string | null;
}

const GRUPO_LABEL: Record<typeof GRUPOS[number], string> = {
  evangelizacao: 'Evangelização',
  mocidade: 'Mocidade',
  adulto: 'Adulto',
  gestante: 'Gestante',
};

export function PessoaForm({ open, onOpenChange, pessoaId }: Props) {
  const { data: existing } = usePessoa(pessoaId);
  const { data: familias = [] } = useFamilias();
  const savePessoa = useSavePessoa();
  const registerConsent = useRegisterConsent();
  const papel = useAuth((s) => s.papel);
  const isAdmin = papel === 'admin';

  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingTermId, setPendingTermId] = useState<string | null>(null);

  const {
    register, handleSubmit, control, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<PessoaInput>({
    resolver: zodResolver(PessoaInputSchema),
    defaultValues: {
      nome: '', grupo: 'adulto', telefone: '', familia_id: '',
      rua: '', numero: '', complemento: '', bairro: '', cep: '',
      visitada: false, apta_cesta: null, visita_obs: '',
      excluir_ranking: false, consent_declarado: false,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (existing) {
      reset({
        nome: existing.nome,
        grupo: existing.grupo,
        telefone: existing.telefone ?? '',
        familia_id: existing.familia_id ?? '',
        rua: existing.rua ?? '',
        numero: existing.numero ?? '',
        complemento: existing.complemento ?? '',
        bairro: existing.bairro ?? '',
        cep: existing.cep ?? '',
        visitada: existing.visitada,
        apta_cesta: existing.apta_cesta,
        visita_obs: existing.visita_obs ?? '',
        excluir_ranking: existing.excluir_ranking,
        consent_declarado: true,
      });
    } else {
      reset({
        nome: '', grupo: 'adulto', telefone: '', familia_id: '',
        rua: '', numero: '', complemento: '', bairro: '', cep: '',
        visitada: false, apta_cesta: null, visita_obs: '',
        excluir_ranking: false, consent_declarado: false,
      });
    }
  }, [existing, open, reset]);

  const onSubmit = async (input: PessoaInput) => {
    try {
      const saved = await savePessoa.mutateAsync({
        id: pessoaId ?? undefined,
        nome: input.nome,
        grupo: input.grupo,
        telefone: input.telefone || null,
        familia_id: input.familia_id || null,
        rua: input.rua || null,
        numero: input.numero || null,
        complemento: input.complemento || null,
        bairro: input.bairro || null,
        cep: input.cep || null,
        visitada: input.visitada,
        apta_cesta: input.apta_cesta ?? null,
        visita_obs: input.visita_obs || null,
        excluir_ranking: input.excluir_ranking,
      });
      if (!pessoaId && pendingTermId) {
        await registerConsent.mutateAsync({
          pessoa_id: saved.id,
          consent_term_id: pendingTermId,
        });
      }
      toast.success(pessoaId ? 'Pessoa atualizada' : 'Pessoa cadastrada');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pessoaId ? 'Editar pessoa' : 'Nova pessoa'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...register('nome')} autoComplete="off" />
              {errors.nome && <p className="text-sm text-[var(--color-red)]">{errors.nome.message}</p>}
            </div>

            <div>
              <Label>Grupo *</Label>
              <Controller
                control={control}
                name="grupo"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRUPOS.map((g) => (
                        <SelectItem key={g} value={g}>{GRUPO_LABEL[g]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" {...register('telefone')} autoComplete="off" placeholder="(11) 99999-9999" />
              {errors.telefone && <p className="text-sm text-[var(--color-red)]">{errors.telefone.message}</p>}
            </div>

            <div>
              <Label>Família</Label>
              <Controller
                control={control}
                name="familia_id"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v === '__none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Sem família" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Sem família</SelectItem>
                      {familias.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {isAdmin && (
              <>
                <div className="border-t border-[var(--color-border)] pt-4">
                  <h4 className="mb-2 text-sm font-semibold">Endereço (admin)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label htmlFor="rua">Rua</Label>
                      <Input id="rua" {...register('rua')} />
                    </div>
                    <div>
                      <Label htmlFor="numero">Número</Label>
                      <Input id="numero" {...register('numero')} />
                    </div>
                    <div>
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input id="complemento" {...register('complemento')} />
                    </div>
                    <div>
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input id="bairro" {...register('bairro')} />
                    </div>
                    <div>
                      <Label htmlFor="cep">CEP</Label>
                      <Input id="cep" {...register('cep')} placeholder="00000-000" />
                      {errors.cep && <p className="text-sm text-[var(--color-red)]">{errors.cep.message}</p>}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[var(--color-border)] pt-4">
                  <h4 className="mb-2 text-sm font-semibold">Visita social (admin)</h4>
                  <label className="flex items-center gap-2">
                    <Controller
                      control={control}
                      name="visitada"
                      render={({ field }) => (
                        <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                      )}
                    />
                    <span className="text-sm">Pessoa visitada</span>
                  </label>
                  <div className="mt-2">
                    <Label>Apta a cesta?</Label>
                    <Controller
                      control={control}
                      name="apta_cesta"
                      render={({ field }) => (
                        <Select
                          value={field.value === true ? 'sim' : field.value === false ? 'nao' : ''}
                          onValueChange={(v) => field.onChange(v === 'sim' ? true : v === 'nao' ? false : null)}
                        >
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sim">Sim</SelectItem>
                            <SelectItem value="nao">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="mt-2">
                    <Label htmlFor="visita_obs">Observação visita</Label>
                    <Input id="visita_obs" {...register('visita_obs')} />
                  </div>
                </div>
              </>
            )}

            <div className="border-t border-[var(--color-border)] pt-4">
              <label className="flex items-start gap-2 text-sm">
                <Controller
                  control={control}
                  name="excluir_ranking"
                  render={({ field }) => (
                    <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-1" />
                  )}
                />
                <span>
                  Excluir do ranking
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    Não aparece na lista de ranking. Presença e cestas continuam funcionando.
                  </span>
                </span>
              </label>
            </div>

            {!pessoaId && (
              <div className="border-t border-[var(--color-border)] pt-4">
                <Controller
                  control={control}
                  name="consent_declarado"
                  render={({ field }) => (
                    <Button
                      type="button"
                      variant={field.value ? 'default' : 'secondary'}
                      onClick={() => setConsentOpen(true)}
                      className="w-full"
                    >
                      {field.value ? '✓ Consentimento capturado' : 'Capturar consentimento LGPD *'}
                    </Button>
                  )}
                />
                {errors.consent_declarado && (
                  <p className="mt-1 text-sm text-[var(--color-red)]">{errors.consent_declarado.message}</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConsentModal
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onAccept={(termId) => {
          setPendingTermId(termId);
          setValue('consent_declarado', true, { shouldValidate: true });
          setConsentOpen(false);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/cadastro/pessoa-form.tsx
git commit -m "feat(cadastro): add PessoaForm with consent capture and role-filtered fields"
```

---

### Task 14: PessoaList (com busca DOM-filter + grupos)

**Files:**
- Create: `src/features/cadastro/pessoa-list.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { SearchInput } from '@/components/search-input';
import { FilterPills } from '@/components/filter-pills';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { usePessoas, useDeletePessoa } from '@/hooks/use-pessoas';
import { useFamilias } from '@/hooks/use-familias';
import { toast } from 'sonner';
import type { Pessoa } from '@/types/domain';
import { GRUPOS } from '@/schemas/pessoa';

const GRUPO_LABEL = {
  evangelizacao: 'Evangelização',
  mocidade: 'Mocidade',
  adulto: 'Adultos',
  gestante: 'Gestantes',
} as const;

interface Props {
  onEdit: (id: string) => void;
}

export function PessoaList({ onEdit }: Props) {
  const { data: pessoas = [] } = usePessoas();
  const { data: familias = [] } = useFamilias();
  const familiaMap = useMemo(() => {
    const m = new Map<string, string>();
    familias.forEach((f) => m.set(f.id, f.nome));
    return m;
  }, [familias]);

  const deletePessoa = useDeletePessoa();
  const [search, setSearch] = useState('');
  const [grupoFilter, setGrupoFilter] = useState<string>('todos');
  const [toDelete, setToDelete] = useState<Pessoa | null>(null);

  const grouped = useMemo(() => {
    const norm = search.trim().toLowerCase();
    const filtered = pessoas.filter((p) => {
      if (grupoFilter !== 'todos' && p.grupo !== grupoFilter) return false;
      if (norm && !p.nome.toLowerCase().includes(norm)) return false;
      return true;
    });
    const map: Record<string, Pessoa[]> = {};
    GRUPOS.forEach((g) => { map[g] = []; });
    filtered.forEach((p) => {
      if (map[p.grupo]) map[p.grupo].push(p);
    });
    GRUPOS.forEach((g) => map[g].sort((a, b) => a.nome.localeCompare(b.nome)));
    return map;
  }, [pessoas, search, grupoFilter]);

  const totalFiltered = Object.values(grouped).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <div className="space-y-3">
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar pessoa..." />
      <FilterPills
        value={grupoFilter}
        onChange={setGrupoFilter}
        options={[
          { value: 'todos', label: 'Todos' },
          ...GRUPOS.map((g) => ({ value: g, label: GRUPO_LABEL[g] })),
        ]}
      />

      {totalFiltered === 0 ? (
        <EmptyState icon="🙅" title="Nenhuma pessoa encontrada" />
      ) : (
        <div className="space-y-4">
          {GRUPOS.map((g) => {
            const list = grouped[g];
            if (list.length === 0) return null;
            return (
              <div key={g}>
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">
                  {GRUPO_LABEL[g]} ({list.length})
                </h3>
                <ul className="space-y-1">
                  {list.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{p.nome}</div>
                        {p.familia_id && (
                          <div className="text-xs text-[var(--color-text-muted)]">
                            Família: {familiaMap.get(p.familia_id) ?? '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" onClick={() => onEdit(p.id)} aria-label="Editar">
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setToDelete(p)} aria-label="Excluir">
                          <Trash2 className="size-4 text-[var(--color-red)]" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => { if (!v) setToDelete(null); }}
        title={`Excluir ${toDelete?.nome ?? ''}?`}
        description="A pessoa será marcada como inativa. Histórico de presença e cestas preservado."
        variant="destructive"
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deletePessoa.mutateAsync(toDelete.id);
            toast.success('Pessoa excluída');
            setToDelete(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
          }
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/cadastro/pessoa-list.tsx
git commit -m "feat(cadastro): add PessoaList with grouping, search filter, edit/delete"
```

---

### Task 15: FamiliaForm

**Files:**
- Create: `src/features/cadastro/familia-form.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchInput } from '@/components/search-input';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { FamiliaInputSchema, type FamiliaInput } from '@/schemas/familia';
import { useSaveFamilia, useFamilia } from '@/hooks/use-familias';
import { usePessoas, useSavePessoa } from '@/hooks/use-pessoas';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  familiaId?: string | null;
}

export function FamiliaForm({ open, onOpenChange, familiaId }: Props) {
  const { data: existing } = useFamilia(familiaId);
  const { data: pessoas = [] } = usePessoas();
  const saveFamilia = useSaveFamilia();
  const savePessoa = useSavePessoa();

  const {
    register, handleSubmit, control, reset, setValue,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FamiliaInput>({
    resolver: zodResolver(FamiliaInputSchema),
    defaultValues: { nome: '', membros: [] },
  });

  const membros = watch('membros');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    if (existing) {
      const members = pessoas
        .filter((p) => p.familia_id === existing.id)
        .map((p) => ({ id: p.id, nome: p.nome }));
      reset({ nome: existing.nome, membros: members });
    } else {
      reset({ nome: '', membros: [] });
    }
    setSearch('');
  }, [existing, open, pessoas, reset]);

  const candidates = (() => {
    const norm = search.trim().toLowerCase();
    return pessoas
      .filter((p) =>
        !membros.find((m) => m.id === p.id) &&
        (norm === '' || p.nome.toLowerCase().includes(norm))
      )
      .slice(0, 8);
  })();

  const onSubmit = async (input: FamiliaInput) => {
    try {
      const saved = await saveFamilia.mutateAsync({
        id: familiaId ?? undefined,
        nome: input.nome,
      });

      const previousMemberIds = new Set(
        pessoas.filter((p) => p.familia_id === saved.id).map((p) => p.id),
      );
      const newMemberIds = new Set(input.membros.map((m) => m.id));

      const toAdd = input.membros.filter((m) => !previousMemberIds.has(m.id));
      const toRemove = [...previousMemberIds].filter((id) => !newMemberIds.has(id));

      for (const m of toAdd) {
        const p = pessoas.find((x) => x.id === m.id);
        if (p) await savePessoa.mutateAsync({ ...p, familia_id: saved.id });
      }
      for (const id of toRemove) {
        const p = pessoas.find((x) => x.id === id);
        if (p) await savePessoa.mutateAsync({ ...p, familia_id: null });
      }

      toast.success(familiaId ? 'Família atualizada' : 'Família criada');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar família');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{familiaId ? 'Editar família' : 'Nova família'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" {...register('nome')} autoComplete="off" />
            {errors.nome && <p className="text-sm text-[var(--color-red)]">{errors.nome.message}</p>}
          </div>

          <div>
            <Label>Membros ({membros.length})</Label>
            <SearchInput value={search} onChange={setSearch} placeholder="Adicionar pessoa..." />
            {search.trim() !== '' && candidates.length > 0 && (
              <ul className="mt-1 max-h-40 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-bg-card)]">
                {candidates.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-nav)]"
                      onClick={() => {
                        setValue('membros', [...membros, { id: p.id, nome: p.nome }]);
                        setSearch('');
                      }}
                    >
                      {p.nome}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <ul className="mt-2 space-y-1">
              {membros.map((m) => (
                <li key={m.id} className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-sm">
                  <span>{m.nome}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setValue('membros', membros.filter((x) => x.id !== m.id))}
                    aria-label="Remover"
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/cadastro/familia-form.tsx
git commit -m "feat(cadastro): add FamiliaForm with member search and assignment"
```

---

### Task 16: FamiliaList

**Files:**
- Create: `src/features/cadastro/familia-list.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { SearchInput } from '@/components/search-input';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useFamilias, useDeleteFamilia } from '@/hooks/use-familias';
import { usePessoas } from '@/hooks/use-pessoas';
import { toast } from 'sonner';
import type { Familia } from '@/types/domain';

interface Props {
  onEdit: (id: string) => void;
}

export function FamiliaList({ onEdit }: Props) {
  const { data: familias = [] } = useFamilias();
  const { data: pessoas = [] } = usePessoas();
  const deleteFamilia = useDeleteFamilia();
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState<Familia | null>(null);

  const filtered = useMemo(() => {
    const norm = search.trim().toLowerCase();
    return familias
      .filter((f) => !norm || f.nome.toLowerCase().includes(norm))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [familias, search]);

  const memberCount = useMemo(() => {
    const map: Record<string, number> = {};
    pessoas.forEach((p) => {
      if (p.familia_id) map[p.familia_id] = (map[p.familia_id] ?? 0) + 1;
    });
    return map;
  }, [pessoas]);

  return (
    <div className="space-y-3">
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar família..." />
      {filtered.length === 0 ? (
        <EmptyState icon="👨‍👩‍👧" title="Nenhuma família cadastrada" />
      ) : (
        <ul className="space-y-1">
          {filtered.map((f) => (
            <li key={f.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{f.nome}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{memberCount[f.id] ?? 0} membros</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => onEdit(f.id)} aria-label="Editar">
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setToDelete(f)} aria-label="Excluir">
                  <Trash2 className="size-4 text-[var(--color-red)]" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => { if (!v) setToDelete(null); }}
        title={`Excluir família ${toDelete?.nome ?? ''}?`}
        description="Os membros ficarão sem família. Histórico preservado."
        variant="destructive"
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteFamilia.mutateAsync(toDelete.id);
            toast.success('Família removida');
            setToDelete(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
          }
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/cadastro/familia-list.tsx
git commit -m "feat(cadastro): add FamiliaList with member count + edit/delete"
```

---

### Task 17: ItemForm

**Files:**
- Create: `src/features/cadastro/item-form.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ItemInputSchema, type ItemInput, CATEGORIAS } from '@/schemas/item';
import { useSaveItem, useItem } from '@/hooks/use-itens';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemId?: string | null;
}

const CATEGORIA_LABEL: Record<typeof CATEGORIAS[number], string> = {
  'alimento-doacao': 'Alimento (doação)',
  'alimento-interno': 'Alimento (interno)',
  'limpeza': 'Limpeza',
};

export function ItemForm({ open, onOpenChange, itemId }: Props) {
  const { data: existing } = useItem(itemId);
  const saveItem = useSaveItem();

  const {
    register, handleSubmit, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemInput>({
    resolver: zodResolver(ItemInputSchema),
    defaultValues: { nome: '', categoria: 'alimento-doacao', quantidade: 0 },
  });

  useEffect(() => {
    if (!open) return;
    if (existing) {
      reset({ nome: existing.nome, categoria: existing.categoria, quantidade: existing.quantidade });
    } else {
      reset({ nome: '', categoria: 'alimento-doacao', quantidade: 0 });
    }
  }, [existing, open, reset]);

  const onSubmit = async (input: ItemInput) => {
    try {
      await saveItem.mutateAsync({
        id: itemId ?? undefined,
        nome: input.nome,
        categoria: input.categoria,
        quantidade: input.quantidade,
      });
      toast.success(itemId ? 'Item atualizado' : 'Item criado');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{itemId ? 'Editar item' : 'Novo item'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" {...register('nome')} autoComplete="off" />
            {errors.nome && <p className="text-sm text-[var(--color-red)]">{errors.nome.message}</p>}
          </div>

          <div>
            <Label>Categoria *</Label>
            <Controller
              control={control}
              name="categoria"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="quantidade">Quantidade inicial</Label>
            <Input id="quantidade" type="number" min="0" {...register('quantidade')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/cadastro/item-form.tsx
git commit -m "feat(cadastro): add ItemForm modal"
```

---

### Task 18: ItemList (no cadastro tab)

**Files:**
- Create: `src/features/cadastro/item-list.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { SearchInput } from '@/components/search-input';
import { FilterPills } from '@/components/filter-pills';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useItens, useDeleteItem } from '@/hooks/use-itens';
import { toast } from 'sonner';
import type { Item } from '@/types/domain';
import { CATEGORIAS } from '@/schemas/item';

const CATEGORIA_LABEL = {
  'alimento-doacao': 'Alimento (doação)',
  'alimento-interno': 'Alimento (interno)',
  'limpeza': 'Limpeza',
} as const;

interface Props { onEdit: (id: string) => void; }

export function ItemList({ onEdit }: Props) {
  const { data: itens = [] } = useItens();
  const deleteItem = useDeleteItem();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('todos');
  const [toDelete, setToDelete] = useState<Item | null>(null);

  const filtered = useMemo(() => {
    const norm = search.trim().toLowerCase();
    return itens
      .filter((i) => cat === 'todos' || i.categoria === cat)
      .filter((i) => !norm || i.nome.toLowerCase().includes(norm))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [itens, search, cat]);

  return (
    <div className="space-y-3">
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar item..." />
      <FilterPills
        value={cat}
        onChange={setCat}
        options={[
          { value: 'todos', label: 'Todos' },
          ...CATEGORIAS.map((c) => ({ value: c, label: CATEGORIA_LABEL[c] })),
        ]}
      />
      {filtered.length === 0 ? (
        <EmptyState icon="📦" title="Nenhum item" />
      ) : (
        <ul className="space-y-1">
          {filtered.map((i) => (
            <li key={i.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{i.nome}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{CATEGORIA_LABEL[i.categoria]} · qtd {i.quantidade}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => onEdit(i.id)} aria-label="Editar">
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setToDelete(i)} aria-label="Excluir">
                  <Trash2 className="size-4 text-[var(--color-red)]" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => { if (!v) setToDelete(null); }}
        title={`Excluir ${toDelete?.nome ?? ''}?`}
        variant="destructive"
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteItem.mutateAsync(toDelete.id);
          toast.success('Item removido');
          setToDelete(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/cadastro/item-list.tsx
git commit -m "feat(cadastro): add ItemList with category filter"
```

---

### Task 19: Tabbed Cadastro main page

**Files:**
- Modify: `src/pages/cadastro.tsx`
- Create: `src/features/cadastro/cadastro-page.tsx`

- [ ] **Step 1: Criar página integradora**

`src/features/cadastro/cadastro-page.tsx`:

```typescript
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterPills } from '@/components/filter-pills';
import { PessoaList } from './pessoa-list';
import { PessoaForm } from './pessoa-form';
import { FamiliaList } from './familia-list';
import { FamiliaForm } from './familia-form';
import { ItemList } from './item-list';
import { ItemForm } from './item-form';

type Tab = 'pessoas' | 'familias' | 'itens';

export function CadastroPage() {
  const [tab, setTab] = useState<Tab>('pessoas');
  const [pessoaOpen, setPessoaOpen] = useState(false);
  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [familiaOpen, setFamiliaOpen] = useState(false);
  const [familiaId, setFamiliaId] = useState<string | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);

  const onAdd = () => {
    if (tab === 'pessoas') { setPessoaId(null); setPessoaOpen(true); }
    else if (tab === 'familias') { setFamiliaId(null); setFamiliaOpen(true); }
    else { setItemId(null); setItemOpen(true); }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Cadastros</h1>
        <Button size="icon" onClick={onAdd} aria-label="Adicionar"><Plus className="size-5" /></Button>
      </div>

      <FilterPills
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        options={[
          { value: 'pessoas', label: 'Pessoas' },
          { value: 'familias', label: 'Famílias' },
          { value: 'itens', label: 'Itens' },
        ]}
      />

      {tab === 'pessoas' && <PessoaList onEdit={(id) => { setPessoaId(id); setPessoaOpen(true); }} />}
      {tab === 'familias' && <FamiliaList onEdit={(id) => { setFamiliaId(id); setFamiliaOpen(true); }} />}
      {tab === 'itens' && <ItemList onEdit={(id) => { setItemId(id); setItemOpen(true); }} />}

      <PessoaForm open={pessoaOpen} onOpenChange={setPessoaOpen} pessoaId={pessoaId} />
      <FamiliaForm open={familiaOpen} onOpenChange={setFamiliaOpen} familiaId={familiaId} />
      <ItemForm open={itemOpen} onOpenChange={setItemOpen} itemId={itemId} />
    </div>
  );
}
```

- [ ] **Step 2: Substituir stub em `src/pages/cadastro.tsx`**

```typescript
export { CadastroPage } from '@/features/cadastro/cadastro-page';
```

- [ ] **Step 3: Build + test**

```bash
cd c:/projects/presenca && pnpm run typecheck && pnpm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/cadastro/cadastro-page.tsx src/pages/cadastro.tsx
git commit -m "feat(cadastro): wire CadastroPage with tabs (pessoas/familias/itens)"
```

---

### Task 20-22: Verificação manual cadastro

**Files:**
- Nenhum

- [ ] **Step 1: Dev server**

```bash
cd c:/projects/presenca && pnpm run dev
```

- [ ] **Step 2: Smoke check**

Login admin → Cadastros → testa:
- Criar pessoa nova (deve exigir consent modal)
- Editar pessoa
- Excluir pessoa (modal confirma)
- Criar família, atribuir membros
- Criar item (categoria + quantidade)
- Buscar / filtrar funciona sem perder teclado mobile

Reportar issues, ajustar com micro-commits se houver.

- [ ] **Step 3: Push branch parcial**

```bash
git push origin refactor/react-lgpd
```

---

## Phase I — Chamada

### Task 23: ChamadaPage (presença do dia)

**Files:**
- Create: `src/features/chamada/chamada-page.tsx`
- Modify: `src/pages/chamada.tsx`

- [ ] **Step 1: Criar `features/chamada/chamada-page.tsx`**

```typescript
import { useMemo, useState, useEffect } from 'react';
import { SearchInput } from '@/components/search-input';
import { FilterPills } from '@/components/filter-pills';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePessoas } from '@/hooks/use-pessoas';
import { useGetOrCreateChamada } from '@/hooks/use-chamada';
import { usePresencasByChamada, useSavePresenca } from '@/hooks/use-presencas';
import { GRUPOS } from '@/schemas/pessoa';

const GRUPO_LABEL = {
  evangelizacao: 'Evangelização',
  mocidade: 'Mocidade',
  adulto: 'Adultos',
  gestante: 'Gestantes',
} as const;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ChamadaPage() {
  const today = todayISO();
  const { data: pessoas = [] } = usePessoas();
  const getOrCreate = useGetOrCreateChamada();
  const savePresenca = useSavePresenca();
  const [chamadaId, setChamadaId] = useState<string | null>(null);
  const { data: presencas = [] } = usePresencasByChamada(chamadaId);

  useEffect(() => {
    let cancelled = false;
    getOrCreate.mutateAsync(today).then((c) => { if (!cancelled) setChamadaId(c.id); }).catch(() => {});
    return () => { cancelled = true; };
  }, [today]);

  const [search, setSearch] = useState('');
  const [grupoFilter, setGrupoFilter] = useState('todos');

  const presentMap = useMemo(() => {
    const m = new Map<string, boolean>();
    presencas.forEach((p) => m.set(p.pessoa_id, p.presente));
    return m;
  }, [presencas]);

  const filteredByGrupo = useMemo(() => {
    const norm = search.trim().toLowerCase();
    const list = pessoas.filter((p) => {
      if (grupoFilter !== 'todos' && p.grupo !== grupoFilter) return false;
      if (norm && !p.nome.toLowerCase().includes(norm)) return false;
      return true;
    });
    const grouped: Record<string, typeof pessoas> = {};
    GRUPOS.forEach((g) => { grouped[g] = []; });
    list.forEach((p) => { if (grouped[p.grupo]) grouped[p.grupo].push(p); });
    GRUPOS.forEach((g) => grouped[g].sort((a, b) => a.nome.localeCompare(b.nome)));
    return grouped;
  }, [pessoas, search, grupoFilter]);

  const total = Object.values(filteredByGrupo).reduce((acc, arr) => acc + arr.length, 0);
  const presentCount = Array.from(presentMap.values()).filter(Boolean).length;

  const toggle = async (pessoaId: string) => {
    if (!chamadaId) return;
    try {
      await savePresenca.mutateAsync({
        chamada_id: chamadaId,
        pessoa_id: pessoaId,
        presente: !(presentMap.get(pessoaId) ?? false),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Chamada</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {today} · {presentCount} presentes
        </p>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar pessoa..." />
      <FilterPills
        value={grupoFilter}
        onChange={setGrupoFilter}
        options={[
          { value: 'todos', label: 'Todos' },
          ...GRUPOS.map((g) => ({ value: g, label: GRUPO_LABEL[g] })),
        ]}
      />

      {total === 0 ? (
        <EmptyState icon="✅" title="Nenhuma pessoa encontrada" />
      ) : (
        <div className="space-y-4">
          {GRUPOS.map((g) => {
            const list = filteredByGrupo[g];
            if (list.length === 0) return null;
            return (
              <div key={g}>
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">
                  {GRUPO_LABEL[g]} ({list.length})
                </h3>
                <ul className="space-y-1">
                  {list.map((p) => {
                    const isPresent = presentMap.get(p.id) ?? false;
                    return (
                      <li key={p.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2">
                        <div className="truncate">{p.nome}</div>
                        <Button
                          size="sm"
                          variant={isPresent ? 'default' : 'secondary'}
                          onClick={() => toggle(p.id)}
                          disabled={!chamadaId}
                        >
                          {isPresent ? '✓ Presente' : 'Marcar'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Substituir stub `src/pages/chamada.tsx`**

```typescript
export { ChamadaPage } from '@/features/chamada/chamada-page';
```

- [ ] **Step 3: Build + push**

```bash
cd c:/projects/presenca && pnpm run typecheck && pnpm run build
git add src/features/chamada src/pages/chamada.tsx
git commit -m "feat(chamada): add Chamada page with day attendance toggle"
git push origin refactor/react-lgpd
```

---

### Task 24-25: Chamada — verify

- [ ] **Step 1: Smoke local + preview Vercel**

Após push, preview Vercel rebuilds. Logar como admin, acessar Chamada, marcar/desmarcar presenças. Confirmar:
- Chamada do dia criada automaticamente
- Marcar presença persiste após reload
- Busca não derruba teclado

---

## Phase J — Histórico

### Task 26: HistoricoPage com abas (Por Data / Por Pessoa / Cestas)

**Files:**
- Create: `src/features/historico/historico-page.tsx`
- Modify: `src/pages/historico.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useMemo, useState } from 'react';
import { FilterPills } from '@/components/filter-pills';
import { SearchInput } from '@/components/search-input';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from 'sonner';
import { usePessoas } from '@/hooks/use-pessoas';
import { useChamadas, useDeleteChamada } from '@/hooks/use-chamada';
import { useAllPresencas } from '@/hooks/use-presencas';
import { useCestas, useDeleteCesta } from '@/hooks/use-cestas';
import { useAuth } from '@/features/auth/useAuth';
import type { Chamada } from '@/types/domain';

type Tab = 'data' | 'pessoa' | 'cestas';

export function HistoricoPage() {
  const [tab, setTab] = useState<Tab>('data');
  const [search, setSearch] = useState('');
  const papel = useAuth((s) => s.papel);
  const isAdmin = papel === 'admin';

  const { data: pessoas = [] } = usePessoas();
  const { data: chamadas = [] } = useChamadas();
  const { data: presencas = [] } = useAllPresencas();
  const { data: cestas = [] } = useCestas();
  const deleteChamada = useDeleteChamada();
  const deleteCesta = useDeleteCesta();

  const [chamadaToDelete, setChamadaToDelete] = useState<Chamada | null>(null);

  const pessoaMap = useMemo(() => new Map(pessoas.map((p) => [p.id, p])), [pessoas]);

  const chamadasSorted = useMemo(() =>
    [...chamadas].sort((a, b) => b.data.localeCompare(a.data)),
    [chamadas],
  );

  const presencasByChamada = useMemo(() => {
    const map = new Map<string, typeof presencas>();
    presencas.forEach((p) => {
      if (!map.has(p.chamada_id)) map.set(p.chamada_id, []);
      map.get(p.chamada_id)!.push(p);
    });
    return map;
  }, [presencas]);

  const presencasByPessoa = useMemo(() => {
    const map = new Map<string, typeof presencas>();
    presencas.forEach((p) => {
      if (p.presente) {
        if (!map.has(p.pessoa_id)) map.set(p.pessoa_id, []);
        map.get(p.pessoa_id)!.push(p);
      }
    });
    return map;
  }, [presencas]);

  const cestasByPessoa = useMemo(() => {
    const map = new Map<string, typeof cestas>();
    cestas.forEach((c) => {
      if (!map.has(c.pessoa_id)) map.set(c.pessoa_id, []);
      map.get(c.pessoa_id)!.push(c);
    });
    return map;
  }, [cestas]);

  const norm = search.trim().toLowerCase();

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Histórico</h1>
      <FilterPills
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        options={[
          { value: 'data', label: 'Por Data' },
          { value: 'pessoa', label: 'Por Pessoa' },
          { value: 'cestas', label: 'Cestas' },
        ]}
      />

      {tab !== 'data' && <SearchInput value={search} onChange={setSearch} placeholder="Buscar pessoa..." />}

      {tab === 'data' && (
        chamadasSorted.length === 0 ? (
          <EmptyState icon="📅" title="Nenhuma chamada registrada" />
        ) : (
          <ul className="space-y-2">
            {chamadasSorted.map((c) => {
              const list = presencasByChamada.get(c.id) ?? [];
              const presentes = list.filter((p) => p.presente).length;
              return (
                <li key={c.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.data}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{presentes} presentes / {list.length} marcações</div>
                    </div>
                    {isAdmin && (
                      <Button size="icon" variant="ghost" onClick={() => setChamadaToDelete(c)} aria-label="Excluir chamada">
                        <Trash2 className="size-4 text-[var(--color-red)]" />
                      </Button>
                    )}
                  </div>
                  <ul className="space-y-0.5 text-sm">
                    {list
                      .filter((p) => p.presente)
                      .map((p) => {
                        const pessoa = pessoaMap.get(p.pessoa_id);
                        return <li key={p.id} className="truncate">• {pessoa?.nome ?? '?'}</li>;
                      })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )
      )}

      {tab === 'pessoa' && (
        <ul className="space-y-2">
          {pessoas
            .filter((p) => !norm || p.nome.toLowerCase().includes(norm))
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .map((p) => {
              const list = presencasByPessoa.get(p.id) ?? [];
              return (
                <li key={p.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
                  <div className="font-medium">{p.nome}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{list.length} presenças</div>
                </li>
              );
            })}
        </ul>
      )}

      {tab === 'cestas' && (
        <ul className="space-y-2">
          {pessoas
            .filter((p) => !norm || p.nome.toLowerCase().includes(norm))
            .filter((p) => (cestasByPessoa.get(p.id)?.length ?? 0) > 0)
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .map((p) => {
              const list = cestasByPessoa.get(p.id) ?? [];
              return (
                <li key={p.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
                  <div className="font-medium">{p.nome}</div>
                  <ul className="mt-1 space-y-0.5 text-xs text-[var(--color-text-muted)]">
                    {list.sort((a, b) => b.data.localeCompare(a.data)).map((c) => (
                      <li key={c.id} className="flex items-center justify-between">
                        <span>{c.data}</span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteCesta.mutateAsync(c.id);
                              toast.success('Cesta removida');
                            }}
                            className="text-[var(--color-red)] hover:underline"
                          >
                            remover
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
        </ul>
      )}

      <ConfirmDialog
        open={!!chamadaToDelete}
        onOpenChange={(v) => { if (!v) setChamadaToDelete(null); }}
        title={`Excluir chamada ${chamadaToDelete?.data ?? ''}?`}
        description="Todas as presenças desta data serão removidas."
        variant="destructive"
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!chamadaToDelete) return;
          try {
            await deleteChamada.mutateAsync(chamadaToDelete.id);
            toast.success('Chamada removida');
            setChamadaToDelete(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
          }
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: `src/pages/historico.tsx`**

```typescript
export { HistoricoPage } from '@/features/historico/historico-page';
```

- [ ] **Step 3: Commit + push**

```bash
mkdir -p src/features/historico
git add src/features/historico src/pages/historico.tsx
git commit -m "feat(historico): add page with por-data / por-pessoa / cestas tabs"
git push origin refactor/react-lgpd
```

---

### Task 27-29: Histórico verify + small polish

- [ ] Smoke local: criar chamadas, marcar presenças, verificar abas. Admin pode deletar; operador não vê botão.
- [ ] Se busca derruba teclado, garantir que listas usam DOM-filter sem re-render do input (SearchInput já é defaultValue + useRef).

---

## Phase K — Ranking

### Task 30: RankingPage com seções por grupo + famílias

**Files:**
- Create: `src/features/ranking/ranking-page.tsx`
- Modify: `src/pages/ranking.tsx`

- [ ] **Step 1: Criar `features/ranking/ranking-page.tsx`** (ver código exato em legacy/js/ranking.js — adaptar comportamento atual: seções por grupo + Famílias com saldo, botão ✕ vermelho pra excluir do ranking)

```typescript
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from 'sonner';
import { usePessoas, useSavePessoa } from '@/hooks/use-pessoas';
import { useFamilias } from '@/hooks/use-familias';
import { useAllPresencas } from '@/hooks/use-presencas';
import { useChamadas } from '@/hooks/use-chamada';
import { GRUPOS } from '@/schemas/pessoa';
import type { Pessoa } from '@/types/domain';

const GRUPO_LABEL = {
  evangelizacao: 'Evangelização',
  mocidade: 'Mocidade',
  adulto: 'Adultos',
  gestante: 'Gestantes',
} as const;

export function RankingPage() {
  const { data: pessoas = [] } = usePessoas();
  const { data: familias = [] } = useFamilias();
  const { data: presencas = [] } = useAllPresencas();
  const { data: chamadas = [] } = useChamadas();
  const savePessoa = useSavePessoa();

  const [toHide, setToHide] = useState<Pessoa | null>(null);

  const totalChamadas = chamadas.length;

  const presencaCountByPessoa = useMemo(() => {
    const map = new Map<string, number>();
    presencas.forEach((p) => {
      if (p.presente) map.set(p.pessoa_id, (map.get(p.pessoa_id) ?? 0) + 1);
    });
    return map;
  }, [presencas]);

  const rankablePessoas = useMemo(() =>
    pessoas.filter((p) => !p.excluir_ranking),
    [pessoas],
  );

  const byGrupo = useMemo(() => {
    const grouped: Record<string, Pessoa[]> = {};
    GRUPOS.forEach((g) => { grouped[g] = []; });
    rankablePessoas.forEach((p) => {
      if (grouped[p.grupo]) grouped[p.grupo].push(p);
    });
    GRUPOS.forEach((g) =>
      grouped[g].sort((a, b) =>
        (presencaCountByPessoa.get(b.id) ?? 0) - (presencaCountByPessoa.get(a.id) ?? 0)
        || a.nome.localeCompare(b.nome),
      ),
    );
    return grouped;
  }, [rankablePessoas, presencaCountByPessoa]);

  const familiasRanking = useMemo(() => {
    return familias.map((f) => {
      const members = rankablePessoas.filter((p) => p.familia_id === f.id);
      const total = members.reduce((acc, m) => acc + (presencaCountByPessoa.get(m.id) ?? 0), 0);
      return { familia: f, total, memberCount: members.length };
    })
      .filter((x) => x.memberCount > 0)
      .sort((a, b) => b.total - a.total || a.familia.nome.localeCompare(b.familia.nome));
  }, [familias, rankablePessoas, presencaCountByPessoa]);

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Ranking</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{totalChamadas} chamadas registradas</p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">Famílias</h2>
        {familiasRanking.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Nenhuma família com membros ativos no ranking.</p>
        ) : (
          <ol className="space-y-1">
            {familiasRanking.map((f, idx) => (
              <li key={f.familia.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2">
                <span className="flex items-center gap-2">
                  <span className="w-6 text-right font-mono text-[var(--color-text-muted)]">#{idx + 1}</span>
                  <span className="font-medium">{f.familia.nome}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">({f.memberCount} membros)</span>
                </span>
                <span className="font-mono">{f.total}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {GRUPOS.map((g) => {
        const list = byGrupo[g];
        if (list.length === 0) return null;
        return (
          <section key={g}>
            <h2 className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">
              {GRUPO_LABEL[g]} ({list.length})
            </h2>
            <ol className="space-y-1">
              {list.map((p, idx) => {
                const count = presencaCountByPessoa.get(p.id) ?? 0;
                return (
                  <li key={p.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className="w-6 text-right font-mono text-[var(--color-text-muted)]">#{idx + 1}</span>
                      <span className="font-medium">{p.nome}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono">{count}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setToHide(p)}
                        aria-label="Excluir do ranking"
                      >
                        <X className="size-4 text-[var(--color-red)]" />
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      <ConfirmDialog
        open={!!toHide}
        onOpenChange={(v) => { if (!v) setToHide(null); }}
        title={`Excluir ${toHide?.nome ?? ''} do ranking?`}
        description="Não aparece mais aqui. Presença e cestas continuam normais. Reverter via cadastro."
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!toHide) return;
          try {
            await savePessoa.mutateAsync({ ...toHide, excluir_ranking: true });
            toast.success('Removida do ranking');
            setToHide(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
          }
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: `src/pages/ranking.tsx`**

```typescript
export { RankingPage } from '@/features/ranking/ranking-page';
```

- [ ] **Step 3: Build + commit + push**

```bash
cd c:/projects/presenca && pnpm run typecheck
mkdir -p src/features/ranking
git add src/features/ranking src/pages/ranking.tsx
git commit -m "feat(ranking): add page with familia + grupo sections and exclude-from-ranking flag"
git push origin refactor/react-lgpd
```

---

### Task 31-32: Ranking verify

- [ ] Smoke local: ranking ordena corretamente, botão ✕ marca excluir_ranking=true, pessoa some da lista
- [ ] Reverter via /cadastro → editar pessoa → desmarcar checkbox

---

## Phase L — Estoque

### Task 33: EstoquePage com CRUD + quantidade inline

**Files:**
- Create: `src/features/estoque/estoque-page.tsx`
- Modify: `src/pages/estoque.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Minus, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/search-input';
import { FilterPills } from '@/components/filter-pills';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from 'sonner';
import { useItens, useUpdateItemQuantidade, useDeleteItem } from '@/hooks/use-itens';
import { ItemForm } from '@/features/cadastro/item-form';
import { CATEGORIAS } from '@/schemas/item';
import type { Item } from '@/types/domain';

const CATEGORIA_LABEL = {
  'alimento-doacao': 'Alimento (doação)',
  'alimento-interno': 'Alimento (interno)',
  'limpeza': 'Limpeza',
} as const;

export function EstoquePage() {
  const { data: itens = [] } = useItens();
  const updateQtd = useUpdateItemQuantidade();
  const deleteItem = useDeleteItem();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Item | null>(null);

  const filtered = useMemo(() => {
    const norm = search.trim().toLowerCase();
    return itens
      .filter((i) => cat === 'todos' || i.categoria === cat)
      .filter((i) => !norm || i.nome.toLowerCase().includes(norm))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [itens, search, cat]);

  const bump = async (item: Item, delta: number) => {
    try {
      await updateQtd.mutateAsync({ id: item.id, quantidade: Math.max(0, item.quantidade + delta) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Estoque</h1>
        <Button size="icon" onClick={() => { setEditId(null); setFormOpen(true); }} aria-label="Adicionar"><Plus className="size-5" /></Button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar item..." />
      <FilterPills
        value={cat}
        onChange={setCat}
        options={[
          { value: 'todos', label: 'Todos' },
          ...CATEGORIAS.map((c) => ({ value: c, label: CATEGORIA_LABEL[c] })),
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState icon="📦" title="Estoque vazio" />
      ) : (
        <ul className="space-y-2">
          {filtered.map((i) => (
            <li key={i.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{i.nome}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{CATEGORIA_LABEL[i.categoria]}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => bump(i, -1)} disabled={i.quantidade <= 0} aria-label="Diminuir">
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-10 text-center font-mono text-lg">{i.quantidade}</span>
                  <Button size="icon" variant="ghost" onClick={() => bump(i, 1)} aria-label="Aumentar">
                    <PlusIcon className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditId(i.id); setFormOpen(true); }} aria-label="Editar">
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setToDelete(i)} aria-label="Excluir">
                    <Trash2 className="size-4 text-[var(--color-red)]" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ItemForm open={formOpen} onOpenChange={setFormOpen} itemId={editId} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => { if (!v) setToDelete(null); }}
        title={`Excluir ${toDelete?.nome ?? ''}?`}
        variant="destructive"
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteItem.mutateAsync(toDelete.id);
          toast.success('Item removido');
          setToDelete(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: `src/pages/estoque.tsx`**

```typescript
export { EstoquePage } from '@/features/estoque/estoque-page';
```

- [ ] **Step 3: Commit + push**

```bash
mkdir -p src/features/estoque
git add src/features/estoque src/pages/estoque.tsx
git commit -m "feat(estoque): add page with inline quantidade bump + CRUD"
git push origin refactor/react-lgpd
```

---

### Task 34-35: Estoque verify

- [ ] Smoke: + / - bump quantidade, criar item novo, excluir.

---

## Phase M — Pedidos

### Task 36: PedidoForm

**Files:**
- Create: `src/features/pedidos/pedido-form.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchInput } from '@/components/search-input';
import { toast } from 'sonner';
import { PedidoInputSchema, type PedidoInput } from '@/schemas/pedido';
import { useSavePedido, usePedido } from '@/hooks/use-pedidos';
import { usePessoas } from '@/hooks/use-pessoas';
import { useFamilias } from '@/hooks/use-familias';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedidoId?: string | null;
}

export function PedidoForm({ open, onOpenChange, pedidoId }: Props) {
  const { data: existing } = usePedido(pedidoId);
  const { data: pessoas = [] } = usePessoas();
  const { data: familias = [] } = useFamilias();
  const savePedido = useSavePedido();

  const [destTipo, setDestTipo] = useState<'pessoa' | 'familia'>('pessoa');
  const [destSearch, setDestSearch] = useState('');

  const {
    register, handleSubmit, control, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<PedidoInput>({
    resolver: zodResolver(PedidoInputSchema),
    defaultValues: { pessoa_id: null, familia_id: null, item: '', quantidade: 1, observacao: '' },
  });

  const pessoa_id = watch('pessoa_id');
  const familia_id = watch('familia_id');

  useEffect(() => {
    if (!open) return;
    if (existing) {
      reset({
        pessoa_id: existing.pessoa_id,
        familia_id: existing.familia_id,
        item: existing.item,
        quantidade: existing.quantidade,
        observacao: existing.observacao ?? '',
      });
      setDestTipo(existing.familia_id ? 'familia' : 'pessoa');
    } else {
      reset({ pessoa_id: null, familia_id: null, item: '', quantidade: 1, observacao: '' });
      setDestTipo('pessoa');
    }
    setDestSearch('');
  }, [existing, open, reset]);

  const candidates = (() => {
    const norm = destSearch.trim().toLowerCase();
    if (norm === '') return [];
    if (destTipo === 'pessoa') {
      return pessoas.filter((p) => p.nome.toLowerCase().includes(norm)).slice(0, 8);
    }
    return familias.filter((f) => f.nome.toLowerCase().includes(norm)).slice(0, 8);
  })();

  const selectedName = (() => {
    if (destTipo === 'pessoa' && pessoa_id) return pessoas.find((p) => p.id === pessoa_id)?.nome;
    if (destTipo === 'familia' && familia_id) return familias.find((f) => f.id === familia_id)?.nome;
    return null;
  })();

  const onSubmit = async (input: PedidoInput) => {
    try {
      await savePedido.mutateAsync({
        id: pedidoId ?? undefined,
        pessoa_id: destTipo === 'pessoa' ? input.pessoa_id : null,
        familia_id: destTipo === 'familia' ? input.familia_id : null,
        item: input.item,
        quantidade: input.quantidade,
        observacao: input.observacao || null,
      });
      toast.success(pedidoId ? 'Pedido atualizado' : 'Pedido criado');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pedidoId ? 'Editar pedido' : 'Novo pedido'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Destinatário</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={destTipo === 'pessoa' ? 'default' : 'secondary'}
                onClick={() => { setDestTipo('pessoa'); setValue('familia_id', null); }}
              >Pessoa</Button>
              <Button
                type="button"
                size="sm"
                variant={destTipo === 'familia' ? 'default' : 'secondary'}
                onClick={() => { setDestTipo('familia'); setValue('pessoa_id', null); }}
              >Família</Button>
            </div>

            {selectedName ? (
              <div className="mt-2 flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1 text-sm">
                <span>{selectedName}</span>
                <button
                  type="button"
                  className="text-xs text-[var(--color-text-muted)] hover:underline"
                  onClick={() => {
                    if (destTipo === 'pessoa') setValue('pessoa_id', null);
                    else setValue('familia_id', null);
                  }}
                >trocar</button>
              </div>
            ) : (
              <>
                <SearchInput
                  value={destSearch}
                  onChange={setDestSearch}
                  placeholder={destTipo === 'pessoa' ? 'Buscar pessoa...' : 'Buscar família...'}
                  className="mt-2"
                />
                {candidates.length > 0 && (
                  <ul className="mt-1 max-h-40 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-bg-card)]">
                    {candidates.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-nav)]"
                          onClick={() => {
                            if (destTipo === 'pessoa') setValue('pessoa_id', c.id);
                            else setValue('familia_id', c.id);
                            setDestSearch('');
                          }}
                        >{c.nome}</button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {errors.pessoa_id && <p className="text-sm text-[var(--color-red)]">{errors.pessoa_id.message}</p>}
          </div>

          <div>
            <Label htmlFor="item">Item *</Label>
            <Input id="item" {...register('item')} autoComplete="off" placeholder="Geladeira, fogão..." />
            {errors.item && <p className="text-sm text-[var(--color-red)]">{errors.item.message}</p>}
          </div>

          <div>
            <Label htmlFor="quantidade">Quantidade</Label>
            <Input id="quantidade" type="number" min="1" {...register('quantidade')} />
          </div>

          <div>
            <Label htmlFor="observacao">Observação</Label>
            <Input id="observacao" {...register('observacao')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p src/features/pedidos
git add src/features/pedidos/pedido-form.tsx
git commit -m "feat(pedidos): add PedidoForm with destinatário picker"
```

---

### Task 37: PedidosPage com accordion por item + ATENDIDOS

**Files:**
- Create: `src/features/pedidos/pedidos-page.tsx`
- Modify: `src/pages/pedidos.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useMemo, useState } from 'react';
import { Plus, Check, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from 'sonner';
import { usePedidos, useAtenderPedido, useDeletePedido } from '@/hooks/use-pedidos';
import { usePessoas } from '@/hooks/use-pessoas';
import { useFamilias } from '@/hooks/use-familias';
import { PedidoForm } from './pedido-form';
import type { Pedido } from '@/types/domain';

export function PedidosPage() {
  const { data: pedidos = [] } = usePedidos();
  const { data: pessoas = [] } = usePessoas();
  const { data: familias = [] } = useFamilias();
  const atender = useAtenderPedido();
  const deletePedido = useDeletePedido();

  const pessoaMap = useMemo(() => new Map(pessoas.map((p) => [p.id, p.nome])), [pessoas]);
  const familiaMap = useMemo(() => new Map(familias.map((f) => [f.id, f.nome])), [familias]);

  const pendentes = useMemo(() => pedidos.filter((p) => p.status === 'pendente'), [pedidos]);
  const atendidos = useMemo(() => pedidos.filter((p) => p.status === 'atendido'), [pedidos]);

  const byItem = useMemo(() => {
    const map = new Map<string, Pedido[]>();
    pendentes.forEach((p) => {
      const key = p.item.toUpperCase().trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pendentes]);

  const [open, setOpen] = useState<Set<string>>(new Set());
  const [openAtendidos, setOpenAtendidos] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Pedido | null>(null);

  const destOf = (p: Pedido) => p.pessoa_id ? pessoaMap.get(p.pessoa_id) : p.familia_id ? `${familiaMap.get(p.familia_id)} (família)` : '?';

  const toggle = (key: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <Button size="icon" onClick={() => { setEditId(null); setFormOpen(true); }} aria-label="Adicionar"><Plus className="size-5" /></Button>
      </div>

      {byItem.length === 0 ? (
        <EmptyState icon="🎁" title="Sem pedidos pendentes" />
      ) : (
        <ul className="space-y-2">
          {byItem.map(([item, list]) => {
            const isOpen = open.has(item);
            return (
              <li key={item} className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                  onClick={() => toggle(item)}
                >
                  <span className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    <span className="font-medium">{item}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">({list.length})</span>
                  </span>
                </button>
                {isOpen && (
                  <ul className="border-t border-[var(--color-border)]">
                    {list.sort((a, b) => a.solicitado_em.localeCompare(b.solicitado_em))
                      .map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{destOf(p)}</div>
                            <div className="text-xs text-[var(--color-text-muted)]">
                              {p.quantidade}x · {p.solicitado_em}
                              {p.observacao && ` · ${p.observacao}`}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button size="icon" variant="ghost" onClick={() => atender.mutateAsync(p.id).then(() => toast.success('Atendido'))} aria-label="Marcar atendido">
                              <Check className="size-4 text-[var(--color-green)]" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => { setEditId(p.id); setFormOpen(true); }} aria-label="Editar">
                              <Pencil className="size-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setToDelete(p)} aria-label="Excluir">
                              <Trash2 className="size-4 text-[var(--color-red)]" />
                            </Button>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {atendidos.length > 0 && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
            onClick={() => setOpenAtendidos(!openAtendidos)}
          >
            <span className="flex items-center gap-2">
              {openAtendidos ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              <span className="font-medium">Atendidos</span>
              <span className="text-xs text-[var(--color-text-muted)]">({atendidos.length})</span>
            </span>
          </button>
          {openAtendidos && (
            <ul className="border-t border-[var(--color-border)]">
              {atendidos.sort((a, b) => (b.atendido_em ?? '').localeCompare(a.atendido_em ?? ''))
                .map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{p.item} → {destOf(p)}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">Atendido {p.atendido_em}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(p)} aria-label="Excluir">
                      <Trash2 className="size-4 text-[var(--color-red)]" />
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <PedidoForm open={formOpen} onOpenChange={setFormOpen} pedidoId={editId} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => { if (!v) setToDelete(null); }}
        title="Excluir pedido?"
        variant="destructive"
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!toDelete) return;
          await deletePedido.mutateAsync(toDelete.id);
          toast.success('Pedido removido');
          setToDelete(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: `src/pages/pedidos.tsx`**

```typescript
export { PedidosPage } from '@/features/pedidos/pedidos-page';
```

- [ ] **Step 3: Commit + push**

```bash
git add src/features/pedidos src/pages/pedidos.tsx
git commit -m "feat(pedidos): add page with accordion por item + atendidos section"
git push origin refactor/react-lgpd
```

---

### Task 38-39: Pedidos verify

- [ ] Smoke local: criar pedido, marcar atendido, edit, excluir
- [ ] Accordion abre/fecha por item, ATENDIDOS separado

---

## Phase N — Admin

### Task 40: Admin shell + sub-router

**Files:**
- Create: `src/features/admin/admin-page.tsx`
- Modify: `src/pages/admin.tsx`

- [ ] **Step 1: Criar shell**

```typescript
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { UsersPage } from './users/users-page';
import { AuditPage } from './audit/audit-page';
import { LgpdPage } from './lgpd/lgpd-page';
import { TermosPage } from './termos/termos-page';
import { cn } from '@/lib/cn';

const tabs = [
  { to: 'usuarios', label: 'Usuários' },
  { to: 'audit', label: 'Audit log' },
  { to: 'lgpd', label: 'LGPD' },
  { to: 'termos', label: 'Termos' },
];

export function AdminPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <nav className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                'rounded-full border px-3 py-1 text-sm',
                isActive
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-muted)]',
              )
            }
          >{t.label}</NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Navigate to="usuarios" replace />} />
        <Route path="usuarios" element={<UsersPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="lgpd" element={<LgpdPage />} />
        <Route path="termos" element={<TermosPage />} />
      </Routes>
    </div>
  );
}
```

- [ ] **Step 2: `src/pages/admin.tsx`**

```typescript
export { AdminPage } from '@/features/admin/admin-page';
```

- [ ] **Step 3: Commit (pages internas serão criadas nas tasks seguintes)**

Note: pages internas em `users-page.tsx`, `audit-page.tsx`, `lgpd-page.tsx`, `termos-page.tsx` ainda não existem — Tasks 41-50. Vai dar erro de import. Aceitar até completar; crie stubs vazios temporários se necessário:

```typescript
// src/features/admin/users/users-page.tsx
export function UsersPage() { return <div>Em construção</div>; }
// (idem para audit, lgpd, termos — TODOs preenchidos abaixo)
```

```bash
mkdir -p src/features/admin/users src/features/admin/audit src/features/admin/lgpd src/features/admin/termos
# Criar stubs:
echo "export function UsersPage() { return <div>Em construção</div>; }" > src/features/admin/users/users-page.tsx
echo "export function AuditPage() { return <div>Em construção</div>; }" > src/features/admin/audit/audit-page.tsx
echo "export function LgpdPage() { return <div>Em construção</div>; }" > src/features/admin/lgpd/lgpd-page.tsx
echo "export function TermosPage() { return <div>Em construção</div>; }" > src/features/admin/termos/termos-page.tsx
git add src/features/admin src/pages/admin.tsx
git commit -m "feat(admin): add admin shell with sub-router and tab nav (stubs)"
```

---

### Task 41: useAppUsers hooks

**Files:**
- Create: `src/hooks/use-app-users.ts`

- [ ] **Step 1: Criar**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CreateUserInput, ResetPasswordInput } from '@/schemas/admin-user';

export function useAppUsers() {
  return useQuery({
    queryKey: ['app_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, nome, papel, ativo, criado_em, ultimo_login_em')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateAppUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app_users'] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async (input: ResetPasswordInput) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
}

export function useToggleUserAtivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('app_users').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app_users'] }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-app-users.ts
git commit -m "feat(hooks): add use-app-users with create + reset password via Edge Functions"
```

---

### Task 42: UsersPage com create + reset + ativar

**Files:**
- Modify: `src/features/admin/users/users-page.tsx`
- Create: `src/features/admin/users/user-form.tsx`
- Create: `src/features/admin/users/reset-password-dialog.tsx`

- [ ] **Step 1: UserForm**

```typescript
// src/features/admin/users/user-form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Controller } from 'react-hook-form';
import { CreateUserSchema, type CreateUserInput } from '@/schemas/admin-user';
import { useCreateAppUser } from '@/hooks/use-app-users';

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function UserForm({ open, onOpenChange }: Props) {
  const createUser = useCreateAppUser();
  const {
    register, handleSubmit, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: { email: '', nome: '', papel: 'operador', senha_temporaria: '' },
  });

  const onSubmit = async (input: CreateUserInput) => {
    try {
      await createUser.mutateAsync(input);
      toast.success('Usuário criado. Comunique a senha temporária por canal seguro.');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" {...register('nome')} />
            {errors.nome && <p className="text-sm text-[var(--color-red)]">{errors.nome.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-[var(--color-red)]">{errors.email.message}</p>}
          </div>
          <div>
            <Label>Papel *</Label>
            <Controller
              control={control}
              name="papel"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="operador">Operador</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label htmlFor="senha_temporaria">Senha temporária *</Label>
            <Input id="senha_temporaria" {...register('senha_temporaria')} />
            {errors.senha_temporaria && <p className="text-sm text-[var(--color-red)]">{errors.senha_temporaria.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: ResetPasswordDialog**

```typescript
// src/features/admin/users/reset-password-dialog.tsx
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useResetUserPassword } from '@/hooks/use-app-users';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  userNome: string;
}

export function ResetPasswordDialog({ open, onOpenChange, userId, userNome }: Props) {
  const reset = useResetUserPassword();
  const [senha, setSenha] = useState('');

  const onConfirm = async () => {
    if (senha.length < 8) { toast.error('Mínimo 8 caracteres'); return; }
    try {
      await reset.mutateAsync({ target_user_id: userId, nova_senha: senha });
      toast.success('Senha redefinida. Comunique ao usuário.');
      setSenha('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSenha(''); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetar senha — {userNome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="nova_senha">Nova senha (mínimo 8 caracteres)</Label>
          <Input id="nova_senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={reset.isPending}>{reset.isPending ? 'Resetando...' : 'Resetar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: UsersPage**

```typescript
// src/features/admin/users/users-page.tsx
import { useState } from 'react';
import { Plus, KeyRound, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';
import { useAppUsers, useToggleUserAtivo } from '@/hooks/use-app-users';
import { UserForm } from './user-form';
import { ResetPasswordDialog } from './reset-password-dialog';

export function UsersPage() {
  const { data: users = [] } = useAppUsers();
  const toggle = useToggleUserAtivo();
  const [formOpen, setFormOpen] = useState(false);
  const [resetUser, setResetUser] = useState<{ id: string; nome: string } | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Usuários</h2>
        <Button size="icon" onClick={() => setFormOpen(true)} aria-label="Adicionar"><Plus className="size-5" /></Button>
      </div>

      {users.length === 0 ? (
        <EmptyState icon="👥" title="Nenhum usuário" />
      ) : (
        <ul className="space-y-1">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{u.nome}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {u.papel} · {u.ativo ? 'ativo' : 'inativo'}
                  {u.ultimo_login_em && ` · último login ${u.ultimo_login_em.slice(0, 10)}`}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => setResetUser({ id: u.id, nome: u.nome })} aria-label="Resetar senha">
                  <KeyRound className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await toggle.mutateAsync({ id: u.id, ativo: !u.ativo });
                      toast.success(u.ativo ? 'Usuário desativado' : 'Usuário reativado');
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Erro');
                    }
                  }}
                  aria-label={u.ativo ? 'Desativar' : 'Reativar'}
                >
                  {u.ativo ? <UserX className="size-4 text-[var(--color-red)]" /> : <UserCheck className="size-4 text-[var(--color-green)]" />}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <UserForm open={formOpen} onOpenChange={setFormOpen} />
      {resetUser && (
        <ResetPasswordDialog
          open={!!resetUser}
          onOpenChange={(v) => { if (!v) setResetUser(null); }}
          userId={resetUser.id}
          userNome={resetUser.nome}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit + push**

```bash
git add src/features/admin/users src/hooks/use-app-users.ts
git commit -m "feat(admin): add users management (create + reset password + toggle ativo)"
git push origin refactor/react-lgpd
```

---

### Task 43: useAuditLog hook

**Files:**
- Create: `src/hooks/use-audit-log.ts`

- [ ] **Step 1: Criar**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface Filter {
  tabela?: string;
  registroId?: string;
  usuarioId?: string;
  limit?: number;
}

export function useAuditLog(filter: Filter = {}) {
  const { tabela, registroId, usuarioId, limit = 100 } = filter;
  return useQuery({
    queryKey: ['audit_log', tabela ?? null, registroId ?? null, usuarioId ?? null, limit],
    queryFn: async () => {
      let q = supabase
        .from('audit_log')
        .select('id, tabela, registro_id, operacao, usuario_id, diff, ocorrido_em')
        .order('ocorrido_em', { ascending: false })
        .limit(limit);
      if (tabela) q = q.eq('tabela', tabela);
      if (registroId) q = q.eq('registro_id', registroId);
      if (usuarioId) q = q.eq('usuario_id', usuarioId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-audit-log.ts
git commit -m "feat(hooks): add use-audit-log with filters"
```

---

### Task 44: AuditPage

**Files:**
- Modify: `src/features/admin/audit/audit-page.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useState } from 'react';
import { useAuditLog } from '@/hooks/use-audit-log';
import { useAppUsers } from '@/hooks/use-app-users';
import { FilterPills } from '@/components/filter-pills';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';

const TABELAS = ['pessoas', 'familias', 'presencas', 'cestas', 'pedidos', 'app_users'];

export function AuditPage() {
  const [tabela, setTabela] = useState('todas');
  const [registroId, setRegistroId] = useState('');
  const { data: users = [] } = useAppUsers();
  const userMap = new Map(users.map((u) => [u.id, u.nome]));
  const { data: logs = [], isLoading } = useAuditLog({
    tabela: tabela === 'todas' ? undefined : tabela,
    registroId: registroId.trim() || undefined,
    limit: 200,
  });

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Audit log</h2>

      <FilterPills
        value={tabela}
        onChange={setTabela}
        options={[
          { value: 'todas', label: 'Todas' },
          ...TABELAS.map((t) => ({ value: t, label: t })),
        ]}
      />
      <Input
        placeholder="Filtrar por registro_id (UUID)..."
        value={registroId}
        onChange={(e) => setRegistroId(e.target.value)}
      />

      {isLoading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Carregando...</p>
      ) : logs.length === 0 ? (
        <EmptyState icon="📜" title="Sem registros" />
      ) : (
        <ul className="space-y-1">
          {logs.map((l) => (
            <li key={l.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{l.ocorrido_em.replace('T', ' ').slice(0, 19)}</span>
                <span className="rounded bg-[var(--color-bg-nav)] px-2 py-0.5 text-xs">{l.operacao}</span>
                <span className="text-[var(--color-text-muted)]">{l.tabela}</span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">{l.registro_id.slice(0, 8)}</span>
                <span className="text-xs text-[var(--color-text-muted)]">por {l.usuario_id ? (userMap.get(l.usuario_id) ?? '?') : '—'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/admin/audit/audit-page.tsx
git commit -m "feat(admin): add audit log page with table + registro_id filters"
```

---

### Task 45: useLgpd hooks (export + anonimizar + revogar)

**Files:**
- Create: `src/hooks/use-lgpd.ts`

- [ ] **Step 1: Criar**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';

export function useExportPessoa() {
  return useMutation({
    mutationFn: async (pessoa_id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-pessoa-lgpd`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pessoa_id }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pessoa-${pessoa_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useAnonimizarPessoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pessoa_id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
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
          anonimizado_por: user.id,
        })
        .eq('id', pessoa_id);
      if (error) throw error;

      await supabase.from('lgpd_requests').insert({
        pessoa_id,
        tipo: 'anonimizacao',
        status: 'concluido',
        solicitado_por: user.id,
        concluido_por: user.id,
        concluido_em: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pessoas'] });
    },
  });
}

export function useRevogarConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pessoa_id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('pessoa_consents')
        .update({ revogado_em: new Date().toISOString(), revogado_por: user.id })
        .eq('pessoa_id', pessoa_id)
        .is('revogado_em', null);
      if (error) throw error;

      await supabase.from('lgpd_requests').insert({
        pessoa_id,
        tipo: 'revogacao',
        status: 'concluido',
        solicitado_por: user.id,
        concluido_por: user.id,
        concluido_em: new Date().toISOString(),
      });
    },
    onSuccess: (_, pessoa_id) => {
      qc.invalidateQueries({ queryKey: ['pessoa_consents', pessoa_id] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-lgpd.ts
git commit -m "feat(hooks): add use-lgpd with export + anonimizar + revogar"
```

---

### Task 46: LgpdPage (busca pessoa + ações)

**Files:**
- Modify: `src/features/admin/lgpd/lgpd-page.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useState } from 'react';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Download, EyeOff, Ban, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { usePessoas } from '@/hooks/use-pessoas';
import { useAuditLog } from '@/hooks/use-audit-log';
import { useExportPessoa, useAnonimizarPessoa, useRevogarConsent } from '@/hooks/use-lgpd';
import type { Pessoa } from '@/types/domain';

export function LgpdPage() {
  const { data: pessoas = [] } = usePessoas();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Pessoa | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | 'anonimizar' | 'revogar'>(null);

  const exportPessoa = useExportPessoa();
  const anonimizar = useAnonimizarPessoa();
  const revogar = useRevogarConsent();

  const { data: history = [] } = useAuditLog({
    registroId: selected?.id,
    limit: 30,
  });

  const candidates = (() => {
    const norm = search.trim().toLowerCase();
    if (norm === '') return [];
    return pessoas
      .filter((p) => p.nome.toLowerCase().includes(norm) || (p.telefone && p.telefone.includes(norm)))
      .slice(0, 8);
  })();

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Direitos do titular — LGPD</h2>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar pessoa por nome ou telefone..."
      />

      {candidates.length > 0 && (
        <ul className="rounded border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          {candidates.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-nav)]"
                onClick={() => { setSelected(p); setSearch(''); }}
              >
                <span>{p.nome}{p.telefone && ` · ${p.telefone}`}</span>
                <ChevronRight className="size-4 text-[var(--color-text-muted)]" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
          <div>
            <div className="font-medium">{selected.nome}</div>
            <div className="text-xs text-[var(--color-text-muted)]">
              Cadastrada em {selected.criado_em.slice(0, 10)} · {selected.grupo}
              {selected.anonimizado_em && ' · ANONIMIZADA'}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => exportPessoa.mutateAsync(selected.id).then(() => toast.success('Exportado')).catch((e) => toast.error(e.message))}
              disabled={exportPessoa.isPending}
            ><Download className="mr-1 size-4" /> Exportar JSON</Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!!selected.anonimizado_em}
              onClick={() => setConfirmAction('anonimizar')}
            ><EyeOff className="mr-1 size-4" /> Anonimizar</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmAction('revogar')}
            ><Ban className="mr-1 size-4" /> Revogar consentimento</Button>
          </div>

          <div className="border-t border-[var(--color-border)] pt-2">
            <div className="text-sm font-medium">Histórico (audit log)</div>
            <ul className="mt-1 space-y-0.5 text-xs">
              {history.length === 0 ? (
                <li className="text-[var(--color-text-muted)]">Nenhuma operação registrada.</li>
              ) : (
                history.map((h) => (
                  <li key={h.id}>
                    <span className="font-mono">{h.ocorrido_em.replace('T', ' ').slice(0, 19)}</span>
                    {' · '}
                    <span>{h.operacao}</span>
                    {' · '}
                    <span className="text-[var(--color-text-muted)]">{h.tabela}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction === 'anonimizar'}
        onOpenChange={(v) => { if (!v) setConfirmAction(null); }}
        title={`Anonimizar ${selected?.nome ?? ''}?`}
        description="Nome, telefone, endereço e dados de visita serão zerados. Histórico de presença/cesta preservado anonimamente. Irreversível."
        variant="destructive"
        confirmLabel="Anonimizar"
        onConfirm={async () => {
          if (!selected) return;
          try {
            await anonimizar.mutateAsync(selected.id);
            toast.success('Pessoa anonimizada');
            setConfirmAction(null);
            setSelected(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
          }
        }}
      />

      <ConfirmDialog
        open={confirmAction === 'revogar'}
        onOpenChange={(v) => { if (!v) setConfirmAction(null); }}
        title="Revogar consentimento?"
        description="Marca consentimentos ativos como revogados. Considere também anonimizar dados em seguida."
        variant="destructive"
        confirmLabel="Revogar"
        onConfirm={async () => {
          if (!selected) return;
          try {
            await revogar.mutateAsync(selected.id);
            toast.success('Consentimento revogado');
            setConfirmAction(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
          }
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/admin/lgpd
git commit -m "feat(admin): add LGPD panel with export + anonimizar + revogar + audit history"
```

---

### Task 47: useConsentTerms (lista + CRUD)

**Files:**
- Create: `src/hooks/use-consent-terms.ts`

- [ ] **Step 1: Criar**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';

export function useConsentTerms() {
  return useQuery({
    queryKey: ['consent_terms', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consent_terms')
        .select('id, versao, texto, ativo, criado_em')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateConsentTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { versao: string; texto: string }) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      await supabase.from('consent_terms').update({ ativo: false }).eq('ativo', true);
      const { data, error } = await supabase
        .from('consent_terms')
        .insert({ ...input, ativo: true, criado_por: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consent_terms'] });
      qc.invalidateQueries({ queryKey: ['consent_term', 'active'] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-consent-terms.ts
git commit -m "feat(hooks): add use-consent-terms with deactivate-and-create"
```

---

### Task 48: TermosPage

**Files:**
- Modify: `src/features/admin/termos/termos-page.tsx`

- [ ] **Step 1: Criar**

```typescript
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';
import { useConsentTerms, useCreateConsentTerm } from '@/hooks/use-consent-terms';

export function TermosPage() {
  const { data: terms = [] } = useConsentTerms();
  const create = useCreateConsentTerm();
  const [open, setOpen] = useState(false);
  const [versao, setVersao] = useState('');
  const [texto, setTexto] = useState('');

  const onSubmit = async () => {
    if (versao.trim().length < 3) { toast.error('Versão obrigatória'); return; }
    if (texto.trim().length < 100) { toast.error('Texto deve ter mínimo 100 caracteres'); return; }
    try {
      await create.mutateAsync({ versao: versao.trim(), texto: texto.trim() });
      toast.success('Termo criado e marcado como ativo. Versão anterior desativada.');
      setVersao('');
      setTexto('');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Termos de consentimento</h2>
        <Button size="icon" onClick={() => setOpen(true)} aria-label="Novo termo"><Plus className="size-5" /></Button>
      </div>

      {terms.length === 0 ? (
        <EmptyState icon="📜" title="Nenhum termo cadastrado" />
      ) : (
        <ul className="space-y-2">
          {terms.map((t) => (
            <li key={t.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{t.versao}</div>
                {t.ativo && <span className="rounded bg-[var(--color-green)] px-2 py-0.5 text-xs text-black">ATIVO</span>}
              </div>
              <p className="mt-2 max-h-24 overflow-y-auto text-xs text-[var(--color-text-muted)]">{t.texto}</p>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo termo de consentimento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="versao">Versão (ex: 2026-06-01-v2)</Label>
              <Input id="versao" value={versao} onChange={(e) => setVersao(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="texto">Texto (mínimo 100 caracteres)</Label>
              <textarea
                id="texto"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={10}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2 text-sm"
              />
              <p className="text-xs text-[var(--color-text-muted)]">{texto.length} caracteres</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={onSubmit} disabled={create.isPending}>{create.isPending ? 'Salvando...' : 'Criar e ativar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit + push**

```bash
git add src/features/admin/termos src/hooks/use-consent-terms.ts
git commit -m "feat(admin): add consent terms management"
git push origin refactor/react-lgpd
```

---

### Task 49: Verificar typecheck + build + e2e

- [ ] **Step 1: Verificações**

```bash
cd c:/projects/presenca
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

All PASS. Se algo falhar, fix-it commits.

---

### Task 50: Smoke admin completo

- [ ] **Step 1: Local + preview**

- Login como admin
- /admin/usuarios → criar segundo usuário operador
- /admin/audit → listar logs recentes
- /admin/lgpd → buscar pessoa, exportar JSON (download), anonimizar
- /admin/termos → criar termo v2 (verifica que v1 fica `ativo=false`)
- Verifica em pessoa novamente: novo cadastro usa termo v2

---

## Phase O — Smoke + handoff

### Task 51: Smoke E2E completo

- [ ] **Step 1: Smoke checklist**

Local + preview:

- Login admin OK
- Logout limpa IndexedDB
- Idle 15min desloga (alterar IDLE_MS temporariamente pra 30s, voltar)
- Cadastros: pessoas/famílias/itens — criar, editar, excluir, consent capturado
- Chamada: marcar presenças
- Histórico: por data / por pessoa / cestas
- Ranking: famílias + grupos, excluir do ranking
- Estoque: bump quantidade
- Pedidos: criar + atender
- Admin: criar usuário operador (logar como operador pra verificar restrições)
  - Operador NÃO vê /admin
  - Operador edita pessoa mas campos admin (endereço/visita) silently revertidos pelo trigger
  - Operador marca presença SÓ na chamada do dia (RLS bloqueia editar datas passadas)
- LGPD: export pessoa, anonimizar, revogar
- Audit: aparece registros das ações

---

### Task 52: Handoff doc + push final

**Files:**
- Create: `docs/superpowers/plans/2026-05-16-plan-3-features-handoff.md`

- [ ] **Step 1: Doc handoff**

```markdown
# Plan 3 — Handoff

**Status:** Concluído
**Branch:** `refactor/react-lgpd`
**Próximo:** Plan 4 (cutover) — promover branch pra produção

## Entregue

- 7 features migradas: Cadastro (pessoas+famílias+itens), Chamada, Histórico, Ranking, Estoque, Pedidos
- Painel Admin completo: usuários, audit log, LGPD (export/anonimizar/revogar), termos
- Consent capture no cadastro de pessoa
- E2E manual passou nas verificações listadas em Task 51

## Operação cotidiana

- Admin cria operadores via /admin/usuarios (gera senha temp, comunica ao operador por canal seguro)
- Operador entra com email + senha, marca presença na chamada do dia
- Admin gerencia histórico, exclui chamadas erradas
- Direitos LGPD via /admin/lgpd

## Anti-regressão crítico

- Policies `*_anon_legacy_temp` (role anon) ainda ativas pra manter app vanilla legacy operando em main
- Plan 4 (cutover) remove esas policies + promove preview pra produção + descontinua vanilla

## Open items pra Plan 4

- DPO formal (atualmente Ariel Lorencini, confirmar)
- Validação jurídica do termo de consentimento v1
- Decisão sobre backup formal (Supabase Pro auto-backup vs pg_dump semanal)
- Code splitting pra reduzir bundle size (atualmente warn em ~780KB)
```

- [ ] **Step 2: Commit + push**

```bash
git add docs/superpowers/plans/2026-05-16-plan-3-features-handoff.md
git commit -m "docs: Plan 3 handoff"
git push origin refactor/react-lgpd
```

---

## Definition of Done (Plan 3)

- [x] 5 schemas Zod (pessoa, familia, item, pedido, admin-user)
- [x] 4 componentes UI (SearchInput, FilterPills, EmptyState, ConfirmDialog)
- [x] Cadastro completo (pessoas com consent, famílias, itens) — Tasks 10-22
- [x] Chamada com toggle presença + busca DOM-filter — Tasks 23-25
- [x] Histórico 3 abas (data, pessoa, cestas) — Tasks 26-29
- [x] Ranking famílias + grupos + excluir-flag — Tasks 30-32
- [x] Estoque CRUD + inline bump — Tasks 33-35
- [x] Pedidos accordion + atendidos — Tasks 36-39
- [x] Admin shell + sub-router — Task 40
- [x] /admin/usuarios CRUD + reset password — Tasks 41-42
- [x] /admin/audit com filtros — Tasks 43-44
- [x] /admin/lgpd export + anonimizar + revogar — Tasks 45-46
- [x] /admin/termos versionar — Tasks 47-48
- [x] lint + typecheck + tests + build green
- [x] Smoke E2E manual passou
- [x] Handoff doc

## Riscos remanescentes (Plan 4)

| Risco | Mitigação |
|---|---|
| Policies anon_legacy_temp removidas cedo quebram vanilla | Manter até cutover formal |
| Bundle size ~780KB warn | Code splitting por rota no Plan 4 |
| Smoke manual depende de admin operacional | Criar test fixture admin no preview ou usar service_role pra setup |
| Termo v1 não revisado juridicamente | Validar antes do cutover, criar v2 se necessário |
