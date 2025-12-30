import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Edit, Save, X as CancelIcon, Calendar as CalendarIcon, User, Folder, Loader2 } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calendarDateToISO, parseISODateSafe, formatDateSafe } from '@/lib/dateUtils';
import { useTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useUsers } from '@/hooks/useUsers';
import { useClassifications } from '@/hooks/useClassifications';
import type { TaskWithDetails, TaskUpdateExtended } from '@/types';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPriorityLabel } from '@/lib/utils';


import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';

import TaskAttachments from '../task/TaskAttachments';
import TaskHistory from './TaskHistory';
import TaskDelegation from '../task/TaskDelegation';
import MentionComments from '../comments/MentionComments';
import ActionPlan from './ActionPlan';
import RecurrenceConfig from '@/components/recurrence/RecurrenceConfig';
import RecurrenceIndicator from '@/components/recurrence/RecurrenceIndicator';
import RecurrenceSeriesView from '@/components/recurrence/RecurrenceSeriesView';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';

interface TaskDetailsContentProps {
  task: TaskWithDetails;
  onUpdate: () => void;
}

const TaskDetailsContent: React.FC<TaskDetailsContentProps> = ({ task, onUpdate }) => {
  const { updateTask, startTask, completeTask } = useTask(task.id);
  const navigate = useNavigate();
  const { deleteTask } = useTasks({});
  const { users: profiles } = useUsers();
  const { projects } = useProjects();
  const { classifications } = useClassifications();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<TaskWithDetails>(task);
  const [isSaving, setIsSaving] = useState(false);
  const [recurrenceSheetOpen, setRecurrenceSheetOpen] = useState(false);

  const handleSaveAndClose = async () => {
    try {
      await handleSave();
      setRecurrenceSheetOpen(false);
    } catch (e) {
      // handleSave already shows toast on error
    }
  };
  const currentPriorityLabel = getPriorityLabel(task.priority);

  useEffect(() => {
    setEditedTask(task);
    if (task.title === 'Nova Tarefa (sem título)') {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  }, [task]);

  const handleInputChange = (field: keyof TaskWithDetails, value: any) => {
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

  const payload: TaskUpdateExtended = {
      title: editedTask.title,
      description: editedTask.description,
      status: editedTask.status,
      priority: editedTask.priority,
      due_date: editedTask.due_date,
      start_date: editedTask.start_date,
      end_date: editedTask.end_date,
      project_id: editedTask.project_id,
      assignee_id: editedTask.assignee_id,
      category_id: editedTask.category_id,
      is_recurring: editedTask.is_recurring ?? false,
      recurrence_pattern: editedTask.recurrence_pattern ?? null,
      recurrence_days: editedTask.recurrence_days ?? null,
      recurrence_end: editedTask.recurrence_end ?? null,
      parent_task_id: editedTask.parent_task_id ?? null,
    };

    try {
      await updateTask(payload);
      toast.success("Tarefa salva com sucesso!");
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast.error("Não foi possível salvar as alterações.", { 
        description: error.message.includes('schema cache')
          ? "Erro de cache do Supabase. Por favor, recarregue a página (CTRL+F5)."
          : error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  const calculateTimeSpent = () => {
    const start = parseISODateSafe(task.start_date);
    const end = parseISODateSafe(task.end_date);
    if (start && end) {
      return formatDistance(end, start, { locale: ptBR });
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
          <TabsList className="rounded-xl bg-muted/40">
            <TabsTrigger value="details" className="rounded-xl">Detalhes</TabsTrigger>
            <TabsTrigger value="action_plan" className="rounded-xl">Plano de Ação</TabsTrigger>
            <TabsTrigger value="attachments" className="rounded-xl">Anexos</TabsTrigger>
            <TabsTrigger value="comments" className="rounded-xl">Comentários</TabsTrigger>
            <TabsTrigger value="delegation" className="rounded-xl">Delegação</TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl">Histórico</TabsTrigger>
          </TabsList>
        </div>
        <div className="p-6">
          <TabsContent value="details">
            <Card className="border-none shadow-none rounded-2xl bg-white">
              <CardHeader className="p-0 pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Informações da Tarefa</CardTitle>
                  <div className="flex items-center gap-4">
                    <RecurrenceIndicator task={task} />
                    <div className="flex gap-2">
                    {!isEditing && task.status === 'todo' && (<Button size="sm" onClick={() => startTask()} className="bg-blue-500 hover:bg-blue-600"><Play className="w-4 h-4 mr-2" /> Iniciar</Button>)}
                    {!isEditing && task.status === 'progress' && (<Button size="sm" onClick={() => completeTask()} className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-4 h-4 mr-2" /> Concluir</Button>)}
                    {isEditing ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}><CancelIcon className="w-4 h-4 mr-2" />Cancelar</Button>
                        <Button size="sm" onClick={handleSave} disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Salvar</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="w-4 h-4 mr-2" /> Editar</Button>
                        <Button variant="destructive" size="sm" onClick={async () => {
                          try {
                            if (!confirm('Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.')) return;
                            await deleteTask(task.id);
                            toast.success('Tarefa excluída');
                            navigate('/tasks');
                          } catch (err: any) {
                            console.error('Erro ao excluir tarefa:', err);
                            toast.error('Não foi possível excluir a tarefa.', { description: err?.message });
                          }
                        }}>
                          Excluir
                        </Button>
                      </>
                    )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0 mt-6 space-y-6">
                {isEditing ? (
                  <>
                    <div>
                      <Label htmlFor="task-title">Título <span className="text-destructive">*</span></Label>
                      <Input id="task-title" value={editedTask.title} onChange={(e) => handleInputChange('title', e.target.value)} className="rounded-xl border-2" />
                    </div>
                    <div>
                      <Label>Descrição <span className="text-destructive">*</span></Label>
                      <Textarea value={editedTask.description || ''} onChange={(e) => handleInputChange('description', e.target.value)} rows={4} className="rounded-xl border-2" />
                    </div>
                    <div className="pt-4">
                      <Label className="mb-2">Tarefa recorrente</Label>
                      <div className="flex items-center gap-4">
                        <input type="checkbox" checked={!!editedTask.is_recurring} onChange={e => handleInputChange('is_recurring', e.target.checked)} />
                        <span>Ativar recorrência</span>
                      </div>
                      {!!editedTask.is_recurring && (
                        <div className="mt-2">
                          <Button variant="outline" size="sm" onClick={() => setRecurrenceSheetOpen(true)}>Configurar recorrência</Button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-1"><Label className="text-muted-foreground">Descrição</Label><p className="text-sm whitespace-pre-wrap">{task.description || 'Nenhuma descrição.'}</p></div>
                )}
                
                {!isEditing && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 border rounded-2xl bg-muted/50">
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Criado em</Label><p className="font-medium">{(() => { const d = parseISODateSafe(task.created_at); return d ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : '' })()}</p></div>
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Prazo</Label><p className="font-medium">{(() => { const d = parseISODateSafe(task.due_date); return d ? format(d, 'dd/MM/yyyy') : 'N/A' })()}</p></div>
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Iniciado</Label><p className="font-medium">{(() => { const d = parseISODateSafe(task.start_date); return d ? format(d, 'dd/MM/yyyy HH:mm') : '-' })()}</p></div>
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Concluído</Label><p className="font-medium">{(() => { const d = parseISODateSafe(task.end_date); return d ? format(d, 'dd/MM/yyyy HH:mm') : '-' })()}</p></div>
                    {calculateTimeSpent() && (<div className="space-y-1 col-span-full border-t pt-2 mt-2"><Label className="text-xs text-muted-foreground">Tempo Gasto</Label><p className="font-medium">{calculateTimeSpent()}</p></div>)}
                  </div>
                )}

                  {/* Recurrence series view for parent tasks or show series when this is an occurrence */}
                  {!isEditing && (task.is_recurring || task.parent_task_id) && (
                    <div className="mt-6">
                      <RecurrenceSeriesView parentTaskId={task.parent_task_id ?? task.id} />
                    </div>
                  )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 pt-6 border-t rounded-2xl">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Responsável</Label>
                    {isEditing ? (
                      <Select onValueChange={(v) => handleInputChange('assignee_id', v === 'none' ? null : v)} value={editedTask.assignee_id || 'none'}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não atribuído</SelectItem>
                          {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 pt-2">
                        <User className="w-4 h-4" />
                        <p>{currentAssigneeName}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Projeto</Label>
                    {isEditing ? (
                      <Select onValueChange={(v) => handleInputChange('project_id', v === 'none' ? null : v)} value={editedTask.project_id || 'none'}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {projects.filter(p => p.id !== 'all').map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 pt-2">
                        <Folder className="w-4 h-4" />
                        <p>{currentProjectName}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Prioridade</Label>
                    {isEditing ? (
                      <Select onValueChange={(v) => handleInputChange('priority', v)} value={editedTask.priority || 'medium'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Definir prioridade..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 pt-2">
                        <p>{currentPriorityLabel}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Categoria</Label>
                    {isEditing ? (
                      <Select onValueChange={(v) => handleInputChange('category_id', v === 'none' ? null : v)} value={editedTask.category_id || 'none'}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {classifications.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 pt-2">
                        {task.category?.color && <div className="w-3 h-3 rounded-full" style={{backgroundColor: task.category.color}} />}
                        <p>{currentCategoryName}</p>
                      </div>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t rounded-2xl">
                    <div className="space-y-1">
                      <Label>Data de Início</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full font-normal justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editedTask.start_date ? formatDateSafe(editedTask.start_date, 'dd/MM/yyyy') : <span>Escolha</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar 
                            mode="single" 
                            selected={editedTask.start_date ? parseISODateSafe(editedTask.start_date) ?? undefined : undefined} 
                            onSelect={(d) => {
                              const date = Array.isArray(d) ? (d[0] as Date | undefined) : (d as Date | undefined);
                              handleInputChange('start_date', calendarDateToISO(date));
                            }} 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label>Prazo Final</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full font-normal justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editedTask.due_date ? formatDateSafe(editedTask.due_date, 'dd/MM/yyyy') : <span>Escolha</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar 
                            mode="single" 
                            selected={editedTask.due_date ? parseISODateSafe(editedTask.due_date) ?? undefined : undefined} 
                            onSelect={(d) => {
                              const date = Array.isArray(d) ? (d[0] as Date | undefined) : (d as Date | undefined);
                              handleInputChange('due_date', calendarDateToISO(date));
                            }} 
                          />
                        </PopoverContent>
                      </Popover>
                      {editedTask.is_recurring && (
                        <div className="mt-2">
                          <Button variant="ghost" size="sm" onClick={() => setRecurrenceSheetOpen(true)}>🔁 Recorrência</Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
      <Sheet open={recurrenceSheetOpen} onOpenChange={setRecurrenceSheetOpen}>
        <SheetContent side="right" className="w-[50vw] sm:w-[50vw] max-w-[900px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Configurar recorrência</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <RecurrenceConfig
              value={{
                pattern: (editedTask.recurrence_pattern as any) || null,
                interval: (editedTask.recurrence_interval as any) || 1,
                days: editedTask.recurrence_days ? editedTask.recurrence_days.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n)) : [],
                endDate: editedTask.recurrence_end ?? null,
              }}
              onChange={(v: any) => {
                handleInputChange('recurrence_pattern', v.pattern ?? null);
                handleInputChange('recurrence_interval', v.interval ?? 1);
                handleInputChange('recurrence_days', Array.isArray(v.days) ? v.days.join(',') : null);
                handleInputChange('recurrence_end', v.endDate ?? null);
              }}
            />
          </div>
          <div className="mt-auto pt-4 border-t flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRecurrenceSheetOpen(false)}>Fechar</Button>
            <Button size="sm" onClick={handleSaveAndClose} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar e fechar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TaskDetailsContent;