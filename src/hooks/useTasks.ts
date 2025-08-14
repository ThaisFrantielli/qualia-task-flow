// src/hooks/useTasks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
    Task, 
    TaskWithDetails, 
    TaskInsert, 
    TaskUpdate, 
    AppUser, 
    AllTaskFilters, 
    Profile, 
    Project, 
    TaskCategory 
} from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const isValidUUID = (uuid: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);

// --- Função para buscar a LISTA de tarefas ---
const fetchTasksList = async (filters: Partial<AllTaskFilters>, user: AppUser | null): Promise<TaskWithDetails[]> => {
  if (!user?.id || !isValidUUID(user.id)) return [];
  
  let query = supabase.from('tasks').select(`
    *, 
    assignee: profiles (*), 
    project: projects (*), 
    category: task_categories (*)
  `);

  const isAdmin = user?.permissoes?.team === true;
  if (!isAdmin) { 
    query = query.eq('user_id', user.id); 
  }

  // Lógica de filtros (pode ser expandida conforme necessário)
  if (filters.searchTerm) {
    query = query.ilike('title', `%${filters.searchTerm}%`);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  return data?.map((task: any) => ({
    ...task,
    assignee: task.assignee as Profile | null,
    project: task.project as Project | null,
    category: task.category as TaskCategory | null,
  })) || [];
};

// --- Função para buscar UMA ÚNICA tarefa por ID ---
const fetchTaskById = async (taskId: string): Promise<TaskWithDetails | null> => {
    if (!taskId || !isValidUUID(taskId)) return null;
    const { data, error } = await supabase.from('tasks').select(`
        *, 
        assignee: profiles(*), 
        project: projects(*), 
        category: task_categories(*)
    `).eq('id', taskId).single();
    if (error) throw new Error(error.message);
    return data as TaskWithDetails;
};

// --- Função para CRIAR uma tarefa ---
const createTaskFn = async (taskData: TaskInsert): Promise<Task> => {
    const { data, error } = await supabase.from('tasks').insert(taskData).select().single();
    if (error) throw new Error(error.message);
    return data;
};

// --- Hook principal para a LISTA de tarefas ---
export function useTasks(filters: Partial<AllTaskFilters> = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', filters, user?.id],
    queryFn: () => fetchTasksList(filters, user),
    enabled: !!user?.id,
  });

  const createTaskMutation = useMutation({
    mutationFn: createTaskFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
  
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
        const { error } = await supabase.from('tasks').delete().eq('id', taskId);
        if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return {
    tasks: data ?? [],
    loading: isLoading,
    error,
    refetch,
    createTask: createTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
  };
}

// --- Hook para UMA ÚNICA tarefa ---
export function useTask(taskId: string) {
    const queryClient = useQueryClient();

    const { data: task, isLoading, isError, refetch } = useQuery({
        queryKey: ['task', taskId],
        queryFn: () => fetchTaskById(taskId),
        enabled: !!taskId && isValidUUID(taskId),
    });

    const updateTaskMutation = useMutation({
        mutationFn: async (updates: TaskUpdate) => {
            const { data, error } = await supabase.from('tasks').update(updates).eq('id', taskId).select().single();
            if (error) throw new Error(error.message);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        }
    });

    // --- MUTATION PARA INICIAR A TAREFA ---
    const startTaskMutation = useMutation({
        mutationFn: async () => {
            const updates = { 
                status: 'progress', 
                start_date: new Date().toISOString() 
            };
            const { data, error } = await supabase.from('tasks').update(updates).eq('id', taskId);
            if (error) throw new Error(error.message);
            return data;
        },
        onSuccess: () => {
            toast.success("Tarefa iniciada!");
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    // --- MUTATION PARA CONCLUIR A TAREFA ---
    const completeTaskMutation = useMutation({
        mutationFn: async () => {
            const updates = { 
                status: 'done', 
                end_date: new Date().toISOString() 
            };
            const { data, error } = await supabase.from('tasks').update(updates).eq('id', taskId);
            if (error) throw new Error(error.message);
            return data;
        },
        onSuccess: () => {
            toast.success("Tarefa concluída!");
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    return {
        task,
        isLoading,
        isError,
        refetch,
        updateTask: updateTaskMutation.mutateAsync,
        startTask: startTaskMutation.mutateAsync,
        completeTask: completeTaskMutation.mutateAsync,
    };
}