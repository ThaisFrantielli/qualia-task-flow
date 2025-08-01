// src/pages/Tasks.tsx

import React, { useState, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useUsers } from '../hooks/useUsers';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

import { Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TasksFilters from '../components/tasks/TasksFilters';
import TasksEmptyState from '../components/tasks/TasksEmptyState';
import TasksGroupedView from '../components/tasks/TasksGroupedView';
import TaskTable from '../components/TaskTable';
import TaskDetailsModal from '../components/TaskDetailsModal';
import CreateTaskForm from '../components/CreateTaskForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type { Task } from '@/types';

const Tasks = () => {
  // --- ESTADO DOS FILTROS CENTRALIZADO ---
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'all',
    priority: 'all',
    assignee: 'all',
    period: 'all',
    tag: 'all',
    project: 'all',
    archiveStatus: 'active' as 'active' | 'archived' | 'all',
  });

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [groupBy, setGroupBy] = useState<'status' | 'project' | 'assignee'>('status');
  const [focusMode, setFocusMode] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  const { projects: uniqueProjects, loading: loadingProjects } = useProjects();
  const { users: availableAssignees, loading: loadingUsers } = useUsers();

  // O hook useTasks agora consome o estado centralizado 'filters'
  const { tasks, loading, error, archiveTask, deleteTask, refetch } = useTasks(
    focusMode ? 'today' : filters.period,
    filters.archiveStatus,
    filters.project,
    filters.assignee,
    filters.status,
    filters.priority,
    filters.searchTerm,
    filters.tag,
  );

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach(task => {
      if (task.tags) {
        task.tags.split(',').forEach(tag => {
          const trimmedTag = tag.trim();
          if (trimmedTag) tags.add(trimmedTag);
        });
      }
    });
    return Array.from(tags);
  }, [tasks]);

  const hasFilters = useMemo(() =>
    Object.values(filters).some(value => value !== 'all' && value !== '' && value !== 'active') || focusMode,
    [filters, focusMode]
  );
  
  const clearAllFilters = () => {
    setFilters({
      searchTerm: '',
      status: 'all',
      priority: 'all',
      assignee: 'all',
      period: 'all',
      tag: 'all',
      project: 'all',
      archiveStatus: 'active',
    });
    setFocusMode(false);
  };

  const handleTaskClick = (task: Task) => setSelectedTask(task);

  const handlePriorityChange = async (taskId: string, newPriority: string) => {
    try {
      const { error } = await supabase.from('tasks').update({ priority: newPriority }).eq('id', taskId);
      if (error) throw error;
      toast.success('Prioridade da tarefa atualizada.');
      refetch();
    } catch (error) {
      toast.error('Não foi possível atualizar a prioridade.');
    }
  };

  const handleDeleteClick = (taskId: string) => {
    setTaskToDeleteId(taskId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (taskToDeleteId) {
      try {
        await deleteTask(taskToDeleteId);
        toast.success('Tarefa excluída com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir a tarefa.');
      } finally {
        setIsDeleteConfirmOpen(false);
        setTaskToDeleteId(null);
      }
    }
  };
  
  const isLoadingData = loading || loadingProjects || loadingUsers;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lista de Tarefas</h1>
          <p className="text-muted-foreground">Visualize e gerencie todas as suas tarefas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={focusMode ? 'default' : 'outline'} onClick={() => setFocusMode(!focusMode)}>
            <Target className="w-4 h-4 mr-2" />
            Modo Foco
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      <TasksFilters
        searchTerm={filters.searchTerm} setSearchTerm={(v) => setFilters(f => ({...f, searchTerm: v}))}
        statusFilter={filters.status} setStatusFilter={(v) => setFilters(f => ({...f, status: v}))}
        priorityFilter={filters.priority} setPriorityFilter={(v) => setFilters(f => ({...f, priority: v}))}
        assigneeFilter={filters.assignee} setAssigneeFilter={(v) => setFilters(f => ({...f, assignee: v}))}
        periodFilter={filters.period} setPeriodFilter={(v) => setFilters(f => ({...f, period: v}))}
        tagFilter={filters.tag} setTagFilter={(v) => setFilters(f => ({...f, tag: v}))}
        projectFilter={filters.project} setProjectFilter={(v) => setFilters(f => ({...f, project: v}))}
        archiveStatusFilter={filters.archiveStatus} setArchiveStatusFilter={(v) => setFilters(f => ({...f, archiveStatus: v}))}
        
        availableAssignees={availableAssignees}
        uniqueTags={uniqueTags}
        uniqueProjects={uniqueProjects}
        
        viewMode={viewMode} setViewMode={setViewMode}
        groupBy={groupBy} setGroupBy={setGroupBy}
        focusMode={focusMode} setFocusMode={setFocusMode}
        
        hasFilters={hasFilters}
        onClearFilters={clearAllFilters}
        // A propriedade 'overdueCount' foi removida daqui para corrigir o erro
      />

      {isLoadingData && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {!isLoadingData && tasks.length === 0 && (
        <TasksEmptyState
          hasFilters={hasFilters}
          focusMode={focusMode}
          onCreateTask={() => setIsCreateModalOpen(true)}
          onClearFilters={clearAllFilters}
        />
      )}
      
      {!isLoadingData && tasks.length > 0 && (
        viewMode === 'list' ? (
          <TaskTable
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onArchiveTask={archiveTask}
            onDeleteTask={handleDeleteClick}
            onPriorityChange={handlePriorityChange}
            isLoading={loading}
          />
        ) : (
          // Placeholder para a visualização agrupada, que pode ser desenvolvida a seguir
          <p>Visualização Agrupada em desenvolvimento.</p> 
        )
      )}

      {/* Modais */}
      <CreateTaskForm
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onTaskCreated={refetch}
      />
      
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
        />
      )}

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tasks;