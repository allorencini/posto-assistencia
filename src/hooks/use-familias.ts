import { useAuth } from '@/features/auth/useAuth';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import type { Familia } from '@/types/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useFamilias() {
  return useQuery({
    queryKey: ['familias'],
    queryFn: async () => {
      const all = await db.familias.toArray();
      return all.filter((f) => f.ativo !== false);
    },
  });
}

export function useFamilia(id: string | null | undefined) {
  return useQuery({
    queryKey: ['familia', id],
    queryFn: async () => (id ? await db.familias.get(id) : null),
    enabled: !!id,
  });
}

export function useSaveFamilia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Familia>) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const now = new Date().toISOString();
      const existing = input.id ? await db.familias.get(input.id) : undefined;
      const familia: Familia = {
        id: input.id ?? crypto.randomUUID(),
        nome: (input.nome ?? '').toUpperCase(),
        ativo: input.ativo ?? true,
        criado_em: existing?.criado_em ?? now,
        atualizado_em: now,
      };
      await db.transaction('rw', db.familias, db.sync_queue, async () => {
        await db.familias.put(familia);
        await enqueueSync({
          table: 'familias',
          operation: 'upsert',
          data: familia,
          user_id: user.id,
        });
      });
      return familia;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['familias'] }),
  });
}

export function useDeleteFamilia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.familias.get(id);
      if (!existing) return;
      const updated: Familia = {
        ...existing,
        ativo: false,
        atualizado_em: new Date().toISOString(),
      };
      await db.transaction('rw', db.familias, db.sync_queue, async () => {
        await db.familias.put(updated);
        await enqueueSync({
          table: 'familias',
          operation: 'upsert',
          data: updated,
          user_id: user.id,
        });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['familias'] }),
  });
}
