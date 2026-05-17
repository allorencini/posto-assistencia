const EVENTS = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];

export function startIdleDetector(idleMs: number, onIdle: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;

  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(onIdle, idleMs);
  };

  for (const ev of EVENTS) {
    window.addEventListener(ev, reset, { passive: true });
  }
  document.addEventListener('visibilitychange', reset);

  reset();

  return () => {
    clearTimeout(timer);
    for (const ev of EVENTS) {
      window.removeEventListener(ev, reset);
    }
    document.removeEventListener('visibilitychange', reset);
  };
}
