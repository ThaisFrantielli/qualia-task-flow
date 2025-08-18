// src/components/tasks/TaskTableRow.tsx (COPIE E COLE ESTE CÓDIGO)

import React from 'react';
import type { TaskWithDetails } from '@/types';
import { TableRow, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { 
  MoreHorizontal, Eye, Edit, Archive, Trash2, 
  Circle, CircleCheck, CircleDashed, AlertOctagon,
  ArrowDown, ArrowRight, ArrowUp,
  ChevronRight, ChevronDown, 
  ListTodo
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';

interface TaskTableRowProps {
  task: TaskWithDetails;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onViewDetails: (task: TaskWithDetails) => void;
  onDeleteRequest: (task: TaskWithDetails) => void;
}

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

const TaskTableRow: React.FC<TaskTableRowProps> = ({ task, isExpanded, onToggleExpand, onViewDetails, onDeleteRequest }) => {
  const currentStatus = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
  const currentPriority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  
  const hasSubtasks = (task.subtasks_count ?? 0) > 0;
  const totalSubtasks = task.subtasks_count ?? 0;
  const completedSubtasks = task.completed_subtasks_count ?? 0;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const handleActionClick = (e: React.MouseEvent) => e.stopPropagation();

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand();
  };

  return (
    <TableRow 
      className="hover:bg-muted/50 cursor-pointer"
      onClick={() => onViewDetails(task)}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {hasSubtasks ? (
            <Button variant="ghost" size="icon" onClick={handleToggleClick} className="h-6 w-6 rounded-sm flex-shrink-0">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <div className="w-6 h-6 flex-shrink-0" />
          )}
          
          <span className="truncate">{task.title}</span>

          {hasSubtasks && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-muted-foreground ml-2 px-1.5 py-0.5 rounded-full bg-muted/50 hover:bg-muted transition-colors">
                    <ListTodo className="h-3 w-3" />
                    <span className="text-xs font-mono font-semibold tracking-tighter">{completedSubtasks}/{totalSubtasks}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Plano de ação: {completedSubtasks} de {totalSubtasks} concluídas.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      
      <TableCell>
        {hasSubtasks ? (
          <div className="flex items-center gap-2">
            <Progress value={progress} className="w-20 h-1.5" />
            <span className="text-xs font-mono text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
        ) : (
          <div className={cn("flex items-center gap-2 text-sm", currentStatus.color)}>
            <currentStatus.icon className="h-4 w-4" />
            <span>{currentStatus.label}</span>
          </div>
        )}
      </TableCell>
      
      <TableCell>
        <div className={cn("flex items-center gap-2 text-sm", currentPriority.color)}>
          <currentPriority.icon className="h-4 w-4" />
          <span>{currentPriority.label}</span>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={task.assignee?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{getInitials(task.assignee?.full_name)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-700 truncate">{task.assignee?.full_name || 'N/A'}</span>
        </div>
      </TableCell>
      
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={handleActionClick}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={handleActionClick}>
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
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDeleteRequest(task)}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default TaskTableRow;