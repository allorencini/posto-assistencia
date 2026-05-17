import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/useAuth';
import { useAppUsers, useToggleUserAtivo } from '@/hooks/use-app-users';
import { KeyRound, Plus, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ResetPasswordDialog } from './reset-password-dialog';
import { UserForm } from './user-form';

export function UsersPage() {
  const { data: users = [] } = useAppUsers();
  const toggle = useToggleUserAtivo();
  const currentUserId = useAuth((s) => s.user?.id);
  const [formOpen, setFormOpen] = useState(false);
  const [resetUser, setResetUser] = useState<{ id: string; nome: string } | null>(null);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Usuários</h2>
      <Button
        size="lg"
        onClick={() => setFormOpen(true)}
        className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white"
      >
        <Plus className="mr-2 size-5" />
        Adicionar
      </Button>

      {users.length === 0 ? (
        <EmptyState icon="👥" title="Nenhum usuário" />
      ) : (
        <ul className="space-y-1">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{u.nome}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {u.username && `@${u.username} · `}
                  {u.papel} · {u.ativo ? 'ativo' : 'inativo'}
                  {u.ultimo_login_em && ` · último login ${u.ultimo_login_em.slice(0, 10)}`}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setResetUser({ id: u.id, nome: u.nome })}
                  aria-label="Resetar senha"
                >
                  <KeyRound className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={u.id === currentUserId}
                  title={u.id === currentUserId ? 'Não pode desativar a si mesmo' : undefined}
                  onClick={async () => {
                    try {
                      await toggle.mutateAsync({ id: u.id, ativo: !u.ativo });
                      toast.success(u.ativo ? 'Usuário desativado' : 'Usuário reativado');
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Erro');
                    }
                  }}
                  aria-label={u.ativo ? 'Desativar' : 'Reativar'}
                >
                  {u.ativo ? (
                    <UserX className="size-4 text-[var(--color-red)]" />
                  ) : (
                    <UserCheck className="size-4 text-[var(--color-green)]" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <UserForm open={formOpen} onOpenChange={setFormOpen} />
      {resetUser && (
        <ResetPasswordDialog
          open={!!resetUser}
          onOpenChange={(v) => {
            if (!v) setResetUser(null);
          }}
          userId={resetUser.id}
          userNome={resetUser.nome}
        />
      )}
    </div>
  );
}
