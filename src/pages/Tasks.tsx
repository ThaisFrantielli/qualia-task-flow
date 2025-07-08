
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
import ProjectsView from '../components/projects/ProjectsView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'] & {
  project?: Database['public']['Tables']['projects']['Row'];
  subtasks?: Database['public']['Tables']['subtasks']['Row'][];  
  comments?: Database['public']['Tables']['comments']['Row'][];
  attachments?: Database['public']['Tables']['attachments']['Row'][];
};

const Tasks = () => {
  const { tasks, loading, updateTaskStatus, archiveTask, deleteTask, getTasksByPeriod, isTaskOverdue, refetch } = useTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grouped' | 'projects'>('list');
  const [groupBy, setGroupBy] = useState<'status' | 'project' | 'assignee'>('status');
  const [focusMode, setFocusMode] = useState(false);

  // Get unique assignees for filter
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    tasks.forEach(task => {
      if (task.assignee_name) {
        assignees.add(task.assignee_name);
      }
    });
    return Array.from(assignees);
  }, [tasks]);

  // Get unique tags for filter
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach(task => {
      if (task.tags) {
        task.tags.split(',').forEach(tag => {
          if (tag.trim()) tags.add(tag.trim());
        });
      }
    });
    return Array.from(tags);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Aplicar filtro por período primeiro
    if (periodFilter !== 'all') {
      filtered = getTasksByPeriod(periodFilter as any);
    }

    // Modo foco - apenas tarefas do usuário atual para hoje
    if (focusMode) {
      const today = new Date().toDateString();
      filtered = filtered.filter(task => {
        const dueDate = task.due_date ? new Date(task.due_date).toDateString() : null;
        return dueDate === today && task.assignee_name === 'Usuário Atual'; // Substituir por usuário real
      });
    }

    // Aplicar outros filtros
    return filtered.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === 'all' || task.assignee_name === assigneeFilter;
      const matchesTag = tagFilter === 'all' || (task.tags && task.tags.includes(tagFilter));
      
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesTag;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter, assigneeFilter, periodFilter, tagFilter, focusMode, getTasksByPeriod]);

  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    
    filteredTasks.forEach(task => {
      let groupKey = '';
      
      switch (groupBy) {
        case 'status':
          groupKey = task.status;
          break;
        case 'project':
          groupKey = task.project?.name || 'Sem Projeto';
          break;
        case 'assignee':
          groupKey = task.assignee_name || 'Não Atribuído';
          break;
        default:
          groupKey = task.status;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });
    
    return groups;
  }, [filteredTasks, groupBy]);

  const getStatusLabel = (status: string) => {
    const labels = {
      'todo': 'A Fazer',
      'progress': 'Em Progresso', 
      'done': 'Concluído',
      'late': 'Atrasado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'todo': 'bg-gray-100 text-gray-800',
      'progress': 'bg-blue-100 text-blue-800',
      'done': 'bg-green-100 text-green-800',
      'late': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await updateTaskStatus(taskId, newStatus);
  };

  const handleArchiveTask = async (taskId: string) => {
    await archiveTask(taskId);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.')) {
      await deleteTask(taskId);
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
            onDeleteTask={handleDeleteTask}
          />
        </div>
      ) : viewMode === 'projects' ? (
        <ProjectsView
          onTaskClick={handleTaskClick}
        />
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
    </div>
  );
};

export default Tasks;
