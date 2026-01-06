import { useState, useEffect } from 'react';
import { useProjects } from '@/hooks/useProjects';
import ProjectsListCascade from '@/components/projects/ProjectsListCascade';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import type { AllTaskFilters, TaskWithDetails } from '@/types';
import TasksFilters from '@/components/tasks/TasksFilters';
import SubtaskDetailSheet from '@/components/tasks/SubtaskDetailSheet';
import { ViewToggle, type ViewType } from '@/components/tasks/ViewToggle';
import { FocusModeSelector, type FocusModeType } from '@/components/tasks/FocusModeSelector';
import { TasksKanbanView } from '@/components/tasks/TasksKanbanView';
import { TasksCalendarView } from '@/components/tasks/TasksCalendarView';
import { AssigneeFilterBanner } from '@/components/tasks/AssigneeFilterBanner';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';

const TasksPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const assigneeFilter = searchParams.get('assignee');
  
  const { user } = useAuth();
  const [filters, setFilters] = useState<AllTaskFilters>(() => ({
    assignee_id: assigneeFilter || undefined,
  }));
  const [focusMode, setFocusMode] = useState<FocusModeType>('none');
  const [taskToDelete, setTaskToDelete] = useState<TaskWithDetails | null>(null);
  const [viewingSubtaskId, setViewingSubtaskId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    return (localStorage.getItem('tasks-view-preference') as ViewType) || 'list';
  });
  
  // Dialog de criação de tarefa
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [defaultDueDate, setDefaultDueDate] = useState<Date | undefined>();
  
  const { projects } = useProjects();
  const { tasks, deleteTask, loading, updateTask, startTask } = useTasks(filters);

  // Sincronizar filtro com URL quando assignee muda
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      assignee_id: assigneeFilter || undefined,
    }));
  }, [assigneeFilter]);

  // Aplica filtro do modo foco
  const getFilteredTasks = () => {
    if (focusMode === 'none' || !tasks) return tasks || [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));

    switch (focusMode) {
      case 'high_priority':
        return tasks.filter(t => t.priority === 'high' && t.status !== 'done');
      case 'due_today':
        return tasks.filter(t => {
          if (!t.due_date || t.status === 'done') return false;
          const due = new Date(t.due_date);
          return due.toDateString() === today.toDateString();
        });
      case 'due_week':
        return tasks.filter(t => {
          if (!t.due_date || t.status === 'done') return false;
          const due = new Date(t.due_date);
          return due >= today && due <= endOfWeek;
        });
      case 'overdue':
        return tasks.filter(t => {
          if (!t.due_date || t.status === 'done') return false;
          return new Date(t.due_date) < today;
        });
      case 'my_in_progress':
        return tasks.filter(t => t.assignee_id === user?.id && t.status === 'progress');
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    localStorage.setItem('tasks-view-preference', view);
  };

  const handleFilterChange = (filterName: keyof AllTaskFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const handleClearFilters = () => {
    setFilters({});
    setFocusMode('none');
    setSearchParams({});
  };

  const handleClearAssigneeFilter = () => {
    setSearchParams({});
    setFilters(prev => ({ ...prev, assignee_id: undefined }));
  };

  const handleOpenCreateDialog = () => {
    setDefaultDueDate(undefined);
    setShowCreateDialog(true);
  };

  const handleDateClick = (date: Date) => {
    setDefaultDueDate(date);
    setShowCreateDialog(true);
  };

  const handleTaskCreated = (task: any) => {
    toast.success('Tarefa criada com sucesso!');
    navigate(`/tasks/${task.id}`);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete.id);
      toast.success('Tarefa excluída com sucesso!');
    } catch (error: any) {
      toast.error('Não foi possível excluir a tarefa.', {
        description: error.message,
      });
    } finally {
      setTaskToDelete(null);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      if (newStatus === 'progress' && startTask) {
        await startTask(taskId);
      } else {
        await updateTask({ id: taskId, updates: { status: newStatus } });
      }
      toast.success('Status atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const focusModeLabels: Record<FocusModeType, string> = {
    none: 'Modo Foco',
    high_priority: 'Prioridade Alta',
    due_today: 'Vence Hoje',
    due_week: 'Esta Semana',
    overdue: 'Atrasadas',
    my_in_progress: 'Minhas em Andamento',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
            {focusMode !== 'none' && (
              <span className="inline-flex items-center bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">
                {focusModeLabels[focusMode] || 'Modo Foco Ativo'}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">Visualize e gerencie suas atividades.</p>
        </div>
        <div className="flex items-center gap-2">
          <FocusModeSelector value={focusMode} onChange={setFocusMode} />
          <ViewToggle value={currentView} onChange={handleViewChange} />
          <Button onClick={handleOpenCreateDialog} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Banner de Filtro por Membro */}
      {assigneeFilter && (
        <AssigneeFilterBanner 
          userId={assigneeFilter} 
          onClear={handleClearAssigneeFilter} 
        />
      )}

      {/* Filtros */}
      <TasksFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Conteúdo baseado na visualização */}
      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : currentView === 'list' ? (
          <ProjectsListCascade 
            projetos={projects} 
            modoFoco={focusMode !== 'none'} 
            teamFilter={filters.teamFilter}
            assigneeFilter={assigneeFilter}
            onOpenSubtask={(id) => setViewingSubtaskId(id)} 
          />
        ) : currentView === 'kanban' ? (
          <TasksKanbanView 
            tasks={filteredTasks} 
            onStatusChange={handleStatusChange}
            onTaskClick={handleTaskClick}
          />
        ) : currentView === 'calendar' ? (
          <TasksCalendarView 
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onDateClick={handleDateClick}
          />
        ) : null}
      </div>

      {/* Dialog de Criação de Tarefa */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultDueDate={defaultDueDate}
        onTaskCreated={handleTaskCreated}
      />

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tarefa "{taskToDelete?.title}"? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancelar</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Excluir
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detalhes da Subtarefa */}
      <SubtaskDetailSheet
        subtaskId={viewingSubtaskId}
        open={!!viewingSubtaskId}
        onOpenChange={(isOpen) => !isOpen && setViewingSubtaskId(null)}
      />
    </div>
  );
};

export default TasksPage;
