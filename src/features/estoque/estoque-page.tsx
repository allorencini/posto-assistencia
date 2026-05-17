import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { FilterPills } from '@/components/filter-pills';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import { ItemForm } from '@/features/cadastro/item-form';
import { useDeleteItem, useItens, useUpdateItemQuantidade } from '@/hooks/use-itens';
import { normalize } from '@/lib/normalize';
import { CATEGORIAS } from '@/schemas/item';
import type { Item } from '@/types/domain';
import { Minus, Pencil, Plus, PlusIcon, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const CATEGORIA_LABEL = {
  'alimento-doacao': 'Alimento (doação)',
  'alimento-interno': 'Alimento (interno)',
  limpeza: 'Limpeza',
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
    const norm = normalize(search);
    return itens
      .filter((i) => cat === 'todos' || i.categoria === cat)
      .filter((i) => !norm || normalize(i.nome).includes(norm))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [itens, search, cat]);

  const bump = async (item: Item, delta: number) => {
    try {
      await updateQtd.mutateAsync({
        id: item.id,
        quantidade: Math.max(0, item.quantidade + delta),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Estoque</h1>
      <Button
        size="lg"
        onClick={() => {
          setEditId(null);
          setFormOpen(true);
        }}
        className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white"
      >
        <Plus className="size-5" />
        <span>Adicionar</span>
      </Button>

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
        <div className="space-y-4">
          {CATEGORIAS.map((catKey) => {
            const list = filtered.filter((i) => i.categoria === catKey);
            if (list.length === 0) return null;
            return (
              <div key={catKey}>
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">
                  {CATEGORIA_LABEL[catKey]} ({list.length})
                </h3>
                <ul className="space-y-2">
                  {list.map((i) => (
                    <li
                      key={i.id}
                      className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{i.nome}</div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => bump(i, -1)}
                            disabled={i.quantidade <= 0}
                            aria-label="Diminuir"
                          >
                            <Minus className="size-4" />
                          </Button>
                          <span className="w-10 text-center font-mono text-lg">{i.quantidade}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => bump(i, 1)}
                            aria-label="Aumentar"
                          >
                            <PlusIcon className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditId(i.id);
                              setFormOpen(true);
                            }}
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
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <ItemForm open={formOpen} onOpenChange={setFormOpen} itemId={editId} />
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
