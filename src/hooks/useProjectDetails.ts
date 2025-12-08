// src/hooks/useProjectDetails.ts - Atualizado para incluir seções

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
  const projectPromise = supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
    
  const tasksPromise = supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles(*),
      project:projects(*),
      category:task_categories(*)
    `)
    .eq('project_id', projectId)
    .order('order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  // Buscar contagem de subtarefas para cada tarefa
  const subtasksCountPromise = supabase
    .from('subtasks')
    .select('task_id, completed')
    .in('task_id', 
      (await supabase.from('tasks').select('id').eq('project_id', projectId))
        .data?.map(t => t.id) || []
    );

  const [
    { data: projectData, error: projectError },
    { data: tasksData, error: tasksError },
    { data: subtasksData }
  ] = await Promise.all([projectPromise, tasksPromise, subtasksCountPromise]);

  if (projectError) throw new Error(`Erro ao buscar projeto: ${projectError.message}`);
  if (tasksError) throw new Error(`Erro ao buscar tarefas: ${tasksError.message}`);

  // Calcular contagem de subtarefas por tarefa
  const subtasksCounts: Record<string, { total: number; completed: number }> = {};
  subtasksData?.forEach(subtask => {
    if (!subtasksCounts[subtask.task_id]) {
      subtasksCounts[subtask.task_id] = { total: 0, completed: 0 };
    }
    subtasksCounts[subtask.task_id].total++;
    if (subtask.completed) {
      subtasksCounts[subtask.task_id].completed++;
    }
  });

  // Adicionar contagem às tarefas
  const tasksWithCounts = (tasksData || []).map(task => ({
    ...task,
    subtasks_count: subtasksCounts[task.id]?.total || 0,
    completed_subtasks_count: subtasksCounts[task.id]?.completed || 0,
  }));

  return {
    project: projectData,
    tasks: tasksWithCounts as TaskWithDetails[]
  };
};

export const useProjectDetails = (projectId?: string) => {
  return useQuery<ProjectDetailsData, Error>({
    queryKey: ['projectDetails', projectId],
    queryFn: () => fetchProjectDetails(projectId!),
    enabled: !!projectId,
    staleTime: 30000, // 30 segundos
  });
};
