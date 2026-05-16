import Dexie, { type Table } from 'dexie';
import type {
  Pessoa, Familia, Chamada, Presenca, Cesta, Item, Pedido, SyncQueueItem,
} from '@/types/domain';

export class PresencaDB extends Dexie {
  pessoas!: Table<Pessoa, string>;
  familias!: Table<Familia, string>;
  chamadas!: Table<Chamada, string>;
  presencas!: Table<Presenca, string>;
  cestas!: Table<Cesta, string>;
  itens!: Table<Item, string>;
  pedidos!: Table<Pedido, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super('presenca-db');
    this.version(1).stores({
      pessoas: 'id, grupo, ativo, familia_id, excluir_ranking, anonimizado_em',
      familias: 'id, ativo',
      chamadas: 'id, data',
      presencas: 'id, chamada_id, pessoa_id, [chamada_id+pessoa_id]',
      cestas: 'id, pessoa_id, data, ativo',
      itens: 'id, categoria, ativo',
      pedidos: 'id, pessoa_id, familia_id, status, ativo',
      sync_queue: '++id, timestamp, table',
    });
  }
}

export const db = new PresencaDB();
