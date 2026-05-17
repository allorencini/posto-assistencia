import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { runSync } from '@/lib/sync';
import Dexie from 'dexie';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function ResyncPage() {
  const [pulling, setPulling] = useState(false);
  const [wiping, setWiping] = useState(false);

  const [counts, setCounts] = useState<Record<string, number>>({});

  const refreshCounts = async () => {
    setCounts({
      pessoas: await db.pessoas.count(),
      familias: await db.familias.count(),
      chamadas: await db.chamadas.count(),
      presencas: await db.presencas.count(),
      cestas: await db.cestas.count(),
      itens: await db.itens.count(),
      pedidos: await db.pedidos.count(),
      sync_queue: await db.sync_queue.count(),
    });
  };

  const forcePull = async () => {
    setPulling(true);
    try {
      await runSync();
      await refreshCounts();
      toast.success('Sincronização concluída');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao sincronizar');
    } finally {
      setPulling(false);
    }
  };

  const wipeAndReload = async () => {
    if (!window.confirm('Apagar todo o cache local e recarregar?')) return;
    setWiping(true);
    try {
      await db.close();
      await Dexie.delete('presenca-db');
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao limpar cache');
      setWiping(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Sincronização</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Use estas ações se você perceber que os dados locais não batem com o servidor.
        </p>
      </div>

      <div className="space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <h3 className="font-medium">Forçar sincronização</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Envia pendências e re-baixa todos os dados do servidor sem apagar o cache local.
        </p>
        <Button
          onClick={forcePull}
          disabled={pulling}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white"
        >
          <RefreshCw className={pulling ? 'size-4 animate-spin' : 'size-4'} />
          {pulling ? 'Sincronizando…' : 'Sincronizar agora'}
        </Button>
      </div>

      <div className="space-y-3 rounded-md border border-[var(--color-red)]/50 bg-[var(--color-bg-card)] p-4">
        <h3 className="font-medium text-[var(--color-red)]">Apagar cache local</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Apaga o banco IndexedDB deste navegador e recarrega a página. Após o login os dados
          são re-baixados do servidor. Use quando a sincronização normal não resolver.
        </p>
        <Button
          variant="destructive"
          onClick={wipeAndReload}
          disabled={wiping}
        >
          {wiping ? 'Apagando…' : 'Apagar cache e recarregar'}
        </Button>
      </div>

      <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Diagnóstico local</h3>
          <Button size="sm" variant="ghost" onClick={refreshCounts}>
            Atualizar
          </Button>
        </div>
        {Object.keys(counts).length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Clique em <em>Atualizar</em> para ver a contagem por tabela.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-1 text-sm">
            {Object.entries(counts).map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">{k}</span>
                <span className="font-mono">{v}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
