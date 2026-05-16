import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface Filter {
  tabela?: string;
  registroId?: string;
  usuarioId?: string;
  limit?: number;
}

export function useAuditLog(filter: Filter = {}) {
  const { tabela, registroId, usuarioId, limit = 100 } = filter;
  return useQuery({
    queryKey: ['audit_log', tabela ?? null, registroId ?? null, usuarioId ?? null, limit],
    queryFn: async () => {
      let q = supabase
        .from('audit_log')
        .select('id, tabela, registro_id, operacao, usuario_id, diff, ocorrido_em')
        .order('ocorrido_em', { ascending: false })
        .limit(limit);
      if (tabela) q = q.eq('tabela', tabela);
      if (registroId) q = q.eq('registro_id', registroId);
      if (usuarioId) q = q.eq('usuario_id', usuarioId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
