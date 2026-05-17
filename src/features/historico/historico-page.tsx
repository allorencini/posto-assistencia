import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { FilterPills } from '@/components/filter-pills';
import { SearchInput } from '@/components/search-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [dateFilter, setDateFilter] = useState<'todos' | 'mes-atual' | 'mes-anterior' | 'custom'>(
    'todos',
  );
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
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

  const dateRange = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (dateFilter === 'mes-atual') {
      return { from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) };
    }
    if (dateFilter === 'mes-anterior') {
      return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
    }
    if (dateFilter === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return null;
  }, [dateFilter, customFrom, customTo]);

  const chamadasSorted = useMemo(() => {
    const filtered = dateRange
      ? chamadas.filter((c) => c.data >= dateRange.from && c.data <= dateRange.to)
      : chamadas;
    return [...filtered].sort((a, b) => b.data.localeCompare(a.data));
  }, [chamadas, dateRange]);

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
          <FilterPills
            value={dateFilter}
            onChange={(v) => setDateFilter(v as typeof dateFilter)}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'mes-atual', label: 'Mês atual' },
              { value: 'mes-anterior', label: 'Mês anterior' },
              { value: 'custom', label: 'Período' },
            ]}
          />
          {dateFilter === 'custom' && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1">
                <Label htmlFor="hist-from">De</Label>
                <Input
                  id="hist-from"
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="min-w-0 flex-1">
                <Label htmlFor="hist-to">Até</Label>
                <Input
                  id="hist-to"
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}
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
                  .filter(({ pessoa }) =>
                    !pessoa
                      ? grupoFilter === 'todos' && !norm
                      : (grupoFilter === 'todos' || pessoa.grupo === grupoFilter) &&
                        (!norm || normalize(pessoa.nome).includes(norm)),
                  )
                  .sort((a, b) => (a.pessoa?.nome ?? '￿').localeCompare(b.pessoa?.nome ?? '￿'));
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
                              <span className="truncate">
                                •{' '}
                                {pessoa?.nome ?? (
                                  <span className="italic text-[var(--color-text-muted)]">
                                    Pessoa não sincronizada ({presenca.pessoa_id.slice(0, 8)})
                                  </span>
                                )}
                              </span>
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
          <CestasPorData
            cestas={cestas}
            pessoaMap={pessoaMap}
            isAdmin={isAdmin}
            norm={norm}
            expanded={expanded}
            onToggle={toggleExpanded}
            onRemove={async (id) => {
              await deleteCesta.mutateAsync(id);
              toast.success('Cesta removida');
            }}
          />
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
            <li className="text-sm text-[var(--color-text-muted)]">Nenhuma pessoa nos filtros.</li>
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
                    className={`w-28 shrink-0 justify-center text-center font-semibold ${
                      isPresent
                        ? 'bg-[var(--color-green)] text-black hover:bg-[var(--color-green)]/90'
                        : 'bg-[var(--color-red)] text-white hover:bg-[var(--color-red)]/90'
                    }`}
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

interface CestasPorDataProps {
  cestas: ReturnType<typeof useCestas>['data'];
  pessoaMap: Map<string, Pessoa>;
  isAdmin: boolean;
  norm: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void | Promise<void>;
}

function CestasPorData({
  cestas,
  pessoaMap,
  isAdmin,
  norm,
  expanded,
  onToggle,
  onRemove,
}: CestasPorDataProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; pessoa_id: string }[]>();
    (cestas ?? []).forEach((c) => {
      if (c.ativo === false) return;
      if (!map.has(c.data)) map.set(c.data, []);
      map.get(c.data)!.push({ id: c.id, pessoa_id: c.pessoa_id });
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [cestas]);

  if (grouped.length === 0) {
    return <EmptyState icon="🧺" title="Nenhuma cesta entregue" />;
  }

  return (
    <ul className="space-y-2">
      {grouped.map(([data, items]) => {
        const visible = items
          .map((it) => ({ ...it, pessoa: pessoaMap.get(it.pessoa_id) }))
          .filter(({ pessoa }) => !norm || (pessoa && normalize(pessoa.nome).includes(norm)))
          .sort((a, b) => (a.pessoa?.nome ?? '￿').localeCompare(b.pessoa?.nome ?? '￿'));
        if (visible.length === 0) return null;
        const key = `cestas-${data}`;
        const isExpanded = expanded.has(key);
        return (
          <li
            key={data}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
          >
            <button
              type="button"
              onClick={() => onToggle(key)}
              className="flex w-full items-center gap-2 text-left"
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown className="size-4 shrink-0 text-[var(--color-text-muted)]" />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-[var(--color-text-muted)]" />
              )}
              <div className="flex-1">
                <div className="font-medium">{data}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {visible.length} cesta{visible.length !== 1 ? 's' : ''}
                </div>
              </div>
            </button>
            {isExpanded && (
              <ul className="mt-2 space-y-0.5 border-t border-[var(--color-border)] pt-2 text-sm">
                {visible.map((it) => (
                  <li key={it.id} className="flex items-center justify-between">
                    <span className="truncate">
                      •{' '}
                      {it.pessoa?.nome ?? (
                        <span className="italic text-[var(--color-text-muted)]">
                          Pessoa não sincronizada ({it.pessoa_id.slice(0, 8)})
                        </span>
                      )}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => void onRemove(it.id)}
                        className="text-[var(--color-red)] hover:underline"
                      >
                        remover
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
