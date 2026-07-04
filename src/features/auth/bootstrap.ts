import { refreshConsentTermCache } from '@/lib/consent-term-cache';
import { startRealtime, stopRealtime } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';
import { runSync } from '@/lib/sync';
import type { User } from '@supabase/supabase-js';
import { type Papel, useAuth } from './useAuth';

const PAPEL_CACHE_KEY = 'presenca-papel-cache';

interface PapelCache {
  id: string;
  papel: Papel;
}

function readPapelCache(userId: string): Papel | null {
  try {
    const raw = localStorage.getItem(PAPEL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PapelCache;
    return parsed.id === userId ? parsed.papel : null;
  } catch {
    return null;
  }
}

function writePapelCache(userId: string, papel: Papel): void {
  localStorage.setItem(PAPEL_CACHE_KEY, JSON.stringify({ id: userId, papel }));
}

type ResolveResult = { status: 'ok'; papel: Papel } | { status: 'invalid' } | { status: 'offline' };

// Heurística rede-vs-definitivo: uma exceção lançada pelo client (fetch falhou)
// ou um `error` sem confirmação do servidor (sem code, sem linha) contam como
// falha de REDE → 'offline' (não derruba a sessão). Só é 'invalid' quando o
// servidor afirma isso de fato: `PGRST116` (zero rows — id não existe/RLS) ou
// a linha veio com `ativo === false`. Na dúvida, 'offline'.
async function resolvePapel(userId: string): Promise<ResolveResult> {
  try {
    const { data: appUser, error } = await supabase
      .from('app_users')
      .select('papel, ativo')
      .eq('id', userId)
      .single<{ papel: Papel; ativo: boolean }>();

    if (error) {
      return error.code === 'PGRST116' ? { status: 'invalid' } : { status: 'offline' };
    }
    if (!appUser) return { status: 'offline' };
    return appUser.ativo ? { status: 'ok', papel: appUser.papel } : { status: 'invalid' };
  } catch {
    return { status: 'offline' };
  }
}

function applyOk(user: User, papel: Papel): void {
  useAuth.getState().setSession(user, papel);
  writePapelCache(user.id, papel);
  startRealtime();
  // Garante o termo de consentimento no Dexie neste device: cobre tanto o boot
  // feliz quanto o SIGNED_IN disparado por um login direto na LoginPage (que
  // nunca passa por bootstrapAuth). Sem isso, um device cujo Dexie foi
  // zerado por um idle-logout com fila vazia fica sem termo cacheado e o
  // cadastro offline bloqueia até a próxima janela 'online'.
  void refreshConsentTermCache();
}

async function applyInvalid(): Promise<void> {
  await supabase.auth.signOut();
  useAuth.getState().clear();
  stopRealtime();
}

// Sem rede/servidor inalcançável: nunca derruba uma sessão válida.
// - Se o papel do último login bem-sucedido está cacheado, hidrata o estado
//   com ele — isso é o que permite operar offline (e destrava o gate de auth
//   do runSync pra quando a rede voltar).
// - Sem cache no boot inicial não dá pra saber o papel: sai do `loading`
//   limpando o estado local, mas SEM signOut — mantém o token do Supabase
//   intacto pra tentar de novo no próximo boot.
// - Sem cache fora do boot inicial (callback do onAuthStateChange): não mexe
//   em nada — mantém a sessão corrente como está, em vez de derrubá-la por
//   causa de um blip de rede.
function applyOffline(user: User, options: { isInitialBoot: boolean }): void {
  const cachedPapel = readPapelCache(user.id);
  if (cachedPapel) {
    useAuth.getState().setSession(user, cachedPapel);
    return;
  }
  if (options.isInitialBoot) {
    useAuth.getState().clear();
  }
}

let listenerRegistered = false;

// Registrado incondicionalmente, uma única vez por ciclo de vida do módulo
// (guard evita registro duplicado se bootstrapAuth rodar mais de uma vez,
// ex. StrictMode). Precisa existir mesmo quando o boot não encontra sessão
// nenhuma, porque um login feito direto pela LoginPage nunca passa por
// bootstrapAuth — sem esse listener registrado no boot, essa sessão fica a
// vida inteira sem reagir a SIGNED_OUT / refresh de token.
function registerAuthStateListener(): void {
  if (listenerRegistered) return;
  listenerRegistered = true;

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    if (!newSession) {
      useAuth.getState().clear();
      stopRealtime();
      return;
    }

    const result = await resolvePapel(newSession.user.id);
    if (result.status === 'ok') {
      applyOk(newSession.user, result.papel);
    } else if (result.status === 'invalid') {
      await applyInvalid();
    } else {
      applyOffline(newSession.user, { isInitialBoot: false });
    }
  });
}

export async function bootstrapAuth(): Promise<void> {
  useAuth.setState({ loading: true });

  registerAuthStateListener();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    useAuth.getState().clear();
    stopRealtime();
    return;
  }

  const result = await resolvePapel(session.user.id);
  if (result.status === 'invalid') {
    await applyInvalid();
    return;
  }
  if (result.status === 'offline') {
    applyOffline(session.user, { isInitialBoot: true });
    return;
  }

  applyOk(session.user, result.papel);
  // Força pull fresco do server logo após o login (push pendente + pull de
  // todas as tabelas). Crítico no primeiro login num device — senão o
  // IndexedDB fica vazio até o próximo ciclo de 30s. Só roda no caminho
  // 'ok': sem rede, não tem o que puxar.
  void runSync();

  void supabase
    .from('app_users')
    .update({ ultimo_login_em: new Date().toISOString() })
    .eq('id', session.user.id);
}
