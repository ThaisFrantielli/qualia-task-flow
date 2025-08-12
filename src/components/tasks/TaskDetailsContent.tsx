// src/components/tasks/TaskDetailsContent.tsx

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
// CORREÇÃO: Adicionar a importação do Badge
import { Badge } from '@/components/ui/badge'; 
// CORREÇÃO: Remover 'Clock' e adicionar 'Loader2', 'Tag'
import { Edit, Save, X as CancelIcon, Calendar, User, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import TaskAttachments from '../task/TaskAttachments';
import TaskHistory from '../task/TaskHistory';
import TaskDelegation from '../task/TaskDelegation';
import MentionComments from '../comments/MentionComments';

import { useTask } from '@/hooks/useTasks'; 
import { useProfiles } from '@/hooks/useProfiles';
import { formatDate } from '@/lib/utils';
import type { Task, TaskWithDetails } from '@/types';

interface TaskDetailsContentProps {
  task: TaskWithDetails;
  onUpdate: () => void;
}

const TaskDetailsContent: React.FC<TaskDetailsContentProps> = ({ task, onUpdate }) => {
  const { updateTask } = useTask(task.id); 
  const { profiles } = useProfiles();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<TaskWithDetails>(task);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedTask(task);
    setIsEditing(false);
  }, [task]);

  if (!editedTask) {
    return <div>Carregando detalhes...</div>;
  }

  const handleInputChange = (field: keyof Task, value: any) => {
    setEditedTask(prev => ({ ...prev!, [field]: value }));
  };

  const handleCancelEdit = () => {
    setEditedTask(task);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!updateTask) {
      toast.error("Função de atualização não disponível.");
      return;
    }
    setIsSaving(true);
    try {
      const updates: Partial<Task> = {
        title: editedTask.title,
        description: editedTask.description,
        tags: editedTask.tags,
        estimated_hours: editedTask.estimated_hours,
        assignee_id: editedTask.assignee_id,
        start_date: editedTask.start_date,
        due_date: editedTask.due_date,
        priority: editedTask.priority,
      };

      await updateTask(updates);

      toast.success("Tarefa atualizada com sucesso!");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Failed to save task:", error);
      toast.error("Não foi possível salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const taskTags = task.tags ? String(task.tags).split(',').map(tag => tag.trim()).filter(Boolean) : [];
  const currentAssigneeName = task.assignee?.full_name || 'Não atribuído';

  return (
    <div className="flex-grow overflow-y-auto">
      <Tabs defaultValue="details" className="w-full">
        <div className="p-6 border-b sticky top-0 bg-background z-10">
          <TabsList>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
            <TabsTrigger value="comments">Comentários</TabsTrigger>
            <TabsTrigger value="delegation">Delegação</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="p-6">
          <TabsContent value="details">
            <Card className="border-none shadow-none">
              <CardHeader className="p-0 pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Informações da Tarefa</CardTitle>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={isSaving}><CancelIcon className="w-4 h-4 mr-2" />Cancelar</Button>
                        <Button size="sm" onClick={handleSave} disabled={isSaving}>
                          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          {isSaving ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="w-4 h-4 mr-2" />Editar</Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 mt-6 space-y-6">
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={isEditing ? (editedTask.description || '') : (task.description || 'Nenhuma descrição.')} onChange={(e) => handleInputChange('description', e.target.value)} readOnly={!isEditing} rows={4} className="mt-1" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 border-t pt-6">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Responsável</Label>
                    {isEditing ? (
                      <Select onValueChange={(v) => handleInputChange('assignee_id', v === 'none' ? null : v)} value={editedTask.assignee_id || 'none'}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não atribuído</SelectItem>
                          {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 pt-2"><User className="w-4 h-4" /><p>{currentAssigneeName}</p></div>
                    )}
                  </div>
                  <div className="space-y-1">
                      <Label className="text-muted-foreground">Data de Início</Label>
                      {isEditing ? (
                          <Popover>
                              <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><Calendar className="mr-2 h-4 w-4" />{editedTask.start_date ? formatDate(editedTask.start_date) : <span>Escolha uma data</span>}</Button></PopoverTrigger>
                              <PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={editedTask.start_date ? new Date(editedTask.start_date) : undefined} onSelect={(d) => handleInputChange('start_date', d?.toISOString().split('T')[0])} initialFocus /></PopoverContent>
                          </Popover>
                      ) : (<p className="pt-2">{formatDate(task.start_date)}</p>)}
                  </div>
                   <div className="space-y-1 sm:col-span-2">
                      <Label className="text-muted-foreground">Tags</Label>
                        <div className="flex flex-wrap gap-2 pt-1">{taskTags.length > 0 ? taskTags.map(tag => <Badge key={tag} variant="secondary" className="flex items-center gap-1"><Tag className="w-3 h-3" />{tag}</Badge>) : <p className="text-sm text-muted-foreground">Nenhuma tag</p>}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-4">Criado em: {formatDate(task.created_at)} | Última atualização: {formatDate(task.updated_at)}</div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="attachments"><TaskAttachments taskId={task.id} /></TabsContent>
          <TabsContent value="comments"><MentionComments taskId={task.id} /></TabsContent>
          <TabsContent value="delegation"><TaskDelegation taskId={task.id} currentAssigneeId={task.assignee_id} onDelegationSuccess={onUpdate} /></TabsContent>
          <TabsContent value="history"><TaskHistory taskId={task.id} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default TaskDetailsContent;