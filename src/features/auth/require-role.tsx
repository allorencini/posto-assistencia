import { Navigate } from 'react-router-dom';
import { useAuth, type Papel } from './useAuth';
import type { ReactNode } from 'react';

interface Props {
  role?: Papel | Papel[];
  children: ReactNode;
}

export function RequireRole({ role, children }: Props) {
  const { user, papel, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  }

  if (!user || !papel) {
    return <Navigate to="/login" replace />;
  }

  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(papel)) {
      return <Navigate to="/chamada" replace />;
    }
  }

  return <>{children}</>;
}
