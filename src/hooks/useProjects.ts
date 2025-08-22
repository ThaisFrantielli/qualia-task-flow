// src/hooks/useProjects.ts (VERSÃO APRIMORADA)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/types';

// ProjectWithStats agora estende Project, garantindo todos os campos obrigatórios
export type ProjectWithStats = Project & {
  task_count: number;
  completed_count: number;
  late_count: number;
};

export const useProjects = () => {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // --- CHAMANDO A FUNÇÃO RPC ---
      const { data, error: fetchError } = await supabase.rpc('get_projects_with_stats');

      if (fetchError) throw new Error(fetchError.message);
      
      setProjects(
        (data || []).map((p: any) => ({
          ...p,
          team_id: p.team_id ?? null,
          privacy: p.privacy ?? null,
          portfolio_id: p.portfolio_id ?? null,
          description: p.description ?? null,
          user_id: p.user_id ?? null,
        }))
      );

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

  return { projects, loading, error, refetch: fetchProjects };
};