// src/types/index.ts (VERSÃO FINAL E COMPLETA)

import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database as SupabaseDatabase } from './supabase'; // Caminho para os tipos gerados pelo Supabase

// --- Tipos Utilitários e de Base ---
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type PublicSchema = SupabaseDatabase['public'];
export type Database = SupabaseDatabase;

// --- Tipos de Usuário e Autenticação ---
export type Profile = PublicSchema['Tables']['profiles']['Row'];
export type UserProfile = Profile;
export type Team = PublicSchema['Tables']['teams']['Row'];
export type AppUser = SupabaseUser & Partial<Omit<Profile, 'id'>>;
export type User = Profile;

// --- Tipos de Tarefas e Projetos ---
export type Task = PublicSchema['Tables']['tasks']['Row'];
export type Project = PublicSchema['Tables']['projects']['Row'];
export type Portfolio = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  created_at: string | null;
  updated_at?: string;
};
export type Comment = PublicSchema['Tables']['comments']['Row'];
export type Subtask = {
  id: string;
  task_id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  assignee_id?: string | null;
  due_date?: string | null;
  priority?: 'low' | 'medium' | 'high' | string | null;
  status?: string | null;
  created_at: string;
  updated_at: string;
};
export type SubtaskWithDetails = Subtask & {
  assignee?: Profile;
};
export type TaskCategory = {
  id: string;
  name: string;
  color?: string;
};
export type Attachment = {
  id: string;
  filename: string;
  file_path: string;
  file_size?: number;
  created_at: string;
};
export type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
};
export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: string | null;
  created_at: string;
};
export type Survey = {
  id: string;
  title: string;
  description?: string;
  type?: string;
  questions: Json;
  created_at: string;
  updated_at: string;
};

// Tipos para inserção e atualização de dados
export type TaskInsert = PublicSchema['Tables']['tasks']['Insert'];
export type TaskUpdate = PublicSchema['Tables']['tasks']['Update'];

// Tipo "enriquecido" com dados de relacionamentos (JOINs)
export type TaskWithDetails = Task & {
  assignee: Profile | null;
  project: Project | null;
  subtasks?: Subtask[];
  comments?: Comment[];
  attachments?: Attachment[];
  category?: TaskCategory;
  subtasks_count?: number;
  completed_subtasks_count?: number;
};

// --- Tipos de CRM e Atendimento ---
export type Atendimento = PublicSchema['Tables']['atendimentos']['Row'];
export type Cliente = {
  id?: string;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

// Tipo para atendimento com os dados do cliente e do responsável (assignee) aninhados.
// Esta é a estrutura ideal para usar em componentes como AtendimentoCard.
export type AtendimentoComAssignee = Atendimento & {
  cliente: Cliente | null;
  assignee: Profile | null;
  summary?: string | null; // Usando summary ao invés de descricao
};

// Tipo para representar uma interação na timeline de um atendimento
export type Interaction = {
  id: number | string;
  author: string;
  date: string;
  text: string;
  type: 'cliente' | 'resposta_publica' | 'nota_interna';
};

// Tipo completo para a tela de detalhes do atendimento
export type AtendimentoDetail = Atendimento & {
  cliente: Cliente | null; // Reutilizando o tipo Cliente
  assignee: Profile | null; // Reutilizando o tipo Profile
  interactions: Interaction[];
  // Adicione outras relações se necessário
};

// --- Tipos específicos para operações de base de dados ---
export type SubtaskInsert = PublicSchema['Tables']['subtasks']['Insert'];
export type SubtaskUpdate = PublicSchema['Tables']['subtasks']['Update'];

// --- Tipos de Filtros ---
export interface AllTaskFilters {
  searchTerm?: string;
  status?: 'all' | string;
  priority?: 'all' | string;
  statusFilter?: 'all' | string;
  priorityFilter?: 'all' | string;
}

// --- Tipos Adicionais ---
export type Permissoes = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
  dashboard?: boolean;
  kanban?: boolean;
  tasks?: boolean;
  crm?: boolean;
  team?: boolean;
};