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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      atendimentos: {
        Row: {
          adjustment_index: string | null
          assignee_id: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          contact_end_time: string | null
          contact_person: string | null
          contact_start_time: string | null
          contract_signed_date: string | null
          created_at: string
          department: Database["public"]["Enums"]["tipo_departamento"] | null
          final_analysis:
            | Database["public"]["Enums"]["tipo_analise_final"]
            | null
          first_response_at: string | null
          id: number
          initial_message: string | null
          lead_source: Database["public"]["Enums"]["tipo_origem_lead"] | null
          license_plate: string | null
          notes: string | null
          proposal_sent_date: string | null
          reason: Database["public"]["Enums"]["tipo_motivo_reclamacao"] | null
          resolution_details: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["tipo_status_atendimento"] | null
          summary: string | null
          tipo_atendimento: string | null
          updated_at: string
        }
        Insert: {
          adjustment_index?: string | null
          assignee_id?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          contact_end_time?: string | null
          contact_person?: string | null
          contact_start_time?: string | null
          contract_signed_date?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["tipo_departamento"] | null
          final_analysis?:
            | Database["public"]["Enums"]["tipo_analise_final"]
            | null
          first_response_at?: string | null
          id?: number
          initial_message?: string | null
          lead_source?: Database["public"]["Enums"]["tipo_origem_lead"] | null
          license_plate?: string | null
          notes?: string | null
          proposal_sent_date?: string | null
          reason?: Database["public"]["Enums"]["tipo_motivo_reclamacao"] | null
          resolution_details?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["tipo_status_atendimento"] | null
          summary?: string | null
          tipo_atendimento?: string | null
          updated_at?: string
        }
        Update: {
          adjustment_index?: string | null
          assignee_id?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          contact_end_time?: string | null
          contact_person?: string | null
          contact_start_time?: string | null
          contract_signed_date?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["tipo_departamento"] | null
          final_analysis?:
            | Database["public"]["Enums"]["tipo_analise_final"]
            | null
          first_response_at?: string | null
          id?: number
          initial_message?: string | null
          lead_source?: Database["public"]["Enums"]["tipo_origem_lead"] | null
          license_plate?: string | null
          notes?: string | null
          proposal_sent_date?: string | null
          reason?: Database["public"]["Enums"]["tipo_motivo_reclamacao"] | null
          resolution_details?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["tipo_status_atendimento"] | null
          summary?: string | null
          tipo_atendimento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          file_path: string
          file_size: number | null
          filename: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size?: number | null
          filename: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number | null
          filename?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          start_date: string
          task_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          start_date: string
          task_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string
          task_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_mentions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          mentioned_user: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          mentioned_user: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          mentioned_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          task_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string | null
          full_name: string | null
          funcao: string | null
          id: string
          nivelAcesso: string | null
          permissoes: Json | null
          role: string
          push_token: string | null
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          funcao?: string | null
          id: string
          nivelAcesso?: string | null
          permissoes?: Json | null
          role?: string
          push_token?: string | null
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          funcao?: string | null
          id?: string
          nivelAcesso?: string | null
          permissoes?: Json | null
          role?: string
          push_token?: string | null
        }
        Relationships: []
      }
      project_checklists: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          project_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          project_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          portfolio_id: string | null
          updated_at: string
          user_id: string | null
          team_id: string | null
          privacy: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          portfolio_id?: string | null
          updated_at?: string
          user_id?: string | null
          team_id?: string | null
          privacy?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          portfolio_id?: string | null
          updated_at?: string
          user_id?: string | null
          team_id?: string | null
          privacy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          assignee_id: string | null
          completed: boolean
          created_at: string
          description: string | null
          due_date: string | null
          end_date: string | null
          id: string
          priority: string | null
          secondary_assignee_id: string | null
          start_date: string | null
          status: string
          task_id: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          id?: string
          priority?: string | null
          secondary_assignee_id?: string | null
          start_date?: string | null
          status?: string
          task_id: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          id?: string
          priority?: string | null
          secondary_assignee_id?: string | null
          start_date?: string | null
          status?: string
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_secondary_assignee_id_fkey"
            columns: ["secondary_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          created_at: string
          csat_score: number | null
          feedback_comment: string | null
          id: number
          influencing_factors: string[] | null
          nps_score: number | null
          other_factor_text: string | null
          survey_id: string
          survey_type: Database["public"]["Enums"]["survey_type"]
        }
        Insert: {
          created_at?: string
          csat_score?: number | null
          feedback_comment?: string | null
          id?: number
          influencing_factors?: string[] | null
          nps_score?: number | null
          other_factor_text?: string | null
          survey_id: string
          survey_type: Database["public"]["Enums"]["survey_type"]
        }
        Update: {
          created_at?: string
          csat_score?: number | null
          feedback_comment?: string | null
          id?: number
          influencing_factors?: string[] | null
          nps_score?: number | null
          other_factor_text?: string | null
          survey_id?: string
          survey_type?: Database["public"]["Enums"]["survey_type"]
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by_id: string | null
          driver_name: string | null
          id: string
          license_plate: string | null
          responded_at: string | null
          sent_at: string | null
          type: Database["public"]["Enums"]["survey_type"]
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by_id?: string | null
          driver_name?: string | null
          id?: string
          license_plate?: string | null
          responded_at?: string | null
          sent_at?: string | null
          type: Database["public"]["Enums"]["survey_type"]
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by_id?: string | null
          driver_name?: string | null
          id?: string
          license_plate?: string | null
          responded_at?: string | null
          sent_at?: string | null
          type?: Database["public"]["Enums"]["survey_type"]
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_delegations: {
        Row: {
          delegated_at: string
          delegated_by: string
          delegated_by_id: string | null
          delegated_to: string
          delegated_to_id: string | null
          id: string
          notes: string | null
          status: string
          task_id: string | null
        }
        Insert: {
          delegated_at?: string
          delegated_by: string
          delegated_by_id?: string | null
          delegated_to: string
          delegated_to_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          task_id?: string | null
        }
        Update: {
          delegated_at?: string
          delegated_by?: string
          delegated_by_id?: string | null
          delegated_to?: string
          delegated_to_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_delegations_delegated_by_id_fkey"
            columns: ["delegated_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_delegations_delegated_to_id_fkey"
            columns: ["delegated_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_delegations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          action: string
          created_at: string
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
          user_avatar_url: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_avatar_url?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_avatar_url?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived: boolean
          assignee_avatar: string | null
          assignee_id: string | null
          assignee_name: string | null
          atendimento_id: number | null
          category_id: string | null
          created_at: string
          delegated_by: string | null
          description: string | null
          due_date: string | null
          end_date: string | null
          estimated_hours: number | null
          id: string
          priority: string
          project_id: string | null
          section: string | null
          start_date: string | null
          status: string
          tags: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived?: boolean
          assignee_avatar?: string | null
          assignee_id?: string | null
          assignee_name?: string | null
          atendimento_id?: number | null
          category_id?: string | null
          created_at?: string
          delegated_by?: string | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string
          project_id?: string | null
          section?: string | null
          start_date?: string | null
          status?: string
          tags?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived?: boolean
          assignee_avatar?: string | null
          assignee_id?: string | null
          assignee_name?: string | null
          atendimento_id?: number | null
          category_id?: string | null
          created_at?: string
          delegated_by?: string | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string
          project_id?: string | null
          section?: string | null
          start_date?: string | null
          status?: string
          tags?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        }
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        }
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: string | null;
          created_at: string;
        }
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: string | null;
          created_at?: string;
        }
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: string | null;
          created_at?: string;
        }
        Relationships: [
          { foreignKeyName: "project_members_project_id_fkey", columns: ["project_id"], referencedRelation: "projects", referencedColumns: ["id"] },
          { foreignKeyName: "project_members_user_id_fkey", columns: ["user_id"], referencedRelation: "profiles", referencedColumns: ["id"] }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_my_permission: {
        Args: { permission_key: string }
        Returns: boolean
      }
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_projects_with_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          color: string
          completed_count: number
          created_at: string
          description: string
          id: string
          late_count: number
          name: string
          portfolio_id: string
          task_count: number
          updated_at: string
          user_id: string
        }[]
      }
    }
    Enums: {
      survey_type: "comercial" | "entrega" | "manutencao" | "devolucao"
      tipo_analise_final: "Procedente" | "Improcedente" | "Dúvida"
      tipo_departamento:
        | "Manutenção"
        | "Central de Atendimento"
        | "Documentação"
        | "Operação"
        | "Comercial"
        | "Financeiro"
        | "Departamento Pessoal"
        | "Aberto Erroneamente"
        | "Dúvida"
        | "Operação - Filial SP"
      tipo_motivo_reclamacao:
        | "Contestação de Cobrança"
        | "Demora na Aprovação do Orçamento"
        | "Agendamento Errôneo"
        | "Má Qualidade de Serviço"
        | "Problemas Com Fornecedor"
        | "Demora em atendimento"
        | "Atendimento Ineficaz"
        | "Multas e Notificações"
        | "Problemas na Entrega"
        | "Problemas Com Veículo Reserva"
        | "Atendimento Comercial"
        | "Oportunidade Aberta Erroneamente"
        | "Cobrança Indevida"
        | "Dúvida"
        | "Erro de processo interno"
        | "Troca definitiva de veículo"
        | "Problema recorrente"
        | "Solicitação de Reembolso"
        | "Problemas com Terceiro"
      tipo_origem_lead:
        | "Cliente (Base)"
        | "Tráfego Pago"
        | "Indicação"
        | "Site"
        | "Ligação"
        | "Redes Sociais"
        | "Blip ChatBot"
        | "E-mail"
        | "Encerrado - Manutenção"
        | "Fechada"
        | "Perdida"
      tipo_status_atendimento: "Solicitação" | "Em Análise" | "Resolvido"
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
    Enums: {
      survey_type: ["comercial", "entrega", "manutencao", "devolucao"],
      tipo_analise_final: ["Procedente", "Improcedente", "Dúvida"],
      tipo_departamento: [
        "Manutenção",
        "Central de Atendimento",
        "Documentação",
        "Operação",
        "Comercial",
        "Financeiro",
        "Departamento Pessoal",
        "Aberto Erroneamente",
        "Dúvida",
        "Operação - Filial SP",
      ],
      tipo_motivo_reclamacao: [
        "Contestação de Cobrança",
        "Demora na Aprovação do Orçamento",
        "Agendamento Errôneo",
        "Má Qualidade de Serviço",
        "Problemas Com Fornecedor",
        "Demora em atendimento",
        "Atendimento Ineficaz",
        "Multas e Notificações",
        "Problemas na Entrega",
        "Problemas Com Veículo Reserva",
        "Atendimento Comercial",
        "Oportunidade Aberta Erroneamente",
        "Cobrança Indevida",
        "Dúvida",
        "Erro de processo interno",
        "Troca definitiva de veículo",
        "Problema recorrente",
        "Solicitação de Reembolso",
        "Problemas com Terceiro",
      ],
      tipo_origem_lead: [
        "Cliente (Base)",
        "Tráfego Pago",
        "Indicação",
        "Site",
        "Ligação",
        "Redes Sociais",
        "Blip ChatBot",
        "E-mail",
        "Encerrado - Manutenção",
        "Fechada",
        "Perdida",
      ],
      tipo_status_atendimento: ["Solicitação", "Em Análise", "Resolvido"],
    },
  },
} as const
