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
export type Task = PublicSchema['Tables']['tasks']['Row'];

// --- TIPOS COMPOSTOS (Enriquecidos com dados de outras tabelas) ---
export type ClienteComContatos = Cliente & {
  cliente_contatos: Contato[];
};
