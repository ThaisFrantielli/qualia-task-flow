// src/types/index.ts

// Vamos definir a estrutura da 'Database' manualmente aqui.
// Isso substitui a necessidade de gerar tipos com a CLI do Supabase.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      // Definição completa da tabela 'tasks'
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
          assignee_id: string | null; // <-- A coluna que precisamos
          assignee_name: string | null;
          assignee_avatar: string | null;
          archived: boolean | null;
          tags: string | null;
          estimated_hours: number | null;
          start_date: string | null;
          end_date: string | null;
          delegated_by: string | null;
        };
        Insert: {
          // Tipos para criar uma nova tarefa
          id?: string;
          created_at?: string;
          updated_at?: string;
          title: string;
          description?: string | null;
          status?: string | null;
          priority?: string | null;
          due_date?: string | null;
          project_id?: string | null;
          user_id: string; // user_id é obrigatório na criação
          assignee_id?: string | null;
        };
        Update: {
          // Tipos para atualizar uma tarefa
          title?: string;
          description?: string | null;
          status?: string | null;
          priority?: string | null;
          due_date?: string | null;
          assignee_id?: string | null;
        };
      };
      // Defina outras tabelas aqui se precisar
      projects: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          description: string | null;
          color: string | null;
          user_id: string | null;
        };
      };
      profiles: {
          Row: {
            id: string;
            full_name: string | null;
            avatar_url: string | null;
            email: string | null;
          }
      }
      task_delegations: {
          Row: {
              // ...
              task_id: string;
              delegated_by_id: string | null;
              delegated_to_id: string | null;
              delegated_by: string | null;
              delegated_to: string | null;
              status: string | null;
              notes: string | null;
          };
          Insert: {
              task_id: string;
              delegated_by_id?: string | null;
              delegated_to_id?: string | null;
              delegated_by?: string | null;
              delegated_to?: string | null;
              status?: string | null;
              notes?: string | null;
          }
      }
      // Adicionando definições para subtasks, comments e attachments
      subtasks: {
        Row: {
          id: string;
          created_at: string;
          task_id: string;
          title: string;
          completed: boolean;
        };
      };
      comments: {
        Row: {
          id: string;
          created_at: string;
          task_id: string;
          user_id: string;
          content: string;
        };
      };
      attachments: {
        Row: {
          id: string;
          created_at: string;
          task_id: string;
          file_name: string;
          file_url: string;
          uploaded_by_id: string;
        };
      };
      // Adicionar a definição da tabela notifications
      notifications: {
        Row: {
          id: string;
          created_at: string; // Coluna de timestamp
          user_id: string; // Usuário que recebe a notificação
          task_id: string | null; // Opcional, se a notificação for sobre uma tarefa
          type: string; // Tipo da notificação (info, warning, success, error, etc.)
          title: string;
          message: string;
          read: boolean;
          action_required: boolean | null; // Verifique o nome exato da coluna no seu DB
          data: Json | null; // Coluna jsonb para dados adicionais
        };
        Insert: {
           id?: string;
           created_at?: string;
           user_id: string;
           task_id?: string | null;
           type: string;
           title: string;
           message: string;
           read?: boolean;
           action_required?: boolean | null;
           data?: Json | null;
        };
        Update: {
           user_id?: string;
           task_id?: string | null;
           type?: string;
           title?: string;
           message?: string;
           read?: boolean;
           action_required?: boolean | null;
           data?: Json | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
};

// ===============================
// Nossos Tipos de App (Derivados da Database e adicionando tipos de retorno de hooks, etc.)
// ===============================

export type Project = Database['public']['Tables']['projects']['Row'];
export type User = Database['public']['Tables']['profiles']['Row']; // Exportar o tipo User
// Atualizando o tipo Task para incluir as propriedades opcionais (JOINs)
export type Task = Database['public']['Tables']['tasks']['Row'] & {
    project?: Partial<Project>;
    subtasks?: Database['public']['Tables']['subtasks']['Row'][];
    comments?: Database['public']['Tables']['comments']['Row'][]; // Usar o tipo Comment
    attachments?: Database['public']['Tables']['attachments']['Row'][]; // Usar o tipo Attachment
};

// Tipo para uma linha da tabela de comentários
export type Comment = Database['public']['Tables']['comments']['Row'];
// Tipo para uma linha da tabela de anexos
export type Attachment = Database['public']['Tables']['attachments']['Row'];
// Tipo para uma linha da tabela de subtasks
export type Subtask = Database['public']['Tables']['subtasks']['Row'];

// Tipo para uma linha da tabela de notificações (usado no frontend)
// Usamos 'created_at' conforme o banco de dados
// Usamos 'action_required' conforme o banco de dados
export type Notification = Database['public']['Tables']['notifications']['Row'];

// Interface para o que o hook useNotifications deve retornar
export interface UseNotificationsReturn {
  notifications: Notification[]; // Array de notificações tipadas
  loading: boolean; // Estado de carregamento
  error: string | null; // Mensagem de erro ou null
  // Funções de ação tipadas (assumindo que são assíncronas)
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refetch: () => Promise<void>; // Função para recarregar notificações
  // unreadCount: number; // Opcional: pode ser calculado na página
  // createNotification: (notificationData: Database['public']['Tables']['notifications']['Insert']) => Promise<void>; // Incluído se o hook criar notificações
}

// ===============================
// Outros Tipos (Adicione aqui outros tipos globais se necessário)
// ===============================

// Exemplo: Tipo para o contexto de autenticação
// export interface AuthContextType {
//   user: User | null;
//   session: any | null; // Substituir any pelo tipo de sessão do Supabase
//   loading: boolean;
//   signIn: (credentials: any) => Promise<any>; // Ajustar tipos
//   signUp: (credentials: any) => Promise<any>; // Ajustar tipos
//   signOut: () => Promise<any>; // Ajustar tipos
// }
