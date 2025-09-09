import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TaskCategory } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useClassifications = () => {
  const queryClient = useQueryClient();

  const { data: classifications = [], isLoading } = useQuery({
    queryKey: ['classifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .order('name');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const createClassification = useMutation({
    mutationFn: async (newClassification: { name: string; color?: string; description?: string }) => {
      const { data, error } = await supabase.from('task_categories').insert(newClassification).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classifications'] });
    },
  });

  const updateClassification = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { name?: string; color?: string; description?: string } }) => {
      const { data, error } = await supabase
        .from('task_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
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
    classifications,
    isLoading,
    create: createClassification.mutateAsync,
    update: updateClassification.mutateAsync,
    delete: deleteClassification.mutateAsync,
  };
};