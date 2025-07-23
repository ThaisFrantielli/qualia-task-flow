
import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface TaskOverdueIndicatorProps {
  dueDate: string;
  status: string;
  size?: 'sm' | 'md';
}

const TaskOverdueIndicator: React.FC<TaskOverdueIndicatorProps> = ({
  dueDate,
  status,
  size = 'md'
}) => {
  if (status === 'done') return null;

  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOverdue = due < today;
  const isToday = due.toDateString() === today.toDateString();
  const isTomorrow = due.toDateString() === new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString();

  if (isOverdue) {
    const daysOverdue = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="destructive"
              className={`flex items-center gap-1 ${size === 'sm' ? 'text-xs' : ''}`}
            >
              <AlertTriangle className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
              {daysOverdue === 1 ? '1 dia atraso' : `${daysOverdue} dias atraso`}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Esta tarefa está com {daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'} de atraso.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isToday) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`flex items-center gap-1 border-orange-500 text-orange-700 bg-orange-50 ${size === 'sm' ? 'text-xs' : ''}`}
            >
              <Clock className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
              Vence hoje
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Esta tarefa vence hoje.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isTomorrow) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`flex items-center gap-1 border-yellow-500 text-yellow-700 bg-yellow-50 ${size === 'sm' ? 'text-xs' : ''}`}
            >
              <Clock className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
              Vence amanhã
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Esta tarefa vence amanhã.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
};

export default TaskOverdueIndicator;
