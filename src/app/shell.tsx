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
  Menu,
  Package,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);

  const visibleTabs = tabs.filter((t) => !t.role || t.role === papel);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile hamburger (visible < md only) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed left-3 top-3 z-40 flex size-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] md:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Backdrop mobile */}
      {isOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-nav)] transition-transform md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-lg font-bold text-[var(--color-text)]">Presença</h2>
          <button
            type="button"
            className="md:hidden"
            onClick={() => setIsOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {visibleTabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm',
                  isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text)]',
                )
              }
            >
              <Icon className="size-5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[var(--color-border)] p-2">
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--color-red)] hover:bg-[var(--color-bg-card)]"
          >
            <LogOut className="size-5 shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <SyncStatus />
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
