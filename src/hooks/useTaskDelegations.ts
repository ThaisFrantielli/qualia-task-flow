
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TaskDelegation = Database['public']['Tables']['task_delegations']['Row'];

export const useTaskDelegations = () => {
  const [delegations, setDelegations] = useState<TaskDelegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDelegations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_delegations')
        .select('*')
        .order('delegated_at', { ascending: false });

      if (error) throw error;
      setDelegations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar delegações');
    } finally {
      setLoading(false);
    }
  };

  const createDelegation = async (delegation: {
    task_id: string;
    delegated_by: string;
    delegated_to: string;
    notes?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('task_delegations')
        .insert(delegation);

      if (error) throw error;
      await fetchDelegations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar delegação');
    }
  };

  const updateDelegationStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('task_delegations')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      await fetchDelegations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar delegação');
    }
  };

  useEffect(() => {
    fetchDelegations();
  }, []);

  return {
    delegations,
    loading,
    error,
    createDelegation,
    updateDelegationStatus,
    refetch: fetchDelegations
  };
};
