import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const { tasks, loading, deleteTask, createTask } = useTasks(filters);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithDetails | null>(null);
  const [viewingSubtaskId, setViewingSubtaskId] = useState<string | null>(null);
  
  // State to control expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Function to toggle row expansion
  const handleToggleRow = (taskId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(taskId)) {
      newExpandedRows.delete(taskId);
    } else {
      newExpandedRows.add(taskId);
    }
    setExpandedRows(newExpandedRows);
  };

  // Function to handle filter changes
  const handleFilterChange = (filterName: keyof AllTaskFilters, value: string) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterName]: value,
    }));
  };

  // Function to clear all filters
  const handleClearFilters = () => {
    setFilters({});
  };

  const handleCreateAndNavigate = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para criar uma tarefa.");
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
      navigate(`/tasks/${newTask.id}`);
    } catch (error: any) {
      toast.error("Não foi possível criar a tarefa.", { description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const hasFilters = useMemo(() => {
    return Object.values(filters).some(value => value && value !== 'all' && value !== 'active');
  }, [filters]);

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete.id);
      toast.success("Tarefa excluída com sucesso!");
      setTaskToDelete(null);
    } catch (error: any) {
      toast.error("Não foi possível excluir a tarefa.", { description: error.message });
    }
  };

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tarefas</h1>
            <p className="text-gray-600">Visualize e gerencie todas as suas atividades.</p>
          </div>
          <Button onClick={handleCreateAndNavigate} disabled={isCreating}>
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Nova Tarefa
          </Button>
        </div>

        <TasksFilters 
          filters={filters} 
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        <div className="border rounded-lg bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Subtarefas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : tasks.length > 0 ? (
                tasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <TaskTableRow 
                      task={task} 
                      isExpanded={expandedRows.has(task.id)}
                      onToggleExpand={() => handleToggleRow(task.id)}
                      onViewDetails={() => navigate(`/tasks/${task.id}`)} 
                      onDeleteRequest={(taskToDelete) => setTaskToDelete(taskToDelete)} 
                    />
                    {expandedRows.has(task.id) && (
                      <ExpandedSubtasks 
                        taskId={task.id}
                        onSubtaskClick={(subtaskId) => setViewingSubtaskId(subtaskId)}
                      />
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-60">
                    <TasksEmptyState hasFilters={hasFilters} focusMode={false} onCreateTask={handleCreateAndNavigate} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a tarefa "{taskToDelete?.title}"? Essa ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setTaskToDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>Excluir</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <SubtaskDetailSheet
        subtaskId={viewingSubtaskId}
        open={!!viewingSubtaskId}
        onOpenChange={(isOpen) => !isOpen && setViewingSubtaskId(null)}
      />
    </>
  );
};

export default TasksPage;