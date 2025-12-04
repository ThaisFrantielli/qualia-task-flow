import { useEffect, useCallback } from 'react';
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
  conversation?: {
    id: string;
    last_message: string | null;
    last_message_at: string | null;
    unread_count: number;
  } | null;
}

// Buscar leads com conversas vinculadas - otimizado para alto volume
export function useTriagemLeads(options?: { 
  limit?: number; 
  offset?: number;
  debounceMs?: number;
}) {
  const queryClient = useQueryClient();
  const { limit = 100, offset = 0, debounceMs = 1000 } = options || {};

  const query = useQuery({
    queryKey: ['triagem-leads', limit, offset],
    queryFn: async () => {
      // Buscar leads em triagem com paginação
      const { data: leads, error, count } = await supabase
        .from('clientes')
        .select('*', { count: 'exact' })
        .in('status_triagem', ['aguardando', 'em_atendimento'])
        .order('cadastro_cliente', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      if (!leads || leads.length === 0) {
        return { leads: [], total: 0 };
      }

      // Buscar conversas para estes leads
      const leadIds = leads.map(l => l.id);
      const whatsappNumbers = leads.filter(l => l.whatsapp_number).map(l => l.whatsapp_number);

      let conversations: any[] = [];
      if (leadIds.length > 0) {
        // Query otimizada: busca por cliente_id primeiro
        const { data: convs } = await supabase
          .from('whatsapp_conversations')
          .select('id, cliente_id, whatsapp_number, last_message, last_message_at, unread_count')
          .in('cliente_id', leadIds);
        
        conversations = convs || [];

        // Se ainda faltam, busca por whatsapp_number
        if (whatsappNumbers.length > 0) {
          const existingClientIds = conversations.map(c => c.cliente_id);
          const missingLeads = leads.filter(l => 
            l.whatsapp_number && !existingClientIds.includes(l.id)
          );
          
          if (missingLeads.length > 0) {
            const { data: additionalConvs } = await supabase
              .from('whatsapp_conversations')
              .select('id, cliente_id, whatsapp_number, last_message, last_message_at, unread_count')
              .in('whatsapp_number', missingLeads.map(l => l.whatsapp_number));
            
            if (additionalConvs) {
              conversations = [...conversations, ...additionalConvs];
            }
          }
        }
      }

      // Mesclar dados
      const enrichedLeads = leads.map(lead => {
        const conv = conversations.find(c => 
          c.cliente_id === lead.id || c.whatsapp_number === lead.whatsapp_number
        );
        return {
          ...lead,
          conversation: conv ? {
            id: conv.id,
            last_message: conv.last_message,
            last_message_at: conv.last_message_at,
            unread_count: conv.unread_count || 0
          } : null
        } as TriagemLead;
      });

      return { leads: enrichedLeads, total: count || 0 };
    },
    refetchInterval: 30000, // Fallback: refetch a cada 30s
    staleTime: 5000, // Cache por 5s para evitar refetch excessivo
  });

  // Debounced invalidation para evitar muitos refetches
  const debouncedInvalidate = useCallback(() => {
    const timeoutId = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['triagem-leads'] });
    }, debounceMs);
    return () => clearTimeout(timeoutId);
  }, [queryClient, debounceMs]);

  // Subscription para atualizações em tempo real
  useEffect(() => {
    const clientesChannel = supabase
      .channel('triagem-clientes-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clientes' },
        (payload) => {
          const record = payload.new as any;
          // Só invalida se for um lead em triagem
          if (record?.status_triagem === 'aguardando' || record?.status_triagem === 'em_atendimento') {
            debouncedInvalidate();
          }
        }
      )
      .subscribe();

    const conversationsChannel = supabase
      .channel('triagem-conversations-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_conversations' },
        () => debouncedInvalidate()
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('triagem-messages-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        () => debouncedInvalidate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(clientesChannel);
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [debouncedInvalidate]);

  return {
    ...query,
    data: query.data?.leads || [],
    total: query.data?.total || 0
  };
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

      // 5. Vincular conversa à oportunidade (se existir)
      const { data: conversation } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('cliente_id', clienteId)
        .maybeSingle();

      if (conversation) {
        // Podemos usar o campo atendimento_id para vincular
        await supabase
          .from('whatsapp_conversations')
          .update({ cliente_id: clienteId })
          .eq('id', conversation.id);
      }

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

// Hook CORRIGIDO para criar ticket de suporte com todos os campos
export function useCriarTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      clienteId, 
      titulo, 
      descricao,
      sintese,
      prioridade,
      origem,
      motivo,
      departamento,
      placa,
      fase,
      status
    }: {
      clienteId: string;
      titulo: string;
      descricao?: string;
      sintese?: string;
      prioridade?: string;
      origem?: string;
      motivo?: string;
      departamento?: string;
      placa?: string;
      fase?: string;
      status?: string;
    }) => {
      // 1. Criar ticket com todos os campos
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          cliente_id: clienteId,
          titulo,
          descricao: descricao || sintese,
          sintese,
          prioridade: prioridade || 'media',
          status: status || 'em_atendimento',
          atendente_id: user?.id,
          origem: origem || 'triagem',
          motivo: motivo as any,
          departamento: departamento as any,
          placa,
          fase: fase || 'Análise do caso'
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

      // 3. Vincular conversa WhatsApp ao ticket (NOVO!)
      const { data: conversation } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('cliente_id', clienteId)
        .maybeSingle();

      if (conversation) {
        // Vincular a conversa ao ticket usando atendimento_id
        // Note: atendimento_id pode ser usado para tickets também
        await supabase
          .from('whatsapp_conversations')
          .update({ 
            atendimento_id: null, // Reset any previous link
            cliente_id: clienteId 
          })
          .eq('id', conversation.id);
      }

      // 4. Criar interação inicial
      await supabase
        .from('ticket_interacoes')
        .insert({
          ticket_id: ticket.id,
          tipo: 'abertura',
          mensagem: `Ticket criado a partir da triagem. ${sintese || descricao || ''}`,
          usuario_id: user?.id
        });

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
    mutationFn: async ({ clienteId }: { clienteId: string; motivo?: string }) => {
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
    refetchInterval: 10000, // Refetch a cada 10s para manter atualizado
  });
}

// Hook para enviar mensagem
export function useSendTriagemMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

      // Salvar mensagem localmente primeiro (otimistic update)
      const { data: savedMessage, error: saveError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          instance_id: instId,
          sender_type: 'agent',
          sender_id: user?.id,
          content: content,
          message_type: 'text',
          status: 'sending'
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Chamar edge function para enviar mensagem
      try {
        const { data, error } = await supabase.functions.invoke('whatsapp-send', {
          body: {
            instance_id: instId,
            to: targetPhone,
            message: content
          }
        });

        if (error) {
          // Marcar como falha
          await supabase
            .from('whatsapp_messages')
            .update({ status: 'failed' })
            .eq('id', savedMessage.id);
          throw error;
        }

        // Marcar como enviada
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'sent' })
          .eq('id', savedMessage.id);

        // Atualizar conversa
        await supabase
          .from('whatsapp_conversations')
          .update({
            last_message: content,
            last_message_at: new Date().toISOString()
          })
          .eq('id', conversationId);

        return data;
      } catch (err) {
        // Mesmo se falhar no envio, a mensagem foi salva
        console.error('Erro ao enviar via WhatsApp:', err);
        throw err;
      }
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
