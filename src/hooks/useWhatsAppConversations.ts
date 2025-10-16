import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];

import type { Database } from '@/types';

export type WhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Row'];

export function useWhatsAppConversations(customerId?: string) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('whatsapp_conversations')
        .select('*');

      // If customerId is provided, filter by it, otherwise get all conversations
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setConversations(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time subscription for conversations
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: customerId ? `customer_id=eq.${customerId}` : undefined
        },
        (payload) => {
          console.log('Conversation updated:', payload);

          if (payload.eventType === 'INSERT') {
            setConversations(prev => [payload.new as WhatsAppConversation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev => 
              prev.map(conv => 
                conv.id === payload.new.id ? { ...payload.new as WhatsAppConversation } : conv
              ).sort((a, b) => {
                const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                return dateB - dateA;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            setConversations(prev => prev.filter(conv => conv.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId]);

  return { conversations, loading, error, refetch: fetchConversations };
}

export function useWhatsAppMessages(conversationId?: string) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setMessages(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel('whatsapp-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('New message received:', payload);
          setMessages(prev => [...prev, payload.new as WhatsAppMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Message updated:', payload);
          setMessages(prev =>
            prev.map(msg =>
              msg.id === payload.new.id ? { ...payload.new as WhatsAppMessage } : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, error, refetch: fetchMessages };
}
