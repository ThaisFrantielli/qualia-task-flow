
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
import { Calendar, MessageCircle, Paperclip, CheckCircle2, MoreHorizontal, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'] & {
  project?: Database['public']['Tables']['projects']['Row'];
  subtasks?: Database['public']['Tables']['subtasks']['Row'][];
  comments?: Database['public']['Tables']['comments']['Row'][];
  attachments?: Database['public']['Tables']['attachments']['Row'][];
};

interface TaskTableRowProps {
  task: Task;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onArchiveTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

const TaskTableRow: React.FC<TaskTableRowProps> = ({ 
  task, 
  onTaskClick, 
  onStatusChange, 
  onArchiveTask, 
  onDeleteTask 
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'progress': return 'bg-blue-100 text-blue-800';
      case 'done': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo': return 'A Fazer';
      case 'progress': return 'Em Andamento';
      case 'done': return 'Concluído';
      case 'late': return 'Atrasado';
      default: return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return priority;
    }
  };

  const subtasksCompleted = task.subtasks?.filter(s => s.completed).length || 0;
  const subtasksTotal = task.subtasks?.length || 0;

  return (
    <TableRow 
      className="cursor-pointer hover:bg-gray-50"
      onClick={() => onTaskClick(task)}
    >
      <TableCell>
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
      </TableCell>
      <TableCell>
        <Badge className={getStatusColor(task.status)}>
          {getStatusLabel(task.status)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={getPriorityColor(task.priority)}>
          {getPriorityLabel(task.priority)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={task.assignee_avatar || undefined} />
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
      <TableCell>
        <div className="flex items-center space-x-2">
          <Select
            value={task.status}
            onValueChange={(value) => {
              onStatusChange(task.id, value);
            }}
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
          
          {(onArchiveTask || onDeleteTask) && (
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
                    onArchiveTask(task.id);
                  }}>
                    <Archive className="w-4 h-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                )}
                {onDeleteTask && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTask(task.id);
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default TaskTableRow;
