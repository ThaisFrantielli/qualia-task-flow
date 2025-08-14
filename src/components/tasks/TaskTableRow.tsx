// src/components/tasks/TaskTableRow.tsx

import React from 'react';
import type { TaskWithDetails } from '@/types'; // <-- Correto
import { TableRow, TableCell } from '@/components/ui/table';
// ... outras importações ...

interface TaskTableRowProps {
  task: TaskWithDetails; // <-- TaskWithDetails contém todas as propriedades
  onViewDetails: (task: TaskWithDetails) => void;
  onDeleteRequest: (task: TaskWithDetails) => void;
}

const TaskTableRow: React.FC<TaskTableRowProps> = ({ task, onViewDetails, onDeleteRequest }) => {
  // ... resto do componente
  
  return (
    <TableRow onClick={() => onViewDetails(task)} className="cursor-pointer">
      <TableCell>{task.title}</TableCell>
      {/* ... */}
      <TableCell>
        {/* Agora 'assignee_name' existe porque TaskWithDetails foi enriquecido no hook useTasks */}
        {task.assignee_name || 'N/A'} 
      </TableCell>
      {/* ... */}
    </TableRow>
  );
};
export default TaskTableRow;