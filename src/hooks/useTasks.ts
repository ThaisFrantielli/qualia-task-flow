
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'] & {
  project?: Database['public']['Tables']['projects']['Row'];
  subtasks?: Database['public']['Tables']['subtasks']['Row'][];
  comments?: Database['public']['Tables']['comments']['Row'][];
  attachments?: Database['public']['Tables']['attachments']['Row'][];
};

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(*),
          subtasks(*),
          comments(*),
          attachments(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar tarefa');
    }
  };

  return {
    tasks,
    loading,
    error,
    updateTaskStatus,
    refetch: fetchTasks
  };
};
