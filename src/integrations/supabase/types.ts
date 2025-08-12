// src/integrations/supabase/types.ts

// Este tipo é um utilitário para campos que podem conter JSON
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// A interface principal que espelha a estrutura do seu banco de dados
export interface Database {
  public: {
    Tables: {
      // Definição para a tabela 'profiles'
      profiles: {
        Row: { // Como os dados são retornados do DB
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
        }
        Insert: { // Como os dados são inseridos no DB
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Update: { // Como os dados são atualizados no DB
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
      }
      
      // Definição para a tabela 'tasks'
      tasks: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description: string | null
          status: string | null
          priority: string | null
          due_date: string | null
          project_id: string | null
          user_id: string | null
          assignee_id: string | null
          tags: string[] | null
          archived: boolean
          atendimento_id: number | null
          section: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          description?: string | null
          status?: string | null
          priority?: string | null
          due_date?: string | null
          project_id?: string | null
          user_id?: string | null
          assignee_id?: string | null
          tags?: string[] | null
          archived?: boolean
          atendimento_id?: number | null
          section?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          description?: string | null
          status?: string | null
          priority?: string | null
          due_date?: string | null
          project_id?: string | null
          user_id?: string | null
          assignee_id?: string | null
          tags?: string[] | null
          archived?: boolean
          atendimento_id?: number | null
          section?: string | null
        }
      }

      // Definição para a tabela 'comments'
      comments: {
        Row: {
          id: string
          created_at: string
          task_id: string
          user_id: string
          content: string
          author_name: string | null // Adicionamos a propriedade que faltava
        }
        Insert: {
          id?: string
          created_at?: string
          task_id: string
          user_id: string
          content: string
          author_name?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          task_id?: string
          user_id?: string
          content?: string
          author_name?: string | null
        }
      }

      // Adicione aqui definições para outras tabelas como 'projects', 'attachments', etc.
      // Exemplo para 'projects':
      projects: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          description: string | null
          color: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          description?: string | null
          color?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          description?: string | null
          color?: string | null
          user_id?: string | null
        }
      }
      
      // ... e assim por diante para todas as suas tabelas.
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// --- EXPORTAÇÕES DE TIPOS INDIVIDUAIS PARA FACILITAR O USO ---
// Isso resolve o erro "Module has no exported member 'Profile'".

// Extrai o tipo 'Row' da tabela 'profiles' e o exporta como 'Profile'.
export type Profile = Database['public']['Tables']['profiles']['Row'];

// Extrai o tipo 'Row' da tabela 'tasks' e o exporta como 'Task'.
export type Task = Database['public']['Tables']['tasks']['Row'] & {
  // Adicionamos campos que vêm de JOINs para não dar erro
  assignee_name?: string | null;
  assignee_avatar?: string | null;
  project?: Project | null;
};

// Extrai o tipo 'Row' da tabela 'comments' e o exporta como 'Comment'.
export type Comment = Database['public']['Tables']['comments']['Row'];

// Extrai o tipo 'Row' da tabela 'projects' e o exporta como 'Project'.
export type Project = Database['public']['Tables']['projects']['Row'];

// Você pode continuar exportando tipos para todas as suas tabelas aqui.
// Exemplo:
// export type Attachment = Database['public']['Tables']['attachments']['Row'];
// export type Notification = Database['public']['Tables']['notifications']['Row'];