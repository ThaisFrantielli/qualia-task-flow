// src/types/index.ts

import type { User as SupabaseUser } from '@supabase/supabase-js';

export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Interface de filtros que será usada em Tasks.tsx
export interface AllTaskFilters {
  searchTerm?: string; 
  statusFilter?: 'all' | 'todo' | 'progress' | 'done' | 'late';
  priorityFilter?: 'all' | 'low' | 'medium' | 'high'; 
  assigneeFilter?: 'all' | string;
  projectFilter?: 'all' | string; 
  tagFilter?: 'all' | string;
  archiveStatusFilter?: 'active' | 'archived' | 'all';
}

export type Database = {
  public: {
    Tables: {
      task_categories: {
        Row: {
          id: string;
          name: string;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string; 
          created_at: string; 
          updated_at: string; 
          title: string;
          description: string | null; 
          status: string; 
          priority: string;
          due_date: string | null; 
          start_date: string | null; 
          end_date: string | null;
          project_id: string | null; 
          user_id: string | null; 
          assignee_id: string | null;
          section: string | null; 
          atendimento_id: number | null; 
          archived: boolean;
          tags: string | null; 
          estimated_hours: number | null; 
          assignee_name: string | null;
          assignee_avatar: string | null; 
          delegated_by: string | null; 
          category_id: string | null;
        };
        Insert: {
          id?: string; 
          title: string; 
          description?: string | null; 
          status?: string;
          priority?: string; 
          due_date?: string | null; 
          user_id?: string | null;
          project_id?: string | null; 
          category_id?: string | null; 
          start_date?: string | null;
          estimated_hours?: number | null; 
          tags?: string | null; 
          assignee_id?: string | null;
        };
        Update: {
          id?: string; 
          title?: string; 
          description?: string | null; 
          status?: string;
          priority?: string; 
          due_date?: string | null; 
          project_id?: string | null;
          assignee_id?: string | null; 
          tags?: string | null; 
          archived?: boolean;
          category_id?: string | null; 
          start_date?: string | null; 
          estimated_hours?: number | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          permissoes: Json | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          permissoes?: Json | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          permissoes?: Json | null;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          user_id?: string | null;
        };
      };
      subtasks: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          completed?: boolean;
        };
        Update: {
          id?: string;
          task_id?: string;
          title?: string;
          completed?: boolean;
        };
      };
    };
  };
};

// --- Tipos Base ---
export type TaskCategory = Database['public']['Tables']['task_categories']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Subtask = Database['public']['Tables']['subtasks']['Row'];

// --- Tipos Compostos e de Usuário ---
export interface Permissoes {
  [key: string]: boolean | string | number;
}

export type ProfileWithPermissions = Omit<Profile, 'permissoes'> & { 
  permissoes: Permissoes | null; 
};

export type AppUser = SupabaseUser & Partial<ProfileWithPermissions>;
export type UserProfile = ProfileWithPermissions;
export type User = ProfileWithPermissions;

// --- A CORREÇÃO PRINCIPAL ESTÁ AQUI ---
export type TaskWithDetails = Task & {
  assignee?: Profile | null;
  project?: Project | null;
  category?: TaskCategory | null; // <-- Propriedade que estava faltando
  // O TypeScript pode inferir subtasks e comments dos joins, mas ser explícito é mais seguro
  subtasks?: Subtask[]; 
  comments?: Comment[]; // Adicione Comment se não estiver definido
};

// Adicione o tipo Comment se ele não existir
export type Comment = {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

// --- Tipos para Insert e Update ---
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];