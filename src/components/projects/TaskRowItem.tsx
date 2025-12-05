import { formatDateSafe } from '@/lib/dateUtils';
import { ChevronRight, MoreVertical, AlertCircle } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, isValid } from 'date-fns';

interface TaskRowItemProps {
  task: any;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  todo: { label: 'A Fazer', variant: 'outline' },
  progress: { label: 'Em Progresso', variant: 'secondary' },
  done: { label: 'Concluída', variant: 'default' },
  late: { label: 'Atrasada', variant: 'destructive' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'text-muted-foreground' },
  medium: { label: 'Média', color: 'text-amber-600' },
  high: { label: 'Alta', color: 'text-destructive' },
};

export function TaskRowItem({
  task,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: TaskRowItemProps) {
  const navigate = useNavigate();

  const getDueDateStatus = () => {
    if (!task.due_date || task.status === 'done') return null;
    try {
      const dueDate = parseISO(task.due_date);
      if (!isValid(dueDate)) return null;
      const daysUntilDue = differenceInDays(dueDate, new Date());
      if (daysUntilDue < 0) return 'overdue';
      if (daysUntilDue <= 2) return 'warning';
      return null;
    } catch {
      return null;
    }
  };

  const dueDateStatus = getDueDateStatus();

  return (
    <TableRow className="hover:bg-muted/50 group">
      <TableCell className="align-middle w-0" style={{ width: 48, paddingLeft: 72 }}>
        <button
          type="button"
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
          aria-label={isExpanded ? 'Recolher tarefa' : 'Expandir tarefa'}
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
      </TableCell>
      <TableCell className="align-middle font-normal text-sm">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-base">{task.title}</span>
          {typeof task.subtasks_count === 'number' && task.subtasks_count > 0 && (
            <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
              {task.completed_subtasks_count || 0}/{task.subtasks_count}
            </span>
          )}
          {dueDateStatus === 'overdue' && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </TableCell>
      <TableCell className="align-middle">
        <Badge variant={statusConfig[task.status]?.variant || 'outline'}>
          {statusConfig[task.status]?.label || task.status}
        </Badge>
      </TableCell>
      <TableCell className="align-middle">
        <span className={cn('text-sm font-medium', priorityConfig[task.priority]?.color)}>
          {priorityConfig[task.priority]?.label || task.priority}
        </span>
      </TableCell>
      <TableCell className="align-middle">
        <span className="text-xs text-muted-foreground">
          {task.assignee?.full_name || 'N/A'}
        </span>
      </TableCell>
      <TableCell className="align-middle">
        <span
          className={cn(
            'text-xs',
            dueDateStatus === 'overdue' ? 'text-destructive font-medium' :
            dueDateStatus === 'warning' ? 'text-amber-600' : 'text-muted-foreground'
          )}
        >
          {task.due_date ? formatDateSafe(task.due_date, 'dd/MM/yyyy') : '-'}
        </span>
      </TableCell>
      <TableCell className="align-middle text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded-full hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => navigate(`/tasks/${task.id}`)}>
              Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
