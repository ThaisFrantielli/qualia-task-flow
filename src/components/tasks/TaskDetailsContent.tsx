// src/components/tasks/TaskDetailsContent.tsx

import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Edit, Save, X as CancelIcon, Calendar as CalendarIcon, User, Folder, Loader2 } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTask } from '@/hooks/useTasks'; 
import { useProjects } from '@/hooks/useProjects';
import { useUsers } from '@/hooks/useUsers';
import { useClassifications } from '@/hooks/useClassifications';
import type { TaskUpdate, TaskWithDetails } from '@/types';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

import TaskAttachments from '../task/TaskAttachments';
import TaskHistory from '../task/TaskHistory';
import TaskDelegation from '../task/TaskDelegation';
import MentionComments from '../comments/MentionComments';
import ActionPlan from './ActionPlan';

interface TaskDetailsContentProps {
  task: TaskWithDetails;
  onUpdate: () => void;
}

const TaskDetailsContent: React.FC<TaskDetailsContentProps> = ({ task, onUpdate }) => {
  const { task: _, isLoading, isError, refetch, updateTask, startTask, completeTask } = useTask(task.id); 
  const { users: profiles } = useUsers();
  const { projects } = useProjects();
  const { classifications } = useClassifications();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<TaskWithDetails>(task);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedTask(task);
    // A LÓGICA CORRETA: Entra em modo de edição AUTOMATICAMENTE se for uma tarefa nova
    if (task.title === 'Nova Tarefa (sem título)') {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  }, [task]); // Roda sempre que a tarefa mudar (ex: após salvar)

  const handleInputChange = (field: keyof TaskUpdate, value: any) => {
    setEditedTask(prev => ({ ...prev!, [field]: value }));
  };

  const handleSave = async () => {
    if (!editedTask.title || editedTask.title.trim() === '' || editedTask.title === 'Nova Tarefa (sem título)') {
      toast.error("O título da tarefa é obrigatório.");
      return;
    }
    if (!editedTask.description || editedTask.description.trim().length < 10) {
      toast.error("A descrição é obrigatória (mínimo 10 caracteres).");
      return;
    }
    
    setIsSaving(true);
    try {
      await updateTask(editedTask);
      toast.success("Tarefa salva com sucesso!");
      setIsEditing(false); // <-- Volta para o modo de visualização
      onUpdate();
    } catch (error: any) {
      toast.error("Não foi possível salvar as alterações.", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };
  
  const calculateTimeSpent = () => {
    if (task.start_date && task.end_date) {
      return formatDistance(new Date(task.end_date), new Date(task.start_date), { locale: ptBR });
    }
    return null;
  };

  const currentAssigneeName = task.assignee?.full_name || 'Não atribuído';
  const currentProjectName = task.project?.name || 'Nenhum projeto';
  const currentCategoryName = task.category?.name || 'Sem categoria';

  return (
    <div className="flex-grow overflow-y-auto">
      <Tabs defaultValue="details" className="w-full">
        <div className="p-6 border-b sticky top-0 bg-background z-10">
          <TabsList>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="action_plan">Plano de Ação</TabsTrigger>
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
                    {!isEditing && task.status === 'todo' && (<Button size="sm" onClick={() => startTask()} className="bg-blue-500 hover:bg-blue-600"><Play className="w-4 h-4 mr-2" /> Iniciar</Button>)}
                    {!isEditing && task.status === 'progress' && (<Button size="sm" onClick={() => completeTask()} className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-4 h-4 mr-2" /> Concluir</Button>)}
                    {isEditing ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}><CancelIcon className="w-4 h-4 mr-2" />Cancelar</Button>
                        <Button size="sm" onClick={handleSave} disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Salvar</Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="w-4 h-4 mr-2" /> Editar</Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0 mt-6 space-y-6">
                {isEditing ? (
                  <>
                    <div><Label htmlFor="task-title">Título <span className="text-destructive">*</span></Label><Input id="task-title" value={editedTask.title} onChange={(e) => handleInputChange('title', e.target.value)} /></div>
                    <div><Label>Descrição <span className="text-destructive">*</span></Label><Textarea value={editedTask.description || ''} onChange={(e) => handleInputChange('description', e.target.value)} rows={4} /></div>
                  </>
                ) : (
                  <div className="space-y-1"><Label className="text-muted-foreground">Descrição</Label><p className="text-sm whitespace-pre-wrap">{task.description || 'Nenhuma descrição.'}</p></div>
                )}
                
                {!isEditing && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Criado em</Label><p className="font-medium">{format(new Date(task.created_at), 'dd/MM/yyyy', { locale: ptBR })}</p></div>
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Prazo</Label><p className="font-medium">{task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : 'N/A'}</p></div>
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Iniciado</Label><p className="font-medium">{task.start_date ? format(new Date(task.start_date), 'dd/MM/yyyy HH:mm') : '-'}</p></div>
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Concluído</Label><p className="font-medium">{task.end_date ? format(new Date(task.end_date), 'dd/MM/yyyy HH:mm') : '-'}</p></div>
                    {calculateTimeSpent() && (<div className="space-y-1 col-span-full border-t pt-2 mt-2"><Label className="text-xs text-muted-foreground">Tempo Gasto</Label><p className="font-medium">{calculateTimeSpent()}</p></div>)}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t">
                  <div className="space-y-1"><Label className="text-muted-foreground">Responsável</Label>{isEditing ? (<Select onValueChange={(v) => handleInputChange('assignee_id', v === 'none' ? null : v)} value={editedTask.assignee_id || 'none'}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Não atribuído</SelectItem>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent></Select>) : (<div className="flex items-center gap-2 pt-2"><User className="w-4 h-4" /><p>{currentAssigneeName}</p></div>)}</div>
                  <div className="space-y-1"><Label className="text-muted-foreground">Projeto</Label>{isEditing ? (<Select onValueChange={(v) => handleInputChange('project_id', v === 'none' ? null : v)} value={editedTask.project_id || 'none'}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Nenhum</SelectItem>{projects.filter(p => p.id !== 'all').map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>) : (<div className="flex items-center gap-2 pt-2"><Folder className="w-4 h-4" /><p>{currentProjectName}</p></div>)}</div>
                  <div className="space-y-1"><Label className="text-muted-foreground">Categoria</Label>{isEditing ? (<Select onValueChange={(v) => handleInputChange('category_id', v === 'none' ? null : v)} value={editedTask.category_id || 'none'}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{classifications.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>) : (<div className="flex items-center gap-2 pt-2">{task.category?.color && <div className="w-3 h-3 rounded-full" style={{backgroundColor: task.category.color}} />}<p>{currentCategoryName}</p></div>)}</div>
                </div>

                {isEditing && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t"><div className="space-y-1"><Label>Data de Início</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full font-normal justify-start"><CalendarIcon className="mr-2 h-4 w-4" />{editedTask.start_date ? format(new Date(editedTask.start_date), "dd/MM/yyyy") : <span>Escolha</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editedTask.start_date ? new Date(editedTask.start_date) : undefined} onSelect={(d) => handleInputChange('start_date', d?.toISOString())} /></PopoverContent></Popover></div><div className="space-y-1"><Label>Prazo Final</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full font-normal justify-start"><CalendarIcon className="mr-2 h-4 w-4" />{editedTask.due_date ? format(new Date(editedTask.due_date), "dd/MM/yyyy") : <span>Escolha</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editedTask.due_date ? new Date(editedTask.due_date) : undefined} onSelect={(d) => handleInputChange('due_date', d?.toISOString())} /></PopoverContent></Popover></div></div>)}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="action_plan"><ActionPlan taskId={task.id} /></TabsContent>
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
