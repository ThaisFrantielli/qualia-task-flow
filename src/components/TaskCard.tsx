
import React from 'react';
import { Clock, MessageCircle, Paperclip, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useTasks } from '@/hooks/useTasks';
import TaskTags from './tasks/TaskTags';
import { formatDateSafe } from '@/lib/dateUtils';
import TaskOverdueIndicator from './tasks/TaskOverdueIndicator';

const isFunction = (v: any): v is (...args: any[]) => any => typeof v === 'function';

interface TaskCardProps {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'progress' | 'done' | 'late';
  priority: 'low' | 'medium' | 'high';
  assignee: {
    name: string;
    avatar?: string;
  };
  dueDate?: string;
  tags?: string[];
  estimatedHours?: number;
  subtasks?: {
    completed: number;
    total: number;
  };
  comments?: number;
  attachments?: number;
  onStatusChange?: (newStatus: string) => void;
  onTagsChange?: (tags: string[]) => void;
  onOpen?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  id,
  title,
  description,
  status,
  priority,
  assignee,
  dueDate,
  tags = [],
  estimatedHours,
  subtasks,
  comments,
  attachments,
  onTagsChange,
  onOpen, onDelete
}) => {
  const navigate = useNavigate();
  const { deleteTask } = useTasks({});
  const handleOpen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isFunction(onOpen)) return (onOpen as (id: string) => void)(String(id));
    navigate(`/tasks/${id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFunction(onDelete)) return (onDelete as (id: string) => void)(String(id));
    try {
      if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
      if (typeof deleteTask === 'function') {
        await deleteTask(String(id));
        toast.success('Tarefa excluída');
        if (isFunction(onDelete)) (onDelete as (id: string) => void)(String(id));
      } else {
        toast.error('Não foi possível excluir (deleteTask não disponível). Abra a tarefa para excluir.');
      }
    } catch (err: any) {
      console.error('Erro ao excluir tarefa:', err);
      toast.error('Erro ao excluir tarefa');
    }
  };
  const statusColors = {
    todo: 'border-l-gray-400',
    progress: 'border-l-blue-500',
    done: 'border-l-green-500',
    late: 'border-l-red-500'
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${statusColors[status]} p-4 hover:shadow-md transition-shadow duration-200`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{title}</h3>
        <div className="flex gap-2 items-center">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${priorityColors[priority]}`}>
            {priority === 'low' ? 'Baixa' : priority === 'medium' ? 'Média' : 'Alta'}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="Ações" onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-muted">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={(e: any) => handleOpen(e)}>Abrir / Editar</DropdownMenuItem>
              <DropdownMenuItem onSelect={(e: any) => handleDelete(e)}>Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{description}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mb-3">
          <TaskTags 
            tags={tags} 
            onTagsChange={onTagsChange || (() => {})} 
            readOnly={!onTagsChange}
          />
        </div>
      )}

      {/* Overdue Indicator */}
      {dueDate && (
        <div className="mb-3">
          <TaskOverdueIndicator dueDate={dueDate} status={status} size="sm" />
        </div>
      )}

      {/* Estimated Hours */}
      {estimatedHours && (
        <div className="mb-3 text-xs text-gray-600">
          <Clock className="w-3 h-3 inline mr-1" />
          {estimatedHours}h estimadas
        </div>
      )}

      {/* Progress Bar for Subtasks */}
      {subtasks && subtasks.total > 0 && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">Subtarefas</span>
            <span className="text-xs text-gray-600 font-medium">
              {subtasks.completed}/{subtasks.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(subtasks.completed / subtasks.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          {/* Assignee */}
          <div className="flex items-center space-x-1">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">
                {assignee.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="truncate max-w-20">{assignee.name}</span>
          </div>
          
          {/* Attachments */}
          {attachments && attachments > 0 && (
            <div className="flex items-center space-x-1">
              <Paperclip className="w-3 h-3" />
              <span>{attachments}</span>
            </div>
          )}
          
          {/* Comments */}
          {comments && comments > 0 && (
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-3 h-3" />
              <span>{comments}</span>
            </div>
          )}
        </div>

        {/* Due Date */}
        {dueDate && (
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formatDateSafe(dueDate, 'dd/MM/yyyy')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
