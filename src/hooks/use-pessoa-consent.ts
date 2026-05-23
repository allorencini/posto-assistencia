import { useAuth } from '@/features/auth/useAuth';
import { enqueueSync } from '@/lib/sync';
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
      // Offline-first: enfileira via sync_queue. Sync engine processa em ordem
      // de timestamp — pessoa (enfileirada antes pelo savePessoa) faz upsert
      // primeiro, evitando violação de FK pessoa_consents_pessoa_id_fkey.
      const consent = {
        id: crypto.randomUUID(),
        pessoa_id: args.pessoa_id,
        consent_term_id: args.consent_term_id,
        declarado_por: user.id,
        metodo: args.metodo ?? 'verbal',
        registrado_em: new Date().toISOString(),
      };
      await enqueueSync({
        table: 'pessoa_consents',
        operation: 'upsert',
        data: consent,
        user_id: user.id,
      });
      return consent;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pessoa_consents', vars.pessoa_id] });
    },
  });
}
