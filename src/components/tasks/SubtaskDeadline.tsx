// src/components/tasks/SubtaskDeadline.tsx

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SubtaskWithDetails } from '@/types';

interface SubtaskDeadlineProps {
  subtask: SubtaskWithDetails;
}

const SubtaskDeadline: React.FC<SubtaskDeadlineProps> = ({ subtask }) => {
  if (!subtask.due_date) {
    return <span className="text-xs text-muted-foreground">Sem prazo</span>;
  }

  const dueDate = new Date(subtask.due_date);

  // Se a subtarefa já foi concluída, não mostramos o status de atraso
  if (subtask.completed) {
    return (
      <span className="text-xs text-muted-foreground line-through">
        {format(dueDate, "dd 'de' MMM", { locale: ptBR })}
      </span>
    );
  }

  if (isPast(dueDate) && !isToday(dueDate)) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1 text-xs">
        <AlertTriangle className="h-3 w-3" />
        Atrasado
      </Badge>
    );
  }
  
  if (isToday(dueDate)) {
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-xs border-orange-500 text-orange-700">
        <Clock className="h-3 w-3" />
        Hoje
      </Badge>
    );
  }
  
  if (isTomorrow(dueDate)) {
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-xs border-yellow-500 text-yellow-700">
        <Clock className="h-3 w-3" />
        Amanhã
      </Badge>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">
      {format(dueDate, "dd 'de' MMM", { locale: ptBR })}
    </span>
  );
};

export default SubtaskDeadline;