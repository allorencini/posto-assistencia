import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFamilia, useSaveFamilia } from '@/hooks/use-familias';
import { usePessoas, useSavePessoa } from '@/hooks/use-pessoas';
import { normalize } from '@/lib/normalize';
import { type FamiliaInput, FamiliaInputSchema } from '@/schemas/familia';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
    register,
    handleSubmit,
    reset,
    setValue,
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
    const norm = normalize(search);
    return pessoas
      .filter(
        (p) =>
          !membros.find((m) => m.id === p.id) &&
          (norm === '' || normalize(p.nome).includes(norm)),
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
            {errors.nome && (
              <p className="text-sm text-[var(--color-red)]">{errors.nome.message}</p>
            )}
          </div>

          <div>
            <Label>Membros ({membros.length})</Label>
            <SearchInput value={search} onChange={setSearch} placeholder="Adicionar pessoa..." />
            {search.trim() !== '' && candidates.length > 0 && (
              <ul className="relative z-50 mt-1 max-h-40 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg">
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
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-sm"
                >
                  <span>{m.nome}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setValue(
                        'membros',
                        membros.filter((x) => x.id !== m.id),
                      )
                    }
                    aria-label="Remover"
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
