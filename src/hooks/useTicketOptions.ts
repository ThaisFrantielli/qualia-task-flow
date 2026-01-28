import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TicketOrigem, TicketAnaliseFinal, TicketMotivo } from '@/types/ticket-options';
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
        .eq('is_active', true)
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
