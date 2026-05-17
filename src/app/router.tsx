import { LoginPage } from '@/features/auth/login';
import { RequireRole } from '@/features/auth/require-role';
import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppShell } from './shell';

// Pages com named export — wrap pra obter `default` esperado por React.lazy
const lazyNamed = <T extends string>(
  loader: () => Promise<Record<T, ComponentType>>,
  name: T,
) => lazy(async () => ({ default: (await loader())[name] }));

const CadastroPage = lazyNamed(() => import('@/pages/cadastro'), 'CadastroPage');
const ChamadaPage = lazyNamed(() => import('@/pages/chamada'), 'ChamadaPage');
const HistoricoPage = lazyNamed(() => import('@/pages/historico'), 'HistoricoPage');
const RankingPage = lazyNamed(() => import('@/pages/ranking'), 'RankingPage');
const EstoquePage = lazyNamed(() => import('@/pages/estoque'), 'EstoquePage');
const PedidosPage = lazyNamed(() => import('@/pages/pedidos'), 'PedidosPage');
const PrivacidadePage = lazyNamed(() => import('@/pages/privacidade'), 'PrivacidadePage');
const NotFoundPage = lazyNamed(() => import('@/pages/not-found'), 'NotFoundPage');

const AdminPage = lazyNamed(() => import('@/pages/admin'), 'AdminPage');
const UsersPage = lazyNamed(
  () => import('@/features/admin/users/users-page'),
  'UsersPage',
);
const AuditPage = lazyNamed(
  () => import('@/features/admin/audit/audit-page'),
  'AuditPage',
);
const LgpdPage = lazyNamed(() => import('@/features/admin/lgpd/lgpd-page'), 'LgpdPage');
const TermosPage = lazyNamed(
  () => import('@/features/admin/termos/termos-page'),
  'TermosPage',
);
const ResyncPage = lazyNamed(
  () => import('@/features/admin/resync/resync-page'),
  'ResyncPage',
);

function PageFallback() {
  return (
    <div className="flex h-full min-h-[40vh] items-center justify-center p-6 text-sm text-[var(--color-text-muted)]">
      Carregando…
    </div>
  );
}

const wrap = (el: React.ReactElement) => <Suspense fallback={<PageFallback />}>{el}</Suspense>;

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/privacidade', element: wrap(<PrivacidadePage />) },
  {
    path: '/',
    element: (
      <RequireRole>
        <AppShell />
      </RequireRole>
    ),
    children: [
      { index: true, element: wrap(<CadastroPage />) },
      { path: 'cadastro', element: wrap(<CadastroPage />) },
      { path: 'chamada', element: wrap(<ChamadaPage />) },
      { path: 'historico', element: wrap(<HistoricoPage />) },
      { path: 'ranking', element: wrap(<RankingPage />) },
      { path: 'estoque', element: wrap(<EstoquePage />) },
      { path: 'pedidos', element: wrap(<PedidosPage />) },
      {
        path: 'admin',
        element: (
          <RequireRole role="admin">{wrap(<AdminPage />)}</RequireRole>
        ),
        children: [
          { index: true, element: <Navigate to="usuarios" replace /> },
          { path: 'usuarios', element: wrap(<UsersPage />) },
          { path: 'audit', element: wrap(<AuditPage />) },
          { path: 'lgpd', element: wrap(<LgpdPage />) },
          { path: 'termos', element: wrap(<TermosPage />) },
          { path: 'resync', element: wrap(<ResyncPage />) },
        ],
      },
    ],
  },
  { path: '*', element: wrap(<NotFoundPage />) },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
