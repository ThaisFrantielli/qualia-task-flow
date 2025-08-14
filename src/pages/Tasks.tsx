// src/pages/Tasks.tsx

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

const TasksPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [filters, setFilters] = useState<AllTaskFilters>({});
  const { tasks, loading, deleteTask, createTask } = useTasks(filters);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithDetails | null>(null);

  // --- A LÓGICA CORRETA PARA O BOTÃO "NOVA TAREFA" ---
  const handleCreateAndNavigate = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para criar uma tarefa.");
      return;
    }
    setIsCreating(true);
    try {
      // 1. Cria a tarefa no banco com valores padrão
      const newTask = await createTask({
        title: 'Nova Tarefa (sem título)',
        user_id: user.id,
        status: 'todo',
        priority: 'medium',
      });
      // 2. Navega para a página de detalhes da tarefa recém-criada
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
      // ...
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tarefas</h1>
          <p className="text-gray-600">Visualize e gerencie todas as suas atividades.</p>
        </div>
        {/* --- O BOTÃO AGORA CHAMA A FUNÇÃO CORRETA --- */}
        <Button onClick={handleCreateAndNavigate} disabled={isCreating}>
          {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Nova Tarefa
        </Button>
      </div>

      <TasksFilters filters={filters} onFilterChange={() => {}} onClearFilters={() => {}} />

      <div className="border rounded-lg bg-white">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Tarefa</TableHead><TableHead>Status</TableHead><TableHead>Prioridade</TableHead><TableHead>Responsável</TableHead><TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
            {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)
            ) : tasks.length > 0 ? (
                tasks.map((task) => (
                <TaskTableRow key={task.id} task={task} onViewDetails={() => navigate(`/tasks/${task.id}`)} onDeleteRequest={() => setTaskToDelete(task)} />
                ))
            ) : (
                <TableRow><TableCell colSpan={5} className="h-60">
                    <TasksEmptyState hasFilters={hasFilters} focusMode={false} onCreateTask={handleCreateAndNavigate} />
                </TableCell></TableRow>
            )}
            </TableBody>
        </Table>
      </div>
      
      {/* AlertDialog para exclusão... */}
    </div>
  );
};

export default TasksPage;