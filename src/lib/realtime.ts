import type { RealtimeChannel } from '@supabase/supabase-js';
import { db } from './db';
import { queryClient } from './query';
import { supabase } from './supabase';

const TABLES = ['presencas', 'cestas', 'chamadas', 'pessoas', 'pedidos', 'itens'] as const;
type TableName = (typeof TABLES)[number];

const QUERY_INVALIDATE_MAP: Record<TableName, string[][]> = {
  presencas: [
    ['presencas', 'all'],
    ['presencas', 'chamada'],
  ],
  cestas: [['cestas']],
  chamadas: [['chamadas']],
  pessoas: [['pessoas']],
  pedidos: [['pedidos']],
  itens: [['itens']],
};

let channels: RealtimeChannel[] = [];

export function startRealtime() {
  stopRealtime();
  channels = TABLES.map((table) => {
    return supabase
      .channel(`rt_${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, async (payload) => {
        const row =
          (payload.new as Record<string, unknown>) ?? (payload.old as Record<string, unknown>);
        if (!row || !row.id) return;
        const id = row.id as string;
        const dexieTable = (db as unknown as Record<string, typeof db.pessoas>)[table];
        if (!dexieTable) return;

        if (payload.eventType === 'DELETE') {
          await dexieTable.delete(id).catch(() => {});
        } else {
          // INSERT or UPDATE — write into Dexie if local stale
          const local = await dexieTable.get(id).catch(() => undefined);
          const localTs = (local as { atualizado_em?: string })?.atualizado_em ?? '';
          const newTs = (row.atualizado_em as string | undefined) ?? '';
          if (!local || newTs >= localTs) {
            await dexieTable.put(row as never).catch(() => {});
          }
        }

        // Invalidate query keys so React re-renders
        for (const key of QUERY_INVALIDATE_MAP[table]) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      })
      .subscribe();
  });
}

export function stopRealtime() {
  for (const ch of channels) {
    void supabase.removeChannel(ch);
  }
  channels = [];
}
