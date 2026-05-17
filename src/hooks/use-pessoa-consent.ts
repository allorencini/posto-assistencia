import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface RegisterArgs {
  pessoa_id: string;
  consent_term_id: string;
  metodo?: 'verbal' | 'escrito';
}

export function useRegisterConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: RegisterArgs) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('pessoa_consents')
        .insert({
          pessoa_id: args.pessoa_id,
          consent_term_id: args.consent_term_id,
          declarado_por: user.id,
          metodo: args.metodo ?? 'verbal',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pessoa_consents', vars.pessoa_id] });
    },
  });
}
