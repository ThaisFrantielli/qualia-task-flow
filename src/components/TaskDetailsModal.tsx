
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, MessageCircle, Paperclip, Calendar, FolderOpen } from 'lucide-react';
import TaskTags from './tasks/TaskTags';
import TaskOverdueIndicator from './tasks/TaskOverdueIndicator';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'] & {
  project?: Database['public']['Tables']['projects']['Row'];
  subtasks?: Database['public']['Tables']['subtasks']['Row'][];
  comments?: Database['public']['Tables']['comments']['Row'][];
  attachments?: Database['public']['Tables']['attachments']['Row'][];
};

interface TaskDetailsModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, open, onOpenChange }) => {
  if (!task) return null;

  const statusMap = {
    todo: { label: 'A Fazer', color: 'bg-gray-100 text-gray-800' },
    progress: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
    done: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
    late: { label: 'Atrasado', color: 'bg-red-100 text-red-800' },
  };

  const priorityMap = {
    low: { label: 'Baixa', color: 'bg-green-100 text-green-800' },
    medium: { label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
    high: { label: 'Alta', color: 'bg-red-100 text-red-800' },
  };

  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const taskTags = task.tags ? task.tags.split(',').filter(tag => tag.trim()) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{task.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status, Prioridade e Indicador de Atraso */}
          <div className="flex gap-4 flex-wrap">
            <Badge className={statusMap[task.status as keyof typeof statusMap]?.color}>
              {statusMap[task.status as keyof typeof statusMap]?.label}
            </Badge>
            <Badge className={priorityMap[task.priority as keyof typeof priorityMap]?.color}>
              Prioridade: {priorityMap[task.priority as keyof typeof priorityMap]?.label}
            </Badge>
            {task.due_date && (
              <TaskOverdueIndicator dueDate={task.due_date} status={task.status} />
            )}
          </div>

          {/* Tags */}
          {taskTags.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Tags</h3>
              <TaskTags tags={taskTags} onTagsChange={() => {}} readOnly />
            </div>
          )}

          {/* Horas Estimadas */}
          {task.estimated_hours && (
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Horas estimadas:</span>
              <span className="font-medium">{task.estimated_hours}h</span>
            </div>
          )}

          {/* Descrição */}
          {task.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Descrição</h3>
              <p className="text-gray-600">{task.description}</p>
            </div>
          )}

          {/* Informações do Projeto e Responsável */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {task.project && (
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Projeto:</span>
                <span className="font-medium">{task.project.name}</span>
              </div>
            )}
            
            {task.assignee_name && (
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Responsável:</span>
                <span className="font-medium">{task.assignee_name}</span>
              </div>
            )}
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {task.start_date && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Data de Início:</span>
                <span className="font-medium">
                  {new Date(task.start_date).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            
            {task.due_date && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Data de Entrega:</span>
                <span className="font-medium">
                  {new Date(task.due_date).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>

          {/* Subtarefas */}
          {totalSubtasks > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  Subtarefas ({completedSubtasks}/{totalSubtasks})
                </h3>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {task.subtasks?.map((subtask) => (
                  <div key={subtask.id} className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={subtask.completed}
                      readOnly
                      className="rounded"
                    />
                    <span className={subtask.completed ? 'line-through text-gray-500' : ''}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comentários */}
          {task.comments && task.comments.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <MessageCircle className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-900">
                  Comentários ({task.comments.length})
                </h3>
              </div>
              <div className="space-y-3">
                {task.comments.slice(0, 3).map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{comment.author_name}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{comment.content}</p>
                  </div>
                ))}
                {task.comments.length > 3 && (
                  <p className="text-sm text-gray-500">
                    e mais {task.comments.length - 3} comentários...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Anexos */}
          {task.attachments && task.attachments.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Paperclip className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-900">
                  Anexos ({task.attachments.length})
                </h3>
              </div>
              <div className="space-y-2">
                {task.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center space-x-2 text-sm">
                    <Paperclip className="w-3 h-3 text-gray-400" />
                    <span>{attachment.filename}</span>
                    {attachment.file_size && (
                      <span className="text-gray-500">
                        ({(attachment.file_size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Datas de Criação e Atualização */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 border-t pt-4">
            <div>
              <Clock className="w-4 h-4 inline mr-1" />
              Criado em: {new Date(task.created_at).toLocaleDateString('pt-BR')}
            </div>
            <div>
              <Clock className="w-4 h-4 inline mr-1" />
              Atualizado em: {new Date(task.updated_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsModal;
