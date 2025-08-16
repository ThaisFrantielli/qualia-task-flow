// src/components/tasks/SubtaskDetailSheet.tsx

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useSubtask, useSubtasks } from '@/hooks/useSubtasks'; // <-- Adicionado useSubtasks
import { useUsers } from '@/hooks/useUsers';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Save, Calendar as CalendarIcon, Trash2 } from 'lucide-react';

interface SubtaskDetailSheetProps {
  subtaskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SubtaskDetailSheet: React.FC<SubtaskDetailSheetProps> = ({ subtaskId, open, onOpenChange }) => {
  const { subtask, isLoading, update } = useSubtask(subtaskId);
  const { delete: deleteSubtask } = useSubtasks(subtask?.task_id || ''); // <-- Usando o hook para a ação de delete
  
  const { users: profiles } = useUsers();
  const [isSaving, setIsSaving] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('todo');

  useEffect(() => {
    if (subtask) {
      setTitle(subtask.title);
      setDescription(subtask.description || '');
      setAssigneeId(subtask.assignee_id || null);
      setDueDate(subtask.due_date ? new Date(subtask.due_date) : null);
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
      due_date: dueDate ? dueDate.toISOString() : null,
    };
    
    try {
      await update(updates);
      toast.success("Ação atualizada com sucesso!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao atualizar a ação.", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!subtaskId) return;
    try {
      await deleteSubtask(subtaskId);
      toast.success("Ação apagada com sucesso!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao apagar a ação.", { description: error.message });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Detalhes da Ação</SheetTitle>
          <SheetDescription>
            Visualize e edite todas as informações da ação do seu plano.
          </SheetDescription>
        </SheetHeader>
        
        {isLoading ? (
          <div className="space-y-4 py-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-10 w-full" /><Skeleton className="h-20 w-full" /></div>
        ) : subtask ? (
          <form onSubmit={handleSave} className="flex-grow flex flex-col">
            <div className="space-y-4 py-4 flex-grow overflow-y-auto pr-6">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Ação</Label>
                <Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição / Notas</Label>
                <Textarea id="description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[120px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select value={assigneeId || 'none'} onValueChange={(value) => setAssigneeId(value === 'none' ? null : value)}>
                    <SelectTrigger><SelectValue placeholder="Atribuir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não atribuído</SelectItem>
                      {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, 'dd/MM/yyyy', { locale: ptBR }) : <span>Definir prazo</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate || undefined} onSelect={(date) => setDueDate(date || null)} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                   <Select value={priority || 'medium'} onValueChange={(value) => setPriority(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">A Fazer</SelectItem>
                      <SelectItem value="progress">Em Progresso</SelectItem>
                      <SelectItem value="done">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <SheetFooter className="mt-auto pt-4 border-t flex justify-between items-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso irá apagar permanentemente a ação do plano.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
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
          <p className="py-4 text-center text-muted-foreground">Ação não encontrada ou ID inválido.</p>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default SubtaskDetailSheet;