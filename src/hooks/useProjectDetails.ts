// src/hooks/useProjectDetails.ts

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Project, TaskWithDetails } from '@/types';

interface ProjectDetailsData {
  project: Project | null;
  tasks: TaskWithDetails[];
}

const fetchProjectDetails = async (projectId: string): Promise<ProjectDetailsData> => {
  if (!projectId) {
    return { project: null, tasks: [] };
  }
  
  // Busca os detalhes do projeto e as tarefas ao mesmo tempo
  const projectPromise = supabase.from('projects').select('*').eq('id', projectId).single();
  const tasksPromise = supabase.from('tasks').select('*, assignee:profiles(*), project:projects(*), category:task_categories(*)').eq('project_id', projectId);

  const [
    { data: projectData, error: projectError },
    { data: tasksData, error: tasksError }
  ] = await Promise.all([projectPromise, tasksPromise]);

  if (projectError) throw new Error(`Erro ao buscar projeto: ${projectError.message}`);
  if (tasksError) throw new Error(`Erro ao buscar tarefas: ${tasksError.message}`);

  return {
    project: projectData,
    tasks: (tasksData as TaskWithDetails[]) || []
  };
};

export const useProjectDetails = (projectId?: string) => {
  return useQuery<ProjectDetailsData, Error>({
    queryKey: ['projectDetails', projectId],
    queryFn: () => fetchProjectDetails(projectId!),
    enabled: !!projectId, // Só executa a query se o projectId existir
  });
};