import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  EmailAccount,
  EmailMessage,
  EmailFolder,
  EmailConnectRequest,
  EmailConnectResponse,
  EmailListResponse,
  EmailSendRequest,
  EmailSendResponse,
  TaskEmailLink
} from '@/types/email';

// ==================== EMAIL ACCOUNTS ====================

export function useEmailAccounts() {
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: async (): Promise<EmailAccount[]> => {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as EmailAccount[];
    }
  });

  const connectMutation = useMutation({
    mutationFn: async (request: EmailConnectRequest): Promise<EmailConnectResponse> => {
      const { data, error } = await supabase.functions.invoke('email-connect', {
        body: request
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro ao conectar com o servidor');
      }
      
      // Check if the response indicates an error
      if (data && !data.success && data.error) {
        return { success: false, error: data.error };
      }
      
      return data as EmailConnectResponse;
    },
    onSuccess: (data) => {
      if (data.success && data.account) {
        queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
        toast.success('Conta de email conectada com sucesso!');
      }
    },
    onError: (error: Error) => {
      console.error('Connect mutation error:', error);
      toast.error(`Erro ao conectar conta: ${error.message}`);
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('email_accounts')
        .update({ is_active: false })
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      toast.success('Conta desconectada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desconectar conta: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      toast.success('Conta removida com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover conta: ${error.message}`);
    }
  });

  return {
    accounts,
    isLoading,
    error,
    connectAccount: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    disconnectAccount: disconnectMutation.mutateAsync,
    deleteAccount: deleteMutation.mutateAsync
  };
}

// ==================== EMAIL LIST ====================

interface UseEmailListOptions {
  accountId: string | undefined;
  folder?: EmailFolder;
  page?: number;
  limit?: number;
  search?: string;
  unreadOnly?: boolean;
  enabled?: boolean;
}

export function useEmailList({
  accountId,
  folder = 'inbox',
  page = 1,
  limit = 20,
  search,
  unreadOnly = false,
  enabled = true
}: UseEmailListOptions) {
  return useQuery({
    queryKey: ['emails', accountId, folder, page, limit, search, unreadOnly],
    queryFn: async (): Promise<EmailListResponse> => {
      if (!accountId) throw new Error('Account ID is required');

      const { data, error } = await supabase.functions.invoke('email-list', {
        body: {
          accountId,
          folder,
          page,
          limit,
          search,
          unreadOnly
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: enabled && !!accountId
  });
}

// ==================== EMAIL DETAIL ====================

interface UseEmailDetailOptions {
  accountId: string | undefined;
  messageId: string | undefined;
  enabled?: boolean;
}

export function useEmailDetail({ accountId, messageId, enabled = true }: UseEmailDetailOptions) {
  return useQuery({
    queryKey: ['email', accountId, messageId],
    queryFn: async () => {
      if (!accountId || !messageId) throw new Error('Account ID and Message ID are required');

      const { data, error } = await supabase.functions.invoke('email-read', {
        body: {
          accountId,
          messageId,
          markAsRead: true
        }
      });

      if (error) throw error;
      return data.email as EmailMessage;
    },
    enabled: enabled && !!accountId && !!messageId
  });
}

// ==================== SEND EMAIL ====================

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: EmailSendRequest): Promise<EmailSendResponse> => {
      const { data, error } = await supabase.functions.invoke('email-send', {
        body: request
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['emails', variables.accountId, 'sent'] });
        toast.success('Email enviado com sucesso!');
      } else if (data.error) {
        toast.error(data.error);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar email: ${error.message}`);
    }
  });
}

// ==================== TASK EMAIL LINKS ====================

export function useTaskEmailLink(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-email-link', taskId],
    queryFn: async (): Promise<TaskEmailLink | null> => {
      if (!taskId) return null;

      const { data, error } = await supabase
        .from('task_email_links')
        .select('*')
        .eq('task_id', taskId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
      return data as TaskEmailLink | null;
    },
    enabled: !!taskId
  });
}

export function useCreateTaskEmailLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (link: Omit<TaskEmailLink, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('task_email_links')
        .insert(link)
        .select()
        .single();

      if (error) throw error;
      return data as TaskEmailLink;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-email-link', data.task_id] });
    },
    onError: (error: Error) => {
      console.error('Error creating task email link:', error);
    }
  });
}
