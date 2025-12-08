import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePresenceOptional, type PresenceStatus } from '@/contexts/PresenceContext';

export interface WhatsAppAgent {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  status: PresenceStatus;
  activeConversations: number;
  currentPage?: string;
}

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export function useWhatsAppAgents() {
  const [profilesData, setProfilesData] = useState<ProfileData[]>([]);
  const [conversationCounts, setConversationCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const presence = usePresenceOptional();

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all agents with atendimento permissions
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, permissoes')
        .not('full_name', 'is', null);

      if (error) throw error;

      // Get conversation counts per agent
      const { data: conversations } = await supabase
        .from('whatsapp_conversations')
        .select('cliente_id')
        .eq('status', 'active');

      // Get atendimentos to link conversations to agents
      const { data: atendimentos } = await supabase
        .from('atendimentos')
        .select('assignee_id, cliente_id')
        .not('assignee_id', 'is', null);

      const agentConvCounts: Record<string, number> = {};
      
      atendimentos?.forEach(atd => {
        if (atd.assignee_id && atd.cliente_id) {
          const hasActiveConv = conversations?.some(c => c.cliente_id === atd.cliente_id);
          if (hasActiveConv) {
            agentConvCounts[atd.assignee_id] = (agentConvCounts[atd.assignee_id] || 0) + 1;
          }
        }
      });

      setProfilesData(profiles || []);
      setConversationCounts(agentConvCounts);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Combine profiles with real-time presence data
  const agents = useMemo((): WhatsAppAgent[] => {
    return profilesData.map(p => {
      // Get real-time presence status
      const userPresence = presence?.getUserPresence(p.id);
      
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        status: userPresence?.status || 'offline',
        activeConversations: conversationCounts[p.id] || 0,
        currentPage: userPresence?.currentPage
      };
    }).sort((a, b) => {
      // Sort: online first, then busy, then away, then offline
      const statusOrder: Record<PresenceStatus, number> = { online: 0, busy: 1, away: 2, offline: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [profilesData, conversationCounts, presence]);

  return { agents, loading, refetch: fetchAgents };
}
