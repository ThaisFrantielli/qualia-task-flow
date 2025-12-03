import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TriagemLead {
  id: string;
  codigo_cliente: string;
  nome_fantasia: string | null;
  razao_social: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp_number: string | null;
  origem: string | null;
  status_triagem: string | null;
  created_at?: string;
  cadastro_cliente?: string;
  ultimo_atendente_id?: string | null;
  ultimo_atendimento_at?: string | null;
  // Joined data
  conversation?: {
    id: string;
    last_message: string | null;
    last_message_at: string | null;
    unread_count: number;
  } | null;
}

// Buscar leads com conversas vinculadas
export function useTriagemLeads() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['triagem-leads'],
    queryFn: async () => {
      // Buscar leads em triagem
      const { data: leads, error } = await supabase
        .from('clientes')
        .select('*')
        .in('status_triagem', ['aguardando', 'em_atendimento'])
        .order('cadastro_cliente', { ascending: false });

      if (error) throw error;

      // Buscar conversas para estes leads
      const leadIds = leads?.map(l => l.id) || [];
      const whatsappNumbers = leads?.filter(l => l.whatsapp_number).map(l => l.whatsapp_number) || [];

      let conversations: any[] = [];
      if (leadIds.length > 0 || whatsappNumbers.length > 0) {
        const { data: convs } = await supabase
          .from('whatsapp_conversations')
          .select('id, cliente_id, whatsapp_number, last_message, last_message_at, unread_count')
          .or(`cliente_id.in.(${leadIds.join(',')}),whatsapp_number.in.(${whatsappNumbers.join(',')})`);
        
        conversations = convs || [];
      }

      // Mesclar dados
      return leads?.map(lead => {
        const conv = conversations.find(c => 
          c.cliente_id === lead.id || c.whatsapp_number === lead.whatsapp_number
        );
        return {
          ...lead,
          conversation: conv ? {
            id: conv.id,
            last_message: conv.last_message,
            last_message_at: conv.last_message_at,
            unread_count: conv.unread_count
          } : null
        } as TriagemLead;
      }) || [];
    },
    refetchInterval: 30000, // Refetch a cada 30s como fallback
  });

  // Subscription para atualizações em tempo real
  useEffect(() => {
    const clientesChannel = supabase
      .channel('triagem-clientes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clientes', filter: "status_triagem=in.(aguardando,em_atendimento)" },
        () => {
          queryClient.invalidateQueries({ queryKey: ['triagem-leads'] });
        }
      )
      .subscribe();

    const conversationsChannel = supabase
      .channel('triagem-conversations')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['triagem-leads'] });
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('triagem-messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['triagem-leads'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(clientesChannel);
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [queryClient]);

  return query;
}

// Hook para atribuir lead a um agente
export function useAtribuirLead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ clienteId }: { clienteId: string }) => {
      const { error } = await supabase
        .from('clientes')
        .update({ 
          status_triagem: 'em_atendimento',
          ultimo_atendente_id: user?.id,
          ultimo_atendimento_at: new Date().toISOString()
        })
        .eq('id', clienteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triagem-leads'] });
      toast.success('Lead atribuído a você');
    },
    onError: (error: any) => {
      toast.error('Erro ao atribuir lead: ' + error.message);
    }
  });
}

// Hook para criar oportunidade a partir da triagem
export function useEncaminharParaComercial() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ clienteId, funilId }: { 
      clienteId: string; 
      funilId?: string;
    }) => {
      // 1. Buscar dados do cliente
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (clienteError) throw clienteError;

      // 2. Buscar primeiro estágio do funil
      let estagioId = null;
      if (funilId) {
        const { data: estagios } = await supabase
          .from('funil_estagios')
          .select('id')
          .eq('funil_id', funilId)
          .order('ordem', { ascending: true })
          .limit(1);

        estagioId = estagios?.[0]?.id || null;
      }

      // 3. Criar oportunidade
      const { data: oportunidade, error: oppError } = await supabase
        .from('oportunidades')
        .insert({
          titulo: `Oportunidade - ${cliente.nome_fantasia || cliente.razao_social || cliente.whatsapp_number}`,
          cliente_id: clienteId,
          status: 'aberta',
          funil_id: funilId || null,
          estagio_id: estagioId,
          user_id: user?.id,
        })
        .select()
        .single();

      if (oppError) throw oppError;

      // 4. Atualizar status do cliente
      await supabase
        .from('clientes')
        .update({ 
          status_triagem: 'comercial',
          ultimo_atendente_id: user?.id,
          ultimo_atendimento_at: new Date().toISOString()
        })
        .eq('id', clienteId);

      return oportunidade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triagem-leads'] });
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      toast.success('Lead encaminhado para Comercial!');
    },
    onError: (error: any) => {
      toast.error('Erro ao encaminhar: ' + error.message);
    }
  });
}

// Hook para criar ticket de suporte
export function useCriarTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      clienteId, 
      titulo, 
      descricao, 
      prioridade,
    }: {
      clienteId: string;
      titulo: string;
      descricao: string;
      prioridade?: string;
    }) => {
      // 1. Criar ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          cliente_id: clienteId,
          titulo,
          descricao,
          prioridade: prioridade || 'media',
          status: 'em_atendimento',
          atendente_id: user?.id,
          origem: 'triagem'
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // 2. Atualizar cliente
      await supabase
        .from('clientes')
        .update({ 
          status_triagem: 'em_atendimento',
          ultimo_atendente_id: user?.id,
          ultimo_atendimento_at: new Date().toISOString()
        })
        .eq('id', clienteId);

      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triagem-leads'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar ticket: ' + error.message);
    }
  });
}

// Hook para descartar lead
export function useDescartarLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clienteId }: { clienteId: string }) => {
      const { error } = await supabase
        .from('clientes')
        .update({ 
          status_triagem: 'descartado',
        })
        .eq('id', clienteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triagem-leads'] });
      toast.success('Lead descartado');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    }
  });
}

// Hook para buscar mensagens de uma conversa
export function useConversationMessages(conversationId?: string) {
  return useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });
}

// Hook para enviar mensagem
export function useSendTriagemMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      content,
      instanceId
    }: { 
      conversationId: string; 
      content: string;
      instanceId?: string;
    }) => {
      // Buscar conversa para pegar instance_id e número
      const { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('instance_id, whatsapp_number, customer_phone')
        .eq('id', conversationId)
        .single();

      if (!conv) throw new Error('Conversa não encontrada');

      const targetPhone = conv.whatsapp_number || conv.customer_phone;
      const instId = instanceId || conv.instance_id;

      // Chamar edge function para enviar mensagem
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          instance_id: instId,
          to: targetPhone,
          message: content
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages'] });
      queryClient.invalidateQueries({ queryKey: ['triagem-leads'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar: ' + error.message);
    }
  });
}
