import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle2,
  MoreHorizontal,
  Archive,
  Trash2,
  Loader2,
  Edit,
  AlertTriangle,
  Clock,
  Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
}
 from "@/components/ui/tooltip";

import type { Task, User } from '@/types';

interface TaskTableRowProps {
  task: Task;
  onTaskClick: (task: Task) => void;
  onArchiveTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  isLoading: boolean;
  onPriorityChange: (taskId: string, priority: string) => void;
}

const TaskTableRow: React.FC<TaskTableRowProps> = ({
  task,
  onTaskClick,
  onArchiveTask,
  onDeleteTask,
  isLoading,
  onPriorityChange,
}) => {
  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusColorClass = (status: string | null) => {
    switch (status) {
      case 'todo': return 'text-gray-500';
      case 'progress': return 'text-blue-500';
      case 'done': return 'text-green-500';
      case 'late': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'todo': return 'A Fazer';
      case 'progress': return 'Em Andamento';
      case 'done': return 'Concluído';
      case 'late': return 'Atrasado';
      default: return status || 'Desconhecido';
    }
  };

  const getPriorityLabel = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return priority || 'Desconhecida';
    }
  };

  const subtasksCompleted = task.subtasks?.filter(s => s?.completed).length || 0;
  const subtasksTotal = task.subtasks?.length || 0;
  const subtaskProgress = subtasksTotal > 0 ? (subtasksCompleted / subtasksTotal) * 100 : 0;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(task.due_date!).getTime()) / (1000 * 3600 * 24)) : 0;

  const isRecentlyCompleted = task.status === 'done' && task.updated_at && new Date(task.updated_at) > new Date(new Date().setDate(new Date().getDate() - 7));

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sem data';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch (e) {
      console.error("Erro ao formatar data:", dateString, e);
      return 'Data inválida';
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    const newStatus = checked ? 'done' : 'todo';
    // Como a coluna de status foi removida, ainda precisamos atualizar o status quando o checkbox é clicado
    // onStatusChange(task.id, newStatus); // Removido, já que onStatusChange foi removido da interface
  };

  const renderPriorityIcon = (priority: string | null) => {
    switch (priority) {
      case 'high': return <span className={`${getPriorityColor(priority)} text-lg`}>&#x2757;</span>; // Símbolo de ponto de exclamação
      case 'medium': return <span className={`${getPriorityColor(priority)} text-lg`}>&#x26A0;&#xFE0F;</span>; // Símbolo de aviso
      case 'low': return <span className={`${getPriorityColor(priority)} text-lg`}>&#x1F53D;</span>; // Triângulo para baixo
      default: return <span className={`${getPriorityColor(priority)} text-lg`}>&#9675;</span>; // Círculo para desconhecido/padrão
    }
  };

  return (
    <TableRow
      className={`cursor-pointer hover:bg-gray-50 ${task.archived === true ? 'opacity-50' : ''}`}
      onClick={() => onTaskClick(task)}
    >
      {/* Célula de Tarefa */}
      <TableCell className="w-[300px]">
        <div className="flex items-center space-x-3">
          <Checkbox
            checked={task.status === 'done'}
            onCheckedChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900 mb-1">{task.title}</div>
            {task.description && (
              <div className="text-sm text-gray-500 line-clamp-2">
                {task.description}
              </div>
            )}
          </div>
        </div>
      </TableCell>{/* Remove o espaço em branco */}

      {/* Célula de Responsável - Apenas Avatar */}
      <TableCell>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                 <Avatar className="w-8 h-8">
                   <AvatarImage src={task.assignee_avatar ?? undefined} />
                   <AvatarFallback className="text-xs">
                     {task.assignee_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'NA'}
                   </AvatarFallback>
                 </Avatar>
              </TooltipTrigger>
              {/* Exibir o nome do responsável no tooltip */}
              <TooltipContent>
                {task.assignee_name || 'Não atribuído'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
      </TableCell>{/* Remove o espaço em branco */}

      {/* Célula de Projeto */}
      <TableCell>
        <span className="text-sm text-gray-700">
          {task.project?.name || 'Sem projeto'}
        </span>
      </TableCell>{/* Remove o espaço em branco */}

      {/* Célula de Prazo com destaque e indicador de atraso */}
      <TableCell className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
        <div className="flex items-center space-x-1">
          {isOverdue ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </TooltipTrigger>
                <TooltipContent>
                  {`Atrasada em ${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'}`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : task.due_date && (
             <Clock className={`w-4 h-4 ${getStatusColorClass(task.status)}`} />
          )}
          <span>{formatDate(task.due_date)}</span>
           {isRecentlyCompleted && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CheckCircle2 className="w-4 h-4 text-green-500 ml-1" />
                    </TooltipTrigger>
                    <TooltipContent>Concluída Recentemente</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
        </div>
      </TableCell>{/* Remove o espaço em branco */}

      {/* Célula de Progresso */}
      <TableCell className="font-medium text-gray-700">
        {subtasksTotal > 0 ? (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>{subtasksCompleted}/{subtasksTotal}</span>
            </div>
            <div className="w-16 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
          </div>
        ) : (
           <div className={`flex items-center space-x-1 text-sm ${getStatusColorClass(task.status)}`}>
            <Circle className="w-4 h-4 fill-current" />
            <span>{getStatusLabel(task.status)}</span>
          </div>
        )}
      </TableCell>{/* Remove o espaço em branco */}
      
      {/* Célula de Prioridade com símbolo e Tooltip - Movida para depois de Progresso */}
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-6 h-6">
                 {renderPriorityIcon(task.priority)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {getPriorityLabel(task.priority)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>{/* Remove o espaço em branco */}

      {/* Célula de Ações */}
      <TableCell className="flex items-center space-x-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={(e) => {
                e.stopPropagation();
                onTaskClick(task);
              }}>
                <Edit className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {onDeleteTask && (
           <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTask(task.id);
                  }}
                  className="text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
               </TooltipTrigger>
              <TooltipContent>Excluir</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {onArchiveTask && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onArchiveTask(task.id);
              }}>
                <Archive className="w-4 h-4 mr-2" />
                Arquivar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
};

export default TaskTableRow;