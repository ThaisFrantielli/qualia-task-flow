// src/pages/Tasks.tsx

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTasks } from '@/hooks/useTasks';
import type { AllTaskFilters } from '@/hooks/useTasks';
import TasksFilters from '@/components/tasks/TasksFilters';
import { Skeleton } from '@/components/ui/skeleton';
import TasksEmptyState from '@/components/tasks/TasksEmptyState';
import TaskTableRow from '@/components/tasks/TaskTableRow';
import type { TaskWithDetails, Profile, Project } from '@/types';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TasksPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<AllTaskFilters>({
    searchTerm: searchParams.get('q') || '',
    statusFilter: (searchParams.get('status') as AllTaskFilters['statusFilter']) || 'all',
    priorityFilter: (searchParams.get('priority') as AllTaskFilters['priorityFilter']) || 'all',
    assigneeFilter: searchParams.get('assignee') || 'all',
    projectFilter: searchParams.get('project') || 'all',
    tagFilter: searchParams.get('tag') || 'all',
    archiveStatusFilter: (searchParams.get('archived') as AllTaskFilters['archiveStatusFilter']) || 'active',
  });

  const { data: tasks, loading, availableAssignees, uniqueProjects, uniqueTags, deleteTask } = useTasks(filters);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithDetails | null>(null);
  
  const safeTasks = tasks ?? [];
  
  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    if (filters.searchTerm) newSearchParams.set('q', filters.searchTerm);
    if (filters.archiveStatusFilter !== 'active') newSearchParams.set('archived', filters.archiveStatusFilter!);
    setSearchParams(newSearchParams, { replace: true });
  }, [filters, setSearchParams]);

  const handleFilterChange = (filterName: keyof AllTaskFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '', statusFilter: 'all', priorityFilter: 'all',
      assigneeFilter: 'all', projectFilter: 'all', tagFilter: 'all',
      archiveStatusFilter: 'active',
    });
  };

  const hasFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'searchTerm') return !!value;
      if (key === 'archiveStatusFilter') return value !== 'active';
      return value !== 'all';
    });
  }, [filters]);

  const handleViewDetails = (task: TaskWithDetails) => navigate(`/tasks/${task.id}`);

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete.id);
      toast.success(`Tarefa "${taskToDelete.title}" excluída.`);
    } catch (error) {
      toast.error("Falha ao excluir a tarefa.");
    } finally {
      setTaskToDelete(null);
    }
  };

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div><h1 className="text-3xl font-bold">Tarefas</h1><p className="text-gray-600">Visualize e gerencie todas as suas atividades.</p></div>
          <Button onClick={() => navigate('/tasks/new')}><Plus className="mr-2 h-4 w-4" /> Nova Tarefa</Button>
        </div>

        {/* --- A CHAMADA PARA OS FILTROS ESTÁ AQUI --- */}
        <TasksFilters
          searchTerm={filters.searchTerm ?? ''} setSearchTerm={(val) => handleFilterChange('searchTerm', val)}
          statusFilter={filters.statusFilter ?? 'all'} setStatusFilter={(val) => handleFilterChange('statusFilter', val)}
          priorityFilter={filters.priorityFilter ?? 'all'} setPriorityFilter={(val) => handleFilterChange('priorityFilter', val)}
          assigneeFilter={filters.assigneeFilter ?? 'all'} setAssigneeFilter={(val) => handleFilterChange('assigneeFilter', val)}
          projectFilter={filters.projectFilter ?? 'all'} setProjectFilter={(val) => handleFilterChange('projectFilter', val)}
          tagFilter={filters.tagFilter ?? 'all'} setTagFilter={(val) => handleFilterChange('tagFilter', val)}
          archiveStatusFilter={filters.archiveStatusFilter ?? 'active'} setArchiveStatusFilter={(val) => handleFilterChange('archiveStatusFilter', val)}
          uniqueTags={uniqueTags} availableAssignees={availableAssignees as Profile[]}
          uniqueProjects={uniqueProjects as Project[]} hasFilters={hasFilters} onClearFilters={clearFilters}
          periodFilter="" setPeriodFilter={() => {}} viewMode="list" setViewMode={() => {}}
          focusMode={false} setFocusMode={() => {}} groupBy="status" setGroupBy={() => {}}
        />

        <div className="border rounded-lg bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">Tarefa</TableHead><TableHead>Status</TableHead><TableHead>Prioridade</TableHead><TableHead>Responsável</TableHead><TableHead className="text-right w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>))
              ) : safeTasks.length > 0 ? (
                safeTasks.map((task) => (
                  <TaskTableRow 
                    key={task.id} 
                    task={task} 
                    onViewDetails={handleViewDetails}
                    onDeleteRequest={() => setTaskToDelete(task)}
                  />
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-60"><TasksEmptyState hasFilters={hasFilters} focusMode={false} onCreateTask={() => navigate('/tasks/new')} onClearFilters={clearFilters} /></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!taskToDelete} onOpenChange={(isOpen) => !isOpen && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a tarefa
              <strong className="mx-1">"{taskToDelete?.title}"</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TasksPage;