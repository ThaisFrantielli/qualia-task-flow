import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import KanbanColumn from '../components/KanbanColumn';
import CreateTaskForm from '../components/CreateTaskForm';
import TaskDetailsModal from '../components/TaskDetailsModal';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'] & {
  project?: Database['public']['Tables']['projects']['Row'];
  subtasks?: Database['public']['Tables']['subtasks']['Row'][];
  comments?: Database['public']['Tables']['comments']['Row'][];
  attachments?: Database['public']['Tables']['attachments']['Row'][];
};

const Kanban = () => {
  const { tasks, loading, error, updateTaskStatus, refetch } = useTasks();
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
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

  const tasksByStatus = {
    todo: tasks.filter(task => task.status === 'todo').map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || undefined,
      status: task.status as 'todo' | 'progress' | 'done' | 'late',
      priority: task.priority as 'low' | 'medium' | 'high',
      assignee: {
        name: task.assignee_name || 'Não atribuído',
        avatar: task.assignee_avatar || undefined
      },
      dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : undefined,
      subtasks: task.subtasks && task.subtasks.length > 0 ? {
        completed: task.subtasks.filter(s => s.completed).length,
        total: task.subtasks.length
      } : undefined,
      comments: task.comments?.length || 0,
      attachments: task.attachments?.length || 0
    })),
    progress: tasks.filter(task => task.status === 'progress').map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || undefined,
      status: task.status as 'todo' | 'progress' | 'done' | 'late',
      priority: task.priority as 'low' | 'medium' | 'high',
      assignee: {
        name: task.assignee_name || 'Não atribuído',
        avatar: task.assignee_avatar || undefined
      },
      dueDate: task.due_date ? new Date(task.due_date).toLocaleDateDate('pt-BR') : undefined,
      subtasks: task.subtasks && task.subtasks.length > 0 ? {
        completed: task.subtasks.filter(s => s.completed).length,
        total: task.subtasks.length
      } : undefined,
      comments: task.comments?.length || 0,
      attachments: task.attachments?.length || 0
    })),
    done: tasks.filter(task => task.status === 'done').map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || undefined,
      status: task.status as 'todo' | 'progress' | 'done' | 'late',
      priority: task.priority as 'low' | 'medium' | 'high',
      assignee: {
        name: task.assignee_name || 'Não atribuído',
        avatar: task.assignee_avatar || undefined
      },
      dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : undefined,
      subtasks: task.subtasks && task.subtasks.length > 0 ? {
        completed: task.subtasks.filter(s => s.completed).length,
        total: task.subtasks.length
      } : undefined,
      comments: task.comments?.length || 0,
      attachments: task.attachments?.length || 0
    })),
    late: tasks.filter(task => task.status === 'late').map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || undefined,
      status: task.status as 'todo' | 'progress' | 'done' | 'late',
      priority: task.priority as 'low' | 'medium' | 'high',
      assignee: {
        name: task.assignee_name || 'Não atribuído',
        avatar: task.assignee_avatar || undefined
      },
      dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : undefined,
      subtasks: task.subtasks && task.subtasks.length > 0 ? {
        completed: task.subtasks.filter(s => s.completed).length,
        total: task.subtasks.length
      } : undefined,
      comments: task.comments?.length || 0,
      attachments: task.attachments?.length || 0
    }))
  };

  const handleTaskClick = (taskData: any) => {
    // Find the full task data from the original tasks array
    const fullTask = tasks.find(t => t.id === taskData.id);
    if (fullTask) {
      setSelectedTask(fullTask);
      setTaskDetailsOpen(true);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Kanban Board</h1>
        <p className="text-gray-600">Visualize e gerencie suas tarefas com dados reais</p>
      </div>

      {/* Kanban Board */}
      <div className="flex space-x-6 overflow-x-auto pb-6">
        <KanbanColumn
          title="A Fazer"
          status="todo"
          tasks={tasksByStatus.todo}
          color="bg-gray-400"
          onAddTask={() => setCreateTaskOpen(true)}
          onTaskClick={handleTaskClick}
        />
        <KanbanColumn
          title="Em Andamento"
          status="progress"
          tasks={tasksByStatus.progress}
          color="bg-blue-500"
          onAddTask={() => setCreateTaskOpen(true)}
          onTaskClick={handleTaskClick}
        />
        <KanbanColumn
          title="Concluído"
          status="done"
          tasks={tasksByStatus.done}
          color="bg-green-500"
          onAddTask={() => setCreateTaskOpen(true)}
          onTaskClick={handleTaskClick}
        />
        <KanbanColumn
          title="Atrasado"
          status="late"
          tasks={tasksByStatus.late}
          color="bg-red-500"
          onAddTask={() => setCreateTaskOpen(true)}
          onTaskClick={handleTaskClick}
        />
      </div>

      {/* Modals */}
      <CreateTaskForm
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        onTaskCreated={refetch}
      />

      <TaskDetailsModal
        task={selectedTask}
        open={taskDetailsOpen}
        onOpenChange={setTaskDetailsOpen}
      />
    </div>
  );
};

export default Kanban;
