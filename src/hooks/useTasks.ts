import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Task } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export const useTasks = (
  periodFilter: string = 'all',
  archiveStatusFilter: 'active' | 'archived' | 'all' = 'active',
  projectFilter: string = 'all', // Add projectFilter parameter
  assigneeFilter: string = 'all', // Add assigneeFilter parameter
  statusFilter: string = 'all', // Add statusFilter parameter
  priorityFilter: string = 'all', // Add priorityFilter parameter
  searchTerm: string = '', // Add searchTerm parameter
  tagFilter: string = 'all', // Add tagFilter parameter
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
    console.log('fetchTasks called'); // Log adicionado aqui
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    console.log('Fetching tasks with filters:', {
      periodFilter,
      archiveStatusFilter,
      projectFilter,
      assigneeFilter,
      statusFilter,
      priorityFilter,
      searchTerm,
      tagFilter,
      myTasksFilter,
      recentlyCompletedFilter,
      delegatedByMeFilter,
    });

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

      // Apply project filter
      if (projectFilter !== 'all') {
        query = query.eq('project_id', projectFilter);
      }

      // Apply assignee filter
       if (assigneeFilter !== 'all') {
           query = query.eq('assignee_id', assigneeFilter);
       }

      // Apply status filter
       if (statusFilter !== 'all') {
           query = query.eq('status', statusFilter);
       }

      // Apply priority filter
       if (priorityFilter !== 'all') {
           query = query.eq('priority', priorityFilter);
       }

      // Apply search term filter
       if (searchTerm) {
           query = query.or(
               `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
               // Add other searchable fields here if needed
           );
       }

      // Apply tag filter (assuming tags are stored as a comma-separated string or similar)
       if (tagFilter !== 'all') {
           query = query.like('tags', `%{${tagFilter}}%`); // Adjust based on how tags are stored
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
  }, [periodFilter, archiveStatusFilter, projectFilter, assigneeFilter, statusFilter, priorityFilter, searchTerm, tagFilter, myTasksFilter, recentlyCompletedFilter, delegatedByMeFilter, user, limit]);

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

      // Filtrar propriedades com valor null, exceto aquelas explicitamente permitidas por Supabase
      const filteredUpdates: { [key: string]: any } = {};
      // Usar asserção de tipo para permitir acesso por string key
      const updatesWithTimestampAsRecord = updatesWithTimestamp as Record<string, any>;

      for (const key in updatesWithTimestampAsRecord) {
        // Você precisaria saber quais campos não aceitam null na sua tabela/API do Supabase
        // Por enquanto, vamos filtrar todos os campos que são explicitamente null no payload de atualização
        if (updatesWithTimestampAsRecord[key] !== null) {
           filteredUpdates[key] = updatesWithTimestampAsRecord[key];
        }
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(filteredUpdates) // Usar o objeto filtrado
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      
      fetchTasks(); // Chama fetchTasks após uma atualização bem-sucedida

      return data; // Ainda retorna os dados atualizados
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
