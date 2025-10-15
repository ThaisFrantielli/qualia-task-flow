import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase';
import { WhatsAppMessage } from './useWhatsAppConversations';

interface ConversationData {
  id: string;
  messages: WhatsAppMessage[];
  loading: boolean;
  error: string | null;
}

export function useWhatsAppConversation(clienteId?: string, whatsappNumber?: string) {
  const [conversation, setConversation] = useState<ConversationData>({
    id: '',
    messages: [],
    loading: true,
    error: null
  });

  const fetchConversation = useCallback(async () => {
    if (!clienteId || !whatsappNumber) {
      setConversation({
        id: '',
        messages: [],
        loading: false,
        error: null
      });
      return;
    }

    try {
      setConversation(prev => ({ ...prev, loading: true, error: null }));

      // Buscar ou criar conversação específica
      let { data: convData, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('whatsapp_number', whatsappNumber)
        .maybeSingle();

      if (convError) throw convError;

      // Se não existir, criar nova conversação
      if (!convData) {
        // Buscar dados completos do cliente
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('nome_fantasia, razao_social, whatsapp_number, telefone')
          .eq('id', clienteId)
          .single();

        // Pegar o número do cliente (priorizar whatsapp_number, depois telefone)
        const customerPhone = clienteData?.whatsapp_number || clienteData?.telefone || '';

        if (!customerPhone) {
          throw new Error('Cliente não possui número de telefone cadastrado');
        }

        const { data: newConv, error: createError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            cliente_id: clienteId,
            whatsapp_number: whatsappNumber, // Número da empresa WhatsApp
            customer_phone: customerPhone, // Número do CLIENTE
            customer_name: clienteData?.nome_fantasia || clienteData?.razao_social || 'Cliente',
            status: 'active'
          })
          .select('id')
          .single();

        if (createError) throw createError;
        convData = newConv;
      }

      // Buscar mensagens da conversação
      const { data: messagesData, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', convData.id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      setConversation({
        id: convData.id,
        messages: messagesData || [],
        loading: false,
        error: null
      });
    } catch (err) {
      setConversation(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro ao carregar conversação'
      }));
    }
  }, [clienteId, whatsappNumber]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  // Real-time subscription para novas mensagens
  useEffect(() => {
    if (!conversation.id) return;

    const channel = supabase
      .channel(`whatsapp-messages-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          setConversation(prev => ({
            ...prev,
            messages: [...prev.messages, payload.new as WhatsAppMessage]
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  const sendMessage = async (content: string) => {
    if (!conversation.id) return;

    try {
      // Enviar mensagem via edge function
      const { error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId: conversation.id,
          content,
          messageType: 'text'
        }
      });

      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  return {
    ...conversation,
    sendMessage,
    refetch: fetchConversation
  };
}
