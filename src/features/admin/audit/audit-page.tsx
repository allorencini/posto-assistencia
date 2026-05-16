import { useState } from 'react';
import { useAuditLog } from '@/hooks/use-audit-log';
import { useAppUsers } from '@/hooks/use-app-users';
import { FilterPills } from '@/components/filter-pills';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';

const TABELAS = ['pessoas', 'familias', 'presencas', 'cestas', 'pedidos', 'app_users'];

export function AuditPage() {
  const [tabela, setTabela] = useState('todas');
  const [registroId, setRegistroId] = useState('');
  const { data: users = [] } = useAppUsers();
  const userMap = new Map(users.map((u) => [u.id, u.nome]));
  const { data: logs = [], isLoading } = useAuditLog({
    tabela: tabela === 'todas' ? undefined : tabela,
    registroId: registroId.trim() || undefined,
    limit: 200,
  });

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Audit log</h2>

      <FilterPills
        value={tabela}
        onChange={setTabela}
        options={[
          { value: 'todas', label: 'Todas' },
          ...TABELAS.map((t) => ({ value: t, label: t })),
        ]}
      />
      <Input
        placeholder="Filtrar por registro_id (UUID)..."
        value={registroId}
        onChange={(e) => setRegistroId(e.target.value)}
      />

      {isLoading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Carregando...</p>
      ) : logs.length === 0 ? (
        <EmptyState icon="📜" title="Sem registros" />
      ) : (
        <ul className="space-y-1">
          {logs.map((l) => (
            <li key={l.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{l.ocorrido_em.replace('T', ' ').slice(0, 19)}</span>
                <span className="rounded bg-[var(--color-bg-nav)] px-2 py-0.5 text-xs">{l.operacao}</span>
                <span className="text-[var(--color-text-muted)]">{l.tabela}</span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">{l.registro_id.slice(0, 8)}</span>
                <span className="text-xs text-[var(--color-text-muted)]">por {l.usuario_id ? (userMap.get(l.usuario_id) ?? '?') : '—'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
