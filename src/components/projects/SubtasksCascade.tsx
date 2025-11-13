import React from 'react';
import { useSubtasks } from '@/hooks/useSubtasks';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface SubtasksCascadeProps {
  taskId: string;
}

const SubtasksCascade: React.FC<SubtasksCascadeProps> = ({ taskId }) => {
  const { subtasks, isLoading } = useSubtasks(taskId);

  if (isLoading) return <tr><td colSpan={4} className="pl-12 py-2 text-muted-foreground">Carregando subtarefas...</td></tr>;
  if (!subtasks || subtasks.length === 0) return null;

  return (
    <>
      {subtasks.map(subtask => (
        <tr key={subtask.id} className="bg-muted/20">
          <td className="pl-12 py-2 text-sm" colSpan={2}>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={subtask.completed} readOnly className="form-checkbox h-4 w-4 rounded text-primary border-gray-300 focus:ring-primary" />
              <span className={subtask.completed ? 'line-through text-muted-foreground' : ''}>{subtask.title}</span>
            </div>
          </td>
          <td className="py-2">
            <div className="flex items-center gap-2 text-xs">
              <Avatar className="h-5 w-5">
                <AvatarImage src={subtask.assignee?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">{getInitials(subtask.assignee?.full_name)}</AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground">{subtask.assignee?.full_name ?? 'N/A'}</span>
            </div>
          </td>
          <td className="py-2 text-xs text-muted-foreground">
            {subtask.due_date ? formatDateSafe(subtask.due_date, 'dd/MM/yyyy') : '-'}
          </td>
        </tr>
      ))}
    </>
  );
};

export default SubtasksCascade;
