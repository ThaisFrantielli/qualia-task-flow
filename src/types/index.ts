// src/types/index.ts

import type { User as SupabaseUser } from '@supabase/supabase-js';

// =========================================================================
// PARTE 1: DEFINIÇÃO DO BANCO DE DADOS (COMPLETA)
// =========================================================================

export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      task_categories: {
        Row: {
          id: string; name: string; description: string | null; color: string | null;
          created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; name: string; description?: string | null; color?: string | null;
          created_by?: string | null; created_at?: string;
        };
        Update: {
          id?: string; name?: string; description?: string | null; color?: string | null;
          created_by?: string | null; created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string; created_at: string; updated_at: string; title: string;
          description: string | null; status: string; priority: string;
          due_date: string | null; start_date: string | null; end_date: string | null;
          project_id: string | null; user_id: string | null; assignee_id: string | null;
          section: string | null; atendimento_id: number | null; archived: boolean;
          tags: string | null; estimated_hours: number | null; assignee_name: string | null;
          assignee_avatar: string | null; delegated_by: string | null;
          category_id: string | null;
        };
        Insert: {
          id?: string; created_at?: string; updated_at?: string; title: string;
          description?: string | null; status?: string; priority?: string;
          due_date?: string | null; start_date?: string | null; end_date?: string | null;
          project_id?: string | null; user_id?: string | null; assignee_id?: string | null;
          section?: string | null; atendimento_id?: number | null; archived?: boolean;
          tags?: string | null; estimated_hours?: number | null; assignee_name?: string | null;
          assignee_avatar?: string | null; delegated_by?: string | null;
          category_id?: string | null;
        };
        Update: {
          id?: string; created_at?: string; updated_at?: string; title?: string;
          description?: string | null; status?: string; priority?: string;
          due_date?: string | null; start_date?: string | null; end_date?: string | null;
          project_id?: string | null; user_id?: string | null; assignee_id?: string | null;
          section?: string | null; atendimento_id?: number | null; archived?: boolean;
          tags?: string | null; estimated_hours?: number | null; assignee_name?: string | null;
          assignee_avatar?: string | null; delegated_by?: string | null;
          category_id?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string; avatar_url: string | null; email: string | null; full_name: string | null;
          funcao: string | null; nivelAcesso: 'Usuário' | 'Supervisão' | 'Gestão' | 'Admin' | null;
          permissoes: Json | null; role: string;
        };
        Insert: { /* ... */ }; Update: { /* ... */ };
      };
      projects: {
        Row: {
          id: string; created_at: string; updated_at: string; name: string;
          description: string | null; color: string | null; user_id: string | null;
        };
        Insert: { /* ... */ }; Update: { /* ... */ };
      };
      // ... adicione outras tabelas aqui se estiverem faltando
    };
    // ...
  };
};

// =========================================================================
// PARTE 2: EXPORTAÇÃO DE TIPOS SIMPLIFICADOS
// =========================================================================

export type TaskCategory = Database['public']['Tables']['task_categories']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];

export interface Permissoes {
  dashboard: boolean; kanban: boolean; tasks: boolean; projects: boolean;
  team: boolean; settings: boolean; crm: boolean;
}

export type Profile = Omit<Database['public']['Tables']['profiles']['Row'], 'permissoes'> & {
  permissoes: Permissoes | null;
};

export type AppUser = SupabaseUser & Partial<Profile>;
export type UserProfile = Profile;
export type User = Profile;

export type TaskWithDetails = Task & {
  assignee?: Profile | null;
  project?: Project | null;
  category?: TaskCategory | null;
  // Adicione subtasks, comments, attachments se precisar deles
};

export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];