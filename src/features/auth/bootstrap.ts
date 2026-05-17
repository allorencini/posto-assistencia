import { startRealtime, stopRealtime } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';
import { type Papel, useAuth } from './useAuth';

export async function bootstrapAuth() {
  useAuth.setState({ loading: true });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    useAuth.getState().clear();
    stopRealtime();
    return;
  }

  const { data: appUser, error } = await supabase
    .from('app_users')
    .select('papel, ativo')
    .eq('id', session.user.id)
    .single<{ papel: Papel; ativo: boolean }>();

  if (error || !appUser || !appUser.ativo) {
    await supabase.auth.signOut();
    useAuth.getState().clear();
    stopRealtime();
    return;
  }

  useAuth.getState().setSession(session.user, appUser.papel as Papel);
  startRealtime();

  (supabase.from('app_users') as any)
    .update({ ultimo_login_em: new Date().toISOString() })
    .eq('id', session.user.id);

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    if (!newSession) {
      useAuth.getState().clear();
      stopRealtime();
      return;
    }
    const { data: u } = await supabase
      .from('app_users')
      .select('papel, ativo')
      .eq('id', newSession.user.id)
      .single<{ papel: Papel; ativo: boolean }>();
    if (u?.ativo) {
      useAuth.getState().setSession(newSession.user, u.papel as Papel);
      startRealtime();
    } else {
      await supabase.auth.signOut();
      useAuth.getState().clear();
      stopRealtime();
    }
  });
}
