import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase';
import { WhatsAppMessage } from './useWhatsAppConversations';

interface ConversationData {
  id: string;
  messages: WhatsAppMessage[];
  loading: boolean;
  error: string | null;
  clienteInfo?: {
    hasWhatsApp: boolean;
    phone: string | null;
    whatsappNumber: string | null;
  };
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

      // Buscar ou criar conversação específica com dados do cliente
      let { data: convData, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select(`
          id,
          clientes:cliente_id (
            whatsapp_number,
            telefone,
            nome_fantasia,
            razao_social
          )
        `)
        .eq('cliente_id', clienteId)
        .eq('whatsapp_number', whatsappNumber)
        .maybeSingle();

      if (convError) throw convError;

      // Se não existir, criar nova conversação
      if (!convData) {
        console.log('Creating new conversation for client:', clienteId);
        const { data: newConv, error: createError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            cliente_id: clienteId,
            whatsapp_number: whatsappNumber,
            status: 'active'
          })
          .select(`
            id,
            clientes:cliente_id (
              whatsapp_number,
              telefone,
              nome_fantasia,
              razao_social
            )
          `)
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          throw createError;
        }
        convData = newConv;
      }

      console.log('Conversation data:', convData);

      // Extrair informações do cliente
      const cliente = Array.isArray(convData.clientes) ? convData.clientes[0] : convData.clientes;
      const clienteInfo = {
        hasWhatsApp: !!cliente?.whatsapp_number,
        phone: cliente?.telefone || null,
        whatsappNumber: cliente?.whatsapp_number || null,
      };

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
        error: null,
        clienteInfo
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
    if (!conversation.id) {
      throw new Error('Conversação não inicializada');
    }

    try {
      console.log('Sending message, conversation ID:', conversation.id);
      
      // Buscar dados da conversação com cliente
      const { data: convData, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select(`
          id,
          whatsapp_number,
          clientes:cliente_id (
            whatsapp_number,
            telefone,
            nome_fantasia,
            razao_social
          )
        `)
        .eq('id', conversation.id)
        .single();

      console.log('Conversation query result:', { convData, convError });

      if (convError || !convData) {
        console.error('Conversation not found:', convError);
        throw new Error('Conversação não encontrada');
      }

      // Extrair número do cliente
      const cliente = Array.isArray(convData.clientes) ? convData.clientes[0] : convData.clientes;
      console.log('Cliente data:', cliente);
      
      // Priorizar WhatsApp number, depois telefone
      const customerPhone = cliente?.whatsapp_number || cliente?.telefone;
      const isWhatsAppNumber = !!cliente?.whatsapp_number; // Flag para identificar se é WhatsApp
      
      console.log('Customer phone:', customerPhone);
      console.log('Is WhatsApp number:', isWhatsAppNumber);
      
      if (!customerPhone) {
        throw new Error('Cliente não possui número de telefone/WhatsApp cadastrado');
      }

      // Enviar mensagem diretamente para o serviço WhatsApp
      console.log('Sending to WhatsApp service:', {
        phoneNumber: customerPhone,
        message: content
      });
      
      const response = await fetch('http://localhost:3005/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: customerPhone,
          message: content
        })
      });

      console.log('WhatsApp service response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WhatsApp service error:', errorText);
        throw new Error(`Erro no serviço WhatsApp: ${errorText}`);
      }

      console.log('Message sent successfully to WhatsApp service');

      // Salvar mensagem no banco de dados (tentar sem sender_id primeiro)
      console.log('Saving message to database...');
      
      const messageData = {
        conversation_id: conversation.id,
        sender_type: 'user' as const,
        content: content,
        message_type: 'text' as const,
        // Tentar sem sender_id primeiro
      };
      
      console.log('Message data to insert:', messageData);
      
      const { data: insertedMessage, error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert(messageData)
        .select();

      console.log('Insert result:', { insertedMessage, messageError });

      if (messageError) {
        console.error('Error saving message:', messageError);
        console.warn('Message was sent to WhatsApp but not saved to database');
        
        // Adicionar mensagem localmente na interface mesmo com erro no banco
        const localMessage = {
          id: `local-${Date.now()}`,
          conversation_id: conversation.id,
          sender_type: 'user' as const,
          sender_phone: null,
          sender_name: 'Você',
          content: content,
          message_type: 'text' as const,
          status: 'sent' as const,
          whatsapp_message_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sender_id: null,
          metadata: null,
          read_at: null
        };
        
        console.log('📱 Adding local message:', localMessage);
        
        // Atualizar estado local com a nova mensagem
        setConversation(prev => {
          const updatedConversation = {
            ...prev,
            messages: [...prev.messages, localMessage]
          };
          console.log('📱 Updated conversation state:', updatedConversation);
          return updatedConversation;
        });
        
        console.log('✅ Message added to local interface');
      } else {
        console.log('✅ Message saved to database successfully');
        
        // Se salvou no banco, atualizar também localmente
        if (insertedMessage && insertedMessage[0]) {
          setConversation(prev => ({
            ...prev,
            messages: [...prev.messages, insertedMessage[0]]
          }));
        }
      }

      // Atualizar conversação
      try {
        await supabase
          .from('whatsapp_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation.id);
        console.log('✅ Conversation updated');
      } catch (convError) {
        console.warn('Failed to update conversation timestamp:', convError);
      }
      
      console.log('🎉 Send message process completed successfully');

    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  return {
    ...conversation,
    sendMessage,
    refetch: fetchConversation,
    refreshMessages: () => {
      console.log('🔄 Refreshing messages manually...');
      fetchConversation();
    }
  };
}
