import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppAgent {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  status: 'online' | 'busy' | 'away' | 'offline';
  activeConversations: number;
}

export function useWhatsAppAgents() {
  const [agents, setAgents] = useState<WhatsAppAgent[]>([]);
  const [loading, setLoading] = useState(true);

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

      const mappedAgents: WhatsAppAgent[] = (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        status: 'online' as const, // Default - would need presence system
        activeConversations: agentConvCounts[p.id] || 0
      }));

      setAgents(mappedAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, refetch: fetchAgents };
}
