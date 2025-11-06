// src/components/projects/TaskRow.tsx

import React from 'react';
import type { TaskWithDetails } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils'; // Assumindo que você tem essa função em utils

interface TaskRowProps {
  task: TaskWithDetails;
  onTaskClick: (task: TaskWithDetails) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, onTaskClick }) => {
  return (
    <tr 
      className="border-b group hover:bg-muted/50 transition-colors cursor-pointer" 
      onClick={() => onTaskClick(task)}
    >
      <td className="px-4 py-2 w-3/5">
        <div className="flex items-center gap-3">
          <span className="font-medium">{task.title}</span>
        </div>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Avatar className="h-6 w-6">
            <AvatarImage src={task.assignee?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{getInitials(task.assignee?.full_name)}</AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground">{task.assignee?.full_name || 'N/A'}</span>
        </div>
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">
        {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
      </td>
      <td className="px-4 py-2">
        <Badge variant="outline">{task.priority || 'Normal'}</Badge>
      </td>
    </tr>
  );
};

export default TaskRow;    