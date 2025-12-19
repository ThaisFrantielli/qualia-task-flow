import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { dateToLocalISO, dateToLocalDateOnlyISO, parseISODateSafe } from '@/lib/dateUtils';
import { calculateNextDate, generateNextOccurrences } from '@/lib/recurrenceUtils';
import { filterTasksByHierarchy } from '@/lib/hierarchyUtils';
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

    // Buscar dados da hierarquia para aplicar filtros
    const { data: hierarchyData, error: hierarchyError } = await supabase
        .from('user_hierarchy')
        .select('user_id, supervisor_id');

    if (hierarchyError) {
        console.error('Erro ao buscar hierarquia:', hierarchyError);
    }

    // RLS (Row Level Security) do Supabase cuida automaticamente das permissões
    // Mas vamos aplicar filtro adicional client-side para hierarquia
    let query = supabase.from('tasks').select(`
        *, 
        assignee: profiles (*), 
        project: projects (*), 
        category: task_categories (*),
        subtasks ( count ),
        completed_subtasks:subtasks ( count )
    `).eq('completed_subtasks.completed', true);

    // Aplicar filtros de busca do usuário
    if (filters.searchTerm) {
        query = query.ilike('title', `%${filters.searchTerm}%`);
    }

    if (filters.cliente_id) {
        query = query.eq('cliente_id', filters.cliente_id);
    }

    // Filtro por assignee específico (usado quando visualiza tarefas de membro da equipe)
    if (filters.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id);
    }

    // Filtro por status
    if (filters.statusFilter && filters.statusFilter !== 'all') {
        query = query.eq('status', filters.statusFilter);
    }

    // Filtro por prioridade
    if (filters.priorityFilter && filters.priorityFilter !== 'all') {
        query = query.eq('priority', filters.priorityFilter);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const tasks = data?.map((task: any) => ({
        ...task,
        assignee: task.assignee as Profile | null,
        project: task.project as Project | null,
        category: task.category as TaskCategory | null,
        subtasks_count: task.subtasks[0]?.count || 0,
        completed_subtasks_count: task.completed_subtasks[0]?.count || 0,
    })) || [];

    // Aplicar filtro hierárquico client-side
    if (hierarchyData && hierarchyData.length > 0) {
        return filterTasksByHierarchy(tasks, user as Profile, hierarchyData);
    }

    return tasks;
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
    const newTask = data as Task;

    // If created task is recurring, generate initial occurrences (window of future tasks)
    try {
        if ((taskData as any).is_recurring) {
            // fetch freshly created task with details to pass to generator
            const { data: fetched } = await supabase.from('tasks').select('*').eq('id', newTask.id).single();
            if (fetched) {
                const occurrences = generateNextOccurrences(fetched as TaskWithDetails, 5);
                if (occurrences.length > 0) {
                    await supabase.from('tasks').insert(occurrences);
                }
            }
        }
    } catch (e) {
        // don't fail creation if occurrences generation fails, just log
        console.error('Erro gerando ocorrências iniciais:', e);
    }

    return newTask;
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

    const updateTaskMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<TaskUpdate> }) => {
            if (!id || !isValidUUID(id)) throw new Error('ID da tarefa inválido.');
            const { data, error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', id)
                .select(`*, assignee: profiles(*), project: projects(*), category: task_categories(*)`)
                .single();
            if (error) throw new Error(error.message);
            return data as TaskWithDetails;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        onError: (err: any) => {
            console.error('Erro ao atualizar tarefa:', err);
        }
    });

    return {
        tasks: data ?? [],
        loading: isLoading,
        error,
        refetch,
        createTask: createTaskMutation.mutateAsync,
        deleteTask: deleteTaskMutation.mutateAsync,
        updateTask: updateTaskMutation.mutateAsync,
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
            const typedData = data as TaskWithDetails;

            // Lógica de recorrência: criar próxima instância se for recorrente e concluída
            if (typedData.is_recurring && (updates.status === 'done' || updates.status === 'late')) {
                const parsedDue = parseISODateSafe(typedData.due_date as any);
                let nextDate: Date | null = null;
                if (parsedDue) {
                    nextDate = calculateNextDate(parsedDue, typedData.recurrence_pattern as any, (typedData.recurrence_interval as any) || 1, typedData.recurrence_days);
                }

                const recurrenceEndDate = parseISODateSafe(typedData.recurrence_end as any);
                if (nextDate && (!recurrenceEndDate || nextDate <= recurrenceEndDate)) {
                    await supabase.from('tasks').insert({
                        title: typedData.title,
                        description: typedData.description,
                        status: 'todo',
                        priority: typedData.priority,
                        due_date: dateToLocalDateOnlyISO(nextDate),
                        is_recurring: false,
                        parent_task_id: typedData.id,
                        project_id: typedData.project_id,
                        assignee_id: typedData.assignee_id,
                        category_id: typedData.category_id,
                    });
                }
            }

            return {
                ...typedData,
                assignee: typedData.assignee as Profile | null,
                project: typedData.project as Project | null,
                category: typedData.category as TaskCategory | null,
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
                start_date: dateToLocalISO(new Date())
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
                end_date: dateToLocalISO(new Date())
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