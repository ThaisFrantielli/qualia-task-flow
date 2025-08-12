// src/hooks/useTasks.ts

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Task, Project, UserProfile } from '@/types';
// Corrigimos a importação para usar os tipos do arquivo central
import type { Task, Profile, Project, TaskWithDetails } from '@/types';
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
// Interface de filtros (sem alteração)
export interface TaskFilters {
  searchTerm?: string;
  statusFilter?: string;
  priorityFilter?: string;
  assigneeFilter?: string;
  projectFilter?: string;
  tagFilter?: string;
  archiveStatusFilter?: 'archived' | 'unarchived' | 'all';
}

// --- FUNÇÃO DE BUSCA PRINCIPAL CORRIGIDA E ROBUSTA ---
const fetchTasksList = async (filters: Partial<TaskFilters>, userId: string | undefined): Promise<TaskWithDetails[]> => {
  if (!userId) return [];

  let query = supabase
    .from('tasks')
    .select('*, project:projects(*), assignee:profiles(*)')
    .eq('user_id', userId);

  
  // A query explícita que já tínhamos. Está correta.
  let query = supabase.from('tasks').select(`
    *,
    assignee: profiles (*),
    project: projects (*)
  `);
  
  // Lógica de filtragem (sem alteração)
  if (filters.searchTerm) {
    query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
  }
  // ... (outros filtros)

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
  if (error) {
    console.error("Supabase fetch error:", error);
    throw error;
  }
  
  // Se os dados retornarem nulos ou vazios, retorna um array vazio.
  if (!data) {
    return [];
  }

  // CORREÇÃO FINAL: Construímos manualmente o objeto final.
  // Isso evita qualquer tipo de erro de conversão (as).
  const finalTasks: TaskWithDetails[] = data.map((taskFromDb: any) => {
    // Pegamos o objeto de 'assignee' que vem do DB
    const assigneeData = taskFromDb.assignee as Profile | null;
    // Pegamos o objeto de 'project' que vem do DB
    const projectData = taskFromDb.project as Project | null;

    // Retornamos um novo objeto com a "forma" exata que nosso tipo TaskWithDetails espera.
    return {
      ...taskFromDb, // Espalha todas as propriedades da tarefa (id, title, status, etc.)
      assignee: assigneeData, // A propriedade 'assignee' agora é o objeto Profile completo (ou nulo)
      project: projectData,   // A propriedade 'project' agora é o objeto Project completo (ou nulo)
    };
  });

  return finalTasks;
};

// --- FUNÇÃO DE BUSCA POR ID CORRIGIDA E ROBUSTA ---
const fetchTaskById = async (taskId: string): Promise<TaskWithDetails> => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
          *,
          assignee: profiles (*),
          project: projects (*),
          comments (*),
          attachments (*),
          subtasks (*)
      `)
      .eq('id', taskId)
      .single();

    if (error) {
      console.error("Supabase fetch by id error:", error);
      throw error;
    }

    // A mesma lógica de construção manual para garantir a consistência
    const taskFromDb: any = data;
    const assigneeData = taskFromDb.assignee as Profile | null;
    const projectData = taskFromDb.project as Project | null;

    const finalTask: TaskWithDetails = {
      ...taskFromDb,
      assignee: assigneeData,
      project: projectData,
      // Os outros joins (comments, attachments, etc.) já estarão no objeto
    };
    
    return finalTask;
};

// Hooks useTasks e useTask (sem alterações na estrutura)
export const useTasks = (filters: Partial<TaskFilters>) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<Task[], Error>({
    queryKey: ['tasks', filters, user?.id],
  return useQuery<TaskWithDetails[], Error>({
    queryKey: ['tasks', filters],
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
  
  const queryInfo = useQuery<TaskWithDetails, Error>({
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
