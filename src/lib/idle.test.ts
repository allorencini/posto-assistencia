import { describe, it, expect, vi } from 'vitest';

describe('idle detector', () => {
  it('fires callback after idle period', async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const { startIdleDetector } = await import('./idle');
    const stop = startIdleDetector(1000, cb);
    vi.advanceTimersByTime(1100);
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
    vi.useRealTimers();
  });

  it('resets timer on activity', async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const { startIdleDetector } = await import('./idle');
    const stop = startIdleDetector(1000, cb);
    vi.advanceTimersByTime(500);
    window.dispatchEvent(new Event('mousemove'));
    vi.advanceTimersByTime(600);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
    vi.useRealTimers();
  });
});
