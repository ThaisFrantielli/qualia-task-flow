import React, { useState, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Search, Filter, Plus, Users, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TaskTable from '../components/TaskTable';
import TaskDetailsModal from '../components/TaskDetailsModal';
import CreateTaskForm from '../components/CreateTaskForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'] & {
  project?: Database['public']['Tables']['projects']['Row'];
  subtasks?: Database['public']['Tables']['subtasks']['Row'][];  
  comments?: Database['public']['Tables']['comments']['Row'][];
  attachments?: Database['public']['Tables']['attachments']['Row'][];
};

const Tasks = () => {
  const { tasks, loading, updateTaskStatus, archiveTask, deleteTask, refetch } = useTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');

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

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === 'all' || task.assignee_name === assigneeFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter, assigneeFilter]);

  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {
      'todo': [],
      'progress': [],
      'done': [],
      'late': []
    };
    
    filteredTasks.forEach(task => {
      if (groups[task.status]) {
        groups[task.status].push(task);
      }
    });
    
    return groups;
  }, [filteredTasks]);

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

  // Check if any filters are applied
  const hasFilters = Boolean(
    searchTerm ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    assigneeFilter !== 'all'
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tarefas</h1>
          <p className="text-gray-600">Gerencie e acompanhe suas tarefas</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-quality p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="todo">A Fazer</SelectItem>
              <SelectItem value="progress">Em Progresso</SelectItem>
              <SelectItem value="done">Concluído</SelectItem>
              <SelectItem value="late">Atrasado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[150px]">
              <Users className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {uniqueAssignees.map(assignee => (
                <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              Lista
            </Button>
            <Button
              variant={viewMode === 'grouped' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grouped')}
            >
              Agrupar
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {viewMode === 'list' ? (
        <TaskTable 
          tasks={filteredTasks} 
          onTaskClick={handleTaskClick}
          onStatusChange={handleStatusChange}
          onArchiveTask={handleArchiveTask}
          onDeleteTask={handleDeleteTask}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([status, statusTasks]) => (
            <Card key={status}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Badge className={getStatusColor(status)}>
                      {getStatusLabel(status)}
                    </Badge>
                    <span className="text-lg">{statusTasks.length} tarefas</span>
                  </CardTitle>
                </div>
              </CardHeader>
              {statusTasks.length > 0 && (
                <CardContent>
                  <TaskTable 
                    tasks={statusTasks} 
                    onTaskClick={handleTaskClick}
                    onStatusChange={handleStatusChange}
                    onArchiveTask={handleArchiveTask}
                    onDeleteTask={handleDeleteTask}
                  />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasFilters ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa criada'}
          </h3>
          <p className="text-gray-500 mb-4">
            {hasFilters 
              ? 'Tente ajustar os filtros para encontrar o que procura.'
              : 'Comece criando sua primeira tarefa.'
            }
          </p>
          {!hasFilters && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira tarefa
            </Button>
          )}
        </div>
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
