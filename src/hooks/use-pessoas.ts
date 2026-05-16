import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import { useAuth } from '@/features/auth/useAuth';
import type { Pessoa } from '@/types/domain';

export function usePessoas() {
  return useQuery({
    queryKey: ['pessoas'],
    queryFn: async () => {
      const all = await db.pessoas.toArray();
      return all.filter((p) => p.ativo !== false && !p.anonimizado_em);
    },
  });
}

export function usePessoa(id: string | null | undefined) {
  return useQuery({
    queryKey: ['pessoa', id],
    queryFn: async () => {
      if (!id) return null;
      return await db.pessoas.get(id);
    },
    enabled: !!id,
  });
}

export function useSavePessoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Pessoa>) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();
      const existing = input.id ? await db.pessoas.get(input.id) : undefined;
      const pessoa: Pessoa = {
        id: input.id ?? crypto.randomUUID(),
        nome: (input.nome ?? '').toUpperCase(),
        grupo: input.grupo ?? 'adulto',
        familia_id: input.familia_id ?? null,
        telefone: input.telefone ?? null,
        rua: input.rua ?? null,
        numero: input.numero ?? null,
        complemento: input.complemento ?? null,
        bairro: input.bairro ?? null,
        cep: input.cep ?? null,
        visitada: input.visitada ?? false,
        apta_cesta: input.apta_cesta ?? null,
        visita_obs: input.visita_obs ?? null,
        excluir_ranking: input.excluir_ranking ?? false,
        ativo: input.ativo ?? true,
        anonimizado_em: existing?.anonimizado_em ?? null,
        anonimizado_por: existing?.anonimizado_por ?? null,
        criado_em: existing?.criado_em ?? now,
        atualizado_em: now,
      };

      await db.transaction('rw', db.pessoas, db.sync_queue, async () => {
        await db.pessoas.put(pessoa);
        await enqueueSync({
          table: 'pessoas',
          operation: 'upsert',
          data: pessoa,
          user_id: user.id,
        });
      });

      return pessoa;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pessoas'] });
    },
  });
}

export function useDeletePessoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuth.getState().user;
      if (!user) throw new Error('Not authenticated');
      const existing = await db.pessoas.get(id);
      if (!existing) return;

      const updated: Pessoa = {
        ...existing,
        ativo: false,
        atualizado_em: new Date().toISOString(),
      };

      await db.transaction('rw', db.pessoas, db.sync_queue, async () => {
        await db.pessoas.put(updated);
        await enqueueSync({
          table: 'pessoas',
          operation: 'upsert',
          data: updated,
          user_id: user.id,
        });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pessoas'] }),
  });
}
