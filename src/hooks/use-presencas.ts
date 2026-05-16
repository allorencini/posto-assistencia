import { useAuth } from '@/features/auth/useAuth';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import type { Presenca } from '@/types/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function usePresencasByChamada(chamadaId: string | null | undefined) {
  return useQuery({
    queryKey: ['presencas', 'chamada', chamadaId],
    queryFn: async () => {
      if (!chamadaId) return [];
      return await db.presencas.where('chamada_id').equals(chamadaId).toArray();
    },
    enabled: !!chamadaId,
  });
}

export function useAllPresencas() {
  return useQuery({
    queryKey: ['presencas', 'all'],
    queryFn: async () => await db.presencas.toArray(),
  });
}

export function useSavePresenca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { chamada_id: string; pessoa_id: string; presente: boolean }) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const now = new Date().toISOString();
      const id = `presenca-${input.chamada_id}-${input.pessoa_id}`;
      const existing = await db.presencas.get(id);
      const presenca: Presenca = {
        id,
        chamada_id: input.chamada_id,
        pessoa_id: input.pessoa_id,
        presente: input.presente,
        criado_em: existing?.criado_em ?? now,
        atualizado_em: now,
      };
      await db.transaction('rw', db.presencas, db.sync_queue, async () => {
        await db.presencas.put(presenca);
        await enqueueSync({
          table: 'presencas',
          operation: 'upsert',
          data: presenca,
          user_id: user.id,
        });
      });
      return presenca;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['presencas', 'chamada', variables.chamada_id] });
      qc.invalidateQueries({ queryKey: ['presencas', 'all'] });
    },
  });
}
