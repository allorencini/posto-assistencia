import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';

export function useConsentTerms() {
  return useQuery({
    queryKey: ['consent_terms', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consent_terms')
        .select('id, versao, texto, ativo, criado_em')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateConsentTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { versao: string; texto: string }) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      await supabase.from('consent_terms').update({ ativo: false }).eq('ativo', true);
      const { data, error } = await supabase
        .from('consent_terms')
        .insert({ ...input, ativo: true, criado_por: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consent_terms'] });
      qc.invalidateQueries({ queryKey: ['consent_term', 'active'] });
    },
  });
}
