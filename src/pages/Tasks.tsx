import React, { useState, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TaskTable from '../components/TaskTable';
import TaskDetailsModal from '../components/TaskDetailsModal';
import CreateTaskForm from '../components/CreateTaskForm';
import TasksFilters from '../components/tasks/TasksFilters';
import TasksEmptyState from '../components/tasks/TasksEmptyState';
import TasksGroupedView from '../components/tasks/TasksGroupedView';

import type { Task } from '@/types';

import { toast } from '@/hooks/use-toast';

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

import { Badge } from '@/components/ui/badge';

const Tasks = () => {
  // Estados
  const [archiveStatusFilter, setArchiveStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | string>('all');
  const [tagFilter, setTagFilter] = useState<'all' | string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [groupBy, setGroupBy] = useState<'status' | 'project' | 'assignee'>('status');
  const [focusMode, setFocusMode] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  // Hook de Tarefas (agora recebe archiveStatusFilter)
  const { tasks, loading, error, updateTaskStatus, archiveTask, deleteTask, refetch } = useTasks(periodFilter, archiveStatusFilter);

  // useMemos para filtros únicos e filtros ativos
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    tasks.forEach(task => {
      if (task.assignee_name) {
        assignees.add(task.assignee_name);
      } else {
        assignees.add('Não Atribuído');
      }
    });
    return ['all', ...Array.from(assignees)];
  }, [tasks]);

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
    return ['all', ...Array.from(tags)];
  }, [tasks]);

  const activeFilters = useMemo(() => {
    const filters = [];

    if (searchTerm) {
      filters.push({
        label: `Busca: "${searchTerm}"`, 
        onRemove: () => setSearchTerm('')
      });
    }

    if (statusFilter !== 'all') {
      const statusLabel = statusFilter === 'todo' ? 'A Fazer' :
                          statusFilter === 'progress' ? 'Em Andamento' :
                          statusFilter === 'done' ? 'Concluído' :
                          statusFilter === 'late' ? 'Atrasado' : statusFilter;

      filters.push({
        label: `Status: ${statusLabel}`,
        onRemove: () => setStatusFilter('all')
      });
    }

    if (priorityFilter !== 'all') {
       const priorityLabel = priorityFilter === 'low' ? 'Baixa' :
                             priorityFilter === 'medium' ? 'Média' :
                             priorityFilter === 'high' ? 'Alta' : priorityFilter;

      filters.push({
        label: `Prioridade: ${priorityLabel}`,
        onRemove: () => setPriorityFilter('all')
      });
    }

    if (assigneeFilter !== 'all') {
        const assigneeLabel = assigneeFilter === 'Não Atribuído' ? assigneeFilter : (uniqueAssignees.find(a => a === assigneeFilter) || assigneeFilter);
        filters.push({
          label: `Responsável: ${assigneeLabel}`,
          onRemove: () => setAssigneeFilter('all')
        });
    }

    if (periodFilter !== 'all') {
        const periodLabel = periodFilter === 'today' ? 'Hoje' :
                          periodFilter === 'week' ? 'Esta Semana' :
                          periodFilter === 'month' ? 'Este Mês' :
                          periodFilter === 'year' ? 'Este Ano' :
                          periodFilter === 'overdue' ? 'Atrasadas' : periodFilter;

        filters.push({
          label: `Período: ${periodLabel}`,
          onRemove: () => setPeriodFilter('all')
        });
    }

    if (tagFilter !== 'all') {
       const tagLabel = uniqueTags.find(t => t === tagFilter) || tagFilter;
       filters.push({
         label: `Tag: ${tagLabel}`,
         onRemove: () => setTagFilter('all')
       });
    }

    if (archiveStatusFilter !== 'active') {
      const archiveLabel = archiveStatusFilter === 'archived' ? 'Tarefas Arquivadas' : 'Todas Tarefas';
      filters.push({
        label: `Visualizando: ${archiveLabel}`,
        onRemove: () => setArchiveStatusFilter('active')
      });
    }

    if (focusMode) {
      filters.push({
        label: 'Modo Foco: Tarefas de Hoje',
        onRemove: () => setFocusMode(false)})
    }

    return filters;
  }, [searchTerm, statusFilter, priorityFilter, assigneeFilter, periodFilter, tagFilter, archiveStatusFilter, focusMode, uniqueAssignees, uniqueTags]);

  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    tasks.forEach(task => {
      let groupKey = '';
      switch (groupBy) {
        case 'status':
          groupKey = task.status || 'Sem Status';
          break;
        case 'project':
          groupKey = task.project?.name || 'Sem Projeto';
          break;
        case 'assignee':
          groupKey = task.assignee_name || 'Não Atribuído';
          break;
        default:
          groupKey = task.status || 'Sem Status';
      }
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });
    return groups;
  }, [tasks, groupBy]);

  // Funções de handler
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast({
        title: 'Sucesso!',
        description: 'Status da tarefa atualizado.',
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status da tarefa. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    console.log("Chamando handleArchiveTask em Tasks.tsx para a tarefa: ", taskId);
    try {
      await archiveTask(taskId);
      toast({
        title: 'Tarefa Arquivada!',
        description: 'A tarefa foi movida para o arquivo.',
      });
    } catch (error) {
      console.error('Erro ao arquivar tarefa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível arquivar a tarefa. Tente novamente.',
        variant: 'destructive',
      });
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
        toast({
          title: 'Tarefa Excluída!',
          description: 'A tarefa foi removida permanentemente.',
        });
      } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível excluir a tarefa. Tente novamente.',
          variant: 'destructive',
        });
      } finally {
        setIsDeleteConfirmOpen(false);
        setTaskToDeleteId(null);
      }
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setPeriodFilter('all');
    setTagFilter('all');
    setFocusMode(false);
    setArchiveStatusFilter('active');
  };

  // Check if any filters are applied (excluindo o filtro de arquivamento padrão)
  const hasFilters = Boolean(
    searchTerm ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    assigneeFilter !== 'all' ||
    periodFilter !== 'all' ||
    tagFilter !== 'all' ||
    focusMode ||
    archiveStatusFilter !== 'active'
  );

  // Renderização
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando tarefas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Erro ao Carregar Tarefas</h2>
          <p className="text-gray-600">Não foi possível carregar suas tarefas. Por favor, tente novamente mais tarde.</p>
          <Button onClick={refetch} className="mt-4">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {focusMode ? 'Modo Foco - Minhas Tarefas' : 'Tarefas'}
          </h1>
          <p className="text-gray-600">
            {focusMode ? 'Foque nas suas tarefas de hoje' : 'Gerencie e acompanhe suas tarefas'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setIsCreateModalOpen(true)} className="custom-button">
            <Plus className="w-4 h-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Filters */}
      <TasksFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        assigneeFilter={assigneeFilter}
        setAssigneeFilter={setAssigneeFilter}
        periodFilter={periodFilter}
        setPeriodFilter={setPeriodFilter}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        uniqueAssignees={uniqueAssignees}
        uniqueTags={uniqueTags}
        viewMode={viewMode}
        setViewMode={setViewMode}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        archiveStatusFilter={archiveStatusFilter}
        setArchiveStatusFilter={setArchiveStatusFilter}
      />

      {/* Indicadores de Filtros Aplicados */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center mt-4">
          <span className="text-sm font-medium text-gray-700">Filtros Aplicados:</span>
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1 cursor-pointer" onClick={filter.onRemove}>
              {filter.label}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Badge>
          ))}
          {activeFilters.length > 0 && (
             <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-sm text-gray-600 hover:text-gray-900 p-1">
               Limpar Todos
             </Button>
           )}
        </div>
      )}

      {/* Results */}
      {tasks.length === 0 && hasFilters ? (
        <TasksEmptyState
          hasFilters={hasFilters}
          focusMode={focusMode}
          onCreateTask={() => setIsCreateModalOpen(true)}
          onClearFilters={clearAllFilters}
        />
      ) : tasks.length === 0 && !hasFilters ? (
         <TasksEmptyState
           hasFilters={hasFilters}
           focusMode={focusMode}
           onCreateTask={() => setIsCreateModalOpen(true)}
           onClearFilters={clearAllFilters}
         />
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <TaskTable
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onStatusChange={handleStatusChange}
            onArchiveTask={handleArchiveTask}
            onDeleteTask={handleDeleteClick}
          />
        </div>
      ) : (
        <TasksGroupedView
          groupedTasks={groupedTasks}
          groupBy={groupBy}
          onTaskClick={handleTaskClick}
          updateTaskStatus={handleStatusChange}
        />
      )}

      {/* Modals */}
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

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente esta tarefa
              e removerá seus dados de nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteConfirmOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} className="bg-red-500 hover:bg-red-600 text-white">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tasks;
