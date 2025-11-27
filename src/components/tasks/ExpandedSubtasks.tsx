// src/components/tasks/ExpandedSubtasks.tsx (COPIE E COLE ESTE CÓDIGO)

import React from 'react';
import { useSubtasks } from '@/hooks/useSubtasks';
import SubtaskTableRow from './SubtaskTableRow';
import AddSubtaskInline from './AddSubtaskInline';
import { TableRow, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ListTodo } from 'lucide-react';

interface ExpandedSubtasksProps {
  taskId: string;
  onSubtaskClick: (subtaskId: string) => void;
}

const ExpandedSubtasks: React.FC<ExpandedSubtasksProps> = ({ taskId, onSubtaskClick }) => {
  const { subtasks, isLoading, error } = useSubtasks(taskId);

  if (isLoading) {
    return (
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={5} className="py-2">
          <Skeleton className="h-8 w-full" />
        </TableCell>
      </TableRow>
    );
  }

  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="text-center text-destructive py-4">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Erro ao carregar o plano de ação.</span>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {subtasks.length > 0 ? (
        subtasks.map((subtask) => (
          <SubtaskTableRow 
            key={subtask.id} 
            subtask={subtask} 
            onClick={() => onSubtaskClick(subtask.id)} 
          />
        ))
      ) : (
        <TableRow className="bg-muted/50 border-none">
          <TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-sm">
            <div className="flex items-center justify-center gap-2">
              <ListTodo className="h-4 w-4" />
              <span>Esta tarefa não possui um plano de ação. Adicione a primeira ação abaixo.</span>
            </div>
          </TableCell>
        </TableRow>
      )}

      {/* Formulário para adicionar nova subtarefa inline */}
      <AddSubtaskInline taskId={taskId} />
    </>
  );
};

export default ExpandedSubtasks;