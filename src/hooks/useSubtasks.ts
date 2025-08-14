// src/hooks/useSubtasks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Subtask, SubtaskWithDetails, Database } from '@/types'; 

type SubtaskInsert = Database['public']['Tables']['subtasks']['Insert'];

// Função para buscar a LISTA de subtarefas
const fetchSubtasks = async (taskId: string): Promise<SubtaskWithDetails[]> => {
  if (!taskId) return [];
  const { data, error } = await supabase
    .from('subtasks')
    .select('*, assignee:profiles(id, full_name, avatar_url)')
    .eq('task_id', taskId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return data || [];
};

// Hook principal para a LISTA de subtarefas
export const useSubtasks = (taskId: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['subtasks', taskId];

  const { data, isLoading, error } = useQuery<SubtaskWithDetails[], Error>({
    queryKey,
    queryFn: () => fetchSubtasks(taskId),
    enabled: !!taskId,
  });

  const addSubtask = useMutation({
    mutationFn: async (newSubtask: SubtaskInsert) => {
      const { data, error } = await supabase.from('subtasks').insert(newSubtask).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateSubtask = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Subtask> }) => {
      const { data, error } = await supabase.from('subtasks').update(updates).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    subtasks: data ?? [],
    isLoading,
    error,
    add: addSubtask.mutateAsync,
    update: updateSubtask.mutateAsync,
  };
};

// Hook para UMA ÚNICA subtarefa
export const useSubtask = (subtaskId: string | null) => {
    const queryClient = useQueryClient();
    const queryKey = ['subtask', subtaskId];

    const { data, isLoading, isError } = useQuery<SubtaskWithDetails | null, Error>({
        queryKey,
        queryFn: async () => {
            if (!subtaskId) return null;
            const { data, error } = await supabase
                .from('subtasks')
                .select(`*, assignee:profiles(*), secondary_assignee:profiles(*)`)
                .eq('id', subtaskId)
                .single();
            if (error) throw new Error(error.message);
            return data;
        },
        enabled: !!subtaskId,
    });

    const updateSubtask = useMutation({
        mutationFn: async (updates: Partial<Subtask>) => {
            if (!subtaskId) throw new Error("ID da subtarefa não fornecido.");
            const { data, error } = await supabase.from('subtasks').update(updates).eq('id', subtaskId).select().single();
            if (error) throw new Error(error.message);
            return data;
        },
        onSuccess: (updatedSubtask) => {
            queryClient.invalidateQueries({ queryKey: ['subtasks', updatedSubtask.task_id] });
            queryClient.setQueryData(queryKey, updatedSubtask);
        },
    });

    return {
        subtask: data,
        isLoading,
        isError,
        update: updateSubtask.mutateAsync,
    };
};