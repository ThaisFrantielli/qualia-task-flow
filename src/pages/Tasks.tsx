import React, { useState, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
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
// TODO: Importar hook para buscar projetos e usuários (se não for useTasks)
// import { useProjects } from '../hooks/useProjects';
// import { useUsers } from '../hooks/useUsers';

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

  // TODO: Modificar useTasks para aceitar todos os parâmetros de filtro e aplicá-los na consulta
  const { tasks, loading, error, updateTaskStatus, archiveTask, deleteTask, refetch } = useTasks(
    focusMode ? 'today' : periodFilter,
    archiveStatusFilter,
    // Incluir os outros filtros aqui:
    // projectFilter,
    // assigneeFilter,
    // statusFilter,
    // priorityFilter,
    // searchTerm,
    // tagFilter
  );

  // TODO: Implementar busca real de usuários para popular availableAssignees
  // Substituir este mock por uma chamada real à API ou hook de usuários
  const availableAssignees: User[] = useMemo(() => {
      const assigneesFromTasks = new Set<string>();
      tasks.forEach(task => {
        if (task.assignee_name && task.assignee_id) {
           assigneesFromTasks.add(JSON.stringify({ id: task.assignee_id, full_name: task.assignee_name, avatar_url: task.assignee_avatar }));
        } else if (task.assignee_name) { // Caso não tenha ID ainda, usar nome como fallback temporário
           assigneesFromTasks.add(JSON.stringify({ id: task.assignee_name, full_name: task.assignee_name }));
        }
      });
      const assigneeList = Array.from(assigneesFromTasks).map(item => JSON.parse(item));
       // Adicionar um item 'Não Atribuído' com id vazio
      return [{ id: '', full_name: 'Não atribuído' }, ...assigneeList];
  }, [tasks]); // Dependência de tasks temporária, deve depender dos dados reais de usuários

  // TODO: Implementar busca real de projetos para popular uniqueProjects
   // Substituir este mock por uma chamada real à API ou hook de projetos
   const uniqueProjects: Project[] = useMemo(() => {
       const projectsFromTasks = new Set<string>();
       tasks.forEach(task => {
           if (task.project?.id && task.project?.name) {
               projectsFromTasks.add(JSON.stringify({ id: task.project.id, name: task.project.name, created_at: '', updated_at: '', description: null, color: null, user_id: null })); // Incluir outros campos necessários do tipo Project
           }
       });
       const projectList = Array.from(projectsFromTasks).map(item => JSON.parse(item));
      return [{ id: 'all', name: 'Todos Projetos', created_at: '', updated_at: '', description: null, color: null, user_id: null }, ...projectList]; // Incluir outros campos no item 'Todos Projetos'
   }, [tasks]); // Dependência de tasks temporária, deve depender dos dados reais de projetos

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
    if (assigneeFilter !== 'all') {
      const assigneeObj = availableAssignees.find(a => a.id === assigneeFilter);
      const assigneeLabel = assigneeObj ? assigneeObj.full_name : assigneeFilter;
      filters.push({ label: `Responsável: ${assigneeLabel}`, onRemove: () => setAssigneeFilter('all') });
    }
     // Adicionar filtro de projeto aos filtros ativos
    if (projectFilter !== 'all') {
        const projectObj = uniqueProjects.find(p => p.id === projectFilter);
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
          groupKey = task.project?.name || 'Sem Projeto';
          break;
        case 'assignee':
          // Usar o nome do assignee para agrupar visualmente
          const assignee = availableAssignees.find(a => a.id === task.assignee_id);
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
      // TODO: Implementar chamada real à API para atualizar prioridade da tarefa
      console.log(`Atualizar tarefa ${taskId} com nova prioridade: ${newPriority}`);
       toast({ title: 'Sucesso!', description: 'Prioridade da tarefa atualizada.' });
        // Após sucesso da API, refetch ou atualizar estado local
  };

   const handleAssigneeChange = async (taskId: string, newAssigneeId: string | null) => {
      // TODO: Implementar chamada real à API para atualizar responsável da tarefa
      console.log(`Atualizar tarefa ${taskId} com novo responsável ID: ${newAssigneeId}`);
      toast({ title: 'Sucesso!', description: 'Responsável da tarefa atualizado.' });
      // Após sucesso da API, refetch ou atualizar estado local
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
    } catch (error) {
      console.error('Erro ao arquivar tarefa:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando tarefas...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Erro ao Carregar Tarefas</h2>
            <p className="text-gray-600">Não foi possível carregar suas tarefas. Por favor, tente novamente mais tarde.</p>
            <Button onClick={refetch} className="mt-4">Recarregar</Button>
          </div>
        </div>
      ) : tasks.length === 0 && hasFilters ? (
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
          {/* TODO: Passar o estado de seleção de tarefas para TaskTable */}
          <TaskTable
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onStatusChange={handleStatusChange}
            onArchiveTask={handleArchiveTask}
            onDeleteTask={handleDeleteClick}
            // Passando props para edição inline
            onPriorityChange={handlePriorityChange} // TODO: Implementar handlePriorityChange real
            onAssigneeChange={handleAssigneeChange} // TODO: Implementar handleAssigneeChange real
            availableAssignees={availableAssignees} // Passando a lista de responsáveis
          />
        </div>
      ) : (
        <TasksGroupedView
          groupedTasks={groupedTasks}
          groupBy={groupBy}
          onTaskClick={handleTaskClick}
          updateTaskStatus={handleStatusChange}
          // TODO: Passar props para edição inline na visualização agrupada se aplicável
          // onPriorityChange={handlePriorityChange}
          // onAssigneeChange={handleAssigneeChange}
          // availableAssignees={availableAssignees}
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
          onOpenChange={(open) => !open && setSelectedTask(null)}
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