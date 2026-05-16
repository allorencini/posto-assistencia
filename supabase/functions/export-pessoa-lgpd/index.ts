import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const Schema = z.object({ pessoa_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const auth = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth) return new Response('Missing auth', { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(auth);
  if (!user) return new Response('Invalid token', { status: 401 });

  const { data: callerApp } = await supabaseAdmin
    .from('app_users').select('papel').eq('id', user.id).single();
  if (callerApp?.papel !== 'admin') return new Response('Forbidden', { status: 403 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 });
  }

  const { pessoa_id } = parsed.data;

  const [pessoa, familia, presencas, cestas, pedidos, consents] = await Promise.all([
    supabaseAdmin.from('pessoas').select('*').eq('id', pessoa_id).single(),
    supabaseAdmin.from('pessoas').select('familia_id').eq('id', pessoa_id).single()
      .then(async ({ data }) => {
        if (!data?.familia_id) return null;
        const { data: f } = await supabaseAdmin.from('familias').select('*').eq('id', data.familia_id).single();
        return f;
      }),
    supabaseAdmin.from('presencas').select('*').eq('pessoa_id', pessoa_id),
    supabaseAdmin.from('cestas').select('*').eq('pessoa_id', pessoa_id),
    supabaseAdmin.from('pedidos').select('*').eq('pessoa_id', pessoa_id),
    supabaseAdmin.from('pessoa_consents').select('*').eq('pessoa_id', pessoa_id),
  ]);

  if (!pessoa.data) return new Response('Not found', { status: 404 });

  const payload = {
    exportado_em: new Date().toISOString(),
    exportado_por: user.id,
    pessoa: pessoa.data,
    familia: familia,
    presencas: presencas.data || [],
    cestas: cestas.data || [],
    pedidos: pedidos.data || [],
    consents: consents.data || [],
  };

  await supabaseAdmin.from('audit_log').insert({
    tabela: 'pessoas',
    registro_id: pessoa_id,
    operacao: 'EXPORT',
    usuario_id: user.id,
    diff: { exportado: true },
  });

  await supabaseAdmin.from('lgpd_requests').insert({
    pessoa_id,
    pessoa_nome_snapshot: pessoa.data.nome,
    tipo: 'acesso',
    status: 'concluido',
    solicitado_por: user.id,
    concluido_em: new Date().toISOString(),
    concluido_por: user.id,
  });

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="pessoa-${pessoa_id}.json"`,
    },
  });
});
