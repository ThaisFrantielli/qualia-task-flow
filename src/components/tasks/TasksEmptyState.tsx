
import React from 'react';
import { Button } from '@/components/ui/button';
import { Search, Plus, Target } from 'lucide-react';

interface TasksEmptyStateProps {
  hasFilters: boolean;
  focusMode: boolean;
  onCreateTask: () => void;
  onClearFilters?: () => void;
}

const TasksEmptyState: React.FC<TasksEmptyStateProps> = ({
  hasFilters,
  focusMode,
  onCreateTask,
  onClearFilters
}) => {
  if (focusMode) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <Target className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Modo Foco Ativado
        </h3>
        <p className="text-gray-500 mb-4">
          Nenhuma tarefa atribuída a você para hoje. Hora de relaxar! 🎉
        </p>
        <Button onClick={onCreateTask}>
          <Plus className="w-4 h-4 mr-2" />
          Criar nova tarefa
        </Button>
      </div>
    );
  }

  return (
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
      <div className="flex gap-2 justify-center">
        {hasFilters && onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        )}
        <Button onClick={onCreateTask}>
          <Plus className="w-4 h-4 mr-2" />
          {hasFilters ? 'Criar nova tarefa' : 'Criar primeira tarefa'}
        </Button>
      </div>
    </div>
  );
};

export default TasksEmptyState;
