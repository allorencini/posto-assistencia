import { useEffect, useState } from 'react';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';
import { bootstrapAuth } from './features/auth/bootstrap';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bootstrapAuth().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  }

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
