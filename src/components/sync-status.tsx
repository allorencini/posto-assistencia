import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';

function useOnline() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

export function SyncStatus() {
  const online = useOnline();
  const queueCount = useLiveQuery(() => db.sync_queue.count(), [], 0);

  let color = 'var(--color-text-muted)';
  let title = 'Offline';
  if (online && queueCount === 0) {
    color = 'var(--color-green)';
    title = 'Sincronizado';
  } else if (online && queueCount > 0) {
    color = 'var(--color-yellow)';
    title = `Sincronizando (${queueCount})`;
  } else if (!online && queueCount > 0) {
    color = 'var(--color-red)';
    title = `Offline com ${queueCount} pendentes`;
  }

  return (
    <div
      className="fixed right-3 top-3 z-50 size-3 rounded-full"
      style={{ background: color }}
      title={title}
    />
  );
}
