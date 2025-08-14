// src/types/index.ts

import type { User as SupabaseUser } from '@supabase/supabase-js';

// =========================================================================
// PARTE 1: DEFINIÇÃO DO BANCO DE DADOS (COMPLETA E UNIFICADA)
// =========================================================================

export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      // --- NOVA TABELA ---
      task_categories: {
        Row: {
          id: string; name: string; description: string | null; color: string | null;
          created_by: string | null; created_at: string; default_title_prefix: string | null;
          default_description_template: string | null; default_priority: string | null;
          default_estimated_hours: number | null; default_subtasks: Json | null;
        };
        Insert: { /* ... */ }; Update: { /* ... */ };
      };
      // --- TABELAS EXISTENTES (AGORA INCLUÍDAS) ---
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
          id?: string; title: string; user_id?: string | null; status?: string;
          category_id?: string | null; description?: string | null; priority?: string;
          // ... adicione outros campos de Insert se necessário
        };
        Update: {
          id?: string; title?: string; description?: string | null; status?: string;
          priority?: string; due_date?: string | null; project_id?: string | null;
          assignee_id?: string | null; tags?: string | null; archived?: boolean;
          category_id?: string | null;
          // ... adicione outros campos de Update se necessário
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
      subtasks: {
        Row: {
          id: string; created_at: string; task_id: string; title: string;
          completed: boolean; description: string | null; assignee_id: string | null;
          due_date: string | null;
        };
        Insert: { /* ... */ }; Update: { /* ... */ };
      };
      // ... outras tabelas que você possa ter
    };
    // ... Enums, Functions, etc.
  };
};

// =========================================================================
// PARTE 2: EXPORTAÇÃO DE TIPOS SIMPLIFICADOS
// =========================================================================

// Tipos base
export type TaskCategory = Database['public']['Tables']['task_categories']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Subtask = Database['public']['Tables']['subtasks']['Row'];

// Interface de Permissões
export interface Permissoes {
  dashboard: boolean; kanban: boolean; tasks: boolean; projects: boolean;
  team: boolean; settings: boolean; crm: boolean;
}

// Tipo Profile aprimorado
export type ProfileWithPermissions = Omit<Profile, 'permissoes'> & {
  permissoes: Permissoes | null;
};

// Tipos de Usuário
export type AppUser = SupabaseUser & Partial<ProfileWithPermissions>;
export type UserProfile = ProfileWithPermissions;
export type User = ProfileWithPermissions;

// Tipos compostos "Enriquecidos"
export type TaskWithDetails = Task & {
  assignee?: Profile | null;
  project?: Project | null;
  category?: TaskCategory | null;
};

// Tipos para Insert e Update
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];