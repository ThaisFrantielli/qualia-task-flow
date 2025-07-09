import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Calendar, Users, Clock, Target, Palette, Plus, Search, Filter, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CreateProjectTrigger } from '@/components/CreateProjectForm';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'] & {
  project?: Database['public']['Tables']['projects']['Row'];
  subtasks?: Database['public']['Tables']['subtasks']['Row'][];
  comments?: Database['public']['Tables']['comments']['Row'][];
  attachments?: Database['public']['Tables']['attachments']['Row'][];
};

type Project = Database['public']['Tables']['projects']['Row'];

const Projects = () => {
  const { tasks, loading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { projects, loading: projectsLoading, refetch: refetchProjects } = useProjects();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const handleProjectCreated = () => {
    refetchProjects();
    refetchTasks();
  };

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

  const getProjectStats = (projectId: string | null) => {
    const projectTasks = tasks.filter(task => task.project_id === projectId);
    const total = projectTasks.length;
    const completed = projectTasks.filter(task => task.status === 'done').length;
    const inProgress = projectTasks.filter(task => task.status === 'progress').length;
    const todo = projectTasks.filter(task => task.status === 'todo').length;
    const overdue = projectTasks.filter(task => {
      if (!task.due_date) return false;
      return new Date(task.due_date) < new Date() && task.status !== 'done';
    }).length;

    return { total, completed, inProgress, todo, overdue };
  };

  const getUniqueAssignees = (projectId: string | null) => {
    const projectTasks = tasks.filter(task => task.project_id === projectId);
    const assignees = projectTasks
      .filter(task => task.assignee_name)
      .map(task => ({
        name: task.assignee_name!,
        avatar: task.assignee_avatar
      }))
      .reduce((acc, assignee) => {
        if (!acc.find(a => a.name === assignee.name)) {
          acc.push(assignee);
        }
        return acc;
      }, [] as { name: string; avatar: string | null }[]);
    
    return assignees;
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

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Adicionar projeto "Sem Projeto" para tarefas não categorizadas
  const tasksWithoutProject = tasks.filter(task => !task.project_id);
  const hasTasksWithoutProject = tasksWithoutProject.length > 0;

  if (tasksLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando projetos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Projetos</h1>
          <p className="text-muted-foreground">
            Gerencie seus projetos e acompanhe o progresso das tarefas
          </p>
        </div>
        <div className="flex space-x-2">
          <CreateProjectTrigger onProjectCreated={handleProjectCreated} />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar projetos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background border-border"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtros
        </Button>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {/* Projeto "Sem Projeto" se existirem tarefas não categorizadas */}
        {hasTasksWithoutProject && (
          <ProjectListItem
            project={{
              id: 'sem-projeto',
              name: 'Sem Projeto',
              description: 'Tarefas não atribuídas a projetos',
              color: '#6b7280',
              created_at: '',
              updated_at: ''
            }}
            stats={getProjectStats(null)}
            assignees={getUniqueAssignees(null)}
            tasks={tasksWithoutProject}
            isExpanded={expandedProjects.has('sem-projeto')}
            onToggle={() => toggleProject('sem-projeto')}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
            getStatusLabel={getStatusLabel}
            getPriorityLabel={getPriorityLabel}
            formatDate={formatDate}
          />
        )}
        
        {/* Projetos regulares */}
        {filteredProjects.map((project) => (
          <ProjectListItem
            key={project.id}
            project={project}
            stats={getProjectStats(project.id)}
            assignees={getUniqueAssignees(project.id)}
            tasks={tasks.filter(task => task.project_id === project.id)}
            isExpanded={expandedProjects.has(project.id)}
            onToggle={() => toggleProject(project.id)}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
            getStatusLabel={getStatusLabel}
            getPriorityLabel={getPriorityLabel}
            formatDate={formatDate}
          />
        ))}
      </div>

      {filteredProjects.length === 0 && !hasTasksWithoutProject && (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum projeto encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Nenhum projeto corresponde à sua busca.' : 'Você ainda não criou nenhum projeto.'}
          </p>
          <CreateProjectTrigger onProjectCreated={handleProjectCreated} />
        </div>
      )}
    </div>
  );
};

interface ProjectListItemProps {
  project: Project & { id: string };
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    overdue: number;
  };
  assignees: { name: string; avatar: string | null }[];
  tasks: Task[];
  isExpanded: boolean;
  onToggle: () => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  getStatusLabel: (status: string) => string;
  getPriorityLabel: (priority: string) => string;
  formatDate: (date: string | null) => string;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({
  project,
  stats,
  assignees,
  tasks,
  isExpanded,
  onToggle,
  getStatusColor,
  getPriorityColor,
  getStatusLabel,
  getPriorityLabel,
  formatDate,
}) => {
  const progressPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  
  const nearestDeadline = tasks
    .filter(task => task.due_date && task.status !== 'done')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0];

  return (
    <Card className="bg-card border-border">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex items-center space-x-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: project.color || '#6b7280' }}
                  />
                  <FolderOpen className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg font-semibold text-card-foreground">
                    {project.name}
                  </CardTitle>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-sm">
                {/* Stats */}
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {stats.completed} concluídas
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {stats.inProgress} em progresso
                  </Badge>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                    {stats.todo} pendentes
                  </Badge>
                  {stats.overdue > 0 && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {stats.overdue} atrasadas
                    </Badge>
                  )}
                </div>

                {/* Progress */}
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">{progressPercentage}%</span>
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Team */}
                <div className="flex -space-x-2">
                  {assignees.slice(0, 3).map((assignee, index) => (
                    <Avatar key={index} className="w-6 h-6 ring-2 ring-white">
                      <AvatarImage src={assignee.avatar || undefined} />
                      <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                        {assignee.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {assignees.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center ring-2 ring-white">
                      +{assignees.length - 3}
                    </div>
                  )}
                </div>

                <Badge variant="outline" className="text-xs">
                  {stats.total} {stats.total === 1 ? 'tarefa' : 'tarefas'}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-card-foreground">{task.title}</h4>
                        <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                          {getStatusLabel(task.status)}
                        </Badge>
                        <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {getPriorityLabel(task.priority)}
                        </Badge>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        {task.assignee_name && (
                          <div className="flex items-center space-x-1">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={task.assignee_avatar || undefined} />
                              <AvatarFallback className="text-xs bg-muted">
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
};

export default Projects;