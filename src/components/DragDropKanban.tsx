
import React, { useState, useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import TaskCard from './TaskCard';
import { Plus } from 'lucide-react';

interface DragItem {
  id: string;
  status: string;
}

const DragDropKanban: React.FC = () => {
  const { tasks, updateTaskStatus } = useTasks();
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const dragCounter = useRef(0);

  const columns = [
    { id: 'todo', title: 'A Fazer', color: 'bg-gray-400' },
    { id: 'progress', title: 'Em Progresso', color: 'bg-blue-500' },
    { id: 'done', title: 'Concluído', color: 'bg-green-500' },
    { id: 'late', title: 'Atrasado', color: 'bg-red-500' }
  ];

  const handleDragStart = (e: React.DragEvent, taskId: string, status: string) => {
    setDraggedItem({ id: taskId, status });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    dragCounter.current++;
    const element = e.currentTarget as HTMLElement;
    element.classList.add('bg-blue-50', 'border-blue-300');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      const element = e.currentTarget as HTMLElement;
      element.classList.remove('bg-blue-50', 'border-blue-300');
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    dragCounter.current = 0;
    
    const element = e.currentTarget as HTMLElement;
    element.classList.remove('bg-blue-50', 'border-blue-300');

    if (draggedItem && draggedItem.status !== targetStatus) {
      await updateTaskStatus(draggedItem.id, targetStatus);
    }
    
    setDraggedItem(null);
  };

  const getTasksForStatus = (status: string) => {
    return tasks.filter(task => task.status === status && !task.archived);
  };

  return (
    <div className="flex gap-6 overflow-x-auto p-6">
      {columns.map((column) => {
        const columnTasks = getTasksForStatus(column.id);
        
        return (
          <div
            key={column.id}
            className="bg-gray-50 rounded-lg p-4 min-h-[600px] w-80 border-2 border-transparent transition-all duration-200"
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                <h2 className="font-semibold text-gray-900">{column.title}</h2>
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id, task.status)}
                  className="cursor-move hover:shadow-lg transition-shadow"
                >
                  <TaskCard
                    id={task.id}
                    title={task.title}
                    description={task.description || ''}
                    status={task.status as 'todo' | 'progress' | 'done' | 'late'}
                    priority={task.priority as 'low' | 'medium' | 'high'}
                    assignee={{
                      name: task.assignee_name || 'Não atribuído',
                      avatar: task.assignee_avatar || undefined
                    }}
                    dueDate={task.due_date || undefined}
                    subtasks={{
                      completed: task.subtasks?.filter(st => st.completed).length || 0,
                      total: task.subtasks?.length || 0
                    }}
                    comments={task.comments?.length || 0}
                    attachments={task.attachments?.length || 0}
                  />
                </div>
              ))}
            </div>

            <button className="w-full mt-4 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Adicionar tarefa</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default DragDropKanban;
