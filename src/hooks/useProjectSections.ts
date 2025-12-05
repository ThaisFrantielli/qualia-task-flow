import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectSection {
  id: string;
  project_id: string;
  name: string;
  order: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjectSections(projectId?: string) {
  const queryClient = useQueryClient();

  const { data: sections = [], isLoading, error, refetch } = useQuery({
    queryKey: ['project-sections', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_sections')
        .select('*')
        .eq('project_id', projectId)
        .order('order', { ascending: true });
      if (error) throw error;
      return data as ProjectSection[];
    },
    enabled: !!projectId,
  });

  const createSection = useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      if (!projectId) throw new Error('Project ID é obrigatório');
      const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order)) + 1 : 0;
      const { data, error } = await supabase
        .from('project_sections')
        .insert({ project_id: projectId, name, color: color || '#6366f1', order: maxOrder })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sections', projectId] });
      toast.success('Seção criada com sucesso');
    },
    onError: (err: any) => toast.error('Erro ao criar seção', { description: err.message }),
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectSection> }) => {
      const { data, error } = await supabase
        .from('project_sections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sections', projectId] });
    },
    onError: (err: any) => toast.error('Erro ao atualizar seção', { description: err.message }),
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_sections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sections', projectId] });
      toast.success('Seção excluída');
    },
    onError: (err: any) => toast.error('Erro ao excluir seção', { description: err.message }),
  });

  const reorderSections = useMutation({
    mutationFn: async (reorderedSections: { id: string; order: number }[]) => {
      const updates = reorderedSections.map(({ id, order }) =>
        supabase.from('project_sections').update({ order }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sections', projectId] });
    },
  });

  return {
    sections,
    isLoading,
    error,
    refetch,
    createSection: createSection.mutateAsync,
    updateSection: updateSection.mutateAsync,
    deleteSection: deleteSection.mutateAsync,
    reorderSections: reorderSections.mutateAsync,
  };
}
