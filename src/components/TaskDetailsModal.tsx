
import React, { useState } from 'react';
import { X, Calendar, User, Tag, Clock, Paperclip, Users, MessageSquare, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTasks } from '@/hooks/useTasks';
import TaskAttachments from './task/TaskAttachments';
import TaskHistory from './task/TaskHistory';
import TaskDelegation from './task/TaskDelegation';
import MentionComments from './comments/MentionComments';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'] & {
  project?: Database['public']['Tables']['projects']['Row'];
  subtasks?: Database['public']['Tables']['subtasks']['Row'][];  
  comments?: Database['public']['Tables']['comments']['Row'][];
  attachments?: Database['public']['Tables']['attachments']['Row'][];
};

interface TaskDetailsModalProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, open, onOpenChange }) => {
  const { updateTaskTags, updateTaskEstimatedHours } = useTasks();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);

  const handleSave = async () => {
    try {
      // Update tags if changed
      if (editedTask.tags !== task.tags) {
        const tags = editedTask.tags ? editedTask.tags.split(',').map(tag => tag.trim()) : [];
        await updateTaskTags(task.id, tags);
      }

      // Update estimated hours if changed
      if (editedTask.estimated_hours !== task.estimated_hours) {
        await updateTaskEstimatedHours(task.id, editedTask.estimated_hours || undefined);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-gray-100 text-gray-800';
      case 'progress':
        return 'bg-blue-100 text-blue-800';
      case 'done':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const taskTags = task.tags ? task.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl font-semibold">{task.title}</span>
            <div className="flex items-center gap-2">
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
              </Badge>
              <Badge className={getStatusColor(task.status)}>
                {task.status === 'todo' ? 'A Fazer' : task.status === 'progress' ? 'Em Progresso' : 'Concluído'}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
            <TabsTrigger value="comments">Comentários</TabsTrigger>
            <TabsTrigger value="delegation">Delegação</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Informações da Tarefa</CardTitle>
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    size="sm"
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  >
                    {isEditing ? 'Salvar' : 'Editar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={isEditing ? editedTask.title : task.title}
                      onChange={(e) => setEditedTask({...editedTask, title: e.target.value})}
                      readOnly={!isEditing}
                    />
                  </div>
                  <div>
                    <Label>Projeto</Label>
                    <Input
                      value={task.project?.name || 'Sem projeto'}
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={isEditing ? (editedTask.description || '') : (task.description || '')}
                    onChange={(e) => setEditedTask({...editedTask, description: e.target.value})}
                    readOnly={!isEditing}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Data de Início</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        {task.start_date ? formatDate(task.start_date) : 'Não definida'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Data de Término</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        {task.due_date ? formatDate(task.due_date) : 'Não definida'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Responsável</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        {task.assignee_name || 'Não atribuído'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tags</Label>
                    {isEditing ? (
                      <Input
                        value={editedTask.tags || ''}
                        onChange={(e) => setEditedTask({...editedTask, tags: e.target.value})}
                        placeholder="Separar tags com vírgula"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {taskTags.length > 0 ? (
                          taskTags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">Nenhuma tag</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Horas Estimadas</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedTask.estimated_hours || ''}
                        onChange={(e) => setEditedTask({...editedTask, estimated_hours: parseInt(e.target.value) || null})}
                        placeholder="Horas estimadas"
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          {task.estimated_hours ? `${task.estimated_hours}h` : 'Não definido'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-4">
                  Criado em: {formatDate(task.created_at)} | 
                  Última atualização: {formatDate(task.updated_at)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attachments">
            <TaskAttachments taskId={task.id} />
          </TabsContent>

          <TabsContent value="comments">
            <MentionComments taskId={task.id} />
          </TabsContent>

          <TabsContent value="delegation">
            <TaskDelegation taskId={task.id} />
          </TabsContent>

          <TabsContent value="history">
            <TaskHistory taskId={task.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsModal;
