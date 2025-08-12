// src/hooks/useTasks.ts

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Task, Project, UserProfile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export type AllTaskFilters = {
  searchTerm: string;
  statusFilter: 'all' | 'todo' | 'progress' | 'done' | 'late';
  priorityFilter: 'all' | 'low' | 'medium' | 'high';
  assigneeFilter: 'all' | string;
  projectFilter: 'all' | string;
  tagFilter: 'all' | string;
  archiveStatusFilter: 'active' | 'archived' | 'all';
};

const fetchTasksList = async (filters: Partial<AllTaskFilters>, userId: string | undefined): Promise<Task[]> => {
  if (!userId) return [];

  let query = supabase
    .from('tasks')
    .select('*, project:projects(*), assignee:profiles(*)')
    .eq('user_id', userId);

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

  // Enriquecer com nomes/avatars do responsável quando não vierem das colunas diretas
  return (data || []).map((t: any) => ({
    ...t,
    assignee_name: t.assignee_name ?? t.assignee?.full_name ?? null,
    assignee_avatar: t.assignee_avatar ?? t.assignee?.avatar_url ?? null,
  })) as Task[];
};

export const useTasks = (filters: Partial<AllTaskFilters> = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<Task[], Error>({
    queryKey: ['tasks', filters, user?.id],
    queryFn: () => fetchTasksList(filters, user?.id),
    enabled: !!user,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task['status'] }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
  });

  const tasks = query.data || [];

  const uniqueTags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.tags) t.tags.split(',').map(s => s.trim()).filter(Boolean).forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort();
  }, [tasks]);

  const availableAssignees = useMemo(() => {
    const map = new Map<string, { id: string; full_name: string | null; email: string | null }>();
    tasks.forEach((t) => {
      if (t.assignee_id) {
        if (!map.has(t.assignee_id)) {
          map.set(t.assignee_id, {
            id: t.assignee_id,
            full_name: t.assignee_name ?? null,
            email: null,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [tasks]);

  const uniqueProjects = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    tasks.forEach((t) => {
      if (t.project_id) map.set(t.project_id, { id: t.project_id, name: (t as Task).project?.name || 'Projeto' });
    });
    return Array.from(map.values());
  }, [tasks]);

  return {
    tasks,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    uniqueTags,
    availableAssignees,
    uniqueProjects,
    updateTask: (taskId: string, updates: Partial<Task>) => updateTaskMutation.mutateAsync({ taskId, updates }),
    updateTaskStatus: (taskId: string, status: Task['status']) => updateStatusMutation.mutateAsync({ taskId, status }),
  } as const;
};

// Hook para uma única tarefa (completo com relações)
export const useTask = (taskId: string) => {
  const queryClient = useQueryClient();

  const queryInfo = useQuery<Task | null, Error>({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(*), assignee:profiles(*), comments(*), attachments(*), subtasks(*)')
        .eq('id', taskId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        assignee_name: (data as any).assignee_name ?? (data as any).assignee?.full_name ?? null,
        assignee_avatar: (data as any).assignee_avatar ?? (data as any).assignee?.avatar_url ?? null,
      } as Task;
    },
    enabled: !!taskId,
  });

  const updateTask = useMutation({
    mutationFn: async (updates: Partial<Omit<Task, 'id'>>) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return {
    ...queryInfo,
    updateTask: updateTask.mutateAsync,
    deleteTask: deleteTask.mutateAsync,
  } as const;
};
