import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase';

export interface WhatsAppConversation {
  id: string;
  customer_id: string;
  last_message: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  sender: string;
  body: string;
  created_at: string;
}

export function useWhatsAppConversations(customerId?: string) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('customer_id', customerId)
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setConversations(data || []);
        setLoading(false);
      });
  }, [customerId]);

  return { conversations, loading, error };
}

export function useWhatsAppMessages(conversationId?: string) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setMessages(data || []);
        setLoading(false);
      });
  }, [conversationId]);

  return { messages, loading, error };
}
