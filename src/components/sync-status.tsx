import { db } from '@/lib/db';
import { MAX_ATTEMPTS } from '@/lib/sync';
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
  const deadCount = useLiveQuery(
    () => db.sync_queue.filter((q) => q.attempts >= MAX_ATTEMPTS).count(),
    [],
    0,
  );
  const [expanded, setExpanded] = useState(false);

  let color = 'var(--color-text-muted)';
  let label = 'Offline';
  if (deadCount > 0) {
    color = 'var(--color-red)';
    label = `Falha de sincronização (${deadCount}) — abra Admin > Sincronização`;
  } else if (online && queueCount === 0) {
    color = 'var(--color-green)';
    label = 'Sincronizado';
  } else if (online && queueCount > 0) {
    color = 'var(--color-yellow)';
    label = `Sincronizando (${queueCount})`;
  } else if (!online && queueCount > 0) {
    color = 'var(--color-red)';
    label = `Offline (${queueCount} pendentes)`;
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded((e) => !e)}
      title={label}
      aria-label={`Status de sincronização: ${label}`}
      className="fixed right-3 top-3 z-50 flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)]/80 px-2 py-1 text-[10px] text-[var(--color-text-muted)] backdrop-blur transition-all"
    >
      <span className="block size-2 shrink-0 rounded-full" style={{ background: color }} />
      {expanded && <span className="leading-none">{label}</span>}
    </button>
  );
}
