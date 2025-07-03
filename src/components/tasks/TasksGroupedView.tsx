
import React from 'react';
import { Filter, FolderOpen, User } from 'lucide-react';
import TaskCard from '../TaskCard';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'] & {
  project?: Database['public']['Tables']['projects']['Row'];
  subtasks?: Database['public']['Tables']['subtasks']['Row'][];
  comments?: Database['public']['Tables']['comments']['Row'][];
  attachments?: Database['public']['Tables']['attachments']['Row'][];
};

interface TasksGroupedViewProps {
  groupedTasks: Record<string, Task[]>;
  groupBy: 'status' | 'project' | 'assignee';
  onTaskClick: (task: Task) => void;
  updateTaskStatus: (taskId: string, status: string) => void;
}

const TasksGroupedView: React.FC<TasksGroupedViewProps> = ({
  groupedTasks,
  groupBy,
  onTaskClick,
  updateTaskStatus
}) => {
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

  return (
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
                <div key={task.id} onClick={() => onTaskClick(task)} className="cursor-pointer">
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
  );
};

export default TasksGroupedView;
