import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
// TODO Phase D: restore once @/lib/db exists
// import { db } from '@/lib/db';

export async function logout() {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore — limpa local sempre
  }
  // TODO Phase D: restore
  // try {
  //   await db.delete();
  // } catch {
  //   // ignore
  // }
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
