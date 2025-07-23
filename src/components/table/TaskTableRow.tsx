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
import { Calendar, MessageCircle, Paperclip, CheckCircle2, MoreHorizontal, Archive, Trash2, Loader2, Edit } from 'lucide-react'; // Importe o ícone Edit
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox'; // Importe o componente Checkbox
import type { Database, Task } from '@/types';

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
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'progress': return 'bg-blue-100 text-blue-800';
      case 'done': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const handleCheckboxChange = (checked: boolean) => {
    const newStatus = checked ? 'done' : 'todo'; // Assume 'todo' se desmarcar
    onStatusChange(task.id, newStatus);
  };

  return (
    <TableRow
      className="cursor-pointer hover:bg-gray-50"
      // Remove o onClick direto da linha para evitar conflito com o checkbox/botões
      // onClick={() => onTaskClick(task)}
    >
      <TableCell className="w-[300px]">
        <div className="flex items-center space-x-3"> {/* Adiciona flexbox para alinhar checkbox e texto */}
          <Checkbox
            checked={task.status === 'done'}
            onCheckedChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()} // Impede que o clique no checkbox propague para a linha
          />
          <div>
            <div className="font-medium text-gray-900 mb-1">{task.title}</div>
            {task.description && (
              <div className="text-sm text-gray-500 line-clamp-2">
                {task.description}
              </div>
            )}
            <div className="flex items-center space-x-4 mt-2">
              {task.comments && task.comments.length > 0 && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <MessageCircle className="w-3 h-3" />
                  <span>{task.comments.length}</span>
                </div>
              )}
              {task.attachments && task.attachments.length > 0 && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Paperclip className="w-3 h-3" />
                  <span>{task.attachments.length}</span>
                </div>
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
          // Mantém o Select para mudança de status para outros estados além de concluído/a fazer
          <Select
            value={task.status ?? ''}
            onValueChange={(value) => {
              onStatusChange(task.id, value);
            }}
            disabled={isLoading}
          >
            <SelectTrigger className="w-32 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">A Fazer</SelectItem>
              <SelectItem value="progress">Em Andamento</SelectItem>
              <SelectItem value="done">Concluído</SelectItem>
              <SelectItem value="late">Atrasado</SelectItem>
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
              {task.assignee_name?.split(' ').map(n => n[0]).join('') || 'NA'}
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
        {task.due_date ? (
          <div className="flex items-center space-x-1 text-sm text-gray-700">
            <Calendar className="w-3 h-3" />
            <span>{new Date(task.due_date).toLocaleDateString('pt-BR')}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Sem prazo</span>
        )}
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
                style={{ width: `${(subtasksCompleted / subtasksTotal) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Sem subtarefas</span>
        )}
      </TableCell>
      <TableCell className="flex items-center space-x-2"> {/* Adiciona flexbox para alinhar os ícones */}
        {/* Ícone de Editar */}
        <Button variant="ghost" size="sm" onClick={(e) => {
          e.stopPropagation(); // Impede que o clique propague para a linha
          onTaskClick(task); // Chama a função de clique na tarefa para abrir detalhes/edição
        }}>
          <Edit className="w-4 h-4" />
        </Button>

        {/* Ícone de Deletar */}
        {onDeleteTask && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation(); // Impede que o clique propague para a linha
              onDeleteTask(task.id);
            }}
            className="text-red-600 hover:bg-red-100" // Adiciona hover visual
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}

        {/* DropdownMenu para Arquivar e outras futuras ações */}
        {(onArchiveTask) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {onArchiveTask && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  console.log("Botão Arquivar clicado em TaskTableRow para a tarefa: ", task.id);
                  onArchiveTask(task.id);
                }}>
                  <Archive className="w-4 h-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
              )}
               {/* Outras ações podem ser adicionadas aqui no futuro */}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
};

export default TaskTableRow;
