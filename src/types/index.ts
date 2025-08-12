// src/types/index.ts

// =========================================================================
// PARTE 1: DEFINIÇÃO DO BANCO DE DADOS GERADA PELO SUPABASE
// Esta é a fonte da verdade para a estrutura do seu banco de dados.
// Mantemos esta seção exatamente como o Supabase a gera.
// =========================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
          status: 'todo' | 'progress' | 'done' | 'late' | null;
          priority: 'low' | 'medium' | 'high' | null;
          due_date: string | null;
          start_date: string | null;
          end_date: string | null;
          project_id: string | null;
          user_id: string | null;
          assignee_id: string | null;
          section: string | null;
          atendimento_id: number | null;
          archived: boolean | null;
          tags: string | null;
          estimated_hours: number | null;
          assignee_name: string | null;
          assignee_avatar: string | null;
          delegated_by: string | null;
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
      };
      
      // --- DEFINIÇÃO DA TABELA 'atendimentos' ---
      atendimentos: {
        Row: {
          adjustment_index: string | null;
          assignee_id: string | null;
          client_email: string | null;
          client_name: string | null;
          client_phone: string | null;
          contact_end_time: string | null;
          contact_person: string | null;
          contact_start_time: string | null;
          contract_signed_date: string | null;
          created_at: string;
          department: Database["public"]["Enums"]["tipo_departamento"] | null;
          final_analysis: Database["public"]["Enums"]["tipo_analise_final"] | null;
          first_response_at: string | null;
          id: number;
          initial_message: string | null;
          lead_source: Database["public"]["Enums"]["tipo_origem_lead"] | null;
          license_plate: string | null;
          notes: string | null;
          proposal_sent_date: string | null;
          reason: Database["public"]["Enums"]["tipo_motivo_reclamacao"] | null;
          resolution_details: string | null;
          resolved_at: string | null;
          status: Database["public"]["Enums"]["tipo_status_atendimento"] | null;
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          // ... (seções Insert e Update podem ser omitidas para simplicidade se não usadas diretamente)
        };
        Update: {
          // ...
        };
        Relationships: [
          {
            foreignKeyName: "atendimentos_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      attachments: {
        Row: {
          created_at: string;
          file_path: string;
          file_size: number | null;
          filename: string;
          id: string;
          task_id: string;
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
        Relationships: [
          {
            foreignKeyName: "attachments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          }
        ];
      };
      comments: { 
        Row: { id: string; created_at: string; task_id: string; user_id: string | null; content: string; author_name: string; } 
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
      comments: {
        Row: {
          author_name: string; // <-- A propriedade que faltava agora está aqui!
          content: string;
          created_at: string;
          id: string;
          task_id: string;
          user_id: string; // Adicionando user_id que também pode ser útil
        };
        Insert: {
          author_name: string;
          content: string;
          created_at?: string;
          id?: string;
          task_id: string;
          user_id: string;
        };
        Update: { /* ... */ };
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey"; // Supondo que exista esta relação
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          data: Json | null;
          id: string;
          message: string;
          read: boolean;
          task_id: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
        Relationships: [ /* ... */ ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          email: string | null;
          full_name: string | null; // <-- Propriedade que o MentionComments precisa
          funcao: string | null;
          id: string;
          nivelAcesso: string | null;
          permissoes: Json | null;
          role: string;
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
        Relationships: [];
      };
      projects: {
        Row: {
          color: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
        Relationships: [];
      };
      tasks: {
        Row: {
          archived: boolean;
          assignee_avatar: string | null;
          assignee_id: string | null;
          assignee_name: string | null;
          atendimento_id: number | null;
          created_at: string;
          delegated_by: string | null;
          description: string | null;
          due_date: string | null;
          end_date: string | null;
          estimated_hours: number | null;
          id: string;
          priority: string;
          project_id: string | null;
          section: string | null;
          start_date: string | null;
          status: string;
          tags: string | null;
          title: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
        Relationships: [ /* ... */ ];
      };
      // ... (outras tabelas como subtasks, task_history, etc. já estavam no seu arquivo e devem ser mantidas)
      subtasks: { Row: { id: string; title: string; completed: boolean; task_id: string; created_at: string; description: string | null; }; Insert: { /*...*/ }; Update: { /*...*/ }; Relationships: [ /*...*/ ]; };
      task_history: { Row: { id: string; task_id: string; user_id: string | null; action: string; field_changed: string | null; old_value: string | null; new_value: string | null; created_at: string; user_name: string; }; Insert: { /*...*/ }; Update: { /*...*/ }; Relationships: [ /*...*/ ]; };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      survey_type: "comercial" | "entrega" | "manutencao" | "devolucao";
      tipo_analise_final: "Procedente" | "Improcedente" | "Dúvida";
      tipo_departamento: string;
      tipo_motivo_reclamacao: string;
      tipo_origem_lead: string;
      tipo_status_atendimento: "Solicitação" | "Em Análise" | "Resolvido";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// =========================================================================
// PARTE 2: EXPORTAÇÃO DE TIPOS SIMPLIFICADOS PARA O APLICATIVO
// Aqui criamos e exportamos os tipos que os componentes realmente usarão.
// Isso resolve todos os erros "Module has no exported member".
// =========================================================================

// Tipos básicos extraídos diretamente das tabelas do banco de dados
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type UserProfile = Database['public']['Tables']['profiles']['Row'];
export type Attachment = Database['public']['Tables']['attachments']['Row'];
export type Subtask = Database['public']['Tables']['subtasks']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'] & {
  project?: Project | null;
  assignee?: UserProfile | null;
  comments?: Comment[];
  attachments?: Attachment[];
  subtasks?: Subtask[];
};
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Atendimento = Database['public']['Tables']['atendimentos']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Survey = Database['public']['Tables']['surveys']['Row'];
export type SurveyResponse = Database['public']['Tables']['survey_responses']['Row'];
// Alias para compatibilidade com componentes
export type Profile = UserProfile;
export type User = UserProfile;
// Adicione outros tipos conforme necessário

// --- TIPOS "ENRIQUECIDOS" PARA QUERIES COM JOIN ---
export type TaskWithAssigneeProfile = Task & {
  assignee_name?: string | null;
  assignee_avatar?: string | null;
// Adicione outros tipos básicos conforme necessário
export type Subtask = Database['public']['Tables']['subtasks']['Row'];
export type Attachment = Database['public']['Tables']['attachments']['Row'];

// Tipos "Enriquecidos" que podem incluir dados de JOINs
export type TaskWithDetails = Task & {
  assignee?: Profile | null;
  project?: Project | null;
  comments?: Comment[];
  subtasks?: Subtask[];
  attachments?: Attachment[];
};

export type AtendimentoWithDetails = Atendimento & {
    assignee?: Profile | null;
};