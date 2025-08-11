// src/hooks/useTasks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Task } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// Interface para os filtros (sem alterações)
interface TaskFilters {
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  assigneeFilter: string;
  projectFilter: string;
  tagFilter: string;
  archiveStatusFilter: 'archived' | 'unarchived' | 'all';
}

// Função para buscar a lista de tarefas (sem alterações)
const fetchTasksList = async (filters: Partial<TaskFilters>, userId: string | undefined): Promise<Task[]> => {
  if (!userId) return [];
  
  let query = supabase.from('tasks').select('*, project:projects(*), assignee:profiles(*)');
  
  if (filters.searchTerm) {
    query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
  }
  if (filters.statusFilter && filters.statusFilter !== 'all') {
    query = query.eq('status', filters.statusFilter);
  }
  if (filters.priorityFilter && filters.priorityFilter !== 'all') {
    query = query.eq('priority', filters.priorityFilter);
  }
  if (filters.assigneeFilter && filters.assigneeFilter !== 'all') {
    query = query.eq('assignee_id', filters.assigneeFilter);
  }
  if (filters.projectFilter && filters.projectFilter !== 'all') {
    query = query.eq('project_id', filters.projectFilter);
  }
  if (filters.tagFilter && filters.tagFilter !== 'all') {
    query = query.like('tags', `%${filters.tagFilter}%`);
  }
  if (filters.archiveStatusFilter && filters.archiveStatusFilter !== 'all') {
    query = query.eq('archived', filters.archiveStatusFilter === 'archived');
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  
  return data.map(t => ({
    ...t,
    assignee_name: t.assignee?.full_name,
    assignee_avatar: t.assignee?.avatar_url
  })) as Task[];
};

// Função para buscar uma única tarefa (sem alterações)
const fetchTaskById = async (taskId: string): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, project:projects(*), assignee:profiles(*), comments(*), attachments(*), subtasks(*)')
    .eq('id', taskId)
    .single();
    
  if (error) throw error;
  return { ...data, assignee_name: data.assignee?.full_name, assignee_avatar: data.assignee?.avatar_url } as Task;
};

// Hook para a lista de tarefas (sem alterações)
export const useTasks = (filters: Partial<TaskFilters>) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => fetchTasksList(filters, user?.id),
    enabled: !!user,
  });
};

// Hook para uma única tarefa
export const useTask = (taskId: string) => {
  const queryClient = useQueryClient();
  
  const queryInfo = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTaskById(taskId),
    enabled: !!taskId,
  });

  // CORREÇÃO CRÍTICA: As funções de mutação precisam ser async e retornar uma Promise explicitamente.
  const updateTask = useMutation({
    mutationFn: async (updates: Partial<Omit<Task, 'id'>>) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // CORREÇÃO CRÍTICA: Aplicando o mesmo padrão para a função de deletar.
  const deleteTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return { 
    ...queryInfo, 
    updateTask: updateTask.mutateAsync, 
    deleteTask: deleteTask.mutateAsync 
  };
};