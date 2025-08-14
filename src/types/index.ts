// src/types/index.ts

import type { User as SupabaseUser } from '@supabase/supabase-js';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
          end_date?: string | null;
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
          end_date?: string | null;
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
          created_at: string;
          task_id: string;
          title: string;
          completed: boolean;
          description: string | null;
          assignee_id: string | null;
          due_date: string | null;
          priority: string | null;
          status: string;
          start_date: string | null;
          end_date: string | null;
          secondary_assignee_id: string | null;
        };
        Insert: {
          task_id: string;
          title: string;
          assignee_id?: string | null;
          due_date?: string | null;
          completed?: boolean;
          description?: string | null;
          priority?: 'low' | 'medium' | 'high' | null;
          secondary_assignee_id?: string | null;
        };
        Update: {
          title?: string;
          completed?: boolean;
          due_date?: string | null;
          status?: string;
          assignee_id?: string | null;
          secondary_assignee_id?: string | null;
          priority?: 'low' | 'medium' | 'high' | null;
          description?: string | null;
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

export type TaskWithDetails = Task & {
  assignee?: Profile | null;
  project?: Project | null;
  category?: TaskCategory | null;
  subtasks?: SubtaskWithDetails[];
  comments?: Comment[];
  attachments?: Attachment[];
};

export type SubtaskWithDetails = Subtask & {
  assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  secondary_assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
};

export type Comment = {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type Attachment = {
  id: string;
  task_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  content_type: string;
  uploaded_by: string;
  created_at: string;
};

// --- Tipos para Insert e Update ---
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
export type SubtaskInsert = Database['public']['Tables']['subtasks']['Insert'];