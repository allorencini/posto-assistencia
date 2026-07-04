import { useEffect, useState } from 'react';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';
import { bootstrapAuth } from './features/auth/bootstrap';
import { refreshConsentTermCache } from './lib/consent-term-cache';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bootstrapAuth()
      .then(() => void refreshConsentTermCache())
      .finally(() => setReady(true));
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
