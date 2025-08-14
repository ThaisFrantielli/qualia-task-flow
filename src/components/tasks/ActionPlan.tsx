// src/components/tasks/ActionPlan.tsx

import React, { useState } from 'react';
import { useSubtasks } from '@/hooks/useSubtasks';
import { useUsers } from '@/hooks/useUsers';
import type { SubtaskWithDetails, Profile } from '@/types';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Calendar as CalendarIcon, ArrowUp, ArrowRight, ArrowDown, ListChecks } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import SubtaskDeadline from '@/components/tasks/SubtaskDeadline';
import SubtaskDetailDialog from './SubtaskDetailDialog';
import { format } from 'date-fns';

interface ActionPlanProps {
  taskId: string;
}

type FormData = {
  title: string;
  assignee_id: string | null;
  due_date: Date | null;
  priority: 'low' | 'medium' | 'high';
};

const getInitials = (name?: string | null) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

const ActionPlan: React.FC<ActionPlanProps> = ({ taskId }) => {
  const { subtasks, isLoading: isLoadingSubtasks, add, update } = useSubtasks(taskId);
  const { users, loading: isLoadingProfiles } = useUsers();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null);

  const { register, handleSubmit, control, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { title: '', assignee_id: null, due_date: null, priority: 'medium' }
  });

  const onSubmit = async (data: FormData) => {
    try {
      await add({
        task_id: taskId,
        title: data.title,
        assignee_id: data.assignee_id,
        priority: data.priority,
        due_date: data.due_date ? data.due_date.toISOString() : null
      });
      toast.success('Ação adicionada ao plano!');
      
      // MELHORIA 1: Reset explícito para garantir a tipagem correta
      reset({
        title: '',
        assignee_id: data.assignee_id,
        due_date: data.due_date,
        priority: data.priority
      });

    } catch (error: any) {
      toast.error('Erro ao adicionar ação', { description: error.message });
    }
  };

  const handleToggleComplete = (subtask: SubtaskWithDetails) => {
    update({ id: subtask.id, updates: { completed: !subtask.completed, status: !subtask.completed ? 'done' : 'todo' } });
  };

  const handleOpenDetails = (subtaskId: string) => {
    setSelectedSubtaskId(subtaskId);
    setIsDetailOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Descreva uma nova ação..." {...register('title', { required: true })} className="flex-grow" />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Controller
              name="assignee_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingProfiles || isSubmitting}>
                  <SelectTrigger><SelectValue placeholder="Responsável..." /></SelectTrigger>
                  <SelectContent>
                    {/* MELHORIA 2: A tipagem de 'p' agora é inferida corretamente */}
                    {users.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || 'medium'} disabled={isSubmitting}>
                  <SelectTrigger><SelectValue placeholder="Prioridade..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high"><div className="flex items-center gap-2"><ArrowUp className="h-4 w-4 text-red-500" /> Alta</div></SelectItem>
                    <SelectItem value="medium"><div className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-yellow-500" /> Média</div></SelectItem>
                    <SelectItem value="low"><div className="flex items-center gap-2"><ArrowDown className="h-4 w-4 text-gray-500" /> Baixa</div></SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <Controller
              name="due_date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="font-normal w-full justify-start"><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'dd/MM/yy') : <span>Prazo</span>}</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} /></PopoverContent>
                </Popover>
              )}
            />
          </div>
        </form>

        {isLoadingSubtasks ? (
          <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        ) : (
          <div className="space-y-2">
            {subtasks.length > 0 ? (
              subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-3 p-2 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleOpenDetails(subtask.id)}>
                  <div onClick={(e) => e.stopPropagation()}><Checkbox id={`subtask-${subtask.id}`} checked={subtask.completed} onCheckedChange={() => handleToggleComplete(subtask)} /></div>
                  <label htmlFor={`subtask-${subtask.id}`} className={`flex-grow cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>{subtask.title}</label>
                  <div className="w-28 text-right"><SubtaskDeadline subtask={subtask} /></div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Avatar className="h-6 w-6"><AvatarImage src={subtask.assignee?.avatar_url || undefined} /><AvatarFallback className="text-xs">{getInitials(subtask.assignee?.full_name)}</AvatarFallback></Avatar>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ListChecks className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="font-medium">Nenhum plano de ação definido.</p>
                <p className="text-sm">Adicione a primeira ação no formulário acima.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <SubtaskDetailDialog subtaskId={selectedSubtaskId} open={isDetailOpen} onOpenChange={setIsDetailOpen} />
    </>
  );
};

export default ActionPlan;