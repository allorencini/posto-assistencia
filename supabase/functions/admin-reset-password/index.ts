import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const Schema = z.object({
  target_user_id: z.string().uuid(),
  nova_senha: z.string().min(8),
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const auth = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth) return new Response('Missing auth', { status: 401, headers: CORS_HEADERS });

  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(auth);
  if (!user) return new Response('Invalid token', { status: 401, headers: CORS_HEADERS });

  const { data: callerApp } = await supabaseAdmin
    .from('app_users')
    .select('papel')
    .eq('id', user.id)
    .single();

  if (callerApp?.papel !== 'admin') return new Response('Forbidden', { status: 403, headers: CORS_HEADERS });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(parsed.data.target_user_id, {
    password: parsed.data.nova_senha,
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), {
    status: 500,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
});
