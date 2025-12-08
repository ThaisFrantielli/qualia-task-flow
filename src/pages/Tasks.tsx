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

const TasksPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const assigneeFilter = searchParams.get('assignee');
  
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [filters, setFilters] = useState<AllTaskFilters>(() => ({
    assignee_id: assigneeFilter || undefined,
  }));
  const [focusMode, setFocusMode] = useState<FocusModeType>('none');
  const [taskToDelete, setTaskToDelete] = useState<TaskWithDetails | null>(null);
  const [viewingSubtaskId, setViewingSubtaskId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    return (localStorage.getItem('tasks-view-preference') as ViewType) || 'list';
  });
  const { projects } = useProjects();
  const { tasks, deleteTask, createTask, loading, updateTask } = useTasks(filters);

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

  const handleCreateAndNavigate = async () => {
    if (!user?.id) {
      toast.error('Você precisa estar logado para criar uma tarefa.');
      return;
    }
    setIsCreating(true);
    try {
      const newTask = await createTask({
        title: 'Nova Tarefa (sem título)',
        user_id: user.id,
        status: 'todo',
        priority: 'medium',
      });
      toast.success('Tarefa criada com sucesso!');
      navigate(`/tasks/${newTask.id}`);
    } catch (error: any) {
      toast.error('Não foi possível criar a tarefa.', {
        description: error.message,
      });
    } finally {
      setIsCreating(false);
    }
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
      await updateTask({ id: taskId, updates: { status: newStatus } });
      toast.success('Status atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
            {focusMode && (
              <span className="inline-flex items-center bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">
                Modo Foco Ativo
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">Visualize e gerencie suas atividades.</p>
        </div>
        <div className="flex items-center gap-2">
          <FocusModeSelector value={focusMode} onChange={setFocusMode} />
          <ViewToggle value={currentView} onChange={handleViewChange} />
          <Button onClick={handleCreateAndNavigate} disabled={isCreating} className="flex items-center gap-2">
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
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
        isFocusMode={focusMode !== 'none'}
        onToggleFocusMode={() => setFocusMode(focusMode !== 'none' ? 'none' : 'high_priority')}
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
            modoFoco={!!focusMode} 
            teamFilter={filters.teamFilter} 
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
          />
        ) : null}
      </div>

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
