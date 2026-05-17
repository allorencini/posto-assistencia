import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { FilterPills } from '@/components/filter-pills';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import { useDeleteItem, useItens } from '@/hooks/use-itens';
import { normalize } from '@/lib/normalize';
import { CATEGORIAS } from '@/schemas/item';
import type { Item } from '@/types/domain';
import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const CATEGORIA_LABEL = {
  'alimento-doacao': 'Alimento (doação)',
  'alimento-interno': 'Alimento (interno)',
  limpeza: 'Limpeza',
} as const;

interface Props {
  onEdit: (id: string) => void;
}

export function ItemList({ onEdit }: Props) {
  const { data: itens = [] } = useItens();
  const deleteItem = useDeleteItem();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('todos');
  const [toDelete, setToDelete] = useState<Item | null>(null);

  const filtered = useMemo(() => {
    const norm = normalize(search);
    return itens
      .filter((i) => cat === 'todos' || i.categoria === cat)
      .filter((i) => !norm || normalize(i.nome).includes(norm))
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
            <li
              key={i.id}
              className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{i.nome}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {CATEGORIA_LABEL[i.categoria]} · qtd {i.quantidade}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(i.id)}
                  aria-label="Editar"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setToDelete(i)}
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
