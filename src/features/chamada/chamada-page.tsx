import { useMemo, useState, useEffect } from 'react';
import { SearchInput } from '@/components/search-input';
import { FilterPills } from '@/components/filter-pills';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePessoas } from '@/hooks/use-pessoas';
import { useGetOrCreateChamada } from '@/hooks/use-chamada';
import { usePresencasByChamada, useSavePresenca } from '@/hooks/use-presencas';
import { GRUPOS } from '@/schemas/pessoa';

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

export function ChamadaPage() {
  const today = todayISO();
  const { data: pessoas = [] } = usePessoas();
  const getOrCreate = useGetOrCreateChamada();
  const savePresenca = useSavePresenca();
  const [chamadaId, setChamadaId] = useState<string | null>(null);
  const { data: presencas = [] } = usePresencasByChamada(chamadaId);

  useEffect(() => {
    let cancelled = false;
    getOrCreate.mutateAsync(today).then((c) => { if (!cancelled) setChamadaId(c.id); }).catch(() => {});
    return () => { cancelled = true; };
  }, [today]);

  const [search, setSearch] = useState('');
  const [grupoFilter, setGrupoFilter] = useState('todos');

  const presentMap = useMemo(() => {
    const m = new Map<string, boolean>();
    presencas.forEach((p) => m.set(p.pessoa_id, p.presente));
    return m;
  }, [presencas]);

  const filteredByGrupo = useMemo(() => {
    const norm = search.trim().toLowerCase();
    const list = pessoas.filter((p) => {
      if (grupoFilter !== 'todos' && p.grupo !== grupoFilter) return false;
      if (norm && !p.nome.toLowerCase().includes(norm)) return false;
      return true;
    });
    const grouped: Record<string, typeof pessoas> = {};
    GRUPOS.forEach((g) => { grouped[g] = []; });
    list.forEach((p) => { if (grouped[p.grupo]) grouped[p.grupo].push(p); });
    GRUPOS.forEach((g) => grouped[g].sort((a, b) => a.nome.localeCompare(b.nome)));
    return grouped;
  }, [pessoas, search, grupoFilter]);

  const total = Object.values(filteredByGrupo).reduce((acc, arr) => acc + arr.length, 0);
  const presentCount = Array.from(presentMap.values()).filter(Boolean).length;

  const toggle = async (pessoaId: string) => {
    if (!chamadaId) return;
    try {
      await savePresenca.mutateAsync({
        chamada_id: chamadaId,
        pessoa_id: pessoaId,
        presente: !(presentMap.get(pessoaId) ?? false),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Chamada</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {today} · {presentCount} presentes
        </p>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar pessoa..." />
      <FilterPills
        value={grupoFilter}
        onChange={setGrupoFilter}
        options={[
          { value: 'todos', label: 'Todos' },
          ...GRUPOS.map((g) => ({ value: g, label: GRUPO_LABEL[g] })),
        ]}
      />

      {total === 0 ? (
        <EmptyState icon="✅" title="Nenhuma pessoa encontrada" />
      ) : (
        <div className="space-y-4">
          {GRUPOS.map((g) => {
            const list = filteredByGrupo[g];
            if (list.length === 0) return null;
            return (
              <div key={g}>
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">
                  {GRUPO_LABEL[g]} ({list.length})
                </h3>
                <ul className="space-y-1">
                  {list.map((p) => {
                    const isPresent = presentMap.get(p.id) ?? false;
                    return (
                      <li key={p.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2">
                        <div className="truncate">{p.nome}</div>
                        <Button
                          size="sm"
                          variant={isPresent ? 'default' : 'secondary'}
                          onClick={() => toggle(p.id)}
                          disabled={!chamadaId}
                        >
                          {isPresent ? '✓ Presente' : 'Marcar'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
