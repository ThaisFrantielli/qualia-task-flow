// src/components/tasks/SubtaskTableRow.tsx (COPIE E COLE ESTE CÓDIGO)

import React from 'react';
import type { SubtaskWithDetails } from '@/types';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { useSubtasks } from '@/hooks/useSubtasks';
import { toast } from 'sonner';
import { cn, getInitials } from '@/lib/utils';

const priorityConfig = {
  low: { icon: ArrowDown, color: 'text-gray-500' },
  medium: { icon: ArrowRight, color: 'text-yellow-500' },
  high: { icon: ArrowUp, color: 'text-red-500' },
};

interface SubtaskTableRowProps {
  subtask: SubtaskWithDetails;
  onClick: () => void;
}

const SubtaskTableRow: React.FC<SubtaskTableRowProps> = ({ subtask, onClick }) => {
  const { update } = useSubtasks(subtask.task_id);
  const currentPriority = subtask.priority ? priorityConfig[subtask.priority as keyof typeof priorityConfig] : null;

  const handleToggleComplete = async (checked?: boolean) => {
    try {
      const newCompleted = typeof checked === 'boolean' ? checked : !subtask.completed;
      await update({
        id: subtask.id,
        updates: {
          completed: newCompleted,
          status: newCompleted ? 'done' : 'todo',
        }
      });
      toast.success(newCompleted ? "Ação concluída!" : "Ação marcada como pendente.");
    } catch (error: any) {
      toast.error("Erro ao atualizar status.", { description: error.message });
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <TableRow 
      className="bg-muted/50 hover:bg-muted/80 group cursor-pointer"
      onClick={onClick}
    >
      <TableCell className="pl-12 py-2">
        <div className="flex items-center gap-3">
          <Checkbox
            id={`subtask-row-${subtask.id}`}
            checked={subtask.completed}
            onCheckedChange={(checked) => handleToggleComplete(checked as boolean)}
            onClick={(e) => e.stopPropagation()}
          />
          <label 
            htmlFor={`subtask-row-${subtask.id}`}
            className={`text-sm cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}
          >
            {subtask.title}
          </label>
        </div>
      </TableCell>
      
      <TableCell className="text-center text-muted-foreground">--</TableCell>
      
      <TableCell>
        {currentPriority ? (
          <div className={cn("flex items-center gap-2 text-sm", currentPriority.color)}>
            <currentPriority.icon className="h-4 w-4" />
          </div>
        ) : (
          <span className="text-muted-foreground text-center block">--</span>
        )}
      </TableCell>

      <TableCell>
        {subtask.assignee ? (
          <div className="flex items-center gap-2" title={subtask.assignee.full_name || 'Responsável'}>
            <Avatar className="h-6 w-6">
              <AvatarImage src={subtask.assignee.avatar_url || undefined} />
              <AvatarFallback className="text-xs">{getInitials(subtask.assignee.full_name)}</AvatarFallback>
            </Avatar>
          </div>
        ) : null}
      </TableCell>

      <TableCell className="text-right">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleEditClick}
        >
          <Edit className="h-4 w-4 text-muted-foreground" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default SubtaskTableRow;