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
  MessageCircle,
  Paperclip,
  CheckCircle2,
  MoreHorizontal,
  Archive,
  Trash2,
  Loader2,
  Edit,
  AlertTriangle, // Ícone para atraso
  Clock, // Ícone para prazo
  Circle // Ícone genérico para progresso/status sem subtarefas
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { Task } from '@/types';

interface TaskTableRowProps {
  task: Task;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onArchiveTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  isLoading: boolean;
}

const TaskTableRow: React.FC<TaskTableRowProps> = ({
  task,
  onTaskClick,
  onStatusChange,
  onArchiveTask,
  onDeleteTask,
  isLoading,
}) => {
  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string | null) => {
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

  const subtasksCompleted = task.subtasks?.filter(s => s.completed).length || 0;
  const subtasksTotal = task.subtasks?.length || 0;
  const subtaskProgress = subtasksTotal > 0 ? (subtasksCompleted / subtasksTotal) * 100 : 0;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
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
    onStatusChange(task.id, newStatus);
  };

  return (
    <TableRow
      className="cursor-pointer hover:bg-gray-50"
      onClick={() => onTaskClick(task)}
    >
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
            <div className="flex items-center space-x-4 mt-2">
              {isOverdue && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                    </TooltipTrigger>
                    <TooltipContent>Atrasada</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {isRecentlyCompleted && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    </TooltipTrigger>
                    <TooltipContent>Concluída Recentemente</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {task.comments && task.comments.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <MessageCircle className="w-3 h-3" />
                        <span>{task.comments.length}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{`Comentários: ${task.comments.length}`}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {task.attachments && task.attachments.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Paperclip className="w-3 h-3" />
                        <span>{task.attachments.length}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{`Anexos: ${task.attachments.length}`}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!isOverdue && task.due_date && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Clock className="w-3 h-3 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent>{`Prazo: ${formatDate(task.due_date)}`}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {isLoading ? (
          <div className="flex items-center">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>Atualizando...</span>
          </div>
        ) : (
          <Select
            value={task.status ?? ''}
            onValueChange={(value) => {
              onStatusChange(task.id, value);
            }}
            disabled={isLoading || task.status === 'done' || task.status === 'late'}
          >
            <SelectTrigger className="w-32 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">A Fazer</SelectItem>
              <SelectItem value="progress">Em Andamento</SelectItem>
            </SelectContent>
          </Select>
        )}
      </TableCell>
      <TableCell>
        <Badge className={getPriorityColor(task.priority)}>
          {getPriorityLabel(task.priority)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={task.assignee_avatar ?? undefined} />
            <AvatarFallback className="text-xs">
              {task.assignee_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'NA'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-700">
            {task.assignee_name || 'Não atribuído'}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-gray-700">
          {task.project?.name || 'Sem projeto'}
        </span>
      </TableCell>
      <TableCell>
        {/* Célula de prazo vazia, já que o ícone está na primeira célula */}
      </TableCell>
      <TableCell>
        {subtasksTotal > 0 ? (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span className="text-xs text-gray-600">
                {subtasksCompleted}/{subtasksTotal}
              </span>
            </div>
            <div className="w-16 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className={`flex items-center space-x-1 text-xs ${getStatusColor(task.status)}`}>
            <Circle className="w-3 h-3 fill-current" />
            <span>{getStatusLabel(task.status)}</span>
          </div>
        )}
      </TableCell>
      <TableCell className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={(e) => {
          e.stopPropagation();
          onTaskClick(task);
        }}>
          <Edit className="w-4 h-4" />
        </Button>
        {onDeleteTask && (
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