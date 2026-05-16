// Placeholder. Run `pnpm run supabase:types` once Supabase CLI is logged in
// to regenerate from live Postgres schema:
// $ supabase login
// $ pnpm run supabase:types

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      pessoas: {
        Row: {
          id: string;
          nome: string;
          grupo: 'evangelizacao' | 'mocidade' | 'adulto' | 'gestante';
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
        };
        Insert: Partial<Database['public']['Tables']['pessoas']['Row']> & { nome: string; grupo: Database['public']['Tables']['pessoas']['Row']['grupo'] };
        Update: Partial<Database['public']['Tables']['pessoas']['Row']>;
      };
      familias: {
        Row: { id: string; nome: string; ativo: boolean; criado_em: string; atualizado_em: string };
        Insert: Partial<Database['public']['Tables']['familias']['Row']> & { nome: string };
        Update: Partial<Database['public']['Tables']['familias']['Row']>;
      };
      chamadas: {
        Row: { id: string; data: string; criado_em: string };
        Insert: Partial<Database['public']['Tables']['chamadas']['Row']> & { data: string };
        Update: Partial<Database['public']['Tables']['chamadas']['Row']>;
      };
      presencas: {
        Row: { id: string; chamada_id: string; pessoa_id: string; presente: boolean; criado_em: string; atualizado_em: string };
        Insert: Partial<Database['public']['Tables']['presencas']['Row']> & { chamada_id: string; pessoa_id: string };
        Update: Partial<Database['public']['Tables']['presencas']['Row']>;
      };
      cestas: {
        Row: { id: string; pessoa_id: string; data: string; ativo: boolean; criado_em: string; atualizado_em: string };
        Insert: Partial<Database['public']['Tables']['cestas']['Row']> & { pessoa_id: string; data: string };
        Update: Partial<Database['public']['Tables']['cestas']['Row']>;
      };
      itens: {
        Row: {
          id: string;
          nome: string;
          categoria: 'alimento-doacao' | 'alimento-interno' | 'limpeza';
          quantidade: number;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: Partial<Database['public']['Tables']['itens']['Row']> & { nome: string; categoria: Database['public']['Tables']['itens']['Row']['categoria'] };
        Update: Partial<Database['public']['Tables']['itens']['Row']>;
      };
      pedidos: {
        Row: {
          id: string;
          pessoa_id: string | null;
          familia_id: string | null;
          item: string;
          quantidade: number;
          observacao: string | null;
          status: 'pendente' | 'atendido';
          solicitado_em: string;
          atendido_em: string | null;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: Partial<Database['public']['Tables']['pedidos']['Row']> & { item: string };
        Update: Partial<Database['public']['Tables']['pedidos']['Row']>;
      };
      app_users: {
        Row: {
          id: string;
          nome: string;
          papel: 'admin' | 'operador';
          ativo: boolean;
          criado_em: string;
          criado_por: string | null;
          ultimo_login_em: string | null;
        };
        Insert: Partial<Database['public']['Tables']['app_users']['Row']> & { id: string; nome: string; papel: Database['public']['Tables']['app_users']['Row']['papel'] };
        Update: Partial<Database['public']['Tables']['app_users']['Row']>;
      };
      consent_terms: {
        Row: { id: string; versao: string; texto: string; ativo: boolean; criado_em: string; criado_por: string | null };
        Insert: Partial<Database['public']['Tables']['consent_terms']['Row']> & { versao: string; texto: string };
        Update: Partial<Database['public']['Tables']['consent_terms']['Row']>;
      };
      pessoa_consents: {
        Row: {
          id: string;
          pessoa_id: string;
          consent_term_id: string;
          declarado_por: string;
          metodo: 'verbal' | 'escrito';
          registrado_em: string;
          revogado_em: string | null;
          revogado_por: string | null;
        };
        Insert: Partial<Database['public']['Tables']['pessoa_consents']['Row']> & { pessoa_id: string; consent_term_id: string; declarado_por: string };
        Update: Partial<Database['public']['Tables']['pessoa_consents']['Row']>;
      };
      audit_log: {
        Row: {
          id: number;
          tabela: string;
          registro_id: string;
          operacao: 'INSERT' | 'UPDATE' | 'DELETE' | 'ANONIMIZAR' | 'EXPORT';
          usuario_id: string | null;
          diff: Json | null;
          ip: string | null;
          user_agent: string | null;
          ocorrido_em: string;
        };
        Insert: Partial<Database['public']['Tables']['audit_log']['Row']> & { tabela: string; registro_id: string; operacao: Database['public']['Tables']['audit_log']['Row']['operacao'] };
        Update: Partial<Database['public']['Tables']['audit_log']['Row']>;
      };
      lgpd_requests: {
        Row: {
          id: string;
          pessoa_id: string | null;
          pessoa_nome_snapshot: string | null;
          tipo: 'confirmacao' | 'acesso' | 'correcao' | 'anonimizacao' | 'eliminacao' | 'portabilidade' | 'revogacao';
          status: 'aberto' | 'concluido' | 'rejeitado';
          solicitado_em: string;
          solicitado_por: string | null;
          concluido_em: string | null;
          concluido_por: string | null;
          observacao: string | null;
          resultado_arquivo: string | null;
        };
        Insert: Partial<Database['public']['Tables']['lgpd_requests']['Row']> & { tipo: Database['public']['Tables']['lgpd_requests']['Row']['tipo'] };
        Update: Partial<Database['public']['Tables']['lgpd_requests']['Row']>;
      };
    };
    Views: {
      pessoas_operador: {
        Row: {
          id: string;
          nome: string;
          grupo: 'evangelizacao' | 'mocidade' | 'adulto' | 'gestante';
          familia_id: string | null;
          telefone: string | null;
          ativo: boolean;
          excluir_ranking: boolean;
          anonimizado_em: string | null;
          criado_em: string;
          atualizado_em: string;
        };
      };
    };
    Functions: {
      current_app_user_papel: {
        Args: Record<string, never>;
        Returns: string;
      };
      find_inactive_pessoas: {
        Args: { cutoff_date: string };
        Returns: { id: string }[];
      };
    };
    Enums: Record<string, never>;
  };
}
