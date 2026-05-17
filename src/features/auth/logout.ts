import { db } from '@/lib/db';
import { stopRealtime } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export async function logout() {
  try {
    stopRealtime();
  } catch {
    // ignore
  }
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore — limpa local sempre
  }
  try {
    await db.delete();
  } catch {
    // ignore
  }
  try {
    sessionStorage.clear();
    localStorage.clear();
  } catch {
    // ignore
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    // ignore
  }
  useAuth.getState().clear();
  window.location.href = '/login';
}
