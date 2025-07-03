
import React from 'react';
import { Calendar } from 'lucide-react';

interface TasksEmptyStateProps {
  hasFilters: boolean;
}

const TasksEmptyState: React.FC<TasksEmptyStateProps> = ({ hasFilters }) => {
  return (
    <div className="bg-white rounded-xl shadow-quality p-12 text-center">
      <div className="text-gray-400 mb-4">
        <Calendar className="w-16 h-16 mx-auto" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
      <p className="text-gray-500">
        {hasFilters
          ? 'Tente ajustar os filtros para encontrar suas tarefas.'
          : 'Crie sua primeira tarefa para começar.'}
      </p>
    </div>
  );
};

export default TasksEmptyState;
