import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TicketVinculo } from '@/types/ticket-options';
import { toast } from 'sonner';

export function useTicketVinculos(ticketId: string | null) {
  return useQuery({
    queryKey: ['ticket-vinculos', ticketId],
    queryFn: async (): Promise<TicketVinculo[]> => {
      if (!ticketId) return [];
      
      const { data, error } = await supabase
        .from('ticket_vinculos')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!ticketId
  });
}

export function useCreateTicketVinculo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vinculo: Partial<TicketVinculo>) => {
      const { data, error } = await supabase
        .from('ticket_vinculos')
        .insert(vinculo)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-vinculos', data.ticket_id] });
      toast.success('Vínculo adicionado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar vínculo: ' + error.message);
    }
  });
}

export function useUpdateTicketVinculo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...vinculo }: Partial<TicketVinculo> & { id: string }) => {
      const { data, error } = await supabase
        .from('ticket_vinculos')
        .update(vinculo)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-vinculos', data.ticket_id] });
      toast.success('Vínculo atualizado!');
    }
  });
}

export function useDeleteTicketVinculo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ticketId }: { id: string; ticketId: string }) => {
      const { error } = await supabase
        .from('ticket_vinculos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { ticketId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-vinculos', data.ticketId] });
      toast.success('Vínculo removido!');
    }
  });
}
