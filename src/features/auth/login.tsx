import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { type LoginInput, LoginSchema } from '@/schemas/login';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { type Papel, useAuth } from './useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (input: LoginInput) => {
    setError(null);
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.senha,
    });
    if (authErr || !data.user) {
      setError(authErr?.message ?? 'Falha no login');
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
    navigate('/chamada', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6"
      >
        <h1 className="text-2xl font-semibold">Presença</h1>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email && (
            <p className="text-sm text-[var(--color-red)]">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            autoComplete="current-password"
            {...register('senha')}
          />
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
