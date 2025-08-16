// src/hooks/useSubtasks.ts - VERSÃO ALTERNATIVA (caso os nomes das FK sejam diferentes)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Subtask, SubtaskWithDetails, Database } from '@/types'; 

type SubtaskInsert = Database['public']['Tables']['subtasks']['Insert'];

// Função para buscar a LISTA de subtarefas - VERSÃO MAIS SIMPLES
const fetchSubtasks = async (taskId: string): Promise<SubtaskWithDetails[]> => {
  if (!taskId) return [];
  
  try {
    // Primeiro, buscar as subtarefas
    const { data: subtasks, error: subtasksError } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at');
      
    if (subtasksError) throw subtasksError;
    if (!subtasks) return [];

    // Depois, buscar os perfis dos responsáveis
    const assigneeIds = subtasks
      .map(s => s.assignee_id)
      .filter(id => id !== null) as string[];
      
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', assigneeIds);
      
    if (profilesError) throw profilesError;

    // Combinar os dados
    const result: SubtaskWithDetails[] = subtasks.map(subtask => ({
      ...subtask,
      assignee: profiles?.find(p => p.id === subtask.assignee_id) || null,
      secondary_assignee: null, // Por enquanto, vamos ignorar o secondary_assignee
    }));

    return result;
    
  } catch (error: any) {
    console.error('Erro ao buscar subtarefas:', error);
    throw new Error(error.message);
  }
};

// Hook principal para a LISTA de subtarefas
export const useSubtasks = (taskId: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['subtasks', taskId];

  const { data, isLoading, error } = useQuery<SubtaskWithDetails[], Error>({
    queryKey,
    queryFn: () => fetchSubtasks(taskId),
    enabled: !!taskId,
    retry: 2,
  });

  const addSubtask = useMutation({
    mutationFn: async (newSubtask: SubtaskInsert) => {
      const { data, error } = await supabase
        .from('subtasks')
        .insert(newSubtask)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateSubtask = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Subtask> }) => {
      const { data, error } = await supabase
        .from('subtasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
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
                .select('*')
                .eq('id', subtaskId)
                .single();
                
            if (error) throw new Error(error.message);
            return data as SubtaskWithDetails;
        },
        enabled: !!subtaskId,
    });

    const updateSubtask = useMutation({
        mutationFn: async (updates: Partial<Subtask>) => {
            if (!subtaskId) throw new Error("ID da subtarefa não fornecido.");
            const { data, error } = await supabase
                .from('subtasks')
                .update(updates)
                .eq('id', subtaskId)
                .select()
                .single();
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