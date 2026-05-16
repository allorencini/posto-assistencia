import { useAuth } from '@/features/auth/useAuth';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import type { Item } from '@/types/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useItens() {
  return useQuery({
    queryKey: ['itens'],
    queryFn: async () => {
      const all = await db.itens.toArray();
      return all.filter((i) => i.ativo !== false);
    },
  });
}

export function useItem(id: string | null | undefined) {
  return useQuery({
    queryKey: ['item', id],
    queryFn: async () => (id ? await db.itens.get(id) : null),
    enabled: !!id,
  });
}

export function useSaveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Item>) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const now = new Date().toISOString();
      const existing = input.id ? await db.itens.get(input.id) : undefined;
      const item: Item = {
        id: input.id ?? crypto.randomUUID(),
        nome: (input.nome ?? '').toUpperCase(),
        categoria: input.categoria ?? 'alimento-doacao',
        quantidade: Math.max(0, input.quantidade ?? 0),
        ativo: input.ativo ?? true,
        criado_em: existing?.criado_em ?? now,
        atualizado_em: now,
      };
      await db.transaction('rw', db.itens, db.sync_queue, async () => {
        await db.itens.put(item);
        await enqueueSync({ table: 'itens', operation: 'upsert', data: item, user_id: user.id });
      });
      return item;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itens'] }),
  });
}

export function useUpdateItemQuantidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantidade }: { id: string; quantidade: number }) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.itens.get(id);
      if (!existing) return;
      const updated: Item = {
        ...existing,
        quantidade: Math.max(0, quantidade),
        atualizado_em: new Date().toISOString(),
      };
      await db.transaction('rw', db.itens, db.sync_queue, async () => {
        await db.itens.put(updated);
        await enqueueSync({ table: 'itens', operation: 'upsert', data: updated, user_id: user.id });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itens'] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.itens.get(id);
      if (!existing) return;
      const updated: Item = { ...existing, ativo: false, atualizado_em: new Date().toISOString() };
      await db.transaction('rw', db.itens, db.sync_queue, async () => {
        await db.itens.put(updated);
        await enqueueSync({ table: 'itens', operation: 'upsert', data: updated, user_id: user.id });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itens'] }),
  });
}
