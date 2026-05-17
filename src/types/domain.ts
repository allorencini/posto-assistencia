export type Grupo = 'evangelizacao' | 'mocidade' | 'adulto' | 'gestante';
export type Categoria = 'alimento-doacao' | 'alimento-interno' | 'limpeza';
export type PedidoStatus = 'pendente' | 'atendido';

export interface Pessoa {
  id: string;
  nome: string;
  grupo: Grupo;
  familia_id: string | null;
  telefone: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  visitada: boolean;
  apta_cesta: boolean | null;
  visita_obs: string | null;
  excluir_ranking: boolean;
  ativo: boolean;
  anonimizado_em: string | null;
  anonimizado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Familia {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Chamada {
  id: string;
  data: string;
  criado_em: string;
}

export interface Presenca {
  id: string;
  chamada_id: string;
  pessoa_id: string;
  presente: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Cesta {
  id: string;
  pessoa_id: string;
  data: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Item {
  id: string;
  nome: string;
  categoria: Categoria;
  quantidade: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Pedido {
  id: string;
  pessoa_id: string | null;
  familia_id: string | null;
  item: string;
  quantidade: number;
  observacao: string | null;
  status: PedidoStatus;
  solicitado_em: string;
  atendido_em: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export type SyncTable =
  | 'pessoas'
  | 'familias'
  | 'chamadas'
  | 'presencas'
  | 'cestas'
  | 'itens'
  | 'pedidos'
  | 'pessoa_consents';

// Linhas vindo de qualquer tabela sincronizável (upsert) ou apenas `{ id }` (delete).
export type SyncPayload =
  | Pessoa
  | Familia
  | Chamada
  | Presenca
  | Cesta
  | Item
  | Pedido
  | { id: string; [k: string]: unknown };

export interface SyncQueueItem {
  id?: number;
  table: SyncTable;
  operation: 'upsert' | 'delete';
  data: SyncPayload;
  user_id: string;
  attempts: number;
  last_error?: string;
  attempted_at?: number;
  timestamp: number;
}
