import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

import type { Database } from '@/integrations/supabase/types';

export type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];

export type WhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Row'];

function dedupeMessagesById(messages: WhatsAppMessage[]): WhatsAppMessage[] {
  const map = new Map<string, WhatsAppMessage>();
  messages.forEach((message) => {
    if (!message?.id) return;
    map.set(message.id, message);
  });

  return Array.from(map.values()).sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });
}

export function useWhatsAppConversations(customerId?: string, instanceId?: string) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('whatsapp_conversations')
        .select('*')
        .not('customer_phone', 'is', null)
        .neq('customer_phone', '');

      // If customerId is provided, filter by it
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      // If instanceId is provided, filter by it
      if (instanceId) {
        query = query.eq('instance_id', instanceId);
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
  }, [customerId, instanceId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time subscription for conversations
  useEffect(() => {
    const filters = [];
    if (customerId) filters.push(`customer_id=eq.${customerId}`);
    if (instanceId) filters.push(`instance_id=eq.${instanceId}`);

    const channel = supabase
      .channel('whatsapp-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: filters.length > 0 ? filters.join(',') : undefined
        },
        (payload) => {
          console.log('Conversation updated:', payload);

          if (payload.eventType === 'INSERT') {
              // Ignore inserts that are already closed
              if ((payload.new as any).status === 'closed') return;
              setConversations(prev => {
                const newConv = payload.new as WhatsAppConversation;
                const exists = prev.some((conv) => conv.id === newConv.id);
                if (exists) {
                  return prev.map((conv) => (conv.id === newConv.id ? { ...newConv } : conv));
                }
                return [newConv, ...prev];
              });
          } else if (payload.eventType === 'UPDATE') {
              // If conversation was closed, remove it from the list immediately
              if ((payload.new as any).status === 'closed') {
                console.debug('Realtime: removing closed conversation', (payload.new as any).id);
                setConversations(prev => prev.filter(conv => conv.id !== (payload.new as any).id));
                return;
              }

              setConversations(prev => {
                const updatedConv = payload.new as WhatsAppConversation;
                const exists = prev.some((conv) => conv.id === updatedConv.id);
                const next = exists
                  ? prev.map((conv) => (conv.id === updatedConv.id ? { ...updatedConv } : conv))
                  : [updatedConv, ...prev];

                return next.sort((a, b) => {
                  const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                  const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                  return dateB - dateA;
                });
              });
          } else if (payload.eventType === 'DELETE') {
            setConversations(prev => prev.filter(conv => conv.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, instanceId]);

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
        setMessages(dedupeMessagesById((data || []) as WhatsAppMessage[]));
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
          setMessages(prev => dedupeMessagesById([...prev, payload.new as WhatsAppMessage]));
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
          setMessages(prev => {
            const updated = payload.new as WhatsAppMessage;
            const exists = prev.some(msg => msg.id === updated.id);
            if (!exists) {
              return dedupeMessagesById([...prev, updated]);
            }

            return dedupeMessagesById(
              prev.map(msg => (msg.id === updated.id ? { ...updated } : msg))
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, error, refetch: fetchMessages };
}
