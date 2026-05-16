import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';

export function useExportPessoa() {
  return useMutation({
    mutationFn: async (pessoa_id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-pessoa-lgpd`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pessoa_id }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pessoa-${pessoa_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useAnonimizarPessoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pessoa_id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
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
          anonimizado_por: user.id,
        })
        .eq('id', pessoa_id);
      if (error) throw error;

      await supabase.from('lgpd_requests').insert({
        pessoa_id,
        tipo: 'anonimizacao',
        status: 'concluido',
        solicitado_por: user.id,
        concluido_por: user.id,
        concluido_em: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pessoas'] });
    },
  });
}

export function useRevogarConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pessoa_id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('pessoa_consents')
        .update({ revogado_em: new Date().toISOString(), revogado_por: user.id })
        .eq('pessoa_id', pessoa_id)
        .is('revogado_em', null);
      if (error) throw error;

      await supabase.from('lgpd_requests').insert({
        pessoa_id,
        tipo: 'revogacao',
        status: 'concluido',
        solicitado_por: user.id,
        concluido_por: user.id,
        concluido_em: new Date().toISOString(),
      });
    },
    onSuccess: (_, pessoa_id) => {
      qc.invalidateQueries({ queryKey: ['pessoa_consents', pessoa_id] });
    },
  });
}
