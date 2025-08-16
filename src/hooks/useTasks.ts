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

const isValidUUID = (uuid: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
};

const fetchTasksList = async (filters: Partial<AllTaskFilters>, user: AppUser | null): Promise<TaskWithDetails[]> => {
    if (!user?.id || !isValidUUID(user.id)) return [];
    
    let query = supabase.from('tasks').select(`
        *, 
        assignee: profiles (*), 
        project: projects (*), 
        category: task_categories (*),
        subtasks ( count ),
        completed_subtasks:subtasks ( count )
    `).eq('completed_subtasks.completed', true);

    const isAdmin = user?.permissoes && typeof user.permissoes === 'object' && 'team' in user.permissoes && (user.permissoes as any).team === true;

    if (!isAdmin) { 
        query = query.eq('user_id', user.id);
    }

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
        subtasks_count: task.subtasks[0]?.count || 0, 
        completed_subtasks_count: task.completed_subtasks[0]?.count || 0,
    })) || [];
};

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

const createTaskFn = async (taskData: TaskInsert): Promise<Task> => {
    const { data, error } = await supabase.from('tasks').insert(taskData).select().single();
    if (error) throw new Error(error.message);
    return data;
};

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

export function useTask(taskId: string) {
    const queryClient = useQueryClient();

    const { data: task, isLoading, isError, refetch } = useQuery({
        queryKey: ['task', taskId],
        queryFn: () => fetchTaskById(taskId),
        enabled: !!taskId && isValidUUID(taskId),
    });

    const updateTaskMutation = useMutation({
        mutationFn: async (updates: TaskUpdate) => {
            // Validate priority if provided
            if (updates.priority && !['low', 'medium', 'high'].includes(updates.priority)) {
                throw new Error('Prioridade inválida. Use "low", "medium" ou "high".');
            }

            // Ensure taskId is valid
            if (!taskId || !isValidUUID(taskId)) {
                throw new Error('ID da tarefa inválido.');
            }

            const { data, error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', taskId)
                .select(`
                    *,
                    assignee: profiles(*),
                    project: projects(*),
                    category: task_categories(*)
                `)
                .single();

            if (error) throw new Error(error.message);

            return {
                ...data,
                assignee: data.assignee as Profile | null,
                project: data.project as Project | null,
                category: data.category as TaskCategory | null,
            } as TaskWithDetails;
        },
        onSuccess: () => {
            toast.success("Tarefa atualizada com sucesso!");
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        },
        onError: (error: any) => {
            toast.error("Erro ao atualizar a tarefa", { description: error.message });
        }
    });

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