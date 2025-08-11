// src/hooks/useTasks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Task } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// --- FUNÇÕES DE BUSCA SEPARADAS (MELHOR PARA REACT QUERY) ---

// Função para buscar a LISTA de tarefas com filtros
const fetchTasksList = async (filters: any, userId: string | undefined) => {
  if (!userId) return [];
  
  let query = supabase.from('tasks').select('*, project:projects(*), assignee:profiles(*)');
  
  // --- A SUA LÓGICA DE FILTRAGEM COMPLETA ---
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
  // Adicionar aqui a lógica de periodFilter se necessário

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  
  return data.map(t => ({
    ...t,
    assignee_name: t.assignee?.full_name,
    assignee_avatar: t.assignee?.avatar_url
  })) as Task[];
};

// Função para buscar UMA ÚNICA tarefa
const fetchTaskById = async (taskId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, project:projects(*), assignee:profiles(*), comments(*), attachments(*), subtasks(*)')
    .eq('id', taskId)
    .single();
    
  if (error) throw error;
  return { ...data, assignee_name: data.assignee?.full_name, assignee_avatar: data.assignee?.avatar_url } as Task;
};


// --- HOOK PARA A LISTA DE TAREFAS (PARA A PÁGINA /tasks) ---
export const useTasks = (filters: any) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => fetchTasksList(filters, user?.id),
    enabled: !!user,
  });
};

// --- HOOK PARA UMA ÚNICA TAREFA (PARA A PÁGINA /tasks/:id) ---
export const useTask = (taskId: string) => {
  const queryClient = useQueryClient();
  
  const queryInfo = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTaskById(taskId),
    enabled: !!taskId,
  });

  const updateTask = useMutation({
    mutationFn: (updates: Partial<Task>) => 
      supabase.from('tasks').update(updates).eq('id', taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: () => supabase.from('tasks').delete().eq('id', taskId),
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