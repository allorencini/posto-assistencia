import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import { useAuth } from '@/features/auth/useAuth';
import type { Chamada } from '@/types/domain';

export function useChamadas() {
  return useQuery({
    queryKey: ['chamadas'],
    queryFn: async () => await db.chamadas.toArray(),
  });
}

export function useChamadaByData(data: string | null | undefined) {
  return useQuery({
    queryKey: ['chamada', data],
    queryFn: async () => {
      if (!data) return null;
      const all = await db.chamadas.where('data').equals(data).toArray();
      return all[0] ?? null;
    },
    enabled: !!data,
  });
}

export function useGetOrCreateChamada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: string): Promise<Chamada> => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');

      const existing = await db.chamadas.where('data').equals(data).first();
      if (existing) return existing;

      const now = new Date().toISOString();
      const chamada: Chamada = {
        id: `chamada-${data}`,
        data,
        criado_em: now,
      };
      await db.transaction('rw', db.chamadas, db.sync_queue, async () => {
        await db.chamadas.put(chamada);
        await enqueueSync({
          table: 'chamadas',
          operation: 'upsert',
          data: chamada,
          user_id: user.id,
        });
      });
      return chamada;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chamadas'] }),
  });
}

export function useDeleteChamada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const presencas = await db.presencas.where('chamada_id').equals(id).toArray();
      await db.transaction('rw', db.chamadas, db.presencas, db.sync_queue, async () => {
        await db.chamadas.delete(id);
        await db.sync_queue.add({
          table: 'chamadas',
          operation: 'delete',
          data: { id },
          user_id: user.id,
          attempts: 0,
          timestamp: Date.now(),
        });
        for (const p of presencas) {
          await db.presencas.delete(p.id);
          await db.sync_queue.add({
            table: 'presencas',
            operation: 'delete',
            data: { id: p.id },
            user_id: user.id,
            attempts: 0,
            timestamp: Date.now(),
          });
        }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chamadas'] });
      qc.invalidateQueries({ queryKey: ['presencas'] });
    },
  });
}
