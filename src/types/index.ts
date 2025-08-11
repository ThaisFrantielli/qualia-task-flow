// src/types/index.ts

// ===============================
// Definições do Banco de Dados
// ===============================

export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      // --- DEFINIÇÃO DA TABELA 'tasks' ---
      tasks: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          description: string | null;
          status: string | null;
          priority: string | null;
          due_date: string | null;
          project_id: string | null;
          user_id: string | null;
          assignee_id: string | null;
          section: string | null;
          atendimento_id: number | null;
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
      };
      
      // --- DEFINIÇÃO DA TABELA 'atendimentos' ---
      atendimentos: {
        Row: {
          id: number;
          created_at: string;
          updated_at: string;
          client_name: string | null;
          client_phone: string | null;
          client_email: string | null;
          status: 'Solicitação' | 'Em Análise' | 'Resolvido' | null;
          summary: string | null;
          initial_message: string | null;
          assignee_id: string | null;
          department: string | null;
          reason: string | null;
          license_plate: string | null;
          tipo_atendimento: string | null; // Coluna que adicionamos
          resolution_details: string | null;
          final_analysis: string | null;
          lead_source: string | null;
          contact_start_time: string | null;
          contact_end_time: string | null;
          proposal_sent_date: string | null;
          contract_signed_date: string | null;
          adjustment_index: string | null;
          notes: string | null;
          contact_person: string | null;
          first_response_at: string | null; 
          resolved_at: string | null;
        };
        Insert: {
            id?: number;
            client_name?: string | null;
            contact_person?: string | null;
            client_phone?: string | null;
            client_email?: string | null;
            status?: 'Solicitação' | 'Em Análise' | 'Resolvido' | null;
            summary?: string | null;
            initial_message?: string | null;
            assignee_id?: string | null;
            tipo_atendimento?: string | null; // Coluna que adicionamos
        };
        Update: {
            client_name?: string | null;
            status?: 'Solicitação' | 'Em Análise' | 'Resolvido' | null;
            summary?: string | null;
            assignee_id?: string | null;
            department?: string | null;
            reason?: string | null;
            tipo_atendimento?: string | null; // Coluna que adicionamos
            resolution_details?: string | null;
            final_analysis?: string | null;
            license_plate?: string | null;
        };
      };

      // --- OUTRAS DEFINIÇÕES DE TABELA (COMPLETAS) ---
      projects: { 
        Row: { id: string; name: string; description: string | null; color: string | null; created_at: string; updated_at: string; user_id: string | null; } 
      };
      profiles: { 
        Row: { id: string; full_name: string | null; avatar_url: string | null; email: string | null; funcao: string | null; nivelAcesso: 'Usuário' | 'Supervisão' | 'Gestão' | 'Admin' | null; permissoes: Json | null; } 
      };
      notifications: { 
        Row: { id: string; created_at: string; user_id: string; task_id: string | null; type: string; title: string; message: string; read: boolean; action_required: boolean | null; data: Json | null; } 
      };
      comments: { 
        Row: { id: string; created_at: string; task_id: string; user_id: string; content: string; } 
      };
      attachments: { 
        Row: { id: string; created_at: string; task_id: string; file_name: string; file_url: string; uploaded_by_id: string; } 
      };
      subtasks: { 
        Row: { id: string; created_at: string; task_id: string; title: string; completed: boolean; } 
      };
      task_delegations: { 
        Row: { task_id: string; delegated_by_id: string | null; delegated_to_id: string | null; delegated_by: string | null; delegated_to: string | null; status: string | null; notes: string | null; }, Insert: { /* ... */ } 
      };
      clients: {
        Row: {
          id: string; created_at: string; driver_added_by: 'client' | 'company' | null;
          driver_name: string | null; email: string | null; name: string;
          phone: string | null; vehicle_plate: string | null; whatsapp_qr_data: string | null;
        };
        Insert: { /* ... */ }; Update: { /* ... */ };
      };
      surveys: {
        Row: {
          id: string; created_at: string; type: 'comercial' | 'entrega' | 'manutencao' | 'devolucao';
          client_name: string; driver_name: string | null; license_plate: string | null;
          client_email: string | null; client_phone: string | null; sent_at: string | null;
          responded_at: string | null; created_by_id: string | null;
        };
        Insert: { /* ... */ };
      };
      survey_responses: {
        Row: {
          id: number; survey_id: string; created_at: string; csat_score: number | null;
          nps_score: number | null; influencing_factors: string[] | null;
          other_factor_text: string | null; feedback_comment: string | null;
        };
        Insert: { /* ... */ };
      };
    };
    Enums: { /* Adicione seus Enums se necessário */ };
    Views: { [_ in never]: never; };
    Functions: { [_ in never]: never; };
    CompositeTypes: { [_ in never]: never; };
  };
};

// ===============================
// Tipos de App (para uso no código)
// ===============================

// ESTA SEÇÃO AGORA FUNCIONARÁ, POIS TODAS AS TABELAS ACIMA ESTÃO DEFINIDAS CORRETAMENTE
export type Project = Database['public']['Tables']['projects']['Row'];
export type UserProfile = Database['public']['Tables']['profiles']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Atendimento = Database['public']['Tables']['atendimentos']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Survey = Database['public']['Tables']['surveys']['Row'];
export type SurveyResponse = Database['public']['Tables']['survey_responses']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
// Adicione outros tipos conforme necessário

// --- TIPOS "ENRIQUECIDOS" PARA QUERIES COM JOIN ---
export type TaskWithAssigneeProfile = Task & {
  assignee_name?: string | null;
  assignee_avatar?: string | null;
};

export type AtendimentoWithAssigneeProfile = Atendimento & {
  assignee_name?: string | null;
};