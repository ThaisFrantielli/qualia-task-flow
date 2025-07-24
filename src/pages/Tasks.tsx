import React, { useState, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects'; // Import useProjects hook
import { useUsers } from '../hooks/useUsers'; // Importar hook para buscar usuários
import { Plus, Target } from 'lucide-react'; // Importar Target para o Modo Foco
import { Button } from '@/components/ui/button';
import TaskTable from '../components/TaskTable';
import TaskDetailsModal from '../components/TaskDetailsModal';
import CreateTaskForm from '../components/CreateTaskForm';
import TasksFilters from '../components/tasks/TasksFilters';
import TasksEmptyState from '../components/tasks/TasksEmptyState';
import TasksGroupedView from '../components/tasks/TasksGroupedView';
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

import type { Task, Project, User } from '@/types'; // Importar tipos Project e User
import { supabase } from '../integrations/supabase/client'; // Importar supabase client

const Tasks = () => {
  const [archiveStatusFilter, setArchiveStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | string>('all');
  const [tagFilter, setTagFilter] = useState<'all' | string>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | string>('all'); // Novo estado para filtro de projeto
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [groupBy, setGroupBy] = useState<'status' | 'project' | 'assignee'>('status');
  const [focusMode, setFocusMode] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  // Fetch projects and users
  // availableAssignees pode ser null, verificar o uso
  const { projects: uniqueProjects, loading: loadingProjects, error: projectsError } = useProjects();
  const { users: availableAssignees, loading: loadingUsers, error: usersError } = useUsers();

  const { tasks, loading, error, updateTaskStatus, archiveTask, deleteTask, refetch } = useTasks(
    focusMode ? 'today' : periodFilter,
    archiveStatusFilter,
    projectFilter,
    assigneeFilter,
    statusFilter,
    priorityFilter,
    searchTerm,
    tagFilter
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
    return ['all', ...Array.from(tags)];
  }, [tasks]);

  const overdueCount = useMemo(() => tasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
  ).length, [tasks]);

  const activeFilters = useMemo(() => {
    const filters = [];

    if (searchTerm) {
      filters.push({ label: `Busca: "${searchTerm}"`, onRemove: () => setSearchTerm('') });
    }
    if (statusFilter !== 'all') {
      const statusLabel = statusFilter === 'todo' ? 'A Fazer' :
                          statusFilter === 'progress' ? 'Em Andamento' :
                          statusFilter === 'done' ? 'Concluído' : statusFilter;
      filters.push({ label: `Status: ${statusLabel}`, onRemove: () => setStatusFilter('all') });
    }
    if (priorityFilter !== 'all') {
      const priorityLabel = priorityFilter === 'low' ? 'Baixa' :
                            priorityFilter === 'medium' ? 'Média' :
                            priorityFilter === 'high' ? 'Alta' : priorityFilter;
      filters.push({ label: `Prioridade: ${priorityLabel}`, onRemove: () => setPriorityFilter('all') });
    }
    // Modificado para usar o nome do assignee do objeto availableAssignees
    // Verificar se availableAssignees não é null antes de find
    if (assigneeFilter !== 'all') {
      const assigneeObj = availableAssignees?.find(a => a.id === assigneeFilter); // Adicionado ?. aqui
      const assigneeLabel = assigneeObj ? assigneeObj.full_name : assigneeFilter;
      filters.push({ label: `Responsável: ${assigneeLabel}`, onRemove: () => setAssigneeFilter('all') });
    }
     // Adicionar filtro de projeto aos filtros ativos
    if (projectFilter !== 'all') {
        // Verificar se uniqueProjects não é null antes de find
        const projectObj = uniqueProjects?.find(p => p.id === projectFilter); // Adicionado ?. aqui
        const projectLabel = projectObj ? projectObj.name : projectFilter;
        filters.push({ label: `Projeto: ${projectLabel}`, onRemove: () => setProjectFilter('all') });
    }
    if (periodFilter !== 'all') {
      const periodLabel = periodFilter === 'today' ? 'Hoje' :
                          periodFilter === 'week' ? 'Esta Semana' :
                          periodFilter === 'month' ? 'Este Mês' :
                          periodFilter === 'year' ? 'Este Ano' :
                          periodFilter === 'overdue' ? 'Atrasadas' : periodFilter;
      filters.push({ label: `Período: ${periodLabel}`, onRemove: () => setPeriodFilter('all') });
    }
    if (tagFilter !== 'all') {
      const tagLabel = uniqueTags.find(t => t === tagFilter) || tagFilter;
      filters.push({ label: `Tag: ${tagLabel}`, onRemove: () => setTagFilter('all') });
    }
    if (archiveStatusFilter !== 'active') {
      const archiveLabel = archiveStatusFilter === 'archived' ? 'Tarefas Arquivadas' : 'Todas Tarefas';
      filters.push({ label: `Visualizando: ${archiveLabel}`, onRemove: () => setArchiveStatusFilter('active') });
    }
    if (focusMode) {
      filters.push({ label: 'Modo Foco: Tarefas de Hoje', onRemove: () => setFocusMode(false) });
    }
    return filters;
  }, [searchTerm, statusFilter, priorityFilter, assigneeFilter, projectFilter, periodFilter, tagFilter, archiveStatusFilter, focusMode, availableAssignees, uniqueProjects, uniqueTags]);

  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    tasks.forEach(task => {
      let groupKey = '';
      switch (groupBy) {
        case 'status':
          groupKey = task.status || 'Sem Status';
          break;
        case 'project':
          // Usar o nome do projeto para agrupar, lidando com projeto nulo
          groupKey = task.project?.name || 'Sem Projeto'; // Adicionado ?. aqui
          break;
        case 'assignee':
          // Usar o nome do assignee para agrupar, lidando com availableAssignees nulo e assignee nulo
          const assignee = availableAssignees?.find(a => a.id === task.assignee_id); // Adicionado ?. aqui
          groupKey = assignee ? assignee.full_name || 'Não atribuído' : task.assignee_name || 'Não atribuído';
          break;
      }
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(task);
    });
    return groups;
  }, [tasks, groupBy, availableAssignees]); // Adicionar availableAssignees como dependência

  const handleTaskClick = (task: Task) => setSelectedTask(task);

  // Funções para edição inline (chamarão a API para atualizar a tarefa)
  const handlePriorityChange = async (taskId: string, newPriority: string) => {
      try {
        const { error } = await supabase
          .from('tasks') // Assuming your tasks table is named 'tasks'
          .update({ priority: newPriority })
          .eq('id', taskId);

        if (error) {
          throw error;
        }
        toast({ title: 'Sucesso!', description: 'Prioridade da tarefa atualizada.' });
        refetch(); // Refetch tasks to update the UI
      } catch (error) {
        console.error('Erro ao atualizar prioridade:', error);
        toast({ title: 'Erro', description: 'Não foi possível atualizar a prioridade da tarefa. Tente novamente.', variant: 'destructive' });
      }
  };

   const handleAssigneeChange = async (taskId: string, newAssigneeId: string | null) => {
      try {
        const { error } = await supabase
          .from('tasks') // Assuming your tasks table is named 'tasks'
          .update({ assignee_id: newAssigneeId })
          .eq('id', taskId);

        if (error) {
          throw error;
        }
        toast({ title: 'Sucesso!', description: 'Responsável da tarefa atualizado.' });
        refetch(); // Refetch tasks to update the UI
      } catch (error) {
        console.error('Erro ao atualizar responsável:', error);
        toast({ title: 'Erro', description: 'Não foi possível atualizar o responsável da tarefa. Tente novamente.', variant: 'destructive' });
      }
   };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast({ title: 'Sucesso!', description: 'Status da tarefa atualizado.' });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o status da tarefa. Tente novamente.', variant: 'destructive' });
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    try {
      await archiveTask(taskId);
      toast({ title: 'Tarefa Arquivada!', description: 'A tarefa foi movida para o arquivo.' });
    } catch (err: any) {
      console.error('Erro ao arquivar tarefa:', err);
      toast({ title: 'Erro', description: 'Não foi possível arquivar a tarefa. Tente novamente.', variant: 'destructive' });
    }
  };

  const handleDeleteClick = (taskId: string) => {
    setTaskToDeleteId(taskId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (taskToDeleteId && tasks.find(t => t.id === taskToDeleteId)) {
      try {
        await deleteTask(taskToDeleteId);
        toast({ title: 'Tarefa Excluída!', description: 'A tarefa foi removida permanentemente.' });
      } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        toast({ title: 'Erro', description: 'Não foi possível excluir a tarefa. Tente novamente.', variant: 'destructive' });
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
    setProjectFilter('all'); // Limpar filtro de projeto
    setFocusMode(false);
    setArchiveStatusFilter('active');
  };

  const hasFilters = Boolean(
    searchTerm ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    assigneeFilter !== 'all' ||
    periodFilter !== 'all' ||
    tagFilter !== 'all' ||
    projectFilter !== 'all' || // Incluir projectFilter na verificação
    focusMode ||
    archiveStatusFilter !== 'active'
  );

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Minhas Tarefas</h1>

      <TasksFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        // Passando availableAssignees para TasksFilters, lidando com null
        assigneeFilter={assigneeFilter}
        setAssigneeFilter={setAssigneeFilter}
        periodFilter={periodFilter}
        setPeriodFilter={setPeriodFilter}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        projectFilter={projectFilter} // Pass projectFilter
        setProjectFilter={setProjectFilter} // Pass setProjectFilter
        availableAssignees={availableAssignees || []} // Passando array vazio se for null
        uniqueProjects={uniqueProjects} // Pass uniqueProjects
        uniqueTags={uniqueTags} // Pass uniqueTags
        viewMode={viewMode}
        setViewMode={setViewMode}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        archiveStatusFilter={archiveStatusFilter}
        setArchiveStatusFilter={setArchiveStatusFilter}
        overdueCount={overdueCount}
        hasFilters={hasFilters}
        onClearFilters={clearAllFilters}
      />

      {(loading || loadingProjects || loadingUsers) && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando tarefas...</p>
          </div>
        </div>
      )}

      {(error || projectsError || usersError) && !loading && !loadingProjects && !loadingUsers && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Erro ao Carregar Dados</h2>
            <p className="text-gray-600">Não foi possível carregar os dados. Por favor, tente novamente mais tarde.</p>
            <Button onClick={refetch} className="mt-4">Recarregar</Button>
          </div>
        </div>
      )}

      {!loading && !loadingProjects && !loadingUsers && !error && !projectsError && !usersError && tasks.length === 0 && hasFilters && (
         <TasksEmptyState
          hasFilters={hasFilters}
          focusMode={focusMode}
          onCreateTask={() => setIsCreateModalOpen(true)}
          onClearFilters={clearAllFilters}
        />
      )}
n
       {!loading && !loadingProjects && !loadingUsers && !error && !projectsError && !usersError && tasks.length === 0 && !hasFilters && (
         <TasksEmptyState
          hasFilters={hasFilters}
          focusMode={focusMode}
          onCreateTask={() => setIsCreateModalOpen(true)}
          onClearFilters={clearAllFilters}
        />
      )}

      {!loading && !loadingProjects && !loadingUsers && !error && !projectsError && !usersError && tasks.length > 0 && viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* TODO: Passar o estado de seleção de tarefas para TaskTable */}
          <TaskTable
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onArchiveTask={handleArchiveTask}
            onDeleteTask={handleDeleteClick}
            onPriorityChange={handlePriorityChange}
            // Removida a prop onAssigneeChange
            // onAssigneeChange={handleAssigneeChange}
            // Removida a prop availableAssignees
            // availableAssignees={availableAssignees || []}
            isLoading={loading}
          />
        </div>
      )}

      {!loading && !loadingProjects && !loadingUsers && !error && !projectsError && !usersError && tasks.length > 0 && viewMode === 'grouped' && (
        <TasksGroupedView
          groupedTasks={groupedTasks}
          groupBy={groupBy}
          onTaskClick={handleTaskClick}
          updateTaskStatus={handleStatusChange}
          onAssigneeChange={handleAssigneeChange}
          availableAssignees={availableAssignees} // Passando availableAssignees (pode ser null)
        />
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
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTask(null);
              refetch(); // Chama refetch() quando o modal for fechado
            }
          }}
        />
      )}

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