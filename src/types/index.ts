// src/types/index.ts

import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database as SupabaseDatabase } from './supabase';

// --- Tipos Utilitários e de Base ---
export type Database = SupabaseDatabase;
export type PublicSchema = SupabaseDatabase['public'];

// --- Tipos de Usuário ---
export type Profile = PublicSchema['Tables']['profiles']['Row'];

// O tipo AppUser combina o usuário do Supabase com o perfil da sua aplicação
export type AppUser = SupabaseUser & Omit<Profile, 'permissoes'> & {
  permissoes?: Permissoes | null;
};

// Tipo para as permissões do usuário, pode ser expandido conforme necessário
export type Permissoes = {
  dashboard?: boolean;
  kanban?: boolean;
  tasks?: boolean;
  crm?: boolean;
  team?: boolean;
};

// --- Tipos de CRM, Clientes e Atendimento ---
export type Cliente = PublicSchema['Tables']['clientes']['Row'];
export type Contato = PublicSchema['Tables']['cliente_contatos']['Row'];
export type Atendimento = PublicSchema['Tables']['atendimentos']['Row'];

// Tipo estendido para atendimento com informações do assignee e cliente

export type Task = PublicSchema['Tables']['tasks']['Row'];

// --- TIPOS COMPOSTOS (Enriquecidos com dados de outras tabelas) ---
export type ClienteComContatos = Cliente & {
  cliente_contatos: Contato[];
};

// --- Tipos de Tarefas ---
export type TaskWithDetails = Task & {
  assignee?: Profile | null;
  user?: Profile | null;
  subtasks?: Subtask[];
  comments?: Comment[];
  attachments?: Attachment[];
  project?: Project | null;
  category?: TaskCategory | null;
};

export type TaskInsert = PublicSchema['Tables']['tasks']['Insert'];
export type TaskUpdate = PublicSchema['Tables']['tasks']['Update'];

// --- Tipos de Subtarefas ---
export type Subtask = PublicSchema['Tables']['subtasks']['Row'];
export type SubtaskWithDetails = Subtask & {
  assignee?: Profile | null;
  secondary_assignee?: Profile | null;
};

// --- Tipos de Projetos ---
export type Project = PublicSchema['Tables']['projects']['Row'];
export type Portfolio = PublicSchema['Tables']['portfolios']['Row'];
export type ProjectMember = PublicSchema['Tables']['project_members']['Row'];

// --- Tipos de Atendimentos ---
export type AtendimentoComAssignee = Atendimento & {
  assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  cliente?: Pick<Cliente, 'id' | 'nome_fantasia' | 'razao_social'> & {
    nome?: string;
  } | null;
  onUpdate?: () => void; // Função opcional para atualização do UI quando o atendimento é modificado
};

export type AtendimentoDetail = Atendimento & {
  assignee?: Profile | null;
  interactions?: Interaction[];
};

export type Interaction = {
  id: string;
  type: 'comment' | 'status_change' | 'note';
  content: string;
  created_at: string;
  user?: Profile;
};

// --- Tipos de Comentários ---
export type Comment = PublicSchema['Tables']['comments']['Row'];

// --- Tipos de Anexos ---
export type Attachment = PublicSchema['Tables']['attachments']['Row'];

// --- Tipos de Notificações ---
export type Notification = PublicSchema['Tables']['notifications']['Row'];

// --- Tipos de Categorias ---
export type TaskCategory = PublicSchema['Tables']['task_categories']['Row'];

// --- Tipos de Equipes ---
export type Team = PublicSchema['Tables']['teams']['Row'];

// --- Tipos de Usuários ---
export type User = Profile;
export type UserProfile = Profile;

// --- Tipos de Pesquisas ---
export type Survey = PublicSchema['Tables']['surveys']['Row'];

// --- Tipos de Filtros ---
export type AllTaskFilters = {
  search?: string;
  status?: string[];
  priority?: string[];
  assignee?: string[];
  project?: string[];
  category?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
};
