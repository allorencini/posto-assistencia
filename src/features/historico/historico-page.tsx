import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { FilterPills } from '@/components/filter-pills';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/features/auth/useAuth';
import { useCestas, useDeleteCesta } from '@/hooks/use-cestas';
import { useChamadas, useDeleteChamada } from '@/hooks/use-chamada';
import { usePessoas } from '@/hooks/use-pessoas';
import { useAllPresencas, useSavePresenca } from '@/hooks/use-presencas';
import { normalize } from '@/lib/normalize';
import { GRUPOS } from '@/schemas/pessoa';
import type { Chamada, Pessoa, Presenca } from '@/types/domain';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type Tab = 'data' | 'pessoa' | 'cestas';

const GRUPO_LABEL = {
  evangelizacao: 'Evangelização',
  mocidade: 'Mocidade',
  adulto: 'Adultos',
  gestante: 'Gestantes',
} as const;

export function HistoricoPage() {
  const [tab, setTab] = useState<Tab>('data');
  const [search, setSearch] = useState('');
  const [grupoFilter, setGrupoFilter] = useState<string>('todos');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingChamada, setEditingChamada] = useState<Chamada | null>(null);
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

  const chamadasSorted = useMemo(
    () => [...chamadas].sort((a, b) => b.data.localeCompare(a.data)),
    [chamadas],
  );

  const presencasByChamada = useMemo(() => {
    const map = new Map<string, Presenca[]>();
    presencas.forEach((p) => {
      if (!map.has(p.chamada_id)) map.set(p.chamada_id, []);
      map.get(p.chamada_id)!.push(p);
    });
    return map;
  }, [presencas]);

  const presencasByPessoa = useMemo(() => {
    const map = new Map<string, Presenca[]>();
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

  const norm = normalize(search);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const grupoOptions = [
    { value: 'todos', label: 'Todos' },
    ...GRUPOS.map((g) => ({ value: g, label: GRUPO_LABEL[g] })),
  ];

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

      {tab === 'data' && (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar pessoa..." />
          <FilterPills value={grupoFilter} onChange={setGrupoFilter} options={grupoOptions} />
          {chamadasSorted.length === 0 ? (
            <EmptyState icon="📅" title="Nenhuma chamada registrada" />
          ) : (
            <ul className="space-y-2">
              {chamadasSorted.map((c) => {
                const list = presencasByChamada.get(c.id) ?? [];
                const presentes = list.filter((p) => p.presente).length;
                const isExpanded = expanded.has(c.id);
                const presentList = list.filter((p) => p.presente);
                const visiblePeople = presentList
                  .map((p) => ({ presenca: p, pessoa: pessoaMap.get(p.pessoa_id) }))
                  .filter(({ pessoa }) => !!pessoa)
                  .filter(
                    ({ pessoa }) => grupoFilter === 'todos' || pessoa!.grupo === grupoFilter,
                  )
                  .filter(({ pessoa }) => !norm || normalize(pessoa!.nome).includes(norm))
                  .sort((a, b) => a.pessoa!.nome.localeCompare(b.pessoa!.nome));
                return (
                  <li
                    key={c.id}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(c.id)}
                        className="flex flex-1 items-center gap-2 text-left"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-4 shrink-0 text-[var(--color-text-muted)]" />
                        ) : (
                          <ChevronRight className="size-4 shrink-0 text-[var(--color-text-muted)]" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{c.data}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">
                            <span className="font-semibold text-[var(--color-green)]">
                              {presentes}
                            </span>{' '}
                            presentes / {list.length} marcações
                          </div>
                        </div>
                      </button>
                      {isAdmin && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingChamada(c)}
                            aria-label="Editar chamada"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setChamadaToDelete(c)}
                            aria-label="Excluir chamada"
                          >
                            <Trash2 className="size-4 text-[var(--color-red)]" />
                          </Button>
                        </>
                      )}
                    </div>
                    {isExpanded && (
                      <ul className="mt-2 space-y-0.5 border-t border-[var(--color-border)] pt-2 text-sm">
                        {visiblePeople.length === 0 ? (
                          <li className="text-xs text-[var(--color-text-muted)]">
                            Nenhuma pessoa nos filtros.
                          </li>
                        ) : (
                          visiblePeople.map(({ presenca, pessoa }) => (
                            <li
                              key={presenca.id}
                              className="flex items-center justify-between truncate"
                            >
                              <span className="truncate">• {pessoa!.nome}</span>
                              <span
                                className="text-xs text-[var(--color-text-muted)]"
                                aria-label="presente"
                              >
                                ✓
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {tab === 'pessoa' && (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar pessoa..." />
          <ul className="space-y-2">
            {pessoas
              .filter((p) => !norm || normalize(p.nome).includes(norm))
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map((p) => {
                const list = presencasByPessoa.get(p.id) ?? [];
                return (
                  <li
                    key={p.id}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
                  >
                    <div className="font-medium">{p.nome}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {list.length} presenças
                    </div>
                  </li>
                );
              })}
          </ul>
        </>
      )}

      {tab === 'cestas' && (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar pessoa..." />
          <ul className="space-y-2">
            {pessoas
              .filter((p) => !norm || normalize(p.nome).includes(norm))
              .filter((p) => (cestasByPessoa.get(p.id)?.length ?? 0) > 0)
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map((p) => {
                const list = cestasByPessoa.get(p.id) ?? [];
                return (
                  <li
                    key={p.id}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
                  >
                    <div className="font-medium">{p.nome}</div>
                    <ul className="mt-1 space-y-0.5 text-xs text-[var(--color-text-muted)]">
                      {list
                        .sort((a, b) => b.data.localeCompare(a.data))
                        .map((c) => (
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
        </>
      )}

      <ConfirmDialog
        open={!!chamadaToDelete}
        onOpenChange={(v) => {
          if (!v) setChamadaToDelete(null);
        }}
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

      <ChamadaEditDialog
        open={!!editingChamada}
        onOpenChange={(v) => {
          if (!v) setEditingChamada(null);
        }}
        chamada={editingChamada}
        pessoas={pessoas}
        presencas={editingChamada ? (presencasByChamada.get(editingChamada.id) ?? []) : []}
        grupoFilter={grupoFilter}
        search={search}
      />
    </div>
  );
}

interface ChamadaEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chamada: Chamada | null;
  pessoas: Pessoa[];
  presencas: Presenca[];
  grupoFilter: string;
  search: string;
}

function ChamadaEditDialog({
  open,
  onOpenChange,
  chamada,
  pessoas,
  presencas,
  grupoFilter,
  search,
}: ChamadaEditDialogProps) {
  const savePresenca = useSavePresenca();

  const presentMap = useMemo(() => {
    const m = new Map<string, boolean>();
    presencas.forEach((p) => m.set(p.pessoa_id, p.presente));
    return m;
  }, [presencas]);

  const norm = normalize(search);

  const filteredPessoas = useMemo(
    () =>
      pessoas
        .filter((p) => p.ativo !== false)
        .filter((p) => grupoFilter === 'todos' || p.grupo === grupoFilter)
        .filter((p) => !norm || normalize(p.nome).includes(norm))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    [pessoas, grupoFilter, norm],
  );

  const toggle = async (pessoaId: string) => {
    if (!chamada) return;
    const curr = presentMap.get(pessoaId) ?? false;
    try {
      await savePresenca.mutateAsync({
        chamada_id: chamada.id,
        pessoa_id: pessoaId,
        presente: !curr,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar chamada {chamada?.data}</DialogTitle>
        </DialogHeader>
        <ul className="space-y-1">
          {filteredPessoas.length === 0 ? (
            <li className="text-sm text-[var(--color-text-muted)]">
              Nenhuma pessoa nos filtros.
            </li>
          ) : (
            filteredPessoas.map((p) => {
              const isPresent = presentMap.get(p.id) ?? false;
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2"
                >
                  <span className="truncate">{p.nome}</span>
                  <Button
                    size="sm"
                    onClick={() => toggle(p.id)}
                    disabled={savePresenca.isPending}
                    className={
                      'w-28 shrink-0 justify-center text-center font-semibold ' +
                      (isPresent
                        ? 'bg-[var(--color-green)] text-black hover:bg-[var(--color-green)]/90'
                        : 'bg-[var(--color-red)] text-white hover:bg-[var(--color-red)]/90')
                    }
                  >
                    {isPresent ? 'PRESENTE' : 'FALTA'}
                  </Button>
                </li>
              );
            })
          )}
        </ul>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
