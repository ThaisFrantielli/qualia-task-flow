// src/hooks/useSubtasks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// --- CORREÇÃO 1: Importar 'Database' e outros tipos necessários ---
import type { Database, Subtask, SubtaskWithDetails } from '@/types';

// O tipo que o formulário de criação usará
type SubtaskInsert = Database['public']['Tables']['subtasks']['Insert'];

const fetchSubtasks = async (taskId: string): Promise<SubtaskWithDetails[]> => {
  if (!taskId) return [];
  const { data, error } = await supabase
    .from('subtasks')
    .select('*, assignee:profiles(id, full_name, avatar_url)')
    .eq('task_id', taskId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return data as SubtaskWithDetails[]; // Adicionamos um cast para garantir a tipagem
};

export const useSubtasks = (taskId: string) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<SubtaskWithDetails[], Error>({
    queryKey: ['subtasks', taskId],
    queryFn: () => fetchSubtasks(taskId),
    enabled: !!taskId,
  });

  const addSubtask = useMutation({
    mutationFn: async (newSubtask: SubtaskInsert) => {
      const { data, error } = await supabase.from('subtasks').insert(newSubtask).select().single();
      if (error) throw new Error(error.message);
      // TODO: Adicionar lógica para criar uma notificação para o 'assignee_id'
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
    },
  });

  const updateSubtask = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Subtask> }) => {
      const { data, error } = await supabase.from('subtasks').update(updates).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
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