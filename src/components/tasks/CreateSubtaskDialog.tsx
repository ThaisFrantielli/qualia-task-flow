import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface CreateSubtaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  onSubtaskCreated?: (subtask: any) => void;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function CreateSubtaskDialog({
  open,
  onOpenChange,
  taskId,
  onSubtaskCreated,
}: CreateSubtaskDialogProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [secondaryAssigneeId, setSecondaryAssigneeId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [needsApproval, setNeedsApproval] = useState(false);
  const [approverId, setApproverId] = useState('');

  useEffect(() => {
    if (open) {
      fetchUsers();
      resetForm();
    }
  }, [open]);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, email');
    if (data) setUsers(data);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssigneeId('');
    setSecondaryAssigneeId('');
    setPriority('medium');
    setStartDate(undefined);
    setDueDate(undefined);
    setNeedsApproval(false);
    setApproverId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setLoading(true);
    try {
      // Get max order
      const { data: existingSubtasks } = await supabase
        .from('subtasks')
        .select('order')
        .eq('task_id', taskId)
        .order('order', { ascending: false })
        .limit(1);

      const maxOrder = existingSubtasks?.[0]?.order ?? -1;

      const subtaskData = {
        task_id: taskId,
        title: title.trim(),
        description: description.trim() || null,
        assignee_id: assigneeId || null,
        secondary_assignee_id: secondaryAssigneeId || null,
        priority,
        start_date: startDate ? startDate.toISOString() : null,
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
        status: 'todo',
        needs_approval: needsApproval,
        requested_approver_id: needsApproval && approverId ? approverId : null,
        order: maxOrder + 1,
      };

      const { data, error } = await supabase
        .from('subtasks')
        .insert(subtaskData)
        .select('*, assignee:profiles!subtasks_assignee_id_fkey(*)')
        .single();

      if (error) throw error;

      toast.success('Subtarefa criada com sucesso!');
      onSubtaskCreated?.(data);
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao criar subtarefa', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Subtarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título da subtarefa"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a subtarefa..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável Principal</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsável Secundário</Label>
              <Select value={secondaryAssigneeId} onValueChange={setSecondaryAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={(date) => setStartDate(Array.isArray(date) ? date[0] : date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Prazo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dueDate} onSelect={(date) => setDueDate(Array.isArray(date) ? date[0] : date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <Label>Requer Aprovação</Label>
                <p className="text-xs text-muted-foreground">A subtarefa precisará ser aprovada para ser concluída</p>
              </div>
              <Switch checked={needsApproval} onCheckedChange={setNeedsApproval} />
            </div>

            {needsApproval && (
              <div className="space-y-2">
                <Label>Aprovador</Label>
                <Select value={approverId} onValueChange={setApproverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione quem irá aprovar" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email || 'Sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Subtarefa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
