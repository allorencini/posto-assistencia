import { useAuth } from '@/features/auth/useAuth';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import type { Chamada } from '@/types/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

      // Dedupe local: pode haver chamadas duplicadas pra mesma data (bug pre-fix).
      // Preferir a mais antiga (server-side criada via cron/SQL bulk), deletar órfãs locais.
      const all = await db.chamadas.where('data').equals(data).toArray();
      if (all.length > 0) {
        const sorted = [...all].sort((a, b) =>
          (a.criado_em ?? '').localeCompare(b.criado_em ?? ''),
        );
        const keep = sorted[0];
        const orphans = sorted.slice(1);
        if (orphans.length > 0) {
          await db.transaction('rw', db.chamadas, async () => {
            for (const o of orphans) await db.chamadas.delete(o.id);
          });
        }
        return keep;
      }

      const now = new Date().toISOString();
      const chamada: Chamada = {
        id: crypto.randomUUID(),
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
