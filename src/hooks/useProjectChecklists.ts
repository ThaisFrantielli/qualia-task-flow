
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types';

type ProjectChecklist = Database['public']['Tables']['project_checklists']['Row'];

export const useProjectChecklists = (projectId?: string) => {
  const [checklists, setChecklists] = useState<ProjectChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklists = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_checklists')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChecklists(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar checklists');
    } finally {
      setLoading(false);
    }
  };

  const addChecklistItem = async (title: string) => {
    if (!projectId) return;
    
    try {
      const { error } = await supabase
        .from('project_checklists')
        .insert({ project_id: projectId, title, completed: false });

      if (error) throw error;
      await fetchChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar item');
    }
  };

  const toggleChecklistItem = async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('project_checklists')
        .update({ completed, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar item');
    }
  };

  const deleteChecklistItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_checklists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir item');
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, [projectId]);

  return {
    checklists,
    loading,
    error,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    refetch: fetchChecklists
  };
};
