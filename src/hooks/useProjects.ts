// src/hooks/useProjects.ts (VERSÃO APRIMORADA)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { filterProjectsByHierarchy } from '@/lib/hierarchyUtils';
import { Project, Profile } from '@/types';

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
      // Buscar dados da hierarquia e membros de projeto em paralelo
      const [hierarchyResult, membersResult, projectsResult] = await Promise.all([
        supabase.from('user_hierarchy').select('user_id, supervisor_id'),
        supabase.from('project_members').select('project_id, user_id'),
        supabase.rpc('get_projects_with_stats')
      ]);
      
      if (hierarchyResult.error) {
        console.error('Erro ao buscar hierarquia:', hierarchyResult.error);
      }
      if (membersResult.error) {
        console.error('Erro ao buscar membros:', membersResult.error);
      }
      if (projectsResult.error) throw new Error(projectsResult.error.message);
      
      const allProjects: ProjectWithStats[] = (projectsResult.data || []).map((p: any) => ({
        ...p,
        task_count: p.task_count ?? 0,
        completed_count: p.completed_count ?? 0,
        late_count: p.late_count ?? 0,
      }));

      // Aplicar filtro hierárquico client-side incluindo membros do projeto
      let filteredProjects = allProjects;
      const hierarchyData = hierarchyResult.data || [];
      const projectMembers = membersResult.data || [];
      
      if (hierarchyData.length > 0 || projectMembers.length > 0) {
        filteredProjects = filterProjectsByHierarchy(
          allProjects, 
          user as Profile, 
          hierarchyData,
          projectMembers
        );
      }

      setProjects(filteredProjects);

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