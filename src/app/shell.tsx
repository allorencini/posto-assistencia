import { SyncStatus } from '@/components/sync-status';
import { useIdleLogout } from '@/features/auth/idle-timeout';
import { logout } from '@/features/auth/logout';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/lib/cn';
import {
  CheckSquare,
  Gift,
  History,
  LogOut,
  Package,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/cadastro', label: 'Cadastros', icon: Users, role: undefined },
  { to: '/chamada', label: 'Chamada', icon: CheckSquare, role: undefined },
  { to: '/historico', label: 'Histórico', icon: History, role: undefined },
  { to: '/ranking', label: 'Ranking', icon: Trophy, role: undefined },
  { to: '/estoque', label: 'Estoque', icon: Package, role: undefined },
  { to: '/pedidos', label: 'Pedidos', icon: Gift, role: undefined },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, role: 'admin' as const },
];

export function AppShell() {
  useIdleLogout();
  const papel = useAuth((s) => s.papel);

  const visibleTabs = tabs.filter((t) => !t.role || t.role === papel);

  return (
    <div className="flex h-screen flex-col">
      <SyncStatus />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 flex items-stretch justify-around border-t border-[var(--color-border)] bg-[var(--color-bg-nav)] pb-[env(safe-area-inset-bottom)]">
        {visibleTabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-xs text-[var(--color-text-muted)]',
                isActive && 'text-[var(--color-text)]',
              )
            }
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => logout()}
          className="flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-xs text-[var(--color-text-muted)]"
          type="button"
          aria-label="Sair"
        >
          <LogOut className="size-5" />
          <span>Sair</span>
        </button>
      </nav>
    </div>
  );
}
