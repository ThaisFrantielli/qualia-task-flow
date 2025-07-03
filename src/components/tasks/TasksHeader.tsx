
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface TasksHeaderProps {
  onCreateTask: () => void;
  onCreateProject: () => void;
}

const TasksHeader: React.FC<TasksHeaderProps> = ({ onCreateTask, onCreateProject }) => {
  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lista de Tarefas</h1>
        <p className="text-gray-600">Visualize e gerencie todas as suas tarefas</p>
      </div>
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          onClick={onCreateProject}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Projeto</span>
        </Button>
        <Button 
          onClick={onCreateTask}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Tarefa</span>
        </Button>
      </div>
    </div>
  );
};

export default TasksHeader;
