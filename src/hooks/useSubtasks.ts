// src/hooks/useSubtasks.ts (VERSÃO CORRIGIDA)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// --- CORREÇÃO AQUI: 'SubtaskInsert' foi removido da importação ---
import type { Subtask, SubtaskWithDetails, Database } from '@/types';

// A declaração local é mantida, pois é a fonte da verdade
type SubtaskInsert = Database['public']['Tables']['subtasks']['Insert'];

//
// ... O RESTO DO ARQUIVO PERMANECE EXATAMENTE IGUAL ...
// (Função fetchSubtasks, hook useSubtasks, hook useSubtask)
//

// Função para buscar a LISTA de subtarefas (com assignee) - Original Mantida
const fetchSubtasks = async (taskId: string): Promise<SubtaskWithDetails[]> => {
  if (!taskId) return [];
  
  try {
    const { data: subtasks, error: subtasksError } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at');
      
    if (subtasksError) throw subtasksError;
    if (!subtasks) return [];

    const assigneeIds = subtasks
      .map(s => s.assignee_id)
      .filter(id => id !== null) as string[];
      
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', assigneeIds);
      
    if (profilesError) throw profilesError;

    const result: SubtaskWithDetails[] = subtasks.map(subtask => ({
      ...subtask,
      assignee: profiles?.find(p => p.id === subtask.assignee_id) || null,
      secondary_assignee: null,
    }));

    return result;
    
  } catch (error: any) {
    console.error('Erro ao buscar subtarefas:', error);
    throw new Error(error.message);
  }
};

// Hook principal para a LISTA de subtarefas - Original Mantido
export const useSubtasks = (taskId: string | null) => {
  const queryClient = useQueryClient();
  const queryKey = ['subtasks', taskId];

  const { data, isLoading, error } = useQuery<SubtaskWithDetails[], Error>({
    queryKey,
    queryFn: () => fetchSubtasks(taskId || ''),
    enabled: !!taskId,
    retry: 2,
  });

  const addSubtask = useMutation({
    mutationFn: async (newSubtask: SubtaskInsert) => {
      const { data, error } = await supabase.from('subtasks').insert(newSubtask).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteSubtask = useMutation({
    mutationFn: async (subtaskId: string) => {
      const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return {
    subtasks: data ?? [],
    isLoading,
    error,
    add: addSubtask.mutateAsync,
    update: updateSubtask.mutateAsync,
    delete: deleteSubtask.mutateAsync,
  };
};

// --- HOOK PARA UMA ÚNICA SUBTAREFA (VERSÃO CORRIGIDA E COMPLETA) ---
export const useSubtask = (subtaskId: string | null) => {
    const queryClient = useQueryClient();
    const queryKey = ['subtask', subtaskId];

    const { data, isLoading, isError, error } = useQuery<SubtaskWithDetails | null, Error>({
        queryKey,
        queryFn: async () => {
            if (!subtaskId) return null;
            
            const { data, error: queryError } = await supabase
                .from('subtasks')
                .select('*') 
                .eq('id', subtaskId)
                .single();
                
            if (queryError) {
              if (queryError.code === 'PGRST116') return null;
              throw new Error(queryError.message);
            }
            return data as SubtaskWithDetails;
        },
        enabled: !!subtaskId,
    });

    const updateSubtask = useMutation({
        mutationFn: async (updates: Partial<Subtask>) => {
            if (!subtaskId) throw new Error("ID da subtarefa não fornecido.");
            const { data: updatedData, error: updateError } = await supabase
                .from('subtasks')
                .update(updates)
                .eq('id', subtaskId)
                .select()
                .single();
            if (updateError) throw new Error(updateError.message);
            return updatedData;
        },
        onSuccess: (updatedSubtask) => {
            if (updatedSubtask) {
              queryClient.invalidateQueries({ queryKey: ['subtasks', updatedSubtask.task_id] });
              queryClient.setQueryData(queryKey, updatedSubtask);
            }
        },
    });

    const deleteSubtask = useMutation({
        mutationFn: async () => {
            if (!subtaskId) throw new Error("ID da subtarefa não fornecido para apagar.");
            
            const parentTaskId = data?.task_id;

            const { error: deleteError } = await supabase
                .from('subtasks')
                .delete()
                .eq('id', subtaskId);
            if (deleteError) throw new Error(deleteError.message);

            return { parentTaskId };
        },
        onSuccess: ({ parentTaskId }) => {
            queryClient.removeQueries({ queryKey });
            if (parentTaskId) {
                queryClient.invalidateQueries({ queryKey: ['subtasks', parentTaskId] });
            }
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });

    return {
        subtask: data,
        isLoading,
        isError,
        error,
        update: updateSubtask.mutateAsync,
        delete: deleteSubtask.mutateAsync,
    };
};