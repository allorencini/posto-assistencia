import { ConfirmDialog } from '@/components/confirm-dialog';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import { useAuditLog } from '@/hooks/use-audit-log';
import { useAnonimizarPessoa, useExportPessoa, useRevogarConsent } from '@/hooks/use-lgpd';
import { usePessoas } from '@/hooks/use-pessoas';
import { normalize } from '@/lib/normalize';
import type { Pessoa } from '@/types/domain';
import { Ban, ChevronRight, Download, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function LgpdPage() {
  const { data: pessoas = [] } = usePessoas();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Pessoa | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | 'anonimizar' | 'revogar'>(null);

  const exportPessoa = useExportPessoa();
  const anonimizar = useAnonimizarPessoa();
  const revogar = useRevogarConsent();

  const { data: history = [] } = useAuditLog({
    registroId: selected?.id,
    limit: 30,
  });

  const candidates = (() => {
    const norm = normalize(search);
    if (norm === '') return [];
    return pessoas
      .filter((p) => normalize(p.nome).includes(norm) || p.telefone?.includes(norm))
      .slice(0, 8);
  })();

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Direitos do titular — LGPD</h2>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar pessoa por nome ou telefone..."
      />

      {candidates.length > 0 && (
        <ul className="rounded border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          {candidates.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-nav)]"
                onClick={() => {
                  setSelected(p);
                  setSearch('');
                }}
              >
                <span>
                  {p.nome}
                  {p.telefone && ` · ${p.telefone}`}
                </span>
                <ChevronRight className="size-4 text-[var(--color-text-muted)]" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
          <div>
            <div className="font-medium">{selected.nome}</div>
            <div className="text-xs text-[var(--color-text-muted)]">
              Cadastrada em {selected.criado_em.slice(0, 10)} · {selected.grupo}
              {selected.anonimizado_em && ' · ANONIMIZADA'}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() =>
                exportPessoa
                  .mutateAsync(selected.id)
                  .then(() => toast.success('Exportado'))
                  .catch((e) => toast.error(e.message))
              }
              disabled={exportPessoa.isPending}
            >
              <Download className="mr-1 size-4" /> Exportar JSON
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!!selected.anonimizado_em}
              onClick={() => setConfirmAction('anonimizar')}
            >
              <EyeOff className="mr-1 size-4" /> Anonimizar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setConfirmAction('revogar')}>
              <Ban className="mr-1 size-4" /> Revogar consentimento
            </Button>
          </div>

          <div className="border-t border-[var(--color-border)] pt-2">
            <div className="text-sm font-medium">Histórico (audit log)</div>
            <ul className="mt-1 space-y-0.5 text-xs">
              {history.length === 0 ? (
                <li className="text-[var(--color-text-muted)]">Nenhuma operação registrada.</li>
              ) : (
                history.map((h) => (
                  <li key={h.id}>
                    <span className="font-mono">
                      {h.ocorrido_em.replace('T', ' ').slice(0, 19)}
                    </span>
                    {' · '}
                    <span>{h.operacao}</span>
                    {' · '}
                    <span className="text-[var(--color-text-muted)]">{h.tabela}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction === 'anonimizar'}
        onOpenChange={(v) => {
          if (!v) setConfirmAction(null);
        }}
        title={`Anonimizar ${selected?.nome ?? ''}?`}
        description="Nome, telefone, endereço e dados de visita serão zerados. Histórico de presença/cesta preservado anonimamente. Irreversível."
        variant="destructive"
        confirmLabel="Anonimizar"
        onConfirm={async () => {
          if (!selected) return;
          try {
            await anonimizar.mutateAsync(selected.id);
            toast.success('Pessoa anonimizada');
            setConfirmAction(null);
            setSelected(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
          }
        }}
      />

      <ConfirmDialog
        open={confirmAction === 'revogar'}
        onOpenChange={(v) => {
          if (!v) setConfirmAction(null);
        }}
        title="Revogar consentimento?"
        description="Marca consentimentos ativos como revogados. Considere também anonimizar dados em seguida."
        variant="destructive"
        confirmLabel="Revogar"
        onConfirm={async () => {
          if (!selected) return;
          try {
            await revogar.mutateAsync(selected.id);
            toast.success('Consentimento revogado');
            setConfirmAction(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro');
          }
        }}
      />
    </div>
  );
}
