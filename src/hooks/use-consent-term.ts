import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useActiveConsentTerm() {
  return useQuery({
    queryKey: ['consent_term', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consent_terms')
        .select('id, versao, texto')
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}
