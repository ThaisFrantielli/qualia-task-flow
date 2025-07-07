
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TaskHistory = Database['public']['Tables']['task_history']['Row'];

export const useTaskHistory = (taskId?: string) => {
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_history')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const addHistoryEntry = async (entry: {
    task_id: string;
    user_name: string;
    action: string;
    field_changed?: string;
    old_value?: string;
    new_value?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('task_history')
        .insert(entry);

      if (error) throw error;
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar entrada no histórico');
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [taskId]);

  return {
    history,
    loading,
    error,
    addHistoryEntry,
    refetch: fetchHistory
  };
};
