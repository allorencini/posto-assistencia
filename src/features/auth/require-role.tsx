import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { type Papel, useAuth } from './useAuth';

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
      return <Navigate to="/cadastro" replace />;
    }
  }

  return <>{children}</>;
}
