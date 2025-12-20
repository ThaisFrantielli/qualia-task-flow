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
      analytics_page_tabs: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          page_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          page_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          page_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_page_tabs_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "analytics_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_pages: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          hub_category: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          route: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          hub_category?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          route: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          hub_category?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          route?: string
        }
        Relationships: []
      }
      atendimento_historico: {
        Row: {
          atendimento_id: number
          created_at: string
          detalhes: Json | null
          id: number
          tipo_evento: string
          user_id: string | null
        }
        Insert: {
          atendimento_id: number
          created_at?: string
          detalhes?: Json | null
          id?: number
          tipo_evento: string
          user_id?: string | null
        }
        Update: {
          atendimento_id?: number
          created_at?: string
          detalhes?: Json | null
          id?: number
          tipo_evento?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimento_historico_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimentos: {
        Row: {
          adjustment_index: string | null
          assignee_id: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          cliente_id: string | null
          contact_end_time: string | null
          contact_person: string | null
          contact_start_time: string | null
          contract_signed_date: string | null
          created_at: string
          department: Database["public"]["Enums"]["tipo_departamento"] | null
          descricao: string | null
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
          titulo: string | null
          updated_at: string
        }
        Insert: {
          adjustment_index?: string | null
          assignee_id?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          cliente_id?: string | null
          contact_end_time?: string | null
          contact_person?: string | null
          contact_start_time?: string | null
          contract_signed_date?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["tipo_departamento"] | null
          descricao?: string | null
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
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          adjustment_index?: string | null
          assignee_id?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          cliente_id?: string | null
          contact_end_time?: string | null
          contact_person?: string | null
          contact_start_time?: string | null
          contract_signed_date?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["tipo_departamento"] | null
          descricao?: string | null
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
          titulo?: string | null
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
          {
            foreignKeyName: "atendimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimentos_pos_venda: {
        Row: {
          analise_final: string | null
          atendente: string | null
          canal: string | null
          cliente: string | null
          data_atualizacao: string | null
          data_criacao: string | null
          departamento: string | null
          email: string | null
          fantasia: string | null
          fase: string | null
          id: number
          inicio_contato: string | null
          motivo_reclamacao: string | null
          nome: string | null
          numero_atendimento: string | null
          origem_lead: string | null
          pipeline: string | null
          placa: string | null
          prev_fechamento: string | null
          produtos: string | null
          resolucao: string | null
          resumo: string | null
          status: string | null
          telefone: string | null
          tempo_atendimento: string | null
          termino_contato: string | null
          tipo_atendimento: string | null
          valor: string | null
        }
        Insert: {
          analise_final?: string | null
          atendente?: string | null
          canal?: string | null
          cliente?: string | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          departamento?: string | null
          email?: string | null
          fantasia?: string | null
          fase?: string | null
          id?: number
          inicio_contato?: string | null
          motivo_reclamacao?: string | null
          nome?: string | null
          numero_atendimento?: string | null
          origem_lead?: string | null
          pipeline?: string | null
          placa?: string | null
          prev_fechamento?: string | null
          produtos?: string | null
          resolucao?: string | null
          resumo?: string | null
          status?: string | null
          telefone?: string | null
          tempo_atendimento?: string | null
          termino_contato?: string | null
          tipo_atendimento?: string | null
          valor?: string | null
        }
        Update: {
          analise_final?: string | null
          atendente?: string | null
          canal?: string | null
          cliente?: string | null
          data_atualizacao?: string | null
          data_criacao?: string | null
          departamento?: string | null
          email?: string | null
          fantasia?: string | null
          fase?: string | null
          id?: number
          inicio_contato?: string | null
          motivo_reclamacao?: string | null
          nome?: string | null
          numero_atendimento?: string | null
          origem_lead?: string | null
          pipeline?: string | null
          placa?: string | null
          prev_fechamento?: string | null
          produtos?: string | null
          resolucao?: string | null
          resumo?: string | null
          status?: string | null
          telefone?: string | null
          tempo_atendimento?: string | null
          termino_contato?: string | null
          tipo_atendimento?: string | null
          valor?: string | null
        }
        Relationships: []
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
          color: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          owner_id: string | null
          start_date: string
          task_id: string | null
          title: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          owner_id?: string | null
          start_date: string
          task_id?: string | null
          title: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          owner_id?: string | null
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
      cliente_contatos: {
        Row: {
          cliente_id: string
          departamento: string | null
          email_contato: string | null
          id: string
          is_gestor: boolean
          nome_contato: string | null
          telefone_contato: string | null
        }
        Insert: {
          cliente_id: string
          departamento?: string | null
          email_contato?: string | null
          id?: string
          is_gestor?: boolean
          nome_contato?: string | null
          telefone_contato?: string | null
        }
        Update: {
          cliente_id?: string
          departamento?: string | null
          email_contato?: string | null
          id?: string
          is_gestor?: boolean
          nome_contato?: string | null
          telefone_contato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_contatos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          bairro: string | null
          cadastro_cliente: string | null
          cep: string | null
          cidade: string | null
          codigo_cliente: string
          cpf_cnpj: string | null
          descartado_em: string | null
          descartado_motivo: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          natureza_cliente: string | null
          nome_contratante: string | null
          nome_fantasia: string | null
          numero: string | null
          origem: string | null
          razao_social: string | null
          situacao: string | null
          stage_id: string | null
          status: string | null
          status_triagem: string | null
          telefone: string | null
          tipo_cliente: string | null
          ultimo_atendente_id: string | null
          ultimo_atendimento_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          bairro?: string | null
          cadastro_cliente?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_cliente: string
          cpf_cnpj?: string | null
          descartado_em?: string | null
          descartado_motivo?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          natureza_cliente?: string | null
          nome_contratante?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          origem?: string | null
          razao_social?: string | null
          situacao?: string | null
          stage_id?: string | null
          status?: string | null
          status_triagem?: string | null
          telefone?: string | null
          tipo_cliente?: string | null
          ultimo_atendente_id?: string | null
          ultimo_atendimento_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          bairro?: string | null
          cadastro_cliente?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_cliente?: string
          cpf_cnpj?: string | null
          descartado_em?: string | null
          descartado_motivo?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          natureza_cliente?: string | null
          nome_contratante?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          origem?: string | null
          razao_social?: string | null
          situacao?: string | null
          stage_id?: string | null
          status?: string | null
          status_triagem?: string | null
          telefone?: string | null
          tipo_cliente?: string | null
          ultimo_atendente_id?: string | null
          ultimo_atendimento_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_ultimo_atendente_id_fkey"
            columns: ["ultimo_atendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      crm_pipelines: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: []
      }
      crm_stages: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          pipeline_id: string | null
          position: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          pipeline_id?: string | null
          position?: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          pipeline_id?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      funil_estagios: {
        Row: {
          cor: string | null
          created_at: string | null
          funil_id: string | null
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          funil_id?: string | null
          id?: string
          nome: string
          ordem: number
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          funil_id?: string | null
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "funil_estagios_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
        ]
      }
      funis: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "funis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_analytics_permissions: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          page_id: string
          tab_id: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          page_id: string
          tab_id?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          page_id?: string
          tab_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_analytics_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_analytics_permissions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "analytics_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_analytics_permissions_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "analytics_page_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      group_modules: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          module_id: string | null
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          module_id?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          module_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_modules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      module_pages: {
        Row: {
          created_at: string | null
          id: string
          module_id: string | null
          page_key: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          page_key: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          page_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_pages_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          route: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          route?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          route?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      oportunidade_messages: {
        Row: {
          content: string
          created_at: string | null
          id: number
          is_system_message: boolean | null
          metadata: Json | null
          oportunidade_id: number | null
          parent_message_id: number | null
          read_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          is_system_message?: boolean | null
          metadata?: Json | null
          oportunidade_id?: number | null
          parent_message_id?: number | null
          read_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          is_system_message?: boolean | null
          metadata?: Json | null
          oportunidade_id?: number | null
          parent_message_id?: number | null
          read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidade_messages_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidade_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "oportunidade_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidade_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      oportunidade_produtos: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: number
          nome: string
          oportunidade_id: number | null
          quantidade: number | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome: string
          oportunidade_id?: number | null
          quantidade?: number | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome?: string
          oportunidade_id?: number | null
          quantidade?: number | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidade_produtos_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      oportunidades: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          descricao: string | null
          estagio_id: string | null
          funil_id: string | null
          id: number
          status: string | null
          titulo: string
          updated_at: string | null
          user_id: string | null
          valor_total: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          descricao?: string | null
          estagio_id?: string | null
          funil_id?: string | null
          id?: number
          status?: string | null
          titulo: string
          updated_at?: string | null
          user_id?: string | null
          valor_total?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          descricao?: string | null
          estagio_id?: string | null
          funil_id?: string | null
          id?: number
          status?: string | null
          titulo?: string
          updated_at?: string | null
          user_id?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_estagio_id_fkey"
            columns: ["estagio_id"]
            isOneToOne: false
            referencedRelation: "funil_estagios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          force_password_change: boolean | null
          full_name: string | null
          funcao: string | null
          id: string
          manager_id: string | null
          nivelAcesso: string | null
          permissoes: Json | null
          role: string
          supervisor_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          force_password_change?: boolean | null
          full_name?: string | null
          funcao?: string | null
          id: string
          manager_id?: string | null
          nivelAcesso?: string | null
          permissoes?: Json | null
          role?: string
          supervisor_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          force_password_change?: boolean | null
          full_name?: string | null
          funcao?: string | null
          id?: string
          manager_id?: string | null
          nivelAcesso?: string | null
          permissoes?: Json | null
          role?: string
          supervisor_id?: string | null
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
      project_members: {
        Row: {
          created_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sections: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          order: number | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          order?: number | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          order?: number | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_sections_project_id_fkey"
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
          customcolor: string | null
          description: string | null
          id: string
          name: string
          notes: string | null
          portfolio_id: string | null
          privacy: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          customcolor?: string | null
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          portfolio_id?: string | null
          privacy?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          customcolor?: string | null
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          portfolio_id?: string | null
          privacy?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
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
          approval_notes: string | null
          approved_at: string | null
          approved_by_id: string | null
          assignee_id: string | null
          completed: boolean
          created_at: string
          description: string | null
          due_date: string | null
          end_date: string | null
          id: string
          needs_approval: boolean
          order: number | null
          priority: string | null
          requested_approver_id: string | null
          secondary_assignee_id: string | null
          start_date: string | null
          status: string
          task_id: string
          title: string
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by_id?: string | null
          assignee_id?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          id?: string
          needs_approval?: boolean
          order?: number | null
          priority?: string | null
          requested_approver_id?: string | null
          secondary_assignee_id?: string | null
          start_date?: string | null
          status?: string
          task_id: string
          title: string
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by_id?: string | null
          assignee_id?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          id?: string
          needs_approval?: boolean
          order?: number | null
          priority?: string | null
          requested_approver_id?: string | null
          secondary_assignee_id?: string | null
          start_date?: string | null
          status?: string
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_requested_approver_id_fkey"
            columns: ["requested_approver_id"]
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
      survey_campaigns: {
        Row: {
          auto_send_delay_hours: number | null
          created_at: string | null
          created_by_id: string | null
          csat_question: string
          description: string | null
          expires_after_days: number | null
          factors_label: string | null
          id: string
          include_nps: boolean | null
          include_open_feedback: boolean | null
          influencing_factors: Json | null
          is_active: boolean | null
          max_reminders: number | null
          name: string
          nps_question: string | null
          open_feedback_question: string | null
          reminder_delay_hours: number | null
          reminder_enabled: boolean | null
          send_via: string | null
          type: Database["public"]["Enums"]["survey_type"]
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          auto_send_delay_hours?: number | null
          created_at?: string | null
          created_by_id?: string | null
          csat_question: string
          description?: string | null
          expires_after_days?: number | null
          factors_label?: string | null
          id?: string
          include_nps?: boolean | null
          include_open_feedback?: boolean | null
          influencing_factors?: Json | null
          is_active?: boolean | null
          max_reminders?: number | null
          name: string
          nps_question?: string | null
          open_feedback_question?: string | null
          reminder_delay_hours?: number | null
          reminder_enabled?: boolean | null
          send_via?: string | null
          type: Database["public"]["Enums"]["survey_type"]
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          auto_send_delay_hours?: number | null
          created_at?: string | null
          created_by_id?: string | null
          csat_question?: string
          description?: string | null
          expires_after_days?: number | null
          factors_label?: string | null
          id?: string
          include_nps?: boolean | null
          include_open_feedback?: boolean | null
          influencing_factors?: Json | null
          is_active?: boolean | null
          max_reminders?: number | null
          name?: string
          nps_question?: string | null
          open_feedback_question?: string | null
          reminder_delay_hours?: number | null
          reminder_enabled?: boolean | null
          send_via?: string | null
          type?: Database["public"]["Enums"]["survey_type"]
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_campaigns_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_question_templates: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          is_required: boolean | null
          options: Json | null
          order_position: number | null
          question_text: string
          question_type: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          order_position?: number | null
          question_text: string
          question_type: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          order_position?: number | null
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_question_templates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "survey_campaigns"
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
          open_feedback: string | null
          other_factor_text: string | null
          response_time_seconds: number | null
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
          open_feedback?: string | null
          other_factor_text?: string | null
          response_time_seconds?: number | null
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
          open_feedback?: string | null
          other_factor_text?: string | null
          response_time_seconds?: number | null
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
          campaign_id: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          cliente_id: string | null
          created_at: string
          created_by_id: string | null
          driver_name: string | null
          expires_at: string | null
          follow_up_at: string | null
          follow_up_by_id: string | null
          follow_up_notes: string | null
          follow_up_status: string | null
          id: string
          license_plate: string | null
          reminder_count: number | null
          responded_at: string | null
          sent_at: string | null
          sent_via: string | null
          type: Database["public"]["Enums"]["survey_type"]
        }
        Insert: {
          campaign_id?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by_id?: string | null
          driver_name?: string | null
          expires_at?: string | null
          follow_up_at?: string | null
          follow_up_by_id?: string | null
          follow_up_notes?: string | null
          follow_up_status?: string | null
          id?: string
          license_plate?: string | null
          reminder_count?: number | null
          responded_at?: string | null
          sent_at?: string | null
          sent_via?: string | null
          type: Database["public"]["Enums"]["survey_type"]
        }
        Update: {
          campaign_id?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by_id?: string | null
          driver_name?: string | null
          expires_at?: string | null
          follow_up_at?: string | null
          follow_up_by_id?: string | null
          follow_up_notes?: string | null
          follow_up_status?: string | null
          id?: string
          license_plate?: string | null
          reminder_count?: number | null
          responded_at?: string | null
          sent_at?: string | null
          sent_via?: string | null
          type?: Database["public"]["Enums"]["survey_type"]
        }
        Relationships: [
          {
            foreignKeyName: "surveys_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "survey_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_follow_up_by_id_fkey"
            columns: ["follow_up_by_id"]
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
      task_recurrence_history: {
        Row: {
          generated_at: string | null
          generated_task_id: string
          id: string
          occurrence_date: string
          parent_task_id: string
        }
        Insert: {
          generated_at?: string | null
          generated_task_id: string
          id?: string
          occurrence_date: string
          parent_task_id: string
        }
        Update: {
          generated_at?: string | null
          generated_task_id?: string
          id?: string
          occurrence_date?: string
          parent_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_recurrence_history_generated_task_id_fkey"
            columns: ["generated_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_recurrence_history_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
          cliente_id: string | null
          created_at: string
          delegated_by: string | null
          description: string | null
          due_date: string | null
          end_date: string | null
          estimated_hours: number | null
          id: string
          is_recurring: boolean | null
          occurrence_date: string | null
          order: number | null
          parent_task_id: string | null
          priority: string
          project_id: string | null
          recurrence_days: string | null
          recurrence_end: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          section: string | null
          start_date: string | null
          status: string
          tags: string | null
          ticket_id: string | null
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
          cliente_id?: string | null
          created_at?: string
          delegated_by?: string | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_recurring?: boolean | null
          occurrence_date?: string | null
          order?: number | null
          parent_task_id?: string | null
          priority?: string
          project_id?: string | null
          recurrence_days?: string | null
          recurrence_end?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          section?: string | null
          start_date?: string | null
          status?: string
          tags?: string | null
          ticket_id?: string | null
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
          cliente_id?: string | null
          created_at?: string
          delegated_by?: string | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_recurring?: boolean | null
          occurrence_date?: string | null
          order?: number | null
          parent_task_id?: string | null
          priority?: string
          project_id?: string | null
          recurrence_days?: string | null
          recurrence_end?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          section?: string | null
          start_date?: string | null
          status?: string
          tags?: string | null
          ticket_id?: string | null
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
            foreignKeyName: "tasks_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_sla"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_anexos: {
        Row: {
          created_at: string | null
          id: string
          nome_arquivo: string | null
          tamanho_bytes: number | null
          ticket_id: string | null
          tipo_arquivo: string | null
          uploaded_by: string | null
          url_arquivo: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome_arquivo?: string | null
          tamanho_bytes?: number | null
          ticket_id?: string | null
          tipo_arquivo?: string | null
          uploaded_by?: string | null
          url_arquivo?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome_arquivo?: string | null
          tamanho_bytes?: number | null
          ticket_id?: string | null
          tipo_arquivo?: string | null
          uploaded_by?: string | null
          url_arquivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_anexos_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_anexos_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_sla"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_anexos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_departamentos: {
        Row: {
          created_at: string | null
          departamento: string
          id: string
          respondido_em: string | null
          respondido_por: string | null
          resposta: string | null
          solicitado_em: string | null
          solicitado_por: string | null
          task_id: string | null
          ticket_id: string | null
        }
        Insert: {
          created_at?: string | null
          departamento: string
          id?: string
          respondido_em?: string | null
          respondido_por?: string | null
          resposta?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          task_id?: string | null
          ticket_id?: string | null
        }
        Update: {
          created_at?: string | null
          departamento?: string
          id?: string
          respondido_em?: string | null
          respondido_por?: string | null
          resposta?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          task_id?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_departamentos_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_departamentos_solicitado_por_fkey"
            columns: ["solicitado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_departamentos_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_departamentos_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_departamentos_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_sla"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_interacoes: {
        Row: {
          anexos: Json | null
          created_at: string | null
          departamento: string | null
          id: string
          mensagem: string | null
          setor_destino: string | null
          setor_origem: string | null
          status_anterior: string | null
          status_novo: string | null
          ticket_id: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          anexos?: Json | null
          created_at?: string | null
          departamento?: string | null
          id?: string
          mensagem?: string | null
          setor_destino?: string | null
          setor_origem?: string | null
          status_anterior?: string | null
          status_novo?: string | null
          ticket_id?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          anexos?: Json | null
          created_at?: string | null
          departamento?: string | null
          id?: string
          mensagem?: string | null
          setor_destino?: string | null
          setor_origem?: string | null
          status_anterior?: string | null
          status_novo?: string | null
          ticket_id?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_interacoes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_interacoes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_sla"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_interacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_motivos: {
        Row: {
          created_at: string | null
          id: string
          label: string
          parent_value: string | null
          sort_order: number | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          parent_value?: string | null
          sort_order?: number | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          parent_value?: string | null
          sort_order?: number | null
          value?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          acoes_corretivas: string | null
          atendente_id: string | null
          cliente_id: string | null
          created_at: string | null
          data_abertura: string | null
          data_fechamento: string | null
          departamento:
            | Database["public"]["Enums"]["ticket_departamento_enum"]
            | null
          descricao: string | null
          fase: string | null
          feedback_cliente: string | null
          id: string
          motivo: Database["public"]["Enums"]["ticket_motivo_enum"] | null
          nota_cliente: number | null
          numero_ticket: string
          origem: string | null
          placa: string | null
          prioridade: string | null
          procedencia: string | null
          resolucao: string | null
          setor_responsavel: string | null
          sintese: string | null
          sla_primeira_resposta: string | null
          sla_resolucao: string | null
          solucao_aplicada: string | null
          status: string | null
          tempo_primeira_resposta: unknown
          tempo_total_resolucao: unknown
          tipo: string | null
          tipo_reclamacao: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          acoes_corretivas?: string | null
          atendente_id?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_abertura?: string | null
          data_fechamento?: string | null
          departamento?:
            | Database["public"]["Enums"]["ticket_departamento_enum"]
            | null
          descricao?: string | null
          fase?: string | null
          feedback_cliente?: string | null
          id?: string
          motivo?: Database["public"]["Enums"]["ticket_motivo_enum"] | null
          nota_cliente?: number | null
          numero_ticket: string
          origem?: string | null
          placa?: string | null
          prioridade?: string | null
          procedencia?: string | null
          resolucao?: string | null
          setor_responsavel?: string | null
          sintese?: string | null
          sla_primeira_resposta?: string | null
          sla_resolucao?: string | null
          solucao_aplicada?: string | null
          status?: string | null
          tempo_primeira_resposta?: unknown
          tempo_total_resolucao?: unknown
          tipo?: string | null
          tipo_reclamacao?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          acoes_corretivas?: string | null
          atendente_id?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_abertura?: string | null
          data_fechamento?: string | null
          departamento?:
            | Database["public"]["Enums"]["ticket_departamento_enum"]
            | null
          descricao?: string | null
          fase?: string | null
          feedback_cliente?: string | null
          id?: string
          motivo?: Database["public"]["Enums"]["ticket_motivo_enum"] | null
          nota_cliente?: number | null
          numero_ticket?: string
          origem?: string | null
          placa?: string | null
          prioridade?: string | null
          procedencia?: string | null
          resolucao?: string | null
          setor_responsavel?: string | null
          sintese?: string | null
          sla_primeira_resposta?: string | null
          sla_resolucao?: string | null
          solucao_aplicada?: string | null
          status?: string | null
          tempo_primeira_resposta?: unknown
          tempo_total_resolucao?: unknown
          tipo?: string | null
          tipo_reclamacao?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      triagem_descartes: {
        Row: {
          atendente_id: string | null
          cliente_id: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          motivo: string | null
          origem: string | null
        }
        Insert: {
          atendente_id?: string | null
          cliente_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          motivo?: string | null
          origem?: string | null
        }
        Update: {
          atendente_id?: string | null
          cliente_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          motivo?: string | null
          origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "triagem_descartes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triagem_descartes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analytics_permissions: {
        Row: {
          created_at: string | null
          id: string
          page_id: string
          tab_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_id: string
          tab_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          page_id?: string
          tab_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_analytics_permissions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "analytics_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_analytics_permissions_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "analytics_page_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_hierarchy: {
        Row: {
          created_at: string | null
          id: string
          supervisor_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          supervisor_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          supervisor_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_hierarchy_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hierarchy_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_modules: {
        Row: {
          created_at: string | null
          id: string
          module_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          connected_number: string | null
          created_at: string | null
          id: string
          is_connected: boolean | null
          last_connection_at: string | null
          qr_code: string | null
          session_data: Json | null
          updated_at: string | null
        }
        Insert: {
          connected_number?: string | null
          created_at?: string | null
          id: string
          is_connected?: boolean | null
          last_connection_at?: string | null
          qr_code?: string | null
          session_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          connected_number?: string | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_connection_at?: string | null
          qr_code?: string | null
          session_data?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          assigned_agent_id: string | null
          assigned_at: string | null
          atendimento_id: number | null
          auto_assigned: boolean | null
          cliente_id: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          instance_id: string | null
          is_online: boolean | null
          last_message: string | null
          last_message_at: string | null
          status: string
          ticket_id: string | null
          unread_count: number | null
          updated_at: string | null
          whatsapp_number: string
        }
        Insert: {
          assigned_agent_id?: string | null
          assigned_at?: string | null
          atendimento_id?: number | null
          auto_assigned?: boolean | null
          cliente_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          instance_id?: string | null
          is_online?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          ticket_id?: string | null
          unread_count?: number | null
          updated_at?: string | null
          whatsapp_number: string
        }
        Update: {
          assigned_agent_id?: string | null
          assigned_at?: string | null
          atendimento_id?: number | null
          auto_assigned?: boolean | null
          cliente_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          instance_id?: string | null
          is_online?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          ticket_id?: string | null
          unread_count?: number | null
          updated_at?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_sla"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_distribution_log: {
        Row: {
          agent_id: string | null
          assignment_reason: string | null
          conversation_id: string | null
          created_at: string | null
          distribution_type: string
          id: string
        }
        Insert: {
          agent_id?: string | null
          assignment_reason?: string | null
          conversation_id?: string | null
          created_at?: string | null
          distribution_type: string
          id?: string
        }
        Update: {
          agent_id?: string | null
          assignment_reason?: string | null
          conversation_id?: string | null
          created_at?: string | null
          distribution_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_distribution_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_distribution_rules: {
        Row: {
          agent_id: string | null
          available_hours: Json | null
          created_at: string | null
          id: string
          instance_ids: string[] | null
          is_active: boolean | null
          max_concurrent_conversations: number | null
          priority: number | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          available_hours?: Json | null
          created_at?: string | null
          id?: string
          instance_ids?: string[] | null
          is_active?: boolean | null
          max_concurrent_conversations?: number | null
          priority?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          available_hours?: Json | null
          created_at?: string | null
          id?: string
          instance_ids?: string[] | null
          is_active?: boolean | null
          max_concurrent_conversations?: number | null
          priority?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phone_number: string | null
          qr_code: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phone_number?: string | null
          qr_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phone_number?: string | null
          qr_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_media: {
        Row: {
          caption: string | null
          conversation_id: string | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          id: string
          media_type: string
          message_id: string | null
          mime_type: string | null
          storage_url: string | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          caption?: string | null
          conversation_id?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          media_type: string
          message_id?: string | null
          mime_type?: string | null
          storage_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          caption?: string | null
          conversation_id?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          media_type?: string
          message_id?: string | null
          mime_type?: string | null
          storage_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_media_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_media_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          file_name: string | null
          has_media: boolean | null
          id: string
          instance_id: string | null
          media_type: string | null
          media_url: string | null
          message_type: string
          metadata: Json | null
          read_at: string | null
          sender_id: string | null
          sender_name: string | null
          sender_phone: string | null
          sender_type: string
          status: string | null
          updated_at: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          file_name?: string | null
          has_media?: boolean | null
          id?: string
          instance_id?: string | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          sender_type: string
          status?: string | null
          updated_at?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          file_name?: string | null
          has_media?: boolean | null
          id?: string
          instance_id?: string | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          sender_type?: string
          status?: string | null
          updated_at?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      subtasks_with_approvers: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by_email: string | null
          approved_by_full_name: string | null
          approved_by_id: string | null
          assignee_id: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          due_date: string | null
          end_date: string | null
          id: string | null
          needs_approval: boolean | null
          priority: string | null
          requested_approver_email: string | null
          requested_approver_full_name: string | null
          requested_approver_id: string | null
          secondary_assignee_id: string | null
          start_date: string | null
          status: string | null
          task_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_requested_approver_id_fkey"
            columns: ["requested_approver_id"]
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
      tickets_sla: {
        Row: {
          cliente_nome: string | null
          cliente_razao: string | null
          created_at: string | null
          departamentos_pendentes: number | null
          horas_abertas: number | null
          horas_restantes_resolucao: number | null
          id: string | null
          minutos_restantes_primeira_resposta: number | null
          numero_ticket: string | null
          prioridade: string | null
          sla_primeira_resposta: string | null
          sla_resolucao: string | null
          status: string | null
          status_sla_primeira_resposta: string | null
          status_sla_resolucao: string | null
          tempo_primeira_resposta: unknown
          tempo_total_resolucao: unknown
          titulo: string | null
          total_departamentos: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_assign_conversation: {
        Args: { p_conversation_id: string }
        Returns: string
      }
      check_whatsapp_status: { Args: never; Returns: string }
      create_user_admin: {
        Args: {
          user_email: string
          user_full_name: string
          user_funcao?: string
          user_nivel?: string
          user_password: string
        }
        Returns: Json
      }
      create_user_as_admin: {
        Args: {
          user_email: string
          user_full_name: string
          user_funcao?: string
          user_nivel_acesso?: string
          user_password: string
          user_permissoes?: Json
        }
        Returns: Json
      }
      generate_ticket_number: { Args: never; Returns: string }
      get_direct_reports: {
        Args: { supervisor_uuid: string }
        Returns: {
          avatar_url: string
          full_name: string
          has_subordinates: boolean
          nivel_acesso: string
          subordinates_count: number
          user_id: string
        }[]
      }
      get_direct_supervisor: {
        Args: { user_uuid: string }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          funcao: string
          id: string
          nivelacesso: string
        }[]
      }
      get_eligible_agents_for_distribution: {
        Args: { p_instance_id?: string; p_tags?: string[] }
        Returns: {
          agent_id: string
          current_conversations: number
          max_conversations: number
          priority: number
        }[]
      }
      get_is_admin: { Args: never; Returns: boolean }
      get_my_permission: { Args: { permission_key: string }; Returns: boolean }
      get_my_role: { Args: never; Returns: string }
      get_my_subordinates_ids: { Args: never; Returns: string[] }
      get_profile_nivelacesso: { Args: { _id: string }; Returns: string }
      get_profile_permissoes: { Args: { _id: string }; Returns: Json }
      get_profile_role: { Args: { _id: string }; Returns: string }
      get_projects_with_stats: {
        Args: never
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
      get_subordinates_of_manager: {
        Args: { manager_id: string }
        Returns: string[]
      }
      get_team_count: { Args: { user_uuid: string }; Returns: number }
      get_user_analytics_pages: {
        Args: { _user_id: string }
        Returns: {
          display_order: number
          hub_category: string
          icon: string
          id: string
          page_key: string
          page_name: string
          page_route: string
        }[]
      }
      get_user_analytics_tabs: {
        Args: { _page_key: string; _user_id: string }
        Returns: {
          display_order: number
          id: string
          tab_key: string
          tab_name: string
        }[]
      }
      get_user_modules: {
        Args: { _user_id: string }
        Returns: {
          description: string
          display_order: number
          icon: string
          id: string
          key: string
          name: string
          route: string
        }[]
      }
      get_user_team_hierarchy: {
        Args: { user_uuid: string }
        Returns: {
          team_member_id: string
        }[]
      }
      has_analytics_page_access: {
        Args: { _page_key: string; _user_id: string }
        Returns: boolean
      }
      has_analytics_tab_access: {
        Args: { _page_key: string; _tab_key: string; _user_id: string }
        Returns: boolean
      }
      has_module_access: {
        Args: { _module_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_of_project: { Args: { _project_id: string }; Returns: boolean }
      is_owner_of_project: { Args: { _project_id: string }; Returns: boolean }
      is_user_admin: { Args: never; Returns: boolean }
      notify_sla_at_risk: { Args: never; Returns: undefined }
      notify_user: {
        Args: {
          _data?: Json
          _message: string
          _task_id?: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      prepare_user_profile: {
        Args: {
          user_full_name: string
          user_funcao?: string
          user_id: string
          user_nivel_acesso?: string
          user_permissoes?: Json
        }
        Returns: Json
      }
      send_whatsapp_message: {
        Args: { message_text: string; to_number: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "agent" | "user"
      survey_type: "comercial" | "entrega" | "manutencao" | "devolucao"
      ticket_departamento_enum:
        | "Manutenção"
        | "Central de atendimento"
        | "Documentação"
        | "Operação"
        | "Comercial"
        | "Financeiro"
        | "Operação SP"
        | "Não se aplica"
      ticket_motivo_enum:
        | "Contestação cobrança"
        | "Demora na aprovação do orçamento"
        | "Agendamento errôneo"
        | "Má qualidade do serviço"
        | "Problema com fornecedor"
        | "Demora no atendimento"
        | "Multas e notificações"
        | "Problemas na entrega do veículo"
        | "Problemas com o veículo"
        | "Atendimento Comercial"
        | "Oportunidade aberta erroneamente"
        | "Problemas de acesso"
        | "Problemas com terceiro"
        | "Dúvida"
        | "Outros"
      ticket_origem_enum:
        | "Whatsapp"
        | "Site"
        | "Ligação"
        | "Redes Sociais"
        | "E-mail"
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
      app_role: ["admin", "manager", "agent", "user"],
      survey_type: ["comercial", "entrega", "manutencao", "devolucao"],
      ticket_departamento_enum: [
        "Manutenção",
        "Central de atendimento",
        "Documentação",
        "Operação",
        "Comercial",
        "Financeiro",
        "Operação SP",
        "Não se aplica",
      ],
      ticket_motivo_enum: [
        "Contestação cobrança",
        "Demora na aprovação do orçamento",
        "Agendamento errôneo",
        "Má qualidade do serviço",
        "Problema com fornecedor",
        "Demora no atendimento",
        "Multas e notificações",
        "Problemas na entrega do veículo",
        "Problemas com o veículo",
        "Atendimento Comercial",
        "Oportunidade aberta erroneamente",
        "Problemas de acesso",
        "Problemas com terceiro",
        "Dúvida",
        "Outros",
      ],
      ticket_origem_enum: [
        "Whatsapp",
        "Site",
        "Ligação",
        "Redes Sociais",
        "E-mail",
      ],
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
