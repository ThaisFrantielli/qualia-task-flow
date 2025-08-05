// src/types/index.ts

// ===============================
// Definições do Banco de Dados
// ===============================

export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      // Suas tabelas existentes...
      tasks: { Row: { id: string; /* ...outras colunas... */ } };
      atendimentos: { Row: { id: number; /* ...outras colunas... */ } };
      projects: { Row: { id: string; /* ...outras colunas... */ } };
      profiles: { Row: { id: string; /* ...outras colunas... */ } };
      notifications: { Row: { id: string; /* ...outras colunas... */ } };
      comments: { Row: { id: string; /* ...outras colunas... */ } };
      attachments: { Row: { id: string; /* ...outras colunas... */ } };
      subtasks: { Row: { id: string; /* ...outras colunas... */ } };
      task_delegations: { Row: { /* ... */ }, Insert: { /* ... */ } };

      // --- NOVAS TABELAS DO SISTEMA DE PESQUISAS ---
      clients: {
        Row: {
          id: string;
          created_at: string;
          driver_added_by: 'client' | 'company' | null;
          driver_name: string | null;
          email: string | null;
          name: string;
          phone: string | null;
          vehicle_plate: string | null;
          whatsapp_qr_data: string | null;
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
      };
      
      survey_responses: {
        Row: {
          id: string; // UUID
          created_at: string;
          updated_at: string;
          survey_type: 'contract' | 'delivery' | 'maintenance' | 'return';
          customer_name: string;
          customer_email: string | null;
          customer_phone: string | null;
          vehicle_plate: string | null;
          responses: Json; // Armazena as respostas como CSAT, NPS, etc.
        };
        Insert: {
          id?: string;
          survey_type: 'contract' | 'delivery' | 'maintenance' | 'return';
          customer_name: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          vehicle_plate?: string | null;
          responses: Json;
        };
        Update: { /* ... */ };
      };
      // --- FIM DA ADIÇÃO ---
    };
    Enums: {
        driver_added_by: "client" | "company";
        survey_type: "contract" | "delivery" | "maintenance" | "return";
    };
    Views: { [_ in never]: never; };
    Functions: { [_ in never]: never; };
    CompositeTypes: { [_ in never]: never; };
  };
};

// ===============================
// Tipos de App (para uso no código)
// ===============================

export type Project = Database['public']['Tables']['projects']['Row'];
export type UserProfile = Database['public']['Tables']['profiles']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Atendimento = Database['public']['Tables']['atendimentos']['Row'];

// --- NOVOS TIPOS DE APP PARA O MÓDULO DE PESQUISAS ---
export type Client = Database['public']['Tables']['clients']['Row'];
export type SurveyResponse = Database['public']['Tables']['survey_responses']['Row'];
// ----------------------------------------------------

export type Comment = Database['public']['Tables']['comments']['Row'];
// ... (seus outros tipos de app)