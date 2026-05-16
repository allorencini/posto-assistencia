import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const Schema = z.object({
  email: z.string().email(),
  nome: z.string().min(2).max(200),
  papel: z.enum(['admin', 'operador']),
  senha_temporaria: z.string().min(8),
});

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const auth = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth) return new Response('Missing auth', { status: 401 });

  const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(auth);
  if (userErr || !user) return new Response('Invalid token', { status: 401 });

  const { data: callerApp } = await supabaseAdmin
    .from('app_users')
    .select('papel')
    .eq('id', user.id)
    .single();

  if (callerApp?.papel !== 'admin') {
    return new Response('Forbidden: not admin', { status: 403 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 });
  }
  const { email, nome, papel, senha_temporaria } = parsed.data;

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha_temporaria,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    return new Response(JSON.stringify({ error: createErr?.message }), { status: 400 });
  }

  const { error: insertErr } = await supabaseAdmin
    .from('app_users')
    .insert({
      id: created.user.id,
      nome,
      papel,
      criado_por: user.id,
    });

  if (insertErr) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ id: created.user.id, email, nome, papel }), {
    headers: { 'content-type': 'application/json' },
  });
});
