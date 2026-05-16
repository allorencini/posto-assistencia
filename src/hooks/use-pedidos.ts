import { useAuth } from '@/features/auth/useAuth';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import type { Pedido } from '@/types/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function usePedidos() {
  return useQuery({
    queryKey: ['pedidos'],
    queryFn: async () => {
      const all = await db.pedidos.toArray();
      return all.filter((p) => p.ativo !== false);
    },
  });
}

export function usePedido(id: string | null | undefined) {
  return useQuery({
    queryKey: ['pedido', id],
    queryFn: async () => (id ? await db.pedidos.get(id) : null),
    enabled: !!id,
  });
}

export function useSavePedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Pedido>) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const now = new Date().toISOString();
      const existing = input.id ? await db.pedidos.get(input.id) : undefined;
      const pedido: Pedido = {
        id: input.id ?? crypto.randomUUID(),
        pessoa_id: input.pessoa_id ?? null,
        familia_id: input.familia_id ?? null,
        item: (input.item ?? '').toUpperCase(),
        quantidade: input.quantidade ?? 1,
        observacao: input.observacao ?? null,
        status: input.status ?? 'pendente',
        solicitado_em: input.solicitado_em ?? todayDate(),
        atendido_em: input.atendido_em ?? null,
        ativo: input.ativo ?? true,
        criado_em: existing?.criado_em ?? now,
        atualizado_em: now,
      };
      await db.transaction('rw', db.pedidos, db.sync_queue, async () => {
        await db.pedidos.put(pedido);
        await enqueueSync({
          table: 'pedidos',
          operation: 'upsert',
          data: pedido,
          user_id: user.id,
        });
      });
      return pedido;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  });
}

export function useAtenderPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.pedidos.get(id);
      if (!existing) return;
      const updated: Pedido = {
        ...existing,
        status: 'atendido',
        atendido_em: todayDate(),
        atualizado_em: new Date().toISOString(),
      };
      await db.transaction('rw', db.pedidos, db.sync_queue, async () => {
        await db.pedidos.put(updated);
        await enqueueSync({
          table: 'pedidos',
          operation: 'upsert',
          data: updated,
          user_id: user.id,
        });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  });
}

export function useDeletePedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.pedidos.get(id);
      if (!existing) return;
      const updated: Pedido = {
        ...existing,
        ativo: false,
        atualizado_em: new Date().toISOString(),
      };
      await db.transaction('rw', db.pedidos, db.sync_queue, async () => {
        await db.pedidos.put(updated);
        await enqueueSync({
          table: 'pedidos',
          operation: 'upsert',
          data: updated,
          user_id: user.id,
        });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  });
}
