import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  TicketOrigem,
  TicketAnaliseFinal,
  TicketMotivo,
  TicketDepartamentoOpcao,
  TicketCustomFieldDefinition,
  TicketConfigAuditLog,
} from '@/types/ticket-options';
import { toast } from 'sonner';

// =========================================
// Origens
// =========================================
export function useTicketOrigens() {
  return useQuery({
    queryKey: ['ticket-origens'],
    queryFn: async (): Promise<TicketOrigem[]> => {
      const { data, error } = await supabase
        .from('ticket_origens')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  });
}

export function useAllTicketOrigens() {
  return useQuery({
    queryKey: ['ticket-origens-all'],
    queryFn: async (): Promise<TicketOrigem[]> => {
      const { data, error } = await supabase
        .from('ticket_origens')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  });
}

export function useCreateTicketOrigem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (origem: Partial<TicketOrigem>) => {
      const { data, error } = await supabase
        .from('ticket_origens')
        .insert(origem)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-origens'] });
      toast.success('Origem criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar origem: ' + error.message);
    }
  });
}

export function useUpdateTicketOrigem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...origem }: Partial<TicketOrigem> & { id: string }) => {
      const { data, error } = await supabase
        .from('ticket_origens')
        .update(origem)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-origens'] });
      toast.success('Origem atualizada!');
    }
  });
}

export function useDeleteTicketOrigem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_origens')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-origens'] });
      toast.success('Origem removida!');
    }
  });
}

// =========================================
// Análises Finais
// =========================================
export function useTicketAnalises() {
  return useQuery({
    queryKey: ['ticket-analises'],
    queryFn: async (): Promise<TicketAnaliseFinal[]> => {
      const { data, error } = await supabase
        .from('ticket_analises_finais')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  });
}

export function useAllTicketAnalises() {
  return useQuery({
    queryKey: ['ticket-analises-all'],
    queryFn: async (): Promise<TicketAnaliseFinal[]> => {
      const { data, error } = await supabase
        .from('ticket_analises_finais')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  });
}

export function useCreateTicketAnalise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (analise: Partial<TicketAnaliseFinal>) => {
      const { data, error } = await supabase
        .from('ticket_analises_finais')
        .insert(analise)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-analises'] });
      toast.success('Análise criada com sucesso!');
    }
  });
}

export function useUpdateTicketAnalise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...analise }: Partial<TicketAnaliseFinal> & { id: string }) => {
      const { data, error } = await supabase
        .from('ticket_analises_finais')
        .update(analise)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-analises'] });
      toast.success('Análise atualizada!');
    }
  });
}

export function useDeleteTicketAnalise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_analises_finais')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-analises'] });
      toast.success('Análise removida!');
    }
  });
}

// =========================================
// Motivos
// =========================================
export function useTicketMotivos() {
  return useQuery({
    queryKey: ['ticket-motivos'],
    queryFn: async (): Promise<TicketMotivo[]> => {
      const { data, error } = await supabase
        .from('ticket_motivos')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  });
}

export function useAllTicketMotivos() {
  return useQuery({
    queryKey: ['ticket-motivos-all'],
    queryFn: async (): Promise<TicketMotivo[]> => {
      const { data, error } = await supabase
        .from('ticket_motivos')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  });
}

export function useCreateTicketMotivo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (motivo: Partial<TicketMotivo>) => {
      const { data, error } = await supabase
        .from('ticket_motivos')
        .insert(motivo)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-motivos'] });
      toast.success('Motivo criado com sucesso!');
    }
  });
}

export function useUpdateTicketMotivo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...motivo }: Partial<TicketMotivo> & { id: string }) => {
      const { data, error } = await supabase
        .from('ticket_motivos')
        .update(motivo)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-motivos'] });
      toast.success('Motivo atualizado!');
    }
  });
}

export function useDeleteTicketMotivo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_motivos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-motivos'] });
      toast.success('Motivo removido!');
    }
  });
}

// =========================================
// Departamentos (catalogo configuravel)
// =========================================
export function useTicketDepartamentos() {
  return useQuery({
    queryKey: ['ticket-departamentos'],
    queryFn: async (): Promise<TicketDepartamentoOpcao[]> => {
      const { data, error } = await supabase
        .from('ticket_departamento_opcoes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    }
  });
}

export function useAllTicketDepartamentos() {
  return useQuery({
    queryKey: ['ticket-departamentos-all'],
    queryFn: async (): Promise<TicketDepartamentoOpcao[]> => {
      const { data, error } = await supabase
        .from('ticket_departamento_opcoes')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return data || [];
    }
  });
}

export function useCreateTicketDepartamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Partial<TicketDepartamentoOpcao>) => {
      const { data, error } = await supabase
        .from('ticket_departamento_opcoes')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-departamentos'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-departamentos-all'] });
      toast.success('Departamento criado com sucesso!');
    }
  });
}

export function useUpdateTicketDepartamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...item }: Partial<TicketDepartamentoOpcao> & { id: string }) => {
      const { data, error } = await supabase
        .from('ticket_departamento_opcoes')
        .update(item)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-departamentos'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-departamentos-all'] });
      toast.success('Departamento atualizado!');
    }
  });
}

export function useDeleteTicketDepartamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_departamento_opcoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-departamentos'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-departamentos-all'] });
      toast.success('Departamento removido!');
    }
  });
}

// =========================================
// Campos customizados de ticket
// =========================================
export function useTicketCustomFields() {
  return useQuery({
    queryKey: ['ticket-custom-fields'],
    queryFn: async (): Promise<TicketCustomFieldDefinition[]> => {
      const { data, error } = await supabase
        .from('ticket_custom_field_definitions')
        .select('*')
        .eq('entity', 'ticket')
        .order('sort_order');

      if (error) throw error;
      return data || [];
    }
  });
}

export function useCreateTicketCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (field: Partial<TicketCustomFieldDefinition>) => {
      const { data, error } = await supabase
        .from('ticket_custom_field_definitions')
        .insert(field)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-custom-fields'] });
      toast.success('Campo customizado criado!');
    }
  });
}

export function useUpdateTicketCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...field }: Partial<TicketCustomFieldDefinition> & { id: string }) => {
      const { data, error } = await supabase
        .from('ticket_custom_field_definitions')
        .update(field)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-custom-fields'] });
      toast.success('Campo customizado atualizado!');
    }
  });
}

export function useDeleteTicketCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_custom_field_definitions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-custom-fields'] });
      toast.success('Campo customizado removido!');
    }
  });
}

// =========================================
// Auditoria de configuracoes de ticket
// =========================================
interface TicketConfigAuditFilters {
  action?: 'ALL' | 'INSERT' | 'UPDATE' | 'DELETE';
  tableName?: string;
  changedBy?: string;
  limit?: number;
}

export function useTicketConfigAuditLogs(filters?: TicketConfigAuditFilters) {
  return useQuery({
    queryKey: ['ticket-config-audit-log', filters],
    queryFn: async (): Promise<TicketConfigAuditLog[]> => {
      let query = supabase
        .from('ticket_config_audit_log')
        .select('*')
        .order('changed_at', { ascending: false });

      if (filters?.action && filters.action !== 'ALL') {
        query = query.eq('action', filters.action);
      }

      if (filters?.tableName && filters.tableName !== 'all') {
        query = query.eq('table_name', filters.tableName);
      }

      if (filters?.changedBy && filters.changedBy !== 'all') {
        query = query.eq('changed_by', filters.changedBy);
      }

      const limit = filters?.limit ?? 100;
      const { data, error } = await query.limit(limit);

      if (error) throw error;
      return data || [];
    }
  });
}
