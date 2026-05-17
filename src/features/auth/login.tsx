import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { env } from '@/lib/env';
import { startRealtime } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';
import { runSync } from '@/lib/sync';
import { type LoginInput, LoginSchema } from '@/schemas/login';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { type Papel, useAuth } from './useAuth';

async function resolveUsernameToEmail(username: string): Promise<string | null> {
  const res = await fetch(`${env.SUPABASE_URL}/functions/v1/resolve-username`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email: string | null };
  return data.email;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showSenha, setShowSenha] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (input: LoginInput) => {
    setError(null);
    // Remove qualquer whitespace — mobile autocorrect costuma inserir espaços
    // em palavras desconhecidas (ex: "simaopedro" → "sim aopedro").
    const login = input.login.replace(/\s+/g, '');
    const isEmail = login.includes('@');
    let email = login;

    if (!isEmail) {
      const resolved = await resolveUsernameToEmail(login);
      if (!resolved) {
        setError('Usuário ou senha inválidos');
        return;
      }
      email = resolved;
    }

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: input.senha,
    });
    if (authErr || !data.user) {
      setError('Usuário ou senha inválidos');
      return;
    }

    const { data: appUser, error: appErr } = await supabase
      .from('app_users')
      .select('papel, ativo')
      .eq('id', data.user.id)
      .single<{ papel: Papel; ativo: boolean }>();
    if (appErr || !appUser || !appUser.ativo) {
      await supabase.auth.signOut();
      setError('Usuário sem permissão de acesso');
      return;
    }
    useAuth.getState().setSession(data.user, appUser.papel as Papel);
    startRealtime();
    // Espera pull do server completar antes de navegar — evita tela vazia
    await runSync();
    navigate('/cadastro', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6"
      >
        <h1 className="text-2xl font-semibold">Posto Assistência</h1>

        <div className="space-y-2">
          <Label htmlFor="login">Email ou usuário</Label>
          <Input
            id="login"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="email"
            {...register('login')}
          />
          {errors.login && (
            <p className="text-sm text-[var(--color-red)]">{errors.login.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="senha">Senha</Label>
          <div className="relative">
            <Input
              id="senha"
              type={showSenha ? 'text' : 'password'}
              autoComplete="current-password"
              className="pr-10"
              {...register('senha')}
            />
            <button
              type="button"
              onClick={() => setShowSenha((s) => !s)}
              aria-label={showSenha ? 'Esconder senha' : 'Mostrar senha'}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              tabIndex={-1}
            >
              {showSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.senha && (
            <p className="text-sm text-[var(--color-red)]">{errors.senha.message}</p>
          )}
        </div>

        {error && <p className="text-sm text-[var(--color-red)]">{error}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}
