// src/types/index.ts (VERSÃO FINAL E CORRIGIDA)

import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database as SupabaseDatabase } from './supabase';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// --- A CORREÇÃO PRINCIPAL ESTÁ AQUI ---
// 1. Exportamos o tipo Database COMPLETO, sem extrair 'public'.
export type Database = SupabaseDatabase;
// 2. Criamos um tipo auxiliar para o schema 'public'.
//    Todos os outros tipos neste arquivo usarão este 'PublicSchema'.
export type PublicSchema = Database['public'];
// --- FIM DA CORREÇÃO ---


// Filtros para tarefas
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
export type TaskCategory = PublicSchema['Tables']['task_categories']['Row'];
export type Task = PublicSchema['Tables']['tasks']['Row'];
export type Portfolio = PublicSchema['Tables']['portfolios']['Row'];
export type Project = PublicSchema['Tables']['projects']['Row'] & { portfolio_id?: string | null, team_id?: string | null, privacy?: string | null };
export type Profile = PublicSchema['Tables']['profiles']['Row'] & { push_token?: string | null };
export type Subtask = PublicSchema['Tables']['subtasks']['Row'];
export type TaskHistoryEntry = PublicSchema['Tables']['task_history']['Row'];
export type Team = PublicSchema['Tables']['teams']['Row'];
export type ProjectMember = PublicSchema['Tables']['project_members']['Row'];

export interface Permissoes {
  [key: string]: boolean | string | number;
}

export type ProfileWithPermissions = Omit<Profile, 'permissoes'> & {
  permissoes: Permissoes | null;
};

// Tipo para usuário autenticado com informações do perfil
export type AppUser = SupabaseUser & Partial<Profile>;
export type UserProfile = Profile;
export type User = Profile;

// Tipo para tarefa com detalhes adicionais
export type TaskWithDetails = Task & {
  assignee: Profile | null;
  project: Project | null;
  category: TaskCategory | null;
  subtasks?: SubtaskWithDetails[];
  comments?: Comment[];
  attachments?: Attachment[];
  subtasks_count?: number;
  completed_subtasks_count?: number;
};

// Tipo para subtarefa com detalhes adicionais
export type SubtaskWithDetails = Subtask & {
  assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  secondary_assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
};

// Tipo para comentários (mantido manualmente, pois pode ter lógica customizada)
export type Comment = {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
};

// Tipo para anexos (mantido manualmente)
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

// Tipos para atendimentos e pesquisas
export type Atendimento = {
  id: number;
  customer_name: string;
  issue: string;
  status: 'Solicitação' | 'Em Análise' | 'Resolvido';
  created_at: string;
};

export type Survey = {
  id: string;
  title: string;
  type: string;
  questions: any[];
  created_at: string;
};

export type SurveyResponse = {
  id: number;
  survey_id: string;
  customer_name: string;
  responses: any;
  created_at: string;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

// Tipos para inserção e atualização, agora usando 'PublicSchema'
export type TaskInsert = PublicSchema['Tables']['tasks']['Insert'];
export type TaskUpdate = PublicSchema['Tables']['tasks']['Update'];
export type SubtaskInsert = PublicSchema['Tables']['subtasks']['Insert'];