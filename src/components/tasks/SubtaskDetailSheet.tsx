import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { calendarDateToISO, parseISODateSafe } from '@/lib/dateUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSubtask } from '@/hooks/useSubtasks';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUsers } from '@/hooks/useUsers';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Save, Calendar as CalendarIcon, Trash2 } from 'lucide-react';

interface SubtaskDetailSheetProps {
  subtaskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SubtaskDetailSheet: React.FC<SubtaskDetailSheetProps> = ({ subtaskId, open, onOpenChange }) => {
  const { subtask, isLoading, update, delete: deleteSubtask } = useSubtask(subtaskId);
  const queryClient = useQueryClient();
  const { users: profiles } = useUsers();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('todo');
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [selectedApproverId, setSelectedApproverId] = useState<string | null>(null);

  // Popula o formulário quando a subtarefa é carregada
  useEffect(() => {
    if (subtask) {
      setTitle(subtask.title);
      setDescription(subtask.description || '');
      setAssigneeId(subtask.assignee_id || null);
      setDueDate(subtask.due_date ? (parseISODateSafe(subtask.due_date) || new Date(subtask.due_date)) : null);
      setPriority(subtask.priority || 'medium');
      setStatus(subtask.status || 'todo');
    }
  }, [subtask]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subtask) return;

    setIsSaving(true);
    const updates = {
      title,
      description,
      assignee_id: assigneeId,
      priority,
      status,
      completed: status === 'done',
      due_date: dueDate ? calendarDateToISO(dueDate) : null,
    };

    try {
      await update(updates);
      toast.success('Ação atualizada com sucesso!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao atualizar a ação.', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestApproval = async () => {
    if (!subtask) return;
    const baseUpdates: any = {
      needs_approval: true,
      approval_notes: approvalNotes || null,
    };
    // Try to send requested_approver_id if user selected one. If DB doesn't have the column
    // (migration not applied), retry without it and inform the user.
    const willSendApprover = !!selectedApproverId;
    try {
      let updated: any = null;
      if (willSendApprover) {
        updated = await update({ ...baseUpdates, requested_approver_id: selectedApproverId } as any);
      } else {
        updated = await update(baseUpdates as any);
      }
      // Atualiza cache local imediatamente para refletir o estado pendente em todas as views
      try {
        if (updated) {
          // Atualiza a query da subtarefa aberta
          queryClient.setQueryData(['subtask', subtaskId], updated);
          // Atualiza a lista de subtarefas do task pai substituindo a subtarefa
          const parentTaskId = updated.task_id;
          const currentList: any[] | undefined = queryClient.getQueryData(['subtasks', parentTaskId]);
          if (Array.isArray(currentList)) {
            const newList = currentList.map(s => (s.id === updated.id ? updated : s));
            queryClient.setQueryData(['subtasks', parentTaskId], newList);
          } else {
            // força refetch se não existir cache
            queryClient.invalidateQueries({ queryKey: ['subtasks', parentTaskId] });
          }
        }
      } catch (cacheErr) {
        console.warn('Erro atualizando cache local após solicitar aprovação', cacheErr);
      }

      // Debug/feedback: mostra se a API retornou o requested_approver_id
      try {
        console.log('[SubtaskDetailSheet] requestApproval result', updated);
        if (updated && ((updated as any).requested_approver_id || (updated as any).requested_approver)) {
          const rid = (updated as any).requested_approver_id || (updated as any).requested_approver?.id || (updated as any).requested_approver_name || '—';
          toast.success(`Solicitação de aprovação enviada. Aprovador solicitado: ${rid}`);
        } else {
          toast.success('Solicitação de aprovação enviada. (observação: aprovador não gravado)');
        }
      } catch (e) {
        toast.success('Solicitação de aprovação enviada.');
      }
      // Criar notificação para o aprovador (se informado)
      try {
        const approverId = (updated as any)?.requested_approver_id || (updated as any)?.requested_approver?.id || selectedApproverId || null;
        if (approverId) {
          await supabase.from('notifications').insert({
            user_id: approverId,
            title: 'Solicitação de aprovação',
            message: `${user?.full_name || 'Um usuário'} solicitou sua aprovação na ação "${(updated as any).title || title}".`,
            type: 'approval_request',
            task_id: (updated as any).task_id || null,
            data: { subtask_id: (updated as any).id },
            read: false
          });
        }
      } catch (notifErr) {
        console.warn('Erro criando notificação de aprovação:', notifErr);
      }
    } catch (err: any) {
      console.error('Erro solicitando aprovação (tentativa 1):', err);
      const msg = err?.message || String(err);
      // detect common message when column is missing in Postgres / Supabase
      if (willSendApprover && /requested_approver_id|could not find|column .* does not exist/i.test(msg)) {
        try {
          await update(baseUpdates as any);
          toast.success('Solicitação enviada (aprovador não gravado — coluna ausente no banco).');
        } catch (err2: any) {
          console.error('Erro solicitando aprovação (tentativa 2):', err2);
          toast.error('Não foi possível solicitar aprovação.', { description: err2?.message || String(err2) });
        }
      } else {
        toast.error('Não foi possível solicitar aprovação.', { description: msg });
      }

    }

  };

  const handleDelete = async () => {
    if (!subtaskId) return;

    try {
      await deleteSubtask();
      toast.success('Ação apagada com sucesso!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao apagar a ação.', { description: error.message });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full md:w-[50vw] max-w-[900px] max-h-screen overflow-hidden flex flex-col">
        {/* Breadcrumbs */}
        {subtask && (
          <nav className="flex items-center text-xs text-muted-foreground mb-2 mt-2" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1">
              <li>
                <a href="/projects" className="hover:underline flex items-center gap-1">Projetos</a>
              </li>
              {/* subtask.project_id não existe, então não exibe esse breadcrumb */}
              {subtask.task_id && (
                <li>
                  <span className="mx-1">/</span>
                  <a href={`/tasks/${subtask.task_id}`} className="hover:underline">Tarefa</a>
                </li>
              )}
              <li>
                <span className="mx-1">/</span>
                <span className="font-semibold text-foreground">{title}</span>
              </li>
            </ol>
          </nav>
        )}
        <SheetHeader>
          <SheetTitle>Detalhes da Ação</SheetTitle>
          <SheetDescription>Visualize e edite todas as informações da ação do seu plano.</SheetDescription>
        </SheetHeader>
        {/* Indica quando a subtarefa está aguardando aprovação ou já foi aprovada */}
        {(() => {
            const needsApproval = (subtask as any)?.needs_approval === true || (subtask?.status === 'awaiting_approval');
            // prefer view-provided full_name fields when available
            const requestedApprover = (subtask as any)?.requested_approver_full_name || (subtask as any)?.requested_approver?.full_name || (subtask as any)?.requested_approver_name || null;
            const approvedAt = (subtask as any)?.approved_at || null;
            const approvedBy = (subtask as any)?.approved_by_full_name || (subtask as any)?.approved_by?.full_name || (subtask as any)?.approved_by_name || (subtask as any)?.approved_by_id || null;
          if (approvedAt) {
            return (
              <div className="px-4 py-2 bg-green-50 border-l-4 border-green-400 text-green-800">
                Aprovado por {approvedBy ?? '—'} em {format(new Date(approvedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                {(subtask as any)?.approval_notes ? ` • ${ (subtask as any).approval_notes }` : ''}
              </div>
            );
          }
          if (needsApproval) {
            return (
              <div className="px-4 py-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
                {requestedApprover ? `Aguardando aprovação de ${requestedApprover}` : 'Pendente de aprovação'}
              </div>
            );
          }
          return null;
        })()}
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : subtask ? (
          <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-2"  style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <div className="space-y-2">
                <Label htmlFor="title">Título da Ação</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[100px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select value={assigneeId || 'none'} onValueChange={(value) => setAssigneeId(value === 'none' ? null : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Atribuir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não atribuído</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, 'dd/MM/yyyy', { locale: ptBR }) : <span>Escolha</span>}
                      </Button>
                    </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dueDate || undefined}
                          onSelect={(d) => {
                            let sel: Date | null = null;
                            if (!d) sel = null;
                            else if (Array.isArray(d)) sel = d.length ? (d[0] as Date) : null;
                            else sel = d as Date;
                            setDueDate(sel);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={priority || 'medium'} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">A Fazer</SelectItem>
                      <SelectItem value="progress">Em Progresso</SelectItem>
                      <SelectItem value="done">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {subtask && (
                <div className="space-y-2">
                  <Label>Nota para aprovador (opcional)</Label>
                  <Textarea value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} className="min-h-[60px]" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                    <div>
                      <Label>Escolher aprovador (opcional)</Label>
                      <Select value={selectedApproverId || 'none'} onValueChange={(v) => setSelectedApproverId(v === 'none' ? null : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um aprovador" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {profiles.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      {subtask.assignee_id === user?.id && (
                        <Button type="button" variant="secondary" onClick={handleRequestApproval} disabled={(subtask as any).needs_approval === true}>
                          {(subtask as any).needs_approval ? 'Solicitação enviada' : 'Solicitar aprovação'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <SheetFooter className="shrink-0 mt-4 pt-4 border-t flex justify-between items-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex justify-end gap-2">
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
                      Confirmar
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex gap-2">
                <SheetClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </SheetClose>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar
                </Button>
              </div>
            </SheetFooter>
          </form>
        ) : (
          <p className="py-4 text-center text-muted-foreground">Ação não encontrada.</p>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default SubtaskDetailSheet;