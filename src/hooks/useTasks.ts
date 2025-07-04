
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

  const updateTaskTags = async (taskId: string, tags: string[]) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          tags: tags.join(','), 
          updated_at: new Date().toISOString() 
        })
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar tags da tarefa');
    }
  };

  const updateTaskEstimatedHours = async (taskId: string, estimatedHours?: number) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          estimated_hours: estimatedHours || null, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar horas estimadas');
    }
  };

  // Filtros por período
  const getTasksByPeriod = (period: 'today' | 'week' | 'month' | 'overdue') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return tasks.filter(task => {
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      
      switch (period) {
        case 'today':
          return dueDate && dueDate.toDateString() === today.toDateString();
        case 'week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return dueDate && dueDate >= weekStart && dueDate <= weekEnd;
        case 'month':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          return dueDate && dueDate >= monthStart && dueDate <= monthEnd;
        case 'overdue':
          return dueDate && dueDate < today && task.status !== 'done';
        default:
          return true;
      }
    });
  };

  // Verificar se tarefa está vencida
  const isTaskOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'done') return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
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
    updateTaskTags,
    updateTaskEstimatedHours,
    getTasksByPeriod,
    isTaskOverdue,
    refetch: fetchTasks
  };
};
