// src/components/tasks/TaskTableRow.tsx

import React from 'react';
import type { Task } from '@/types';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, Eye, Edit, Archive, Trash2, 
  Circle, CircleCheck, CircleDashed, AlertOctagon, // Ícones de Status
  ArrowDown, ArrowRight, ArrowUp // Ícones de Prioridade
} from 'lucide-react';
import { cn } from '@/lib/utils'; // Utility para classes condicionais

interface TaskTableRowProps {
  task: Task;
  onViewDetails: (task: Task) => void;
  // Futuramente: onEdit, onDelete, etc.
}

// Mapeamento de Status para Ícones, Cores e Labels
const statusConfig = {
  todo: { label: 'A Fazer', icon: CircleDashed, color: 'text-gray-500' },
  progress: { label: 'Em Progresso', icon: Circle, color: 'text-blue-500' },
  done: { label: 'Concluído', icon: CircleCheck, color: 'text-green-500' },
  late: { label: 'Atrasado', icon: AlertOctagon, color: 'text-red-500' },
};

// Mapeamento de Prioridade para Ícones, Cores e Labels
const priorityConfig = {
  low: { label: 'Baixa', icon: ArrowDown, color: 'text-gray-500' },
  medium: { label: 'Média', icon: ArrowRight, color: 'text-yellow-500' },
  high: { label: 'Alta', icon: ArrowUp, color: 'text-red-500' },
};

const getInitials = (name: string | null) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

const TaskTableRow: React.FC<TaskTableRowProps> = ({ task, onViewDetails }) => {
  const currentStatus = statusConfig[task.status as keyof typeof statusConfig || 'todo'];
  const currentPriority = priorityConfig[task.priority as keyof typeof priorityConfig || 'low'];

  return (
    // 1. LINHA CLICÁVEL: Adicionado onClick e cursor-pointer
    <TableRow 
      className="hover:bg-muted/50 cursor-pointer"
      onClick={() => onViewDetails(task)}
    >
      <TableCell className="font-medium">{task.title}</TableCell>
      
      {/* 2. Célula de Status com Ícone e Cor */}
      <TableCell>
        <div className={cn("flex items-center gap-2 text-sm", currentStatus.color)}>
          <currentStatus.icon className="h-4 w-4" />
          <span>{currentStatus.label}</span>
        </div>
      </TableCell>
      
      {/* 3. Célula de Prioridade com Ícone e Cor */}
      <TableCell>
        <div className={cn("flex items-center gap-2 text-sm", currentPriority.color)}>
          <currentPriority.icon className="h-4 w-4" />
          <span>{currentPriority.label}</span>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={task.assignee_avatar || undefined} />
            <AvatarFallback className="text-xs">{getInitials(task.assignee_name)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-700">{task.assignee_name || 'N/A'}</span>
        </div>
      </TableCell>

      <TableCell className="text-right">
        {/* O Menu de Ações agora impede a propagação do clique para a linha */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(task)}>
              <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" /> Editar Tarefa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Archive className="mr-2 h-4 w-4" /> Arquivar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 focus:text-red-600">
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default TaskTableRow;