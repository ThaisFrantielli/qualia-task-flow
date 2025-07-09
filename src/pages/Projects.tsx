import React, { useState } from 'react';
import { Plus, Search, Filter, FolderOpen, Calendar, Users, Clock, Target, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
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
  const { tasks, loading: tasksLoading } = useTasks();
  const { projects, loading: projectsLoading } = useProjects();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

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
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Novo Projeto
          </Button>
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

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Projeto "Sem Projeto" se existirem tarefas não categorizadas */}
        {hasTasksWithoutProject && (
          <ProjectCard
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
            onSelect={() => setSelectedProject('sem-projeto')}
          />
        )}
        
        {/* Projetos regulares */}
        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            stats={getProjectStats(project.id)}
            assignees={getUniqueAssignees(project.id)}
            tasks={tasks.filter(task => task.project_id === project.id)}
            onSelect={() => setSelectedProject(project.id)}
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
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Projeto
          </Button>
        </div>
      )}
    </div>
  );
};

interface ProjectCardProps {
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
  onSelect: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, stats, assignees, tasks, onSelect }) => {
  const progressPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  
  const nearestDeadline = tasks
    .filter(task => task.due_date && task.status !== 'done')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0];

  const getProgressColor = () => {
    if (progressPercentage >= 80) return 'bg-green-500';
    if (progressPercentage >= 50) return 'bg-blue-500';
    if (progressPercentage >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não definida';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Card className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 bg-card border-border" onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
              style={{ backgroundColor: project.color || '#6b7280' }}
            />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg font-semibold text-card-foreground truncate">
                {project.name}
              </CardTitle>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground shrink-0 ml-2">
            {stats.total} {stats.total === 1 ? 'tarefa' : 'tarefas'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium text-card-foreground">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2">
            <div 
              className={`h-full ${getProgressColor()} transition-all duration-300 rounded-full`}
              style={{ width: `${progressPercentage}%` }}
            />
          </Progress>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-green-600">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Feitas</div>
          </div>
          <div className="space-y-1">
            <div className="text-lg font-semibold text-blue-600">{stats.inProgress}</div>
            <div className="text-xs text-muted-foreground">Em Progresso</div>
          </div>
          <div className="space-y-1">
            <div className="text-lg font-semibold text-gray-600">{stats.todo}</div>
            <div className="text-xs text-muted-foreground">A Fazer</div>
          </div>
          <div className="space-y-1">
            <div className="text-lg font-semibold text-red-600">{stats.overdue}</div>
            <div className="text-xs text-muted-foreground">Atrasadas</div>
          </div>
        </div>

        {/* Team and Deadline */}
        <div className="space-y-3 border-t border-border pt-3">
          {/* Team Members */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Equipe</span>
            </div>
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
              {assignees.length === 0 && (
                <span className="text-xs text-muted-foreground">Não atribuído</span>
              )}
            </div>
          </div>

          {/* Nearest Deadline */}
          {nearestDeadline && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Próximo prazo</span>
              </div>
              <span className="text-sm font-medium text-card-foreground">
                {formatDate(nearestDeadline.due_date)}
              </span>
            </div>
          )}

          {/* Total Estimated Hours */}
          {tasks.some(task => task.estimated_hours) && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Estimativa</span>
              </div>
              <span className="text-sm font-medium text-card-foreground">
                {tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0)}h
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Projects;