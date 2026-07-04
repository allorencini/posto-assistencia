import { ConfirmDialog } from '@/components/confirm-dialog';
import { FilterPills } from '@/components/filter-pills';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCestas, useSaveCesta } from '@/hooks/use-cestas';
import { useChamadas } from '@/hooks/use-chamada';
import { usePessoas, useSavePessoa } from '@/hooks/use-pessoas';
import { useAllPresencas } from '@/hooks/use-presencas';
import { GRUPOS } from '@/schemas/pessoa';
import type { Pessoa } from '@/types/domain';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

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

function weeksAgoISO(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function RankingPage() {
  const { data: pessoas = [] } = usePessoas();
  const { data: presencas = [] } = useAllPresencas();
  const { data: chamadas = [] } = useChamadas();
  const { data: cestas = [] } = useCestas();
  const savePessoa = useSavePessoa();
  const saveCesta = useSaveCesta();

  const [toHide, setToHide] = useState<Pessoa | null>(null);
  const [dateFrom, setDateFrom] = useState(weeksAgoISO(12));
  const [dateTo, setDateTo] = useState(todayISO());
  const [grupoFilter, setGrupoFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<
    'presencas-desc' | 'presencas-asc' | 'nome-asc' | 'nome-desc'
  >('presencas-desc');

  const today = todayISO();

  const chamadasInRange = useMemo(
    () => chamadas.filter((c) => c.data >= dateFrom && c.data <= dateTo),
    [chamadas, dateFrom, dateTo],
  );

  const chamadaIdsSet = useMemo(() => new Set(chamadasInRange.map((c) => c.id)), [chamadasInRange]);

  const totalChamadas = chamadasInRange.length;

  const presencaCountByPessoa = useMemo(() => {
    const map = new Map<string, number>();
    presencas.forEach((p) => {
      if (p.presente && chamadaIdsSet.has(p.chamada_id)) {
        map.set(p.pessoa_id, (map.get(p.pessoa_id) ?? 0) + 1);
      }
    });
    return map;
  }, [presencas, chamadaIdsSet]);

  const cestasCountByPessoa = useMemo(() => {
    const map = new Map<string, number>();
    cestas.forEach((c) => {
      if (c.ativo !== false && c.data >= dateFrom && c.data <= dateTo) {
        map.set(c.pessoa_id, (map.get(c.pessoa_id) ?? 0) + 1);
      }
    });
    return map;
  }, [cestas, dateFrom, dateTo]);

  const cestaTodaySet = useMemo(
    () =>
      new Set(cestas.filter((c) => c.ativo !== false && c.data === today).map((c) => c.pessoa_id)),
    [cestas, today],
  );

  const rankablePessoas = useMemo(() => pessoas.filter((p) => !p.excluir_ranking), [pessoas]);

  const byGrupo = useMemo(() => {
    const grouped: Record<string, Pessoa[]> = {};
    GRUPOS.forEach((g) => {
      grouped[g] = [];
    });
    rankablePessoas.forEach((p) => {
      if (grouped[p.grupo]) grouped[p.grupo].push(p);
    });
    GRUPOS.forEach((g) =>
      grouped[g].sort((a, b) => {
        const aCount = presencaCountByPessoa.get(a.id) ?? 0;
        const bCount = presencaCountByPessoa.get(b.id) ?? 0;
        if (sortBy === 'presencas-desc') return bCount - aCount || a.nome.localeCompare(b.nome);
        if (sortBy === 'presencas-asc') return aCount - bCount || a.nome.localeCompare(b.nome);
        if (sortBy === 'nome-asc') return a.nome.localeCompare(b.nome);
        return b.nome.localeCompare(a.nome);
      }),
    );
    return grouped;
  }, [rankablePessoas, presencaCountByPessoa, sortBy]);

  const entregarCesta = async (pessoaId: string) => {
    try {
      await saveCesta.mutateAsync({ pessoa_id: pessoaId, data: today });
      toast.success('Cesta registrada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  const grupoOptions = [
    { value: 'todos', label: 'Todos' },
    ...GRUPOS.map((g) => ({ value: g, label: GRUPO_LABEL[g] })),
  ];

  const visibleGrupos = GRUPOS.filter((g) => grupoFilter === 'todos' || grupoFilter === g);

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Ranking</h1>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <Label htmlFor="ranking-from">De</Label>
            <Input
              id="ranking-from"
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="min-w-0 flex-1">
            <Label htmlFor="ranking-to">Até</Label>
            <Input
              id="ranking-to"
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        <FilterPills value={grupoFilter} onChange={setGrupoFilter} options={grupoOptions} />
        <FilterPills
          value={sortBy}
          onChange={(v) => setSortBy(v as typeof sortBy)}
          options={[
            { value: 'presencas-desc', label: '↓ Presenças' },
            { value: 'presencas-asc', label: '↑ Presenças' },
            { value: 'nome-asc', label: 'A→Z' },
            { value: 'nome-desc', label: 'Z→A' },
          ]}
        />
        <p className="text-sm text-[var(--color-text-muted)]">
          {totalChamadas} chamadas no período
        </p>
      </div>

      {visibleGrupos.map((g) => {
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
                const pct = totalChamadas > 0 ? Math.round((count / totalChamadas) * 100) : 0;
                const cestaCount = cestasCountByPessoa.get(p.id) ?? 0;
                const recebeuHoje = cestaTodaySet.has(p.id);
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2"
                  >
                    <div className="flex w-10 shrink-0 items-center justify-center text-sm font-semibold tabular-nums text-[var(--color-text-muted)]">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.nome}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {count}/{totalChamadas} · {pct}%
                        {cestaCount > 0 && <span className="ml-2">🧺 {cestaCount}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                      <Button
                        size="sm"
                        onClick={() => entregarCesta(p.id)}
                        disabled={recebeuHoje || saveCesta.isPending}
                        variant={recebeuHoje ? 'secondary' : 'default'}
                      >
                        {recebeuHoje ? '✓ Hoje' : 'Cesta'}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setToHide(p)}
                        aria-label="Excluir do ranking"
                      >
                        <X className="size-4 text-[var(--color-red)]" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      <ConfirmDialog
        open={!!toHide}
        onOpenChange={(v) => {
          if (!v) setToHide(null);
        }}
        title={`Excluir ${toHide?.nome ?? ''} do ranking?`}
        description="Não aparece mais aqui. Presença e cestas continuam normais. Reverter via cadastro → editar pessoa → desmarcar Excluir do ranking."
        variant="destructive"
        confirmLabel="Excluir do ranking"
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
