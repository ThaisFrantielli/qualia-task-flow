import React from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import TaskTableRow from './task/TaskTableRow';
import type { Task } from '@/types';

interface TaskTableProps {
  tasks: Task[];
  isLoading: boolean;
}

const TaskTable: React.FC<TaskTableProps> = ({
  tasks
}) => {
  return (
  <div className="bg-white rounded-xl shadow-quality overflow-hidden"> {/* Quality Conecta */}
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
              task={task as any} // TODO: Fix type mismatch
              onViewDetails={() => {}} // TODO: Implement view details
              onDeleteRequest={() => {}} // TODO: Implement delete
            />
          ))}{/* Removido espaço */}
        </TableBody>
      </Table>
    </div>
  );
};

export default TaskTable;
