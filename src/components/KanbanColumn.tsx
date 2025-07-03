
import React from 'react';
import TaskCard from './TaskCard';
import { Plus } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'progress' | 'done' | 'late';
  priority: 'low' | 'medium' | 'high';
  assignee: {
    name: string;
    avatar?: string;
  };
  dueDate?: string;
  subtasks?: {
    completed: number;
    total: number;
  };
  comments?: number;
  attachments?: number;
}

interface KanbanColumnProps {
  title: string;
  status: 'todo' | 'progress' | 'done' | 'late';
  tasks: Task[];
  color: string;
  onAddTask?: () => void;
  onTaskClick?: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  title, 
  status, 
  tasks, 
  color, 
  onAddTask,
  onTaskClick 
}) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4 min-h-[600px] w-80">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${color}`}></div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            onClick={() => onTaskClick?.(task)}
            className="cursor-pointer"
          >
            <TaskCard {...task} />
          </div>
        ))}
      </div>

      {/* Add Task Button */}
      <button 
        onClick={onAddTask}
        className="w-full mt-4 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
      >
        <Plus className="w-4 h-4" />
        <span>Adicionar tarefa</span>
      </button>
    </div>
  );
};

export default KanbanColumn;
