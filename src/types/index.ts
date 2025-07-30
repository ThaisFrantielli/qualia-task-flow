// src/types/index.ts

// ===============================
// Definições do Banco de Dados (Estrutura Bruta)
// ===============================

// Tipo genérico para colunas JSONB
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Definição completa da estrutura do seu banco de dados
export type Database = {
  public: {
    Tables: {
      // Tabela 'tasks'
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
          assignee_name: string | null;
          assignee_avatar: string | null;
          archived: boolean | null;
          tags: string | null;
          estimated_hours: number | null;
          start_date: string | null;
          end_date: string | null;
          delegated_by: string | null;
          section: string | null;
          atendimento_id: number | null;
        };
        Insert: { /* Adicione os campos de inserção se necessário */ };
        Update: { /* Adicione os campos de atualização se necessário */ };
      };

      // Tabela 'atendimentos'
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
          department?: string | null;
          reason?: string | null;
        };
        Update: {
          client_name?: string | null;
          status?: 'Solicitação' | 'Em Análise' | 'Resolvido' | null;
          summary?: string | null;
          assignee_id?: string | null;
          department?: string | null;
          reason?: string | null;
          resolution_details?: string | null;
          final_analysis?: string | null;
        };
      };

      // Outras tabelas...
      projects: { Row: { id: string; name: string; description: string | null; color: string | null; created_at: string; updated_at: string; user_id: string | null; } };
      profiles: { Row: { id: string; full_name: string | null; avatar_url: string | null; email: string | null; funcao: string | null; nivelAcesso: 'Usuário' | 'Supervisão' | 'Gestão' | 'Admin' | null; permissoes: Json | null; } };
      notifications: { Row: { id: string; created_at: string; user_id: string; task_id: string | null; type: string; title: string; message: string; read: boolean; action_required: boolean | null; data: Json | null; } };
      comments: { Row: { id: string; created_at: string; task_id: string; user_id: string; content: string; } };
      attachments: { Row: { id: string; created_at: string; task_id: string; file_name: string; file_url: string; uploaded_by_id: string; } };
      subtasks: { Row: { id: string; created_at: string; task_id: string; title: string; completed: boolean; } };
      task_delegations: { Row: { task_id: string; delegated_by_id: string | null; delegated_to_id: string | null; delegated_by: string | null; delegated_to: string | null; status: string | null; notes: string | null; }, Insert: { /* ... */ } };
    };
    Views: { [_ in never]: never; };
    Functions: { [_ in never]: never; };
  };
};

// ===============================
// Tipos de App (Tipos Limpos para Uso na Aplicação)
// ===============================

export type Project = Database['public']['Tables']['projects']['Row'];
export type UserProfile = Database['public']['Tables']['profiles']['Row'];

export type Task = Database['public']['Tables']['tasks']['Row'] & {
    project?: Partial<Project>;
    subtasks?: Database['public']['Tables']['subtasks']['Row'][];
    comments?: Database['public']['Tables']['comments']['Row'][];
    attachments?: Database['public']['Tables']['attachments']['Row'][];
    assignee?: Partial<UserProfile>;
};

export type Atendimento = Database['public']['Tables']['atendimentos']['Row'] & {
  assignee_name?: string | null;
};

export type Comment = Database['public']['Tables']['comments']['Row'];
export type Attachment = Database['public']['Tables']['attachments']['Row'];
export type Subtask = Database['public']['Tables']['subtasks']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

// ===============================
// Tipos para Hooks
// ===============================

export interface UseNotificationsReturn {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refetch: () => Promise<void>;
}