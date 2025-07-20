import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Calendar, User, Clock, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import type { Database } from '@/integrations/supabase/types';

// Tipagem para uma Tarefa (mantida do seu código original)
type Task = Database['public']['Tables']['tasks']['Row'] & {
  project?: Database['public']['Tables']['projects']['Row'];
  subtasks?: Database['public']['Tables']['subtasks']['Row'][];
  comments?: Database['public']['Tables']['comments']['Row'][];
  attachments?: Database['public']['Tables']['attachments']['Row'][];
};

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

  // Funções auxiliares (mantidas do seu código original)
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não definida';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  const getPriorityLabel = (priority: string) => {
    const labels: { [key: string]: string } = {
      'high': 'Alta',
      'medium': 'Média',
      'low': 'Baixa'
    };
    return labels[priority] || priority;
  };

  // Agrupa tarefas por projeto (mantido do seu código original)
  const tasksByProject = tasks.reduce((acc: { [key: string]: Task[] }, task) => {
    const projectKey = task.project_id || 'sem-projeto';
    if (!acc[projectKey]) {
      acc[projectKey] = [];
    }
    acc[projectKey].push(task);
    return acc;
  }, {});

  // Obtém informações do projeto (mantido do seu código original)
  const getProjectInfo = (projectKey: string) => {
    if (projectKey === 'sem-projeto') {
      return { name: 'Sem Projeto', color: '#6b7280', description: 'Tarefas não atribuídas a projetos' };
    }
    const project = projects.find(p => p.id === projectKey);
    return project || { name: 'Projeto Desconhecido', color: '#6b7280', description: '' };
  };

  // Tela de carregamento
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

  // Renderização principal do componente
  return (
    <div className="space-y-3">
      {Object.entries(tasksByProject).map(([projectKey, projectTasks]) => {
        const projectInfo = getProjectInfo(projectKey);
        const isExpanded = expandedProjects.has(projectKey);

        // --- Lógica de Progresso e contadores ---
        const completed = projectTasks.filter(t => t.status === 'done').length;
        const inProgress = projectTasks.filter(t => t.status === 'progress').length;
        const todo = projectTasks.filter(t => t.status === 'todo').length;
        // const overdue = projectTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
        const totalTasks = projectTasks.length;
        const progressPercent = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

        return (
          <Collapsible key={projectKey} open={isExpanded} onOpenChange={() => toggleProject(projectKey)}>
            <div className="bg-card text-card-foreground rounded-lg border">
              {/* O NOVO HEADER DO PROJETO (Card Clicável) */}
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: projectInfo.color || '#6b7280' }}
                  />
                  
                  <div className="flex-grow">
                    <h3 className="font-semibold">{projectInfo.name}</h3>
                  </div>

                  {/* Indicadores Rápidos */}
                  <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
                    <span title="Concluídas">✅ {completed}</span>
                    <span title="Em Progresso">🔄 {inProgress}</span>
                    <span title="Pendentes">🕒 {todo}</span>
                    {/* <span className="text-red-500" title="Atrasadas">🔴 {overdue}</span> */}
                  </div>

                  {/* Barra de Progresso */}
                  <div className="w-40 hidden lg:block">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">Progresso</span>
                      <span className="text-sm font-medium">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                  </div>

                  {/* Avatares */}
                  <div className="flex -space-x-2">
                    <Avatar className="h-6 w-6 border-2 border-background"><AvatarFallback>A</AvatarFallback></Avatar>
                    <Avatar className="h-6 w-6 border-2 border-background"><AvatarFallback>B</AvatarFallback></Avatar>
                  </div>
                  
                  {/* Ícone de Expandir */}
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              
              {/* A NOVA LISTA DE TAREFAS DETALHADA */}
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
                                <AvatarImage src={task.assignee_avatar || undefined} />
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