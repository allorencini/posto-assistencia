import { LoginPage } from '@/features/auth/login';
import { RequireRole } from '@/features/auth/require-role';
import { AuditPage } from '@/features/admin/audit/audit-page';
import { LgpdPage } from '@/features/admin/lgpd/lgpd-page';
import { ResyncPage } from '@/features/admin/resync/resync-page';
import { TermosPage } from '@/features/admin/termos/termos-page';
import { UsersPage } from '@/features/admin/users/users-page';
import { AdminPage } from '@/pages/admin';
import { CadastroPage } from '@/pages/cadastro';
import { ChamadaPage } from '@/pages/chamada';
import { EstoquePage } from '@/pages/estoque';
import { HistoricoPage } from '@/pages/historico';
import { NotFoundPage } from '@/pages/not-found';
import { PedidosPage } from '@/pages/pedidos';
import { PrivacidadePage } from '@/pages/privacidade';
import { RankingPage } from '@/pages/ranking';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppShell } from './shell';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/privacidade', element: <PrivacidadePage /> },
  {
    path: '/',
    element: (
      <RequireRole>
        <AppShell />
      </RequireRole>
    ),
    children: [
      { index: true, element: <CadastroPage /> },
      { path: 'cadastro', element: <CadastroPage /> },
      { path: 'chamada', element: <ChamadaPage /> },
      { path: 'historico', element: <HistoricoPage /> },
      { path: 'ranking', element: <RankingPage /> },
      { path: 'estoque', element: <EstoquePage /> },
      { path: 'pedidos', element: <PedidosPage /> },
      {
        path: 'admin',
        element: (
          <RequireRole role="admin">
            <AdminPage />
          </RequireRole>
        ),
        children: [
          { index: true, element: <Navigate to="usuarios" replace /> },
          { path: 'usuarios', element: <UsersPage /> },
          { path: 'audit', element: <AuditPage /> },
          { path: 'lgpd', element: <LgpdPage /> },
          { path: 'termos', element: <TermosPage /> },
          { path: 'resync', element: <ResyncPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
