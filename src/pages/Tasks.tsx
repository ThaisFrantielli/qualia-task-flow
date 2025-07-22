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

// Removendo importações de UI que não estão sendo usadas diretamente neste arquivo
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';

// Ajustando a importação de tipo do Supabase, se necessário, dependendo da estrutura do seu projeto
// Assumindo que o tipo Task já inclui os relacionamentos necessários e vem de '@/types'
import type { Task } from '@/types'; // Usando o tipo centralizado se disponível

import { toast } from '@/hooks/use-toast'; // Importar a função toast

// Importar componentes do AlertDialog para a confirmação de exclusão
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


// Removendo a definição de tipo Task duplicada se já existir em '@/types'
// type Task = Database['public']['Tables']['tasks']['Row'] & {
//   project?: Database['public']['Tables']['projects']['Row'];
//   subtasks?: Database['public']['Tables']['subtasks']['Row'][];  
//   comments?: Database['public']['Tables']['comments']['Row'][];
//   attachments?: Database['public']['Tables']['attachments']['Row'][];
// };

const Tasks = () => {
  // Verificando quais funções são retornadas por useTasks (baseado na análise anterior)
  const { tasks, loading, updateTaskStatus, archiveTask, deleteTask, refetch } = useTasks();

  const [searchTerm, setSearchTerm] = useState('');
  // Ajustando a tipagem para permitir 'all'
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

  // Estado para o modal de confirmação de exclusão
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);


  // Get unique assignees for filter
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    tasks.forEach(task => {
      if (task.assignee_name) {
        assignees.add(task.assignee_name);
      } else {
        // Considere adicionar uma categoria para tarefas sem responsável, se aplicável
        assignees.add('Não Atribuído');
      }
    });
    // Incluir a opção 'all'
    return ['all', ...Array.from(assignees)];
  }, [tasks]);

  // Get unique tags for filter
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
     // Incluir a opção 'all'
    return ['all', ...Array.from(tags)];
  }, [tasks]);


  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Removendo getTasksByPeriod, pois não está no retorno do hook analisado
    // Se essa funcionalidade for necessária, precisa ser adicionada ao hook ou implementada aqui
    // if (periodFilter !== 'all') {
    //   filtered = getTasksByPeriod(periodFilter as any);
    // }

    // Modo foco - apenas tarefas do usuário atual para hoje
    if (focusMode) {
      const today = new Date().toDateString();
      filtered = filtered.filter(task => {
        const dueDate = task.due_date ? new Date(task.due_date).toDateString() : null;
        // TODO: Substituir 'Usuário Atual' pela lógica de usuário real
        return dueDate === today && task.assignee_name === 'Usuário Atual';
      });
    }


    // Aplicar outros filtros
    return filtered.filter(task => {
      const matchesSearch = searchTerm === '' || 
                            task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      
      // Ajustando a lógica do filtro de responsável para incluir 'Não Atribuído'
      const matchesAssignee = assigneeFilter === 'all' || 
                              (assigneeFilter === 'Não Atribuído' && !task.assignee_name) ||
                              task.assignee_name === assigneeFilter;
      
      // Ajustando a lógica do filtro de tags
      const matchesTag = tagFilter === 'all' || 
                         (task.tags && task.tags.split(',').map(tag => tag.trim()).includes(tagFilter));
      
      // Removendo a condição de isTaskOverdue, pois a função não está disponível aqui
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesTag; // && (isTaskOverdue ? isTaskOverdue(task) : true);
    });
    // Removendo getTasksByPeriod do array de dependências, pois a função não está disponível
  }, [tasks, searchTerm, statusFilter, priorityFilter, assigneeFilter, periodFilter, tagFilter, focusMode /*, getTasksByPeriod, isTaskOverdue*/]);


  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    
    filteredTasks.forEach(task => {
      let groupKey = '';
      
      switch (groupBy) {
        case 'status':
          // Corrigindo possível atribuição de null a string
          groupKey = task.status || 'Sem Status'; 
          break;
        case 'project':
          groupKey = task.project?.name || 'Sem Projeto';
          break;
        case 'assignee':
          // Corrigindo possível atribuição de null a string
          groupKey = task.assignee_name || 'Não Atribuído';
          break;
        default:
          // Corrigindo possível atribuição de null a string
          groupKey = task.status || 'Sem Status';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });
    
    return groups;
  }, [filteredTasks, groupBy]);

  // Removendo funções de UI que provavelmente estão em TaskTableRow ou similar
  // const getStatusLabel = (status: string) => { ... };
  // const getStatusColor = (status: string) => { ... };


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

  // Função para abrir o modal de confirmação
  const handleDeleteClick = (taskId: string) => {
    setTaskToDeleteId(taskId);
    setIsDeleteConfirmOpen(true);
  };

  // Função para executar a exclusão após confirmação
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
  };

  // Check if any filters are applied
  const hasFilters = Boolean(
    searchTerm ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    assigneeFilter !== 'all' ||
    periodFilter !== 'all' ||
    tagFilter !== 'all' ||
    focusMode
  );

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

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {focusMode ? 'Modo Foco - Minhas Tarefas' : 'Tarefas'}
          </h1>
          <p className="text-gray-600">
            {focusMode
              ? 'Foque nas suas tarefas de hoje'
              : 'Gerencie e acompanhe suas tarefas'
            }
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
      />

      {/* Results */}
      {filteredTasks.length === 0 ? (
        <TasksEmptyState
          hasFilters={hasFilters}
          focusMode={focusMode}
          onCreateTask={() => setIsCreateModalOpen(true)}
          onClearFilters={clearAllFilters}
        />
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <TaskTable
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onStatusChange={handleStatusChange}
            onArchiveTask={handleArchiveTask}
            onDeleteTask={handleDeleteClick} // Usar a nova função para abrir o modal
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
