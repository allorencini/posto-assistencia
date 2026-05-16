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
