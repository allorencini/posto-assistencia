import { LoginPage } from '@/features/auth/login';
import { RequireRole } from '@/features/auth/require-role';
import { AdminPage } from '@/pages/admin';
import { CadastroPage } from '@/pages/cadastro';
import { ChamadaPage } from '@/pages/chamada';
import { EstoquePage } from '@/pages/estoque';
import { HistoricoPage } from '@/pages/historico';
import { NotFoundPage } from '@/pages/not-found';
import { PedidosPage } from '@/pages/pedidos';
import { PrivacidadePage } from '@/pages/privacidade';
import { RankingPage } from '@/pages/ranking';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
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
