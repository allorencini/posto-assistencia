import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoginPage } from '@/features/auth/login';
import { RequireRole } from '@/features/auth/require-role';
import { AppShell } from './shell';
import { ChamadaPage } from '@/pages/chamada';
import { CadastroPage } from '@/pages/cadastro';
import { HistoricoPage } from '@/pages/historico';
import { RankingPage } from '@/pages/ranking';
import { EstoquePage } from '@/pages/estoque';
import { PedidosPage } from '@/pages/pedidos';
import { AdminPage } from '@/pages/admin';
import { PrivacidadePage } from '@/pages/privacidade';
import { NotFoundPage } from '@/pages/not-found';

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
      { index: true, element: <ChamadaPage /> },
      { path: 'chamada', element: <ChamadaPage /> },
      { path: 'cadastro', element: <CadastroPage /> },
      { path: 'historico', element: <HistoricoPage /> },
      { path: 'ranking', element: <RankingPage /> },
      { path: 'estoque', element: <EstoquePage /> },
      { path: 'pedidos', element: <PedidosPage /> },
      {
        path: 'admin/*',
        element: (
          <RequireRole role="admin">
            <AdminPage />
          </RequireRole>
        ),
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
