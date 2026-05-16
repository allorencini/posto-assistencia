export function SyncStatus() {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return (
    <div
      className="fixed right-3 top-3 z-50 size-3 rounded-full"
      style={{ background: online ? 'var(--color-green)' : 'var(--color-red)' }}
      title={online ? 'Online' : 'Offline'}
    />
  );
}
