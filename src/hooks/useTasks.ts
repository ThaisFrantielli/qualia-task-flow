// src/hooks/useTasks.ts

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Task, Profile, Project, TaskWithDetails, TaskInsert, TaskUpdate, AppUser } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// Interface de filtros específica para este hook
export interface AllTaskFilters {
  searchTerm?: string;
  statusFilter?: 'all' | 'todo' | 'progress' | 'done' | 'late';
  priorityFilter?: 'all' | 'low' | 'medium' | 'high';
  assigneeFilter?: 'all' | string;
  projectFilter?: 'all' | string;
  tagFilter?: 'all' | string;
  archiveStatusFilter?: 'active' | 'archived' | 'all';
}

const isValidUUID = (uuid: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);

// --- FUNÇÃO DE BUSCA PRINCIPAL ---
const fetchTasksList = async (filters: Partial<AllTaskFilters>, user: AppUser | null): Promise<TaskWithDetails[]> => {
  if (!user?.id || !isValidUUID(user.id)) return [];

  let query = supabase.from('tasks').select(`*, assignee: profiles (*), project: projects (*)`);

  const isAdmin = user?.permissoes?.team === true;
  if (!isAdmin) {
    query = query.eq('user_id', user.id);
  }

  if (filters.searchTerm) query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
  if (filters.statusFilter && filters.statusFilter !== 'all') query = query.eq('status', filters.statusFilter);
  if (filters.projectFilter && filters.projectFilter !== 'all' && isValidUUID(filters.projectFilter)) query = query.eq('project_id', filters.projectFilter);
  if (filters.assigneeFilter && filters.assigneeFilter !== 'all' && isValidUUID(filters.assigneeFilter)) query = query.eq('assignee_id', filters.assigneeFilter);
  if (filters.archiveStatusFilter === 'active') query = query.eq('archived', false);
  if (filters.archiveStatusFilter === 'archived') query = query.eq('archived', true);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  if (!data) return [];

  return data.map((task: any) => ({
    ...task,
    assignee: task.assignee as Profile | null,
    project: task.project as Project | null,
    assignee_name: task.assignee?.full_name ?? null,
    assignee_avatar: task.assignee?.avatar_url ?? null,
  }));
};

// --- FUNÇÃO DE BUSCA POR ID ---
const fetchTaskById = async (taskId: string): Promise<TaskWithDetails | null> => {
  if (!taskId || !isValidUUID(taskId)) throw new Error(`Invalid task ID: ${taskId}`);
  const { data, error } = await supabase.from('tasks').select(`*, assignee: profiles (*), project: projects (*), comments (*), attachments (*), subtasks (*)`).eq('id', taskId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const taskFromDb: any = data;
  return { ...taskFromDb, assignee: taskFromDb.assignee, project: taskFromDb.project, assignee_name: taskFromDb.assignee?.full_name, assignee_avatar: taskFromDb.assignee?.avatar_url };
};

// --- FUNÇÃO PARA CRIAR NOVA TAREFA ---
const createTaskFn = async (taskData: TaskInsert): Promise<Task> => {
  const { data, error } = await supabase.from('tasks').insert(taskData).select().single();
  if (error) throw error;
  return data as Task;
};

// --- HOOK PRINCIPAL ---
export function useTasks(filters: Partial<AllTaskFilters> = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<TaskWithDetails[], Error>({
    queryKey: ['tasks', filters, user?.id],
    queryFn: () => fetchTasksList(filters, user),
    enabled: !!user && !!user.id,
  });

  const createTaskMutation = useMutation({
    mutationFn: createTaskFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: TaskUpdate }) => {
      const { data, error } = await supabase.from('tasks').update(updates).eq('id', taskId).select().single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const tasks = data || [];

  const availableAssignees = useMemo(() => {
    const map = new Map<string, Profile>();
    tasks.forEach(task => { if (task.assignee) map.set(task.assignee.id, task.assignee); });
    return Array.from(map.values());
  }, [tasks]);
  const uniqueProjects = useMemo(() => {
    const map = new Map<string, Project>();
    tasks.forEach(task => { if (task.project) map.set(task.project.id, task.project); });
    return Array.from(map.values());
  }, [tasks]);
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach(task => { if (task.tags) String(task.tags).split(',').forEach(tag => tags.add(tag.trim())); });
    return Array.from(tags);
  }, [tasks]);

  return {
    data: tasks, // Exporta como 'data' para consistência com useQuery
    tasks,      // Exporta também como 'tasks' para conveniência
    loading: isLoading,
    error,
    refetch,
    availableAssignees,
    uniqueProjects,
    uniqueTags,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
  };
}

// --- HOOK PARA UMA ÚNICA TAREFA ---
export function useTask(taskId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<TaskWithDetails | null, Error>({
    queryKey: ['task', taskId],
    queryFn: () => fetchTaskById(taskId),
    enabled: !!taskId && isValidUUID(taskId),
  });

  const updateTask = useMutation({
    mutationFn: async (updates: TaskUpdate) => {
      const { data, error } = await supabase.from('tasks').update(updates).eq('id', taskId).select().single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return {
    data,
    isLoading,
    isError,
    refetch,
    updateTask: updateTask.mutateAsync,
  };
}