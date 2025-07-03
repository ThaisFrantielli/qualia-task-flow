
import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Filter, Plus, Search, Calendar, User, FolderOpen, LayoutGrid, Table as TableIcon } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import CreateTaskForm from '../components/CreateTaskForm';
import CreateProjectForm from '../components/CreateProjectForm';
import TaskDetailsModal from '../components/TaskDetailsModal';
import TaskTable from '../components/TaskTable';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { useProjects } from '../hooks/useProjects';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'] & {
  project?: Database['public']['Tables']['projects']['Row'];
  subtasks?: Database['public']['Tables']['subtasks']['Row'][];
  comments?: Database['public']['Tables']['comments']['Row'][];
  attachments?: Database['public']['Tables']['attachments']['Row'][];
};

const Tasks = () => {
  const { tasks, loading, error, updateTaskStatus, refetch } = useTasks();
  const { projects } = useProjects();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [groupBy, setGroupBy] = useState<'status' | 'project' | 'assignee'>('status');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando tarefas...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Erro: {error}</p>
        </div>
      </div>
    );
  }

  // Filtrar tarefas
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesProject = filterProject === 'all' || task.project_id === filterProject;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesProject;
  });

  // Agrupar tarefas
  const groupedTasks = filteredTasks.reduce((groups, task) => {
    let key: string;
    switch (groupBy) {
      case 'project':
        key = task.project?.name || 'Sem Projeto';
        break;
      case 'assignee':
        key = task.assignee_name || 'Não Atribuído';
        break;
      default:
        key = task.status;
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(task);
    return groups;
  }, {} as Record<string, typeof filteredTasks>);

  const getGroupTitle = (key: string) => {
    switch (groupBy) {
      case 'status':
        const statusMap: Record<string, string> = {
          'todo': 'A Fazer',
          'progress': 'Em Andamento',
          'done': 'Concluído',
          'late': 'Atrasado'
        };
        return statusMap[key] || key;
      default:
        return key;
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDetailsOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lista de Tarefas</h1>
          <p className="text-gray-600">Visualize e gerencie todas as suas tarefas</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setCreateProjectOpen(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </Button>
          <Button 
            onClick={() => setCreateTaskOpen(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Tarefa</span>
          </Button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-xl shadow-quality p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Busca */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Filtro por Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Todos os Status</option>
            <option value="todo">A Fazer</option>
            <option value="progress">Em Andamento</option>
            <option value="done">Concluído</option>
            <option value="late">Atrasado</option>
          </select>

          {/* Filtro por Prioridade */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Todas as Prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>

          {/* Filtro por Projeto */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Todos os Projetos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          {/* Agrupar por */}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'status' | 'project' | 'assignee')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={viewMode === 'table'}
          >
            <option value="status">Agrupar por Status</option>
            <option value="project">Agrupar por Projeto</option>
            <option value="assignee">Agrupar por Responsável</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <Toggle 
              pressed={viewMode === 'cards'} 
              onPressedChange={() => setViewMode('cards')}
              aria-label="Visualização em cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </Toggle>
            <Toggle 
              pressed={viewMode === 'table'} 
              onPressedChange={() => setViewMode('table')}
              aria-label="Visualização em tabela"
            >
              <TableIcon className="w-4 h-4" />
            </Toggle>
          </div>
        </div>
      </div>

      {/* Conteúdo baseado no modo de visualização */}
      {viewMode === 'table' ? (
        <TaskTable 
          tasks={filteredTasks}
          onTaskClick={handleTaskClick}
          onStatusChange={updateTaskStatus}
        />
      ) : (
        // Lista de Tarefas Agrupadas
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([groupKey, groupTasks]) => (
            <div key={groupKey} className="bg-white rounded-xl shadow-quality p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {groupBy === 'status' && <Filter className="w-5 h-5 text-gray-500" />}
                  {groupBy === 'project' && <FolderOpen className="w-5 h-5 text-gray-500" />}
                  {groupBy === 'assignee' && <User className="w-5 h-5 text-gray-500" />}
                  <h2 className="text-xl font-semibold text-gray-900">
                    {getGroupTitle(groupKey)}
                  </h2>
                  <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                    {groupTasks.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {groupTasks.map((task) => {
                  const subtasksCompleted = task.subtasks?.filter(s => s.completed).length || 0;
                  const subtasksTotal = task.subtasks?.length || 0;
                  
                  return (
                    <div key={task.id} onClick={() => handleTaskClick(task)} className="cursor-pointer">
                      <TaskCard
                        id={task.id}
                        title={task.title}
                        description={task.description || undefined}
                        status={task.status as 'todo' | 'progress' | 'done' | 'late'}
                        priority={task.priority as 'low' | 'medium' | 'high'}
                        assignee={{
                          name: task.assignee_name || 'Não atribuído',
                          avatar: task.assignee_avatar || undefined
                        }}
                        dueDate={task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : undefined}
                        subtasks={subtasksTotal > 0 ? { completed: subtasksCompleted, total: subtasksTotal } : undefined}
                        comments={task.comments?.length || 0}
                        attachments={task.attachments?.length || 0}
                        onStatusChange={(newStatus) => updateTaskStatus(task.id, newStatus)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="bg-white rounded-xl shadow-quality p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Calendar className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
          <p className="text-gray-500">
            {searchTerm || filterStatus !== 'all' || filterPriority !== 'all' || filterProject !== 'all'
              ? 'Tente ajustar os filtros para encontrar suas tarefas.'
              : 'Crie sua primeira tarefa para começar.'}
          </p>
        </div>
      )}

      {/* Modals */}
      <CreateTaskForm
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        onTaskCreated={refetch}
      />

      <CreateProjectForm
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onProjectCreated={refetch}
      />

      <TaskDetailsModal
        task={selectedTask}
        open={taskDetailsOpen}
        onOpenChange={setTaskDetailsOpen}
      />
    </div>
  );
};

export default Tasks;
