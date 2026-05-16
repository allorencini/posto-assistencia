import { startIdleDetector } from '@/lib/idle';
import { useEffect } from 'react';
import { logout } from './logout';
import { useAuth } from './useAuth';

const IDLE_MS = 15 * 60 * 1000;

export function useIdleLogout() {
  const user = useAuth((s) => s.user);
  useEffect(() => {
    if (!user) return;
    const stop = startIdleDetector(IDLE_MS, () => {
      logout();
    });
    return stop;
  }, [user]);
}
