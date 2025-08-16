import React from 'react';
import type { SubtaskWithDetails } from '@/types';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Circle, CircleCheck, CircleDashed, AlertOctagon,
  ArrowDown, ArrowRight, ArrowUp,
  Edit
} from 'lucide-react';
import { useSubtasks } from '@/hooks/useSubtasks';
import { toast } from 'sonner';
import { cn, getInitials } from '@/lib/utils';

// Reutilizando as mesmas configurações de estilo do TaskTableRow
const statusConfig = {
  todo: { label: 'A Fazer', icon: CircleDashed, color: 'text-gray-500' },
  progress: { label: 'Em Progresso', icon: Circle, color: 'text-blue-500' },
  done: { label: 'Concluído', icon: CircleCheck, color: 'text-green-500' },
  late: { label: 'Atrasado', icon: AlertOctagon, color: 'text-red-500' },
};
const priorityConfig = {
  low: { label: 'Baixa', icon: ArrowDown, color: 'text-gray-500' },
  medium: { label: 'Média', icon: ArrowRight, color: 'text-yellow-500' },
  high: { label: 'Alta', icon: ArrowUp, color: 'text-red-500' },
};

interface SubtaskTableRowProps {
  subtask: SubtaskWithDetails;
  onClick: () => void;
}

const SubtaskTableRow: React.FC<SubtaskTableRowProps> = ({ subtask, onClick }) => {
  const { update } = useSubtasks(subtask.task_id);

  const currentStatus = statusConfig[subtask.status as keyof typeof statusConfig] || statusConfig.todo;
  const currentPriority = subtask.priority ? priorityConfig[subtask.priority as keyof typeof priorityConfig] : null;

  const handleToggleComplete = async () => {
    try {
      await update({
        id: subtask.id,
        updates: { 
          completed: !subtask.completed,
          status: !subtask.completed ? 'done' : 'todo'
        }
      });
      toast.success(subtask.completed ? "Ação marcada como pendente." : "Ação concluída!");
    } catch (error: any) {
      toast.error("Erro ao atualizar status.", { description: error.message });
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede que clicar no checkbox acione o onClick da linha inteira
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede que o clique na linha toda seja acionado
    onClick();
  };

  return (
    <TableRow 
      className="bg-muted/50 hover:bg-muted/80 group"
      onClick={() => {
        console.log('CLIQUE NA LINHA DA TABELA! ID:', subtask.id);
        onClick();
      }}
    >
      {/* Célula 1: Título */}
      <TableCell className="pl-12 py-2">
        <div className="flex items-center gap-3" onClick={handleCheckboxClick}>
          <Checkbox 
            id={`subtask-table-row-${subtask.id}`}
            checked={subtask.completed} 
            onCheckedChange={handleToggleComplete} 
          />
          <label 
            htmlFor={`subtask-table-row-${subtask.id}`}
            className={`text-sm cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}
          >
            {subtask.title}
          </label>
        </div>
      </TableCell>
      
      {/* Célula 2: Status */}
      <TableCell>
        <div className={cn("flex items-center gap-2 text-sm", currentStatus.color)}>
          <currentStatus.icon className="h-4 w-4" />
          <span>{currentStatus.label}</span>
        </div>
      </TableCell>

      {/* Célula 3: Prioridade */}
      <TableCell>
        {currentPriority ? (
          <div className={cn("flex items-center gap-2 text-sm", currentPriority.color)}>
            <currentPriority.icon className="h-4 w-4" />
            <span>{currentPriority.label}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Célula 4: Responsável */}
      <TableCell>
        {subtask.assignee ? (
          <div className="flex items-center gap-2" title={subtask.assignee.full_name || 'Responsável'}>
            <Avatar className="h-6 w-6">
              <AvatarImage src={subtask.assignee.avatar_url || undefined} />
              <AvatarFallback className="text-xs">{getInitials(subtask.assignee.full_name)}</AvatarFallback>
            </Avatar>
          </div>
        ) : <span className="text-xs text-muted-foreground">N/A</span>}
      </TableCell>

      {/* Célula 5: Ações */}
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