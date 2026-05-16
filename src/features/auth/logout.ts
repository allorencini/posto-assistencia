import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { db } from '@/lib/db';

export async function logout() {
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
