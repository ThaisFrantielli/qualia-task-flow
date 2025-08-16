// src/types/index.ts (VERSÃO CORRETA E COMPLETA)

import type { User as SupabaseUser } from '@supabase/supabase-js';
// Importa a definição GERADA pelo Supabase. Verifique se o caminho './supabase' está correto.
import type { Database as SupabaseDatabase } from './supabase';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// O tipo Database agora aponta para a estrutura correta.
export type Database = SupabaseDatabase['public'];

// --- Este tipo estava faltando na exportação, causando o erro em useTasks.ts ---
export interface AllTaskFilters {
  searchTerm?: string;
  statusFilter?: 'all' | 'todo' | 'progress' | 'done' | 'late';
  priorityFilter?: 'all' | 'low' | 'medium' | 'high';
  assigneeFilter?: 'all' | string;
  projectFilter?: 'all' | string;
  tagFilter?: 'all' | string;
  archiveStatusFilter?: 'active' | 'archived' | 'all';
}

// --- Tipos base extraídos da definição correta ---
export type TaskCategory = Database['Tables']['task_categories']['Row'];
export type Task = Database['Tables']['tasks']['Row'];
export type Project = Database['Tables']['projects']['Row'];
export type Profile = Database['Tables']['profiles']['Row'];
export type Subtask = Database['Tables']['subtasks']['Row'];
export type TaskHistoryEntry = Database['Tables']['task_history']['Row'];

export interface Permissoes {
  [key: string]: boolean | string | number;
}

export type ProfileWithPermissions = Omit<Profile, 'permissoes'> & {
  permissoes: Permissoes | null;
};

// --- A correção para 'permissoes' está aqui ---
// O tipo AppUser agora usa Profile, que contém 'permissoes'.
export type AppUser = SupabaseUser & Partial<Profile>;
export type UserProfile = Profile;
export type User = Profile;

// --- A correção para assignee, project, category está aqui ---
// O tipo TaskWithDetails agora usa o tipo 'Task' correto e estende-o.
export type TaskWithDetails = Task & {
  assignee: Profile | null; // Removido '?' para corresponder à query que sempre os inclui
  project: Project | null;
  category: TaskCategory | null;
  subtasks?: SubtaskWithDetails[];
  comments?: Comment[];
  attachments?: Attachment[];
  subtasks_count?: number;
  completed_subtasks_count?: number;
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
  author_name: string | null;
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

export type TaskInsert = Database['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['Tables']['tasks']['Update'];
export type SubtaskInsert = Database['Tables']['subtasks']['Insert'];