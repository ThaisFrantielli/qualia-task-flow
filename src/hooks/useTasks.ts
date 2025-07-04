
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
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

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

  const archiveTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ archived: true, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao arquivar tarefa');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir tarefa');
    }
  };

  const updateTaskDates = async (taskId: string, startDate?: string, endDate?: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          start_date: startDate || null, 
          end_date: endDate || null, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar datas da tarefa');
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return {
    tasks,
    loading,
    error,
    updateTaskStatus,
    archiveTask,
    deleteTask,
    updateTaskDates,
    refetch: fetchTasks
  };
};
