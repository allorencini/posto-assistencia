import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { FilterPills } from '@/components/filter-pills';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/useAuth';
import { useCestas, useDeleteCesta } from '@/hooks/use-cestas';
import { useChamadas, useDeleteChamada } from '@/hooks/use-chamada';
import { usePessoas } from '@/hooks/use-pessoas';
import { useAllPresencas } from '@/hooks/use-presencas';
import type { Chamada } from '@/types/domain';
import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

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

  const chamadasSorted = useMemo(
    () => [...chamadas].sort((a, b) => b.data.localeCompare(a.data)),
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

      {tab !== 'data' && (
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar pessoa..." />
      )}

      {tab === 'data' &&
        (chamadasSorted.length === 0 ? (
          <EmptyState icon="📅" title="Nenhuma chamada registrada" />
        ) : (
          <ul className="space-y-2">
            {chamadasSorted.map((c) => {
              const list = presencasByChamada.get(c.id) ?? [];
              const presentes = list.filter((p) => p.presente).length;
              return (
                <li
                  key={c.id}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.data}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {presentes} presentes / {list.length} marcações
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setChamadaToDelete(c)}
                        aria-label="Excluir chamada"
                      >
                        <Trash2 className="size-4 text-[var(--color-red)]" />
                      </Button>
                    )}
                  </div>
                  <ul className="space-y-0.5 text-sm">
                    {list
                      .filter((p) => p.presente)
                      .map((p) => {
                        const pessoa = pessoaMap.get(p.pessoa_id);
                        return (
                          <li key={p.id} className="truncate">
                            • {pessoa?.nome ?? '?'}
                          </li>
                        );
                      })}
                  </ul>
                </li>
              );
            })}
          </ul>
        ))}

      {tab === 'pessoa' && (
        <ul className="space-y-2">
          {pessoas
            .filter((p) => !norm || p.nome.toLowerCase().includes(norm))
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
    </div>
  );
}
