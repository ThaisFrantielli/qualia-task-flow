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
        // Some conversations are identified only by whatsapp_number (e.g. LID resolution flows).
        // Keep them visible in the queue as long as at least one phone field is present.
        .or('customer_phone.not.is.null,whatsapp_number.not.is.null');

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

  // Polling fallback: runs every 8 s while the tab is visible.
  // This guarantees phone messages appear even when Realtime is delayed,
  // the webhook isn't configured, or the connection drops.
  useEffect(() => {
    if (!conversationId) return;

    const POLL_INTERVAL_MS = 8_000;
    let timerId: ReturnType<typeof setTimeout>;

    const schedulePoll = () => {
      timerId = setTimeout(async () => {
        // Skip if tab is hidden to avoid unnecessary requests
        if (document.visibilityState === 'hidden') {
          schedulePoll();
          return;
        }

        try {
          const { data } = await supabase
            .from('whatsapp_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

          if (data) {
            setMessages(prev => {
              const next = dedupeMessagesById([...prev, ...(data as WhatsAppMessage[])]);
              // Only update state when there are actual new messages
              if (next.length !== prev.length) return next;
              return prev;
            });
          }
        } catch {
          // Silently ignore poll errors — Realtime is the primary channel
        }

        schedulePoll();
      }, POLL_INTERVAL_MS);
    };

    schedulePoll();

    return () => clearTimeout(timerId);
  }, [conversationId]);


  // Real-time subscription for messages
  useEffect(() => {
    if (!conversationId) return;

    // Use a unique channel name per conversation so that switching conversations
    // does not reuse a stale channel with the wrong server-side filter.
    const channel = supabase
      .channel(`whatsapp-messages-changes-${conversationId}`)
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
