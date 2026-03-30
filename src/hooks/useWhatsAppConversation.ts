import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dateToLocalISO } from '@/lib/dateUtils';
import { WHATSAPP } from '@/integrations/whatsapp/config';

// Use o tipo diretamente do Supabase
import type { Database } from '@/types';

type WhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Row'];

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

export function useWhatsAppConversation(clienteId?: string, whatsappNumber?: string, instanceId?: string) {
  if (WHATSAPP.DEBUG_LOGS) console.log('🔧 useWhatsAppConversation called with:', { clienteId, whatsappNumber, instanceId });

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
      let query = supabase
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
        .eq('whatsapp_number', whatsappNumber);

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }

      let { data: convData, error: convError } = await query.maybeSingle();

      if (convError) throw convError;

      // Se não existir, criar nova conversação
      if (!convData) {
        if (WHATSAPP.DEBUG_LOGS) console.log('Creating new conversation for client:', clienteId);
        const { data: newConv, error: createError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            cliente_id: clienteId,
            whatsapp_number: whatsappNumber,
            status: 'active',
            instance_id: instanceId
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

      if (WHATSAPP.DEBUG_LOGS) console.log('Conversation data:', convData);

      // Extrair informações do cliente
      const cliente = Array.isArray(convData.clientes) ? convData.clientes[0] : convData.clientes;
      const clienteInfo = {
        hasWhatsApp: !!cliente?.whatsapp_number,
        phone: cliente?.telefone || null,
        whatsappNumber: cliente?.whatsapp_number || null,
      };

      // Buscar mensagens da conversação com mídia
      const { data: messagesData, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          media:whatsapp_media(*)
        `)
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
  }, [clienteId, whatsappNumber, instanceId]);

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
    // Permitir fluxo local quando não houver conversação no banco
    if (!conversation.id) {
      if (clienteId && whatsappNumber) {
        const tempId = `local-${clienteId}-${whatsappNumber}`;
        console.warn('⚠️ Conversação não encontrada no banco. Usando conversa local temporária:', tempId);
        setConversation(prev => ({
          ...prev,
          id: tempId,
          loading: false,
          error: null,
          clienteInfo: prev.clienteInfo ?? {
            hasWhatsApp: true,
            phone: whatsappNumber,
            whatsappNumber: whatsappNumber,
          },
        }));
      } else {
        throw new Error('Conversação não inicializada');
      }
    }

    try {
      if (WHATSAPP.DEBUG_LOGS) console.log('Sending message, conversation ID:', conversation.id);

      const isLocalConversation = String(conversation.id).startsWith('local-');
      let customerPhone: string | null = null;
      let canPersistToDb = true;

      if (isLocalConversation) {
        // Local-only mode: use provided whatsappNumber or clienteInfo
        customerPhone = whatsappNumber || conversation.clienteInfo?.whatsappNumber || conversation.clienteInfo?.phone || null;
        canPersistToDb = false; // Avoid FK errors
        if (WHATSAPP.DEBUG_LOGS) console.log('Local conversation mode. Using phone:', customerPhone);
      } else {
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

        if (WHATSAPP.DEBUG_LOGS) console.log('Conversation query result:', { convData, convError });

        if (convError || !convData) {
          console.error('Conversation not found:', convError);
          throw new Error('Conversação não encontrada');
        }

        // Extrair número do cliente
        const cliente = Array.isArray(convData.clientes) ? convData.clientes[0] : convData.clientes;
        if (WHATSAPP.DEBUG_LOGS) console.log('Cliente data:', cliente);

        // Priorizar WhatsApp number, depois telefone
        customerPhone = cliente?.whatsapp_number || cliente?.telefone || null;
        const isWhatsAppNumber = !!cliente?.whatsapp_number; // Flag para identificar se é WhatsApp

        if (WHATSAPP.DEBUG_LOGS) console.log('Customer phone:', customerPhone);
        if (WHATSAPP.DEBUG_LOGS) console.log('Is WhatsApp number:', isWhatsAppNumber);
      }

      if (!customerPhone) {
        throw new Error('Cliente não possui número de telefone/WhatsApp cadastrado');
      }

      // Sanitizar número: manter apenas dígitos e preservar DDI
      const digits = (customerPhone || '').replace(/\D+/g, '');
      const sanitizedPhone = digits;
      if (WHATSAPP.DEBUG_LOGS) console.log('Sanitized phone:', { input: customerPhone, sanitized: sanitizedPhone });

      if (!canPersistToDb) {
        throw new Error('Conversa local não suporta envio seguro. Selecione uma conversa persistida.');
      }

      if (WHATSAPP.DEBUG_LOGS) console.log('Sending via Supabase Edge Function:', {
        phoneNumber: sanitizedPhone,
        message: content,
        conversationId: conversation.id,
      });

      const { data: functionResult, error: functionError } = await supabase.functions
        .invoke('whatsapp-send', {
          body: {
            instance_id: instanceId,
            phoneNumber: sanitizedPhone,
            message: content,
            conversationId: conversation.id,
          }
        });

      if (WHATSAPP.DEBUG_LOGS) console.log('Edge Function response:', { functionResult, functionError });
      if (functionError || !functionResult?.success) {
        throw new Error(functionError?.message || functionResult?.error || 'Falha ao enfileirar envio');
      }

      if (WHATSAPP.DEBUG_LOGS) console.log('Message sent successfully');

      if (canPersistToDb) {
        // Salvar mensagem no banco de dados (tentar sem sender_id primeiro)
        if (WHATSAPP.DEBUG_LOGS) console.log('Saving message to database...');

        const messageData = {
          conversation_id: conversation.id,
          sender_type: 'system' as const, // Changed from 'user' to 'system' to avoid constraint error
          content: content,
          message_type: 'text' as const,
          // Tentar sem sender_id primeiro
        };

        if (WHATSAPP.DEBUG_LOGS) console.log('Message data to insert:', messageData);

        const { data: insertedMessage, error: messageError } = await supabase
          .from('whatsapp_messages')
          .insert(messageData)
          .select();

        if (WHATSAPP.DEBUG_LOGS) console.log('Insert result:', { insertedMessage, messageError });

        if (messageError) {
          console.error('Error saving message:', messageError);
          console.warn('Message was sent to WhatsApp but not saved to database');
        } else {
          if (WHATSAPP.DEBUG_LOGS) console.log('✅ Message saved to database successfully');
          // Se salvou no banco, atualizar também localmente
          if (insertedMessage && insertedMessage[0]) {
            setConversation(prev => ({
              ...prev,
              messages: [...prev.messages, insertedMessage[0]]
            }));
          }
        }
      }

      // Sempre garantir exibição local (em modo local ou se DB falhou)
      if (!canPersistToDb) {
        const localMessage = {
          id: `local-${Date.now()}`,
          conversation_id: conversation.id,
          sender_type: 'system' as const, // Changed from 'user' to 'system' to avoid constraint error
          sender_phone: null,
          sender_name: 'Você',
          content: content,
          message_type: 'text' as const,
          status: 'sent' as const,
          whatsapp_message_id: null,
          created_at: dateToLocalISO(new Date()),
          updated_at: dateToLocalISO(new Date()),
          sender_id: null,
          metadata: null,
          read_at: null
        };
        if (WHATSAPP.DEBUG_LOGS) console.log('📱 Adding local message (local mode):', localMessage);
        setConversation(prev => ({ ...prev, messages: [...prev.messages, localMessage] }));
      }

      // Atualizar conversação
      // Atualizar conversação no banco se for uma conversa real (não-local)
      if (canPersistToDb) {
        try {
          await supabase
            .from('whatsapp_conversations')
            .update({
              last_message_at: dateToLocalISO(new Date()),
              updated_at: dateToLocalISO(new Date())
            })
            .eq('id', conversation.id);
          if (WHATSAPP.DEBUG_LOGS) console.log('✅ Conversation updated');
        } catch (convError) {
          console.warn('Failed to update conversation timestamp:', convError);
        }
      }

      if (WHATSAPP.DEBUG_LOGS) console.log('🎉 Send message process completed successfully');

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
