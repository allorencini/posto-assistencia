// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CUTOFF_YEARS = 5;

Deno.serve(async () => {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - CUTOFF_YEARS);
  const cutoffISO = cutoff.toISOString();

  const { data: inactives, error } = await supabase.rpc('find_inactive_pessoas', {
    cutoff_date: cutoffISO,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const ids: string[] = (inactives || []).map((p: any) => p.id);
  let anonymized = 0;

  for (const id of ids) {
    const { error: upErr } = await supabase
      .from('pessoas')
      .update({
        nome: 'ANONIMIZADO',
        telefone: null,
        rua: null,
        numero: null,
        complemento: null,
        bairro: null,
        cep: null,
        visita_obs: null,
        apta_cesta: null,
        anonimizado_em: new Date().toISOString(),
      })
      .eq('id', id);

    if (!upErr) anonymized++;
  }

  return new Response(JSON.stringify({ checked: ids.length, anonymized }), {
    headers: { 'content-type': 'application/json' },
  });
});
