// src/hooks/useClassifications.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskCategory } from '@/types';

const fetchClassifications = async (): Promise<TaskCategory[]> => {
  const { data, error } = await supabase.from('task_categories').select('*').order('name');
  if (error) throw new Error(error.message);
  return data;
};

export const useClassifications = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<TaskCategory[], Error>({
    queryKey: ['classifications'],
    queryFn: fetchClassifications,
  });

  const createClassification = useMutation({
    mutationFn: async (newClassification: Partial<Omit<TaskCategory, 'id' | 'created_at'>>) => {
      const { data, error } = await supabase.from('task_categories').insert(newClassification).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classifications'] });
    },
  });

  // --- MUTATION DE ATUALIZAÇÃO ADICIONADA ---
  const updateClassification = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TaskCategory> }) => {
      const { data, error } = await supabase.from('task_categories').update(updates).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classifications'] });
    },
  });

  const deleteClassification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_categories').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classifications'] });
    },
  });

  return {
    classifications: data ?? [],
    isLoading,
    error,
    create: createClassification.mutateAsync,
    update: updateClassification.mutateAsync, // <-- Exportando a nova função
    delete: deleteClassification.mutateAsync,
  };
};