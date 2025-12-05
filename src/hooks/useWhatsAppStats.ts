import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WhatsAppStats {
  totalConversations: number;
  unreadMessages: number;
  myConversations: number;
  queueConversations: number;
  todayMessages: number;
  avgResponseTime: number | null;
  activeAgents: number;
}

export function useWhatsAppStats(instanceId?: string) {
  const { user } = useAuth();
  const [stats, setStats] = useState<WhatsAppStats>({
    totalConversations: 0,
    unreadMessages: 0,
    myConversations: 0,
    queueConversations: 0,
    todayMessages: 0,
    avgResponseTime: null,
    activeAgents: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch conversations stats
      let conversationsQuery = supabase
        .from('whatsapp_conversations')
        .select('id, unread_count, status, cliente_id', { count: 'exact' });

      if (instanceId) {
        conversationsQuery = conversationsQuery.eq('instance_id', instanceId);
      }

      const { data: conversations, count: totalCount } = await conversationsQuery;

      // Calculate stats from conversations
      const unreadTotal = conversations?.reduce((acc, c) => acc + (c.unread_count || 0), 0) || 0;
      const queueCount = conversations?.filter(c => c.status === 'waiting' || c.status === 'open').length || 0;

      // Fetch my conversations (with assigned atendimento linked to current user)
      const myConvsCount = 0; // Will implement with proper assignment system

      // Fetch today's messages count
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let messagesQuery = supabase
        .from('whatsapp_messages')
        .select('id', { count: 'exact' })
        .gte('created_at', today.toISOString());

      if (instanceId) {
        messagesQuery = messagesQuery.eq('instance_id', instanceId);
      }

      const { count: todayMsgCount } = await messagesQuery;

      // Fetch active agents (profiles with recent activity)
      const { count: agentsCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .not('full_name', 'is', null);

      setStats({
        totalConversations: totalCount || 0,
        unreadMessages: unreadTotal,
        myConversations: myConvsCount,
        queueConversations: queueCount,
        todayMessages: todayMsgCount || 0,
        avgResponseTime: null, // Would need more complex calculation
        activeAgents: agentsCount || 0
      });
    } catch (error) {
      console.error('Error fetching WhatsApp stats:', error);
    } finally {
      setLoading(false);
    }
  }, [instanceId, user?.id]);

  useEffect(() => {
    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Real-time subscription for stats updates
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-stats-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_conversations' },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
