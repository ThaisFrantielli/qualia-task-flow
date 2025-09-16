// src/types/index.ts (VERSÃO FINAL E CORRETA)

import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database as SupabaseDatabase } from './supabase';

// --- Tipos Utilitários e de Base ---
export type Database = SupabaseDatabase;
export type PublicSchema = SupabaseDatabase['public'];

// --- Tipos de Usuário ---
export type Profile = PublicSchema['Tables']['profiles']['Row'];

// --- Tipos de CRM, Clientes e Atendimento ---
export type Cliente = PublicSchema['Tables']['clientes']['Row'];
export type Contato = PublicSchema['Tables']['cliente_contatos']['Row'];
export type Atendimento = PublicSchema['Tables']['atendimentos']['Row'];
export type Task = PublicSchema['Tables']['tasks']['Row'];

// --- TIPOS COMPOSTOS (Enriquecidos com dados de outras tabelas) ---
export type ClienteComContatos = Cliente & {
  cliente_contatos: Contato[];
};