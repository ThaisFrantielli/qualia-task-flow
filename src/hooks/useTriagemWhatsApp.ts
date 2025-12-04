import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TriagemConversation {
  id: string;
  cliente_id: string | null;
  whatsapp_number: string | null;
  customer_phone: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  is_online?: boolean;
}

export interface TriagemMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  content: string | null;
  created_at: string;
}

// Hook para buscar conversas de WhatsApp de um cliente em triagem
export function useTriagemConversation(clienteId?: string, whatsappNumber?: string) {
  return useQuery({
    queryKey: ['triagem-conversation', clienteId, whatsappNumber],
    queryFn: async () => {
      if (!clienteId && !whatsappNumber) return null;

      // Buscar conversa por cliente_id ou whatsapp_number
      let query = supabase
        .from('whatsapp_conversations')
        .select('*');

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      } else if (whatsappNumber) {
        query = query.or(`whatsapp_number.eq.${whatsappNumber},customer_phone.eq.${whatsappNumber}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (error) throw error;
      return data as TriagemConversation | null;
    },
    enabled: !!(clienteId || whatsappNumber),
  });
}

// Hook para buscar mensagens de uma conversa
export function useTriagemMessages(conversationId?: string) {
  return useQuery({
    queryKey: ['triagem-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TriagemMessage[];
    },
    enabled: !!conversationId,
  });
}

// Hook para buscar última mensagem de WhatsApp de um lead
export function useLastWhatsAppMessage(clienteId?: string, whatsappNumber?: string) {
  return useQuery({
    queryKey: ['last-whatsapp-message', clienteId, whatsappNumber],
    queryFn: async () => {
      if (!clienteId && !whatsappNumber) return null;

      // Primeiro buscar a conversa
      let convQuery = supabase
        .from('whatsapp_conversations')
        .select('id, last_message, last_message_at, unread_count');

      if (clienteId) {
        convQuery = convQuery.eq('cliente_id', clienteId);
      } else if (whatsappNumber) {
        convQuery = convQuery.or(`whatsapp_number.eq.${whatsappNumber},customer_phone.eq.${whatsappNumber}`);
      }

      const { data: conv } = await convQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (!conv) return null;

      // Buscar última mensagem
      const { data: msg } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        conversation: conv,
        lastMessage: msg,
      };
    },
    enabled: !!(clienteId || whatsappNumber),
  });
}
