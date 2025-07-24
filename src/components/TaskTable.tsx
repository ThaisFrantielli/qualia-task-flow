import React from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import TaskTableRow from './table/TaskTableRow';
import type { Task, User } from '@/types';

interface TaskTableProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onArchiveTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onPriorityChange: (taskId: string, newPriority: string) => Promise<void>;
  isLoading: boolean;
}

const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  onTaskClick,
  onArchiveTask,
  onDeleteTask,
  onPriorityChange,
  isLoading
}) => {
  return (
    <div className="bg-white rounded-xl shadow-quality overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Tarefa</TableHead>{/* Removido espaço */}
            {/* Movendo Prioridade para depois de Progresso */}
            <TableHead>Responsável</TableHead>{/* Removido espaço */}
            <TableHead>Projeto</TableHead>{/* Removido espaço */}
            <TableHead>Prazo</TableHead>{/* Removido espaço */}
            <TableHead>Progresso</TableHead>{/* Removido espaço */}
            <TableHead>Prioridade</TableHead>{/* Removido espaço */}
            <TableHead>Ações</TableHead>{/* Removido espaço */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TaskTableRow
              key={task.id}
              task={task}
              onTaskClick={onTaskClick}
              onArchiveTask={onArchiveTask}
              onDeleteTask={onDeleteTask}
              onPriorityChange={onPriorityChange}
              isLoading={isLoading}
            />
          ))}{/* Removido espaço */}
        </TableBody>
      </Table>
    </div>
  );
};

export default TaskTable;
