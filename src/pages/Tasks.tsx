import React, { useState, useMemo } from 'react';
import { useProjects } from '@/hooks/useProjects';
import ProjectsListCascade from '@/components/projects/ProjectsListCascade';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
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
import TasksEmptyState from '@/components/tasks/TasksEmptyState';
import TaskTableRow from '@/components/tasks/TaskTableRow';
import ExpandedSubtasks from '@/components/tasks/ExpandedSubtasks';
import SubtaskDetailSheet from '@/components/tasks/SubtaskDetailSheet';

const TasksPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [filters, setFilters] = useState<AllTaskFilters>({});
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithDetails | null>(null);
  const [viewingSubtaskId, setViewingSubtaskId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { projects } = useProjects();

  const { tasks, loading, deleteTask, createTask } = useTasks(filters);

  // Filtragem otimizada para Modo Foco
  const displayedTasks = useMemo(() => {
    if (isFocusMode && user?.id) {
      return tasks.filter((task) => task.assignee_id === user.id);
    }
    return tasks;
  }, [tasks, isFocusMode, user?.id]);

  // Verifica se há filtros ativos (incluindo Modo Foco)
  const hasFilters = useMemo(
    () => isFocusMode || Object.values(filters).some((v) => v && v !== 'all'),
    [filters, isFocusMode]
  );

  // Manipuladores de eventos
  const handleToggleRow = (taskId: string) => {
    setExpandedRows((prev) => {
      const newExpandedRows = new Set(prev);
      if (newExpandedRows.has(taskId)) {
        newExpandedRows.delete(taskId);
      } else {
        newExpandedRows.add(taskId);
      }
      return newExpandedRows;
    });
  };

  const handleFilterChange = (filterName: keyof AllTaskFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const handleClearFilters = () => {
    setFilters({});
    setIsFocusMode(false); // Desativa Modo Foco ao limpar filtros
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

  return (
  <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-gray-600 text-sm">Visualize e gerencie suas atividades.</p>
        </div>
        <Button onClick={handleCreateAndNavigate} disabled={isCreating} className="flex items-center gap-2">
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Nova Tarefa
        </Button>
      </div>

      {/* Filtros */}
      <TasksFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        isFocusMode={isFocusMode}
        onToggleFocusMode={() => setIsFocusMode((prev) => !prev)}
      />

      {/* Cascata Portfólio > Projeto > Tarefas > Subtarefas */}
      <div className="mt-4">
        <ProjectsListCascade projetos={projects} />
      </div>

      {/* Tabela de Tarefas removida. As tarefas agora aparecem apenas dentro do bloco de Portfólio/Projeto na cascata. */}

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