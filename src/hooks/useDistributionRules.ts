import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DistributionRule {
  id: string;
  agent_id: string;
  is_active: boolean;
  max_concurrent_conversations: number;
  priority: number;
  available_hours: Record<string, [number, number] | null>;
  instance_ids: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  // Joined data
  agent?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export function useDistributionRules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: ['distribution-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_distribution_rules')
        .select(`
          *,
          agent:agent_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as DistributionRule[];
    }
  });

  const createRule = useMutation({
    mutationFn: async (rule: Partial<DistributionRule>) => {
      const { data, error } = await supabase
        .from('whatsapp_distribution_rules')
        .insert({
          agent_id: rule.agent_id,
          is_active: rule.is_active ?? true,
          max_concurrent_conversations: rule.max_concurrent_conversations ?? 5,
          priority: rule.priority ?? 0,
          available_hours: rule.available_hours ?? {
            monday: [9, 18],
            tuesday: [9, 18],
            wednesday: [9, 18],
            thursday: [9, 18],
            friday: [9, 18],
            saturday: null,
            sunday: null
          },
          instance_ids: rule.instance_ids ?? [],
          tags: rule.tags ?? []
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-rules'] });
      toast({
        title: 'Regra criada',
        description: 'Configuração de distribuição criada com sucesso.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar regra',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DistributionRule> }) => {
      const { data, error } = await supabase
        .from('whatsapp_distribution_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-rules'] });
      toast({
        title: 'Regra atualizada',
        description: 'Configuração de distribuição atualizada com sucesso.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar regra',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_distribution_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-rules'] });
      toast({
        title: 'Regra excluída',
        description: 'Configuração de distribuição removida com sucesso.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir regra',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    rules,
    isLoading,
    error,
    createRule: createRule.mutate,
    updateRule: updateRule.mutate,
    deleteRule: deleteRule.mutate,
    isCreating: createRule.isPending,
    isUpdating: updateRule.isPending,
    isDeleting: deleteRule.isPending
  };
}

// Hook for agents list (for dropdowns)
export function useAvailableAgents() {
  return useQuery({
    queryKey: ['available-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .not('full_name', 'is', null)
        .order('full_name');

      if (error) throw error;
      return data;
    }
  });
}
