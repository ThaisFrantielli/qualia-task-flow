// src/components/projects/ProjectsView.tsx

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import type { Task } from '@/types';
// --- IMPORTAÇÃO DAS FUNÇÕES UTILITÁRIAS ---
import { formatDate, getPriorityColor, getPriorityLabel } from '@/lib/utils';

interface ProjectsViewProps {
  onTaskClick: (task: Task) => void;
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ onTaskClick }) => {
  const { tasks, loading: tasksLoading } = useTasks();
  const { projects, loading: projectsLoading } = useProjects();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  // Agrupa tarefas por projeto
  const tasksByProject = tasks.reduce((acc: { [key: string]: Task[] }, task) => {
    const projectKey = task.project_id || 'sem-projeto';
    if (!acc[projectKey]) {
      acc[projectKey] = [];
    }
    acc[projectKey].push(task);
    return acc;
  }, {});

  // Obtém informações do projeto
  const getProjectInfo = (projectKey: string) => {
    if (projectKey === 'sem-projeto') {
      return { name: 'Sem Projeto', color: '#6b7280', description: 'Tarefas não atribuídas a projetos' };
    }
    const project = projects.find(p => p.id === projectKey);
    return project || { name: 'Projeto Desconhecido', color: '#6b7280', description: '' };
  };

  if (tasksLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando projetos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(tasksByProject).map(([projectKey, projectTasks]) => {
        const projectInfo = getProjectInfo(projectKey);
        const isExpanded = expandedProjects.has(projectKey);

        const completed = projectTasks.filter(t => t.status === 'done').length;
        const inProgress = projectTasks.filter(t => t.status === 'progress').length;
        const todo = projectTasks.filter(t => t.status === 'todo').length;
        const totalTasks = projectTasks.length;
        const progressPercent = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

        return (
          <Collapsible key={projectKey} open={isExpanded} onOpenChange={() => toggleProject(projectKey)}>
            <div className="bg-card text-card-foreground rounded-lg border">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: projectInfo.color || '#6b7280' }}
                  />
                  <div className="flex-grow">
                    <h3 className="font-semibold">{projectInfo.name}</h3>
                  </div>
                  <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
                    <span title="Concluídas">✅ {completed}</span>
                    <span title="Em Progresso">🔄 {inProgress}</span>
                    <span title="Pendentes">🕒 {todo}</span>
                  </div>
                  <div className="w-40 hidden lg:block">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">Progresso</span>
                      <span className="text-sm font-medium">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    {/* Placeholder avatars */}
                    <Avatar className="h-6 w-6 border-2 border-background"><AvatarFallback>A</AvatarFallback></Avatar>
                    <Avatar className="h-6 w-6 border-2 border-background"><AvatarFallback>B</AvatarFallback></Avatar>
                  </div>
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left font-medium text-muted-foreground p-2 w-8"></th>
                        <th className="text-left font-medium text-muted-foreground p-2">Tarefa</th>
                        <th className="text-left font-medium text-muted-foreground p-2">Responsável</th>
                        <th className="text-left font-medium text-muted-foreground p-2">Prazo</th>
                        <th className="text-left font-medium text-muted-foreground p-2">Prioridade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectTasks.map((task) => (
                        <tr
                          key={task.id}
                          className="border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                          onClick={() => onTaskClick(task)}
                        >
                          <td className="p-2 align-middle">
                             <input type="checkbox" checked={task.status === 'done'} readOnly className="form-checkbox h-4 w-4 rounded text-primary border-gray-300 focus:ring-primary"/>
                          </td>
                          <td className="p-2 align-middle font-medium">{task.title}</td>
                          <td className="p-2 align-middle">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={task.assignee_avatar ?? undefined} />
                                <AvatarFallback className="text-xs">
                                  {task.assignee_name ? task.assignee_name.charAt(0).toUpperCase() : '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span>{task.assignee_name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="p-2 align-middle text-muted-foreground">{formatDate(task.due_date)}</td>
                          <td className="p-2 align-middle">
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                              {getPriorityLabel(task.priority)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default ProjectsView;