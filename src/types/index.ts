// src/types/index.ts (VERSÃO FINAL E COMPLETA)

import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database as SupabaseDatabase } from './supabase'; // Caminho para os tipos gerados pelo Supabase

// --- Tipos Utilitários e de Base ---
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type PublicSchema = SupabaseDatabase['public'];

// --- Tipos de Usuário e Autenticação ---
export type Profile = PublicSchema['Tables']['profiles']['Row'];
export type Team = PublicSchema['Tables']['teams']['Row'];
export type AppUser = SupabaseUser & Omit<Profile, 'id'>;

// --- Tipos de Tarefas e Projetos ---
export type Task = PublicSchema['Tables']['tasks']['Row'];
export type Project = PublicSchema['Tables']['projects']['Row'];
export type Comment = PublicSchema['Tables']['comments']['Row'];
// Adicione outros tipos de tarefas/projetos aqui conforme necessário

// Tipos para inserção e atualização de dados
export type TaskInsert = PublicSchema['Tables']['tasks']['Insert'];
export type TaskUpdate = PublicSchema['Tables']['tasks']['Update'];

// Tipo "enriquecido" com dados de relacionamentos (JOINs)
export type TaskWithDetails = Task & {
  assignee: Profile | null;
  project: Project | null;
  // Adicione outras relações aqui
};

// --- Tipos de CRM e Atendimento ---
export type Atendimento = PublicSchema['Tables']['atendimentos']['Row'];
export type Cliente = PublicSchema['Tables']['clientes']['Row']; // Adicionada exportação para uso global

// Tipo para atendimento com os dados do cliente e do responsável (assignee) aninhados.
// Esta é a estrutura ideal para usar em componentes como AtendimentoCard.
export type AtendimentoComAssignee = Atendimento & {
  cliente: Cliente | null;
  assignee: Profile | null;
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

// --- Tipos de Filtros ---
export interface AllTaskFilters {
  searchTerm?: string;
  status?: 'all' | string;
  priority?: 'all' | string;
}