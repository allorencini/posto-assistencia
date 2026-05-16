import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';

export type Papel = 'admin' | 'operador';

interface AuthState {
  user: User | null;
  papel: Papel | null;
  loading: boolean;
  setSession: (user: User, papel: Papel) => void;
  clear: () => void;
  setLoading: (v: boolean) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  papel: null,
  loading: true,
  setSession: (user, papel) => set({ user, papel, loading: false }),
  clear: () => set({ user: null, papel: null, loading: false }),
  setLoading: (loading) => set({ loading }),
}));
