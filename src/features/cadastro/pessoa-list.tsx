import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { FilterPills } from '@/components/filter-pills';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import { useFamilias } from '@/hooks/use-familias';
import { useDeletePessoa, usePessoas } from '@/hooks/use-pessoas';
import { GRUPOS } from '@/schemas/pessoa';
import type { Pessoa } from '@/types/domain';
import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

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
    GRUPOS.forEach((g) => {
      map[g] = [];
    });
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
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{p.nome}</div>
                        {p.familia_id && (
                          <div className="text-xs text-[var(--color-text-muted)]">
                            Família: {familiaMap.get(p.familia_id) ?? '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onEdit(p.id)}
                          aria-label="Editar"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setToDelete(p)}
                          aria-label="Excluir"
                        >
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
        onOpenChange={(v) => {
          if (!v) setToDelete(null);
        }}
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
