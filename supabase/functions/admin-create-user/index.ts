import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const Schema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/)
    .transform((s) => s.toLowerCase()),
  nome: z.string().min(2).max(200),
  papel: z.enum(['admin', 'operador']),
  senha_temporaria: z.string().min(8),
});

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const auth = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth) return new Response('Missing auth', { status: 401 });

  const userResult = await supabaseAdmin.auth.getUser(auth);
  const user = userResult.data.user;
  if (userResult.error || !user) return new Response('Invalid token', { status: 401 });

  const callerResp = await supabaseAdmin
    .from('app_users')
    .select('papel')
    .eq('id', user.id)
    .single();
  if (callerResp.data?.papel !== 'admin') {
    return new Response('Forbidden: not admin', { status: 403 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 });
  }
  const { email, username, nome, papel, senha_temporaria } = parsed.data;

  const existing = await supabaseAdmin
    .from('app_users')
    .select('id')
    .ilike('username', username)
    .maybeSingle();
  if (existing.data) {
    return new Response(JSON.stringify({ error: 'username_already_exists' }), { status: 400 });
  }

  const createRes = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha_temporaria,
    email_confirm: true,
  });
  if (createRes.error || !createRes.data.user) {
    return new Response(JSON.stringify({ error: createRes.error?.message }), { status: 400 });
  }

  const insertRes = await supabaseAdmin.from('app_users').insert({
    id: createRes.data.user.id,
    nome,
    username,
    papel,
    criado_por: user.id,
  });

  if (insertRes.error) {
    await supabaseAdmin.auth.admin.deleteUser(createRes.data.user.id);
    return new Response(JSON.stringify({ error: insertRes.error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ id: createRes.data.user.id, email, username, nome, papel }), {
    headers: { 'content-type': 'application/json' },
  });
});
