const EVENTS = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];

export function startIdleDetector(idleMs: number, onIdle: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;

  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(onIdle, idleMs);
  };

  EVENTS.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
  document.addEventListener('visibilitychange', reset);

  reset();

  return () => {
    clearTimeout(timer);
    EVENTS.forEach((ev) => window.removeEventListener(ev, reset));
    document.removeEventListener('visibilitychange', reset);
  };
}
