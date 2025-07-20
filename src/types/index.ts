// src/types/index.ts

// Vamos definir a estrutura da 'Database' manualmente aqui.
// Isso substitui a necessidade de gerar tipos com a CLI do Supabase.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      // Definição completa da tabela 'tasks'
      tasks: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          description: string | null;
          status: string | null;
          priority: string | null;
          due_date: string | null;
          project_id: string | null;
          user_id: string | null;
          assignee_id: string | null; // <-- A coluna que precisamos
          assignee_name: string | null;
          assignee_avatar: string | null;
          archived: boolean | null;
          tags: string | null;
          estimated_hours: number | null;
          start_date: string | null;
          end_date: string | null;
          delegated_by: string | null;
        };
        Insert: {
          // Tipos para criar uma nova tarefa
          id?: string;
          created_at?: string;
          updated_at?: string;
          title: string;
          description?: string | null;
          status?: string | null;
          priority?: string | null;
          due_date?: string | null;
          project_id?: string | null;
          user_id: string; // user_id é obrigatório na criação
          assignee_id?: string | null;
        };
        Update: {
          // Tipos para atualizar uma tarefa
          title?: string;
          description?: string | null;
          status?: string | null;
          priority?: string | null;
          due_date?: string | null;
          assignee_id?: string | null; // <-- Permitindo a atualização
        };
      };
      // Defina outras tabelas aqui se precisar
      projects: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          description: string | null;
          color: string | null;
          user_id: string | null;
        };
      };
      profiles: {
          Row: {
            id: string;
            full_name: string | null;
            avatar_url: string | null;
            email: string | null;
          }
      };
      task_delegations: {
          Row: {
              // ...
          };
          Insert: {
              task_id: string;
              delegated_by_id?: string; // Para usar IDs no futuro
              delegated_to_id?: string;
              // Usando os campos de texto atuais
              delegated_by?: string;
              delegated_to?: string;
              status?: string;
              notes?: string | null;
          }
      }
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
};

// Nossos tipos de App, agora derivados da nossa definição manual e única
export type Project = Database['public']['Tables']['projects']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'] & {
    project?: Partial<Project>;
};