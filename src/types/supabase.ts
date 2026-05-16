export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          ativo: boolean
          criado_em: string
          criado_por: string | null
          id: string
          nome: string
          papel: string
          ultimo_login_em: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          id: string
          nome: string
          papel: string
          ultimo_login_em?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          id?: string
          nome?: string
          papel?: string
          ultimo_login_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_users_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          diff: Json | null
          id: number
          ip: string | null
          ocorrido_em: string
          operacao: string
          registro_id: string
          tabela: string
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          diff?: Json | null
          id?: number
          ip?: string | null
          ocorrido_em?: string
          operacao: string
          registro_id: string
          tabela: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          diff?: Json | null
          id?: number
          ip?: string | null
          ocorrido_em?: string
          operacao?: string
          registro_id?: string
          tabela?: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      cestas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          data: string
          id: string
          pessoa_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          data: string
          id?: string
          pessoa_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          data?: string
          id?: string
          pessoa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cestas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cestas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas_operador"
            referencedColumns: ["id"]
          },
        ]
      }
      chamadas: {
        Row: {
          criado_em: string
          data: string
          id: string
        }
        Insert: {
          criado_em?: string
          data: string
          id?: string
        }
        Update: {
          criado_em?: string
          data?: string
          id?: string
        }
        Relationships: []
      }
      consent_terms: {
        Row: {
          ativo: boolean
          criado_em: string
          criado_por: string | null
          id: string
          texto: string
          versao: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          id?: string
          texto: string
          versao: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          id?: string
          texto?: string
          versao?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_terms_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      familias: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      itens: {
        Row: {
          ativo: boolean
          atualizado_em: string
          categoria: string
          criado_em: string
          id: string
          nome: string
          quantidade: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          categoria: string
          criado_em?: string
          id?: string
          nome: string
          quantidade?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string
          criado_em?: string
          id?: string
          nome?: string
          quantidade?: number
        }
        Relationships: []
      }
      lgpd_requests: {
        Row: {
          concluido_em: string | null
          concluido_por: string | null
          id: string
          observacao: string | null
          pessoa_id: string | null
          pessoa_nome_snapshot: string | null
          resultado_arquivo: string | null
          solicitado_em: string
          solicitado_por: string | null
          status: string
          tipo: string
        }
        Insert: {
          concluido_em?: string | null
          concluido_por?: string | null
          id?: string
          observacao?: string | null
          pessoa_id?: string | null
          pessoa_nome_snapshot?: string | null
          resultado_arquivo?: string | null
          solicitado_em?: string
          solicitado_por?: string | null
          status?: string
          tipo: string
        }
        Update: {
          concluido_em?: string | null
          concluido_por?: string | null
          id?: string
          observacao?: string | null
          pessoa_id?: string | null
          pessoa_nome_snapshot?: string | null
          resultado_arquivo?: string | null
          solicitado_em?: string
          solicitado_por?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "lgpd_requests_concluido_por_fkey"
            columns: ["concluido_por"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_requests_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_requests_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas_operador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_requests_solicitado_por_fkey"
            columns: ["solicitado_por"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          atendido_em: string | null
          ativo: boolean
          atualizado_em: string
          criado_em: string
          familia_id: string | null
          id: string
          item: string
          observacao: string | null
          pessoa_id: string | null
          quantidade: number
          solicitado_em: string
          status: string
        }
        Insert: {
          atendido_em?: string | null
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          familia_id?: string | null
          id?: string
          item: string
          observacao?: string | null
          pessoa_id?: string | null
          quantidade?: number
          solicitado_em?: string
          status?: string
        }
        Update: {
          atendido_em?: string | null
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          familia_id?: string | null
          id?: string
          item?: string
          observacao?: string | null
          pessoa_id?: string | null
          quantidade?: number
          solicitado_em?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas_operador"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_consents: {
        Row: {
          consent_term_id: string
          declarado_por: string
          id: string
          metodo: string
          pessoa_id: string
          registrado_em: string
          revogado_em: string | null
          revogado_por: string | null
        }
        Insert: {
          consent_term_id: string
          declarado_por: string
          id?: string
          metodo?: string
          pessoa_id: string
          registrado_em?: string
          revogado_em?: string | null
          revogado_por?: string | null
        }
        Update: {
          consent_term_id?: string
          declarado_por?: string
          id?: string
          metodo?: string
          pessoa_id?: string
          registrado_em?: string
          revogado_em?: string | null
          revogado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_consents_consent_term_id_fkey"
            columns: ["consent_term_id"]
            isOneToOne: false
            referencedRelation: "consent_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_consents_declarado_por_fkey"
            columns: ["declarado_por"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_consents_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_consents_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas_operador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_consents_revogado_por_fkey"
            columns: ["revogado_por"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas: {
        Row: {
          anonimizado_em: string | null
          anonimizado_por: string | null
          apta_cesta: boolean | null
          ativo: boolean
          atualizado_em: string
          bairro: string | null
          cep: string | null
          complemento: string | null
          criado_em: string
          excluir_ranking: boolean | null
          familia_id: string | null
          grupo: string
          id: string
          nome: string
          numero: string | null
          rua: string | null
          telefone: string | null
          visita_obs: string | null
          visitada: boolean
        }
        Insert: {
          anonimizado_em?: string | null
          anonimizado_por?: string | null
          apta_cesta?: boolean | null
          ativo?: boolean
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          criado_em?: string
          excluir_ranking?: boolean | null
          familia_id?: string | null
          grupo: string
          id?: string
          nome: string
          numero?: string | null
          rua?: string | null
          telefone?: string | null
          visita_obs?: string | null
          visitada?: boolean
        }
        Update: {
          anonimizado_em?: string | null
          anonimizado_por?: string | null
          apta_cesta?: boolean | null
          ativo?: boolean
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          criado_em?: string
          excluir_ranking?: boolean | null
          familia_id?: string | null
          grupo?: string
          id?: string
          nome?: string
          numero?: string | null
          rua?: string | null
          telefone?: string | null
          visita_obs?: string | null
          visitada?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pessoas_anonimizado_por_fkey"
            columns: ["anonimizado_por"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoas_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
        ]
      }
      presencas: {
        Row: {
          atualizado_em: string
          chamada_id: string
          criado_em: string
          id: string
          pessoa_id: string
          presente: boolean
        }
        Insert: {
          atualizado_em?: string
          chamada_id: string
          criado_em?: string
          id?: string
          pessoa_id: string
          presente?: boolean
        }
        Update: {
          atualizado_em?: string
          chamada_id?: string
          criado_em?: string
          id?: string
          pessoa_id?: string
          presente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "presencas_chamada_id_fkey"
            columns: ["chamada_id"]
            isOneToOne: false
            referencedRelation: "chamadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas_operador"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pessoas_operador: {
        Row: {
          anonimizado_em: string | null
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          excluir_ranking: boolean | null
          familia_id: string | null
          grupo: string | null
          id: string | null
          nome: string | null
          telefone: string | null
        }
        Insert: {
          anonimizado_em?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          excluir_ranking?: boolean | null
          familia_id?: string | null
          grupo?: string | null
          id?: string | null
          nome?: string | null
          telefone?: string | null
        }
        Update: {
          anonimizado_em?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          excluir_ranking?: boolean | null
          familia_id?: string | null
          grupo?: string | null
          id?: string | null
          nome?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoas_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_app_user_papel: { Args: never; Returns: string }
      find_inactive_pessoas: {
        Args: { cutoff_date: string }
        Returns: {
          id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
