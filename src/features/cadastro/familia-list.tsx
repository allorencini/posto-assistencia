import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import { useDeleteFamilia, useFamilias } from '@/hooks/use-familias';
import { usePessoas } from '@/hooks/use-pessoas';
import { normalize } from '@/lib/normalize';
import type { Familia } from '@/types/domain';
import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

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
    const norm = normalize(search);
    return familias
      .filter((f) => !norm || normalize(f.nome).includes(norm))
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
            <li
              key={f.id}
              className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{f.nome}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {memberCount[f.id] ?? 0} membros
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(f.id)}
                  aria-label="Editar"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setToDelete(f)}
                  aria-label="Excluir"
                >
                  <Trash2 className="size-4 text-[var(--color-red)]" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => {
          if (!v) setToDelete(null);
        }}
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
