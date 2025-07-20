// src/components/TaskDetailsModal.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

import { Edit, Save, X as CancelIcon, Calendar, User, Clock, Tag, AlertTriangle } from 'lucide-react';

import TaskAttachments from './task/TaskAttachments';
import TaskHistory from './task/TaskHistory';
import TaskDelegation from './task/TaskDelegation';
import MentionComments from './comments/MentionComments';

import { useTasks } from '@/hooks/useTasks';
import { useTaskHistory } from '@/hooks/useTaskHistory';
import { useProfiles } from '@/hooks/useProfiles';
import { formatDate, getStatusLabel, getPriorityLabel, isOverdue } from '@/lib/utils';
import type { Task } from '@/types';
import { useToast } from '@/hooks/use-toast'; // <-- IMPORTAÇÃO CORRIGIDA AQUI

interface TaskDetailsModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, open, onOpenChange }) => {
  const { refetch: refetchTasks, updateTask } = useTasks();
  const { refetch: refetchHistory } = useTaskHistory(task?.id);
  const { toast } = useToast();
  const { profiles } = useProfiles();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | null>(task);
  const [isSaving, setIsSaving] = useState(false); // Mantém isSaving, remove setSaving

  useEffect(() => {
    setEditedTask(task);
    setIsEditing(false);
  }, [task]);

  if (!task || !editedTask) return null;

  const handleDataChange = () => {
    if (refetchTasks) refetchTasks();
    if (refetchHistory) refetchHistory();
  };
  
  const handleInputChange = (field: keyof Task, value: any) => {
    setEditedTask(prev => prev ? { ...prev, [field]: value } : null);
  };
  
  const handleCancelEdit = () => {
    setEditedTask(task);
    setIsEditing(false);
  };
  
  const handleSave = async () => {
    if (!updateTask) {
        toast({ title: "Erro", description: "Função de atualização não implementada.", variant: "destructive" });
        return;
    }
    
    setIsSaving(true);
    try {
      const updatePayload: Partial<Task> = {
        title: editedTask.title,
        description: editedTask.description,
        tags: editedTask.tags,
        estimated_hours: editedTask.estimated_hours,
        assignee_id: editedTask.assignee_id,
        start_date: editedTask.start_date,
        due_date: editedTask.due_date,
      };
      
      await updateTask(task.id, updatePayload);
      toast({ title: "Sucesso!", description: "Tarefa atualizada." });
      setIsEditing(false);
      handleDataChange();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível salvar a tarefa.", variant: "destructive" });
    } finally {
      setIsSaving(false); // Usa isSaving
    }
  };

  const taskTags = task.tags ? task.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
  const currentAssigneeName = profiles.find(p => p.id === task.assignee_id)?.full_name || 'Não atribuído';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 sm:rounded-lg flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex justify-between items-center">
            {isEditing ? (
              <Input value={editedTask.title} onChange={(e) => handleInputChange('title', e.target.value)} className="text-2xl font-semibold p-0 border-none focus-visible:ring-0" />
            ) : (
              <DialogTitle className="text-2xl font-semibold">{task.title}</DialogTitle>
            )}
            <div className="flex items-center gap-2">
                <Badge>{getPriorityLabel(task.priority)}</Badge>
                <Badge variant="outline">{getStatusLabel(task.status)}</Badge>
                {isOverdue(task) && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Atrasada
                    </Badge>
                )}
            </div>
          </div>
          {task.project?.name && (
              <DialogDescription>No projeto: {task.project.name}</DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-6">
          <Tabs defaultValue="details" className="w-full">
            <div className="px-6 border-b sticky top-0 bg-background z-10">
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
                    <Card className="border-none shadow-none mt-4">
                      <CardHeader className="p-0 pb-4">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">Informações da Tarefa</CardTitle>
                          <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={isSaving}><CancelIcon className="w-4 h-4 mr-2" />Cancelar</Button>
                                <Button size="sm" onClick={handleSave} disabled={isSaving}><Save className="w-4 h-4 mr-2" />{isSaving ? 'Salvando...' : 'Salvar'}</Button>
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
                                      <Select onValueChange={(v) => handleInputChange('assignee_id', v === 'none' ? null : v)} value={editedTask.assignee_id || ''}>
                                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                          <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}</SelectContent>
                                      </Select>
                                  ) : (
                                    <div className="flex items-center gap-2 pt-2"><User className="w-4 h-4" /><p>{currentAssigneeName}</p></div>
                                  )}
                              </div>
                              <div className="space-y-1">
                                  <Label className="text-muted-foreground">Data de Início</Label>
                                  {isEditing ? (
                                      <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><Calendar className="mr-2 h-4 w-4" />{editedTask.start_date ? formatDate(editedTask.start_date) : <span>Escolha uma data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={editedTask.start_date ? new Date(editedTask.start_date) : undefined} onSelect={(d) => handleInputChange('start_date', d?.toISOString().split('T')[0])} initialFocus /></PopoverContent></Popover>
                                  ) : (<p className="pt-2">{formatDate(task.start_date)}</p>)}
                              </div>
                               <div className="space-y-1">
                                  <Label className="text-muted-foreground">Prazo</Label>
                                  {isEditing ? (
                                      <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><Calendar className="mr-2 h-4 w-4" />{editedTask.due_date ? formatDate(editedTask.due_date) : <span>Escolha uma data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={editedTask.due_date ? new Date(editedTask.due_date) : undefined} onSelect={(d) => handleInputChange('due_date', d?.toISOString().split('T')[0])} initialFocus /></PopoverContent></Popover>
                                  ) : (<p className="pt-2">{formatDate(task.due_date)}</p>)}
                              </div>
                               <div className="space-y-1">
                                  <Label className="text-muted-foreground">Horas Estimadas</Label>{isEditing ? (<Input type="number" value={editedTask.estimated_hours || ''} onChange={(e) => handleInputChange('estimated_hours', parseInt(e.target.value) || null)} />) : (<div className="flex items-center gap-2 pt-2"><Clock className="w-4 h-4" /><p>{task.estimated_hours ? `${task.estimated_hours}h` : 'N/D'}</p></div>)}
                              </div>
                               <div className="space-y-1 sm:col-span-2">
                                  <Label className="text-muted-foreground">Tags</Label>{isEditing ? (<Input value={editedTask.tags || ''} onChange={(e) => handleInputChange('tags', e.target.value)} placeholder="design, frontend, bug" />) : (<div className="flex flex-wrap gap-2 pt-1">{taskTags.length > 0 ? taskTags.map(tag => <Badge key={tag} variant="secondary" className="flex items-center gap-1"><Tag className="w-3 h-3" />{tag}</Badge>) : <p className="text-sm text-muted-foreground">Nenhuma tag</p>}</div>)}
                              </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-4">Criado em: {formatDate(task.created_at)} | Última atualização: {formatDate(task.updated_at)}</div>
                      </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="attachments"><TaskAttachments taskId={task.id} /></TabsContent>
                <TabsContent value="comments"><MentionComments taskId={task.id} /></TabsContent>
                <TabsContent value="delegation"><TaskDelegation taskId={task.id} currentAssigneeId={task.assignee_id} onDelegationSuccess={handleDataChange} /></TabsContent>
                <TabsContent value="history"><TaskHistory taskId={task.id} /></TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsModal;