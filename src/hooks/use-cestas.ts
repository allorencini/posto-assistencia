import { useAuth } from '@/features/auth/useAuth';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import type { Cesta } from '@/types/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useCestas() {
  return useQuery({
    queryKey: ['cestas'],
    queryFn: async () => {
      const all = await db.cestas.toArray();
      return all.filter((c) => c.ativo !== false);
    },
  });
}

export function useSaveCesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pessoa_id: string; data: string }) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const now = new Date().toISOString();
      const cesta: Cesta = {
        id: crypto.randomUUID(),
        pessoa_id: input.pessoa_id,
        data: input.data,
        ativo: true,
        criado_em: now,
        atualizado_em: now,
      };
      await db.transaction('rw', db.cestas, db.sync_queue, async () => {
        await db.cestas.put(cesta);
        await enqueueSync({
          table: 'cestas',
          operation: 'upsert',
          data: cesta,
          user_id: user.id,
        });
      });
      return cesta;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cestas'] }),
  });
}

export function useDeleteCesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.cestas.get(id);
      if (!existing) return;
      const updated: Cesta = { ...existing, ativo: false, atualizado_em: new Date().toISOString() };
      await db.transaction('rw', db.cestas, db.sync_queue, async () => {
        await db.cestas.put(updated);
        await enqueueSync({
          table: 'cestas',
          operation: 'upsert',
          data: updated,
          user_id: user.id,
        });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cestas'] }),
  });
}
