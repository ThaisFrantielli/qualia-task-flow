
import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import TasksHeader from '../components/tasks/TasksHeader';
import TasksFilters from '../components/tasks/TasksFilters';
import TasksGroupedView from '../components/tasks/TasksGroupedView';
import TasksEmptyState from '../components/tasks/TasksEmptyState';
import TaskTable from '../components/TaskTable';
import TaskDetailsModal from '../components/TaskDetailsModal';
import CreateTaskForm from '../components/CreateTaskForm';
import CreateProjectForm from '../components/CreateProjectForm';
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

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDetailsOpen(true);
  };

  const hasFilters = searchTerm || filterStatus !== 'all' || filterPriority !== 'all' || filterProject !== 'all';

  return (
    <div className="p-6 space-y-6">
      <TasksHeader
        onCreateTask={() => setCreateTaskOpen(true)}
        onCreateProject={() => setCreateProjectOpen(true)}
      />

      <TasksFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterPriority={filterPriority}
        setFilterPriority={setFilterPriority}
        filterProject={filterProject}
        setFilterProject={setFilterProject}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        projects={projects}
      />

      {/* Conteúdo baseado no modo de visualização */}
      {viewMode === 'table' ? (
        <TaskTable 
          tasks={filteredTasks}
          onTaskClick={handleTaskClick}
          onStatusChange={updateTaskStatus}
        />
      ) : (
        <TasksGroupedView
          groupedTasks={groupedTasks}
          groupBy={groupBy}
          onTaskClick={handleTaskClick}
          updateTaskStatus={updateTaskStatus}
        />
      )}

      {filteredTasks.length === 0 && (
        <TasksEmptyState hasFilters={hasFilters} />
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
