import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const Schema = z.object({
  username: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/),
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

async function delayPad(start: number) {
  const elapsed = Date.now() - start;
  const remaining = 80 - elapsed;
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const start = Date.now();
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    await delayPad(start);
    return new Response(JSON.stringify({ error: 'invalid_input' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  // RPC: SECURITY DEFINER function gives service_role-bypass access in one round-trip
  // and avoids the auth.admin.getUserById call, which has been flaky.
  const { data: email, error } = await supabaseAdmin.rpc('resolve_username_to_email', {
    p_username: parsed.data.username,
  });

  console.log('[resolve-username]', {
    input: parsed.data.username,
    email,
    error: error?.message,
  });

  await delayPad(start);
  return new Response(JSON.stringify({ email: email ?? null }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
});
