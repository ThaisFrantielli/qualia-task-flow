import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Task } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export const useTasks = (
  periodFilter: string = 'all',
  archiveStatusFilter: 'active' | 'archived' | 'all' = 'active',
  myTasksFilter: boolean = false,
  recentlyCompletedFilter: boolean = false,
  delegatedByMeFilter: boolean = false,
  limit: number = 50
) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    console.log('Fetching tasks at:', new Date().toISOString());
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('tasks')
        .select(`
          *,
          project:projects(*)
        `)
        .limit(limit);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      switch (periodFilter) {
        case 'today':
          query = query.gte('due_date', today.toISOString()).lt('due_date', tomorrow.toISOString());
          break;
        case 'week':
          query = query.gte('due_date', startOfWeek.toISOString()).lte('due_date', today.toISOString());
          break;
        case 'month':
          query = query.gte('due_date', startOfMonth.toISOString()).lte('due_date', today.toISOString());
          break;
        case 'year':
          query = query.gte('due_date', startOfYear.toISOString()).lte('due_date', today.toISOString());
          break;
        case 'overdue':
          query = query.lt('due_date', today.toISOString()).neq('status', 'done');
          break;
        case 'all':
        default:
          break;
      }

      if (archiveStatusFilter === 'active') {
        query = query.eq('archived', false);
      } else if (archiveStatusFilter === 'archived') {
        query = query.eq('archived', true);
      }

      if (myTasksFilter && user?.id) {
        query = query.eq('assignee_id', user.id);
      }

      if (recentlyCompletedFilter) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.eq('status', 'done').gte('updated_at', sevenDaysAgo.toISOString());
      }

      if (delegatedByMeFilter && user?.id) {
        query = query.eq('delegated_by', user.id);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      if (fetchError) throw new Error(fetchError.message);
      setTasks(data as Task[] || []);
    } catch (err: any) {
      console.error('Erro ao buscar tarefas:', err);
      setError(`Erro ao buscar tarefas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [periodFilter, archiveStatusFilter, myTasksFilter, recentlyCompletedFilter, delegatedByMeFilter, user, limit]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
      fetchTasks();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      throw err;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const updatesWithTimestamp = { ...updates, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('tasks')
        .update(updatesWithTimestamp)
        .eq('id', taskId)
        .select()
        .single();
      if (error) throw error;
      setTasks(currentTasks => currentTasks.map(t => t.id === taskId ? data : t));
      return data;
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      throw error;
    }
  };

  const archiveTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ archived: true, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
      fetchTasks();
    } catch (err) {
      console.error('Erro ao arquivar tarefa:', err);
      setError('Não foi possível arquivar a tarefa.');
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      if (error) throw error;
      fetchTasks();
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err);
      setError('Não foi possível excluir a tarefa.');
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    updateTaskStatus,
    archiveTask,
    deleteTask,
    refetch: fetchTasks,
    updateTask
  };
};