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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não definida';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'done':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
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

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'todo': 'A Fazer',
      'progress': 'Em Progresso',
      'done': 'Concluído'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: { [key: string]: string } = {
      'high': 'Alta',
      'medium': 'Média',
      'low': 'Baixa'
    };
    return labels[priority] || priority;
  };

  // Group tasks by project
  const tasksByProject = tasks.reduce((acc: { [key: string]: Task[] }, task) => {
    const projectKey = task.project_id || 'sem-projeto';
    if (!acc[projectKey]) {
      acc[projectKey] = [];
    }
    acc[projectKey].push(task);
    return acc;
  }, {});

  // Get project info for a project key
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
    <div className="space-y-4">
      {Object.entries(tasksByProject).map(([projectKey, projectTasks]) => {
        const projectInfo = getProjectInfo(projectKey);
        const isExpanded = expandedProjects.has(projectKey);
        
        return (
          <Card key={projectKey} className="overflow-hidden">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleProject(projectKey)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: projectInfo.color }}
                      />
                      <FolderOpen className="w-5 h-5 text-gray-500" />
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {projectInfo.name}
                        </CardTitle>
                        {projectInfo.description && (
                          <p className="text-sm text-gray-600 mt-1">{projectInfo.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                        {projectTasks.length} {projectTasks.length === 1 ? 'tarefa' : 'tarefas'}
                      </Badge>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {projectTasks.map((task) => (
                      <div 
                        key={task.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => onTaskClick(task)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-gray-900">{task.title}</h4>
                              <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                                {getStatusLabel(task.status)}
                              </Badge>
                              <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                                {getPriorityLabel(task.priority)}
                              </Badge>
                            </div>
                            
                            {task.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              {task.assignee_name && (
                                <div className="flex items-center space-x-1">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={task.assignee_avatar || undefined} />
                                    <AvatarFallback className="text-xs bg-gray-200">
                                      {task.assignee_name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{task.assignee_name}</span>
                                </div>
                              )}
                              
                              {task.due_date && (
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Vence: {formatDate(task.due_date)}</span>
                                </div>
                              )}
                              
                              {task.estimated_hours && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{task.estimated_hours}h estimadas</span>
                                </div>
                              )}
                              
                              {task.subtasks && task.subtasks.length > 0 && (
                                <div className="flex items-center space-x-1">
                                  <span>
                                    {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtarefas
                                  </span>
                                </div>
                              )}
                              
                              {task.comments && task.comments.length > 0 && (
                                <div className="flex items-center space-x-1">
                                  <span>{task.comments.length} comentários</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button variant="ghost" size="sm" className="ml-2">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
};

export default ProjectsView;