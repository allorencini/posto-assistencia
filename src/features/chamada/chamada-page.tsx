import { EmptyState } from '@/components/empty-state';
import { FilterPills } from '@/components/filter-pills';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import { useChamadas, useGetOrCreateChamada } from '@/hooks/use-chamada';
import { usePessoas } from '@/hooks/use-pessoas';
import { useAllPresencas, usePresencasByChamada, useSavePresenca } from '@/hooks/use-presencas';
import { cn } from '@/lib/cn';
import { normalize } from '@/lib/normalize';
import { GRUPOS } from '@/schemas/pessoa';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const GRUPO_LABEL = {
  evangelizacao: 'Evangelização',
  mocidade: 'Mocidade',
  adulto: 'Adultos',
  gestante: 'Gestantes',
} as const;

type HistMark = 'P' | 'F' | '-';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ChamadaPage() {
  const today = todayISO();
  const { data: pessoas = [] } = usePessoas();
  const { data: chamadas = [] } = useChamadas();
  const { data: allPresencas = [] } = useAllPresencas();
  const getOrCreate = useGetOrCreateChamada();
  const savePresenca = useSavePresenca();
  // Pega chamada existente pra hoje sem criar (criação lazy no primeiro toggle pra não
  // poluir histórico com chamadas vazias quando user só abre a página).
  const existing = useMemo(() => chamadas.find((c) => c.data === today) ?? null, [chamadas, today]);
  const [chamadaId, setChamadaId] = useState<string | null>(existing?.id ?? null);
  if (existing && chamadaId !== existing.id) setChamadaId(existing.id);
  const { data: presencas = [] } = usePresencasByChamada(chamadaId);
  const creatingRef = useRef<Promise<string> | null>(null);

  const ensureChamadaId = async (): Promise<string> => {
    if (chamadaId) return chamadaId;
    if (!creatingRef.current) {
      creatingRef.current = getOrCreate.mutateAsync(today).then((c) => c.id);
    }
    const id = await creatingRef.current;
    setChamadaId(id);
    return id;
  };

  const [search, setSearch] = useState('');
  const [grupoFilter, setGrupoFilter] = useState('todos');

  const presentMap = useMemo(() => {
    const m = new Map<string, boolean>();
    presencas.forEach((p) => m.set(p.pessoa_id, p.presente));
    return m;
  }, [presencas]);

  // Last 4 chamadas BEFORE today (older→newer order for display)
  const last4Chamadas = useMemo(() => {
    return chamadas
      .filter((c) => c.data < today)
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 4)
      .reverse();
  }, [chamadas, today]);

  // For each pessoa, compute 4-element array of 'P' | 'F' | '-'
  const historicoMap = useMemo(() => {
    const presIndex = new Map<string, boolean>();
    allPresencas.forEach((p) => {
      presIndex.set(`${p.chamada_id}|${p.pessoa_id}`, p.presente);
    });
    const map = new Map<string, HistMark[]>();
    pessoas.forEach((p) => {
      const arr: HistMark[] = last4Chamadas.map((c) => {
        const key = `${c.id}|${p.id}`;
        if (!presIndex.has(key)) return '-';
        return presIndex.get(key) ? 'P' : 'F';
      });
      map.set(p.id, arr);
    });
    return map;
  }, [allPresencas, pessoas, last4Chamadas]);

  const filteredByGrupo = useMemo(() => {
    const norm = normalize(search);
    const list = pessoas.filter((p) => {
      if (grupoFilter !== 'todos' && p.grupo !== grupoFilter) return false;
      if (norm && !normalize(p.nome).includes(norm)) return false;
      return true;
    });
    const grouped: Record<string, typeof pessoas> = {};
    GRUPOS.forEach((g) => {
      grouped[g] = [];
    });
    list.forEach((p) => {
      if (grouped[p.grupo]) grouped[p.grupo].push(p);
    });
    const isFourFaltas = (hist: HistMark[]) => hist.length === 4 && hist.every((h) => h === 'F');
    const sortKey = (p: (typeof pessoas)[number]) =>
      isFourFaltas(historicoMap.get(p.id) ?? []) ? 1 : 0;
    GRUPOS.forEach((g) =>
      grouped[g].sort((a, b) => sortKey(a) - sortKey(b) || a.nome.localeCompare(b.nome)),
    );
    return grouped;
  }, [pessoas, search, grupoFilter, historicoMap]);

  const total = Object.values(filteredByGrupo).reduce((acc, arr) => acc + arr.length, 0);
  const presentCount = Array.from(presentMap.values()).filter(Boolean).length;

  const toggle = async (pessoaId: string) => {
    try {
      const cid = await ensureChamadaId();
      await savePresenca.mutateAsync({
        chamada_id: cid,
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
                    const hist = historicoMap.get(p.id) ?? [];
                    return (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{p.nome}</div>
                          {hist.length > 0 && (
                            <div className="mt-1 flex gap-1">
                              {hist.map((h, i) => (
                                <span
                                  // biome-ignore lint/suspicious/noArrayIndexKey: histórico tem ordem fixa
                                  key={i}
                                  className={cn(
                                    'rounded px-1.5 py-0.5 font-mono text-[10px]',
                                    h === 'P' && 'bg-[var(--color-green)] text-black',
                                    h === 'F' && 'bg-[var(--color-red)] text-white',
                                    h === '-' &&
                                      'bg-[var(--color-bg-nav)] text-[var(--color-text-muted)]',
                                  )}
                                >
                                  {h}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => toggle(p.id)}
                          className={`w-28 shrink-0 justify-center text-center font-semibold ${
                            isPresent
                              ? 'bg-[var(--color-green)] hover:bg-[var(--color-green)]/90 text-black'
                              : 'bg-[var(--color-red)] hover:bg-[var(--color-red)]/90 text-white'
                          }`}
                        >
                          {isPresent ? 'PRESENTE' : 'FALTA'}
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
