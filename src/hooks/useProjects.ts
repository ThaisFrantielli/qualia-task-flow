import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);
      // Add an 'All Projects' option
      const allProjectsOption: Project = { id: 'all', name: 'Todos Projetos', created_at: '', updated_at: '', description: null, color: null, user_id: null };
      setProjects([allProjectsOption, ...(data as Project[] || [])]);
    } catch (err: any) {
      console.error('Erro ao buscar projetos:', err);
      setError(`Erro ao buscar projetos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
  };
};
