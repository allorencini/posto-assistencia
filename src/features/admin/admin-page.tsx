import { cn } from '@/lib/cn';
import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: 'usuarios', label: 'Usuários' },
  { to: 'audit', label: 'Audit log' },
  { to: 'lgpd', label: 'LGPD' },
  { to: 'termos', label: 'Termos' },
];

export function AdminPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <nav className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) =>
              cn(
                'rounded-full border px-3 py-1 text-sm',
                isActive
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-muted)]',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
