// src/pages/ProjectDetailPage.tsx - Refatorado com design moderno

import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { TaskWithDetails } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProjectDetails } from '@/hooks/useProjectDetails';
import { useProjectSections } from '@/hooks/useProjectSections';
import { useTasksRealtime } from '@/hooks/useRealtimeUpdates';
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet';
import SubtaskDetailSheet from '@/components/tasks/SubtaskDetailSheet';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { SectionManager } from '@/components/projects/SectionManager';
import { TaskProgressBar } from '@/components/tasks/TaskProgressBar';
import { EditProjectForm } from '@/components/EditProjectForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatDateSafe, dateToLocalDateOnlyISO } from '@/lib/dateUtils';
import { getInitials, cn } from '@/lib/utils';
import { 
  ArrowLeft, 
  Plus, 
  Loader2, 
  ChevronDown, 
  ChevronRight,
  MoreHorizontal,
  Calendar,
  Edit,
  Trash2,
  Settings,
  ListTodo
} from 'lucide-react';

const priorityConfig = {
  high: { label: 'Alta', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  medium: { label: 'Média', className: 'bg-warning/10 text-warning border-warning/20' },
  low: { label: 'Baixa', className: 'bg-muted text-muted-foreground border-border' },
};

const statusConfig = {
  done: { label: 'Concluída', className: 'text-success' },
  progress: { label: 'Em Progresso', className: 'text-primary' },
  todo: { label: 'A Fazer', className: 'text-muted-foreground' },
};

const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading, isError, refetch } = useProjectDetails(projectId);
  const { sections, refetch: refetchSections } = useProjectSections(projectId);
  const project = data?.project;

  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [viewingSubtaskId, setViewingSubtaskId] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  // Real-time updates
  useTasksRealtime(projectId);

  useEffect(() => {
    if (data?.tasks) setTasks(data.tasks);
  }, [data?.tasks]);

  // Inicializa seções expandidas
  useEffect(() => {
    if (sections.length > 0) {
      const expanded: Record<string, boolean> = {};
      sections.forEach(s => {
        expanded[s.id] = true;
      });
      // Seção "Geral" sempre expandida
      expanded['general'] = true;
      setExpandedSections(expanded);
    }
  }, [sections]);

  // Agrupa tarefas por seção
  const tasksBySection = useMemo(() => {
    const grouped: Record<string, TaskWithDetails[]> = { general: [] };
    
    sections.forEach(s => {
      grouped[s.id] = [];
    });

    tasks.forEach(task => {
      const sectionId = task.section || 'general';
      if (!grouped[sectionId]) {
        grouped[sectionId] = [];
      }
      grouped[sectionId].push(task);
    });

    return grouped;
  }, [tasks, sections]);

  // Calcula progresso geral
  const projectProgress = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [tasks]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleTaskAdded = (newTask: TaskWithDetails) => {
    setTasks(prev => [...prev, newTask]);
    toast.success('Tarefa criada!');
  };

  const handleToggleComplete = async (task: TaskWithDetails) => {
    const taskId = task.id;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    setUpdatingTaskIds(prev => new Set(prev).add(taskId));
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus, 
          end_date: newStatus === 'done' ? dateToLocalDateOnlyISO(new Date()) : null 
        })
        .eq('id', taskId);
        
      if (error) throw error;
      toast.success(newStatus === 'done' ? 'Tarefa concluída!' : 'Tarefa reaberta');
    } catch (err: unknown) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: task.status } : t));
      toast.error('Erro ao atualizar tarefa');
    } finally {
      setUpdatingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Tarefa excluída');
    } catch (err: unknown) {
      toast.error('Erro ao excluir tarefa');
    }
  };

  const renderTaskRow = (task: TaskWithDetails) => {
    const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.low;
    const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
    const isCompleted = task.status === 'done';
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;

    return (
      <div
        key={task.id}
        className={cn(
          "group flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer",
          isCompleted && "opacity-60"
        )}
        onClick={() => setViewingTaskId(task.id)}
      >
        {/* Checkbox */}
        <Checkbox
          checked={isCompleted}
          disabled={updatingTaskIds.has(task.id)}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={() => handleToggleComplete(task)}
          className="h-5 w-5"
        />

        {/* Task Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium truncate",
              isCompleted && "line-through text-muted-foreground"
            )}>
              {task.title}
            </span>
            {task.subtasks_count && task.subtasks_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                <ListTodo className="h-3 w-3" />
                {task.completed_subtasks_count || 0}/{task.subtasks_count}
              </span>
            )}
          </div>
        </div>

        {/* Priority Badge */}
        <Badge variant="outline" className={cn("text-xs", priority.className)}>
          {priority.label}
        </Badge>

        {/* Status */}
        <span className={cn("text-sm hidden md:block", status.className)}>
          {status.label}
        </span>

        {/* Assignee */}
        <div className="hidden sm:flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={task.assignee?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(task.assignee?.full_name || task.assignee_name)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Due Date */}
        <div className={cn(
          "hidden lg:flex items-center gap-1 text-sm",
          isOverdue ? "text-destructive" : "text-muted-foreground"
        )}>
          <Calendar className="h-3.5 w-3.5" />
          {task.due_date ? formatDateSafe(task.due_date, 'dd/MM') : '-'}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewingTaskId(task.id); }}>
              <Edit className="h-4 w-4 mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-xl font-semibold text-foreground">Projeto não encontrado</h2>
        <Link to="/projects">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para projetos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground">
          <Link to="/projects" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Projetos
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-foreground">{project.name}</span>
        </nav>

        {/* Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: project.color || 'hsl(var(--primary))' }}
              />
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{project.name}</h1>
            </div>
            {project.description && (
              <p className="text-muted-foreground text-sm max-w-xl">{project.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSectionManager(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Seções
            </Button>
            <EditProjectForm project={project} onProjectUpdated={refetch} />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Progresso do Projeto</span>
            <span className="text-sm text-muted-foreground">
              {projectProgress.completed} de {projectProgress.total} tarefas
            </span>
          </div>
          <TaskProgressBar 
            completed={projectProgress.completed} 
            total={projectProgress.total} 
            className="h-2"
          />
        </div>
      </div>

      {/* Add Task Button */}
      <div className="flex items-center gap-2">
        <Button onClick={() => setShowCreateTask(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Task Sections */}
      <div className="space-y-4">
        {/* General Section (tasks without section) */}
        {tasksBySection.general && tasksBySection.general.length > 0 && (
          <Collapsible 
            open={expandedSections.general !== false}
            onOpenChange={() => toggleSection('general')}
          >
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                  {expandedSections.general !== false ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-semibold text-foreground">Tarefas Gerais</span>
                  <Badge variant="secondary" className="text-xs">
                    {tasksBySection.general.length}
                  </Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {tasksBySection.general.map(renderTaskRow)}
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Custom Sections */}
        {sections.map(section => {
          const sectionTasks = tasksBySection[section.id] || [];
          const completedCount = sectionTasks.filter(t => t.status === 'done').length;
          
          return (
            <Collapsible 
              key={section.id}
              open={expandedSections[section.id] !== false}
              onOpenChange={() => toggleSection(section.id)}
            >
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                    {expandedSections[section.id] !== false ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: section.color || 'hsl(var(--primary))' }}
                    />
                    <span className="font-semibold text-foreground">{section.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {completedCount}/{sectionTasks.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {sectionTasks.length === 0 ? (
                    <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Nenhuma tarefa nesta seção
                    </div>
                  ) : (
                    sectionTasks.map(renderTaskRow)
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma tarefa ainda</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Comece adicionando tarefas a este projeto
            </p>
            <Button onClick={() => setShowCreateTask(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira tarefa
            </Button>
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <CreateTaskDialog 
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        defaultProjectId={projectId}
        onTaskCreated={handleTaskAdded}
      />

      {/* Section Manager Dialog */}
      {projectId && (
        <SectionManager 
          open={showSectionManager}
          onOpenChange={(open) => {
            setShowSectionManager(open);
            if (!open) refetchSections();
          }}
          projectId={projectId}
        />
      )}

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        taskId={viewingTaskId}
        open={!!viewingTaskId}
        onOpenChange={(isOpen) => !isOpen && setViewingTaskId(null)}
        onTaskUpdate={refetch}
      />

      {/* Subtask Detail Sheet */}
      <SubtaskDetailSheet
        subtaskId={viewingSubtaskId}
        open={!!viewingSubtaskId}
        onOpenChange={(isOpen) => !isOpen && setViewingSubtaskId(null)}
      />
    </div>
  );
};

export default ProjectDetailPage;
