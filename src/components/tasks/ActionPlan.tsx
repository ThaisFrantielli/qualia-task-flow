// src/components/tasks/ActionPlan.tsx

import React from 'react';
import { useSubtasks } from '@/hooks/useSubtasks';
import { useUsersContext } from '@/contexts/UsersContext'; // <-- USA O NOVO CONTEXTO
import type { Subtask, Profile } from '@/types';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton'; // <-- Importar Skeleton

interface ActionPlanProps {
  taskId: string;
}
type FormData = { title: string; assignee_id: string | null; };
const getInitials = (name?: string | null) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

const ActionPlan: React.FC<ActionPlanProps> = ({ taskId }) => {
  const { subtasks, isLoading: isLoadingSubtasks, add, update } = useSubtasks(taskId);
  const { users: profiles, isLoading: isLoadingProfiles } = useUsersContext(); // <-- LÊ DO CONTEXTO (RÁPIDO)
  const { register, handleSubmit, control, reset, formState: { isSubmitting } } = useForm<FormData>({ defaultValues: { title: '', assignee_id: null } });

  const onSubmit = async (data: FormData) => {
    try {
      await add({ ...data, task_id: taskId });
      toast.success("Ação adicionada ao plano!");
      reset();
    } catch (error: any) {
      toast.error("Erro ao adicionar ação", { description: error.message });
    }
  };
  
  const handleToggleComplete = (subtask: Subtask) => {
    update({ id: subtask.id, updates: { completed: !subtask.completed } });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="flex items-start gap-2">
        <Input placeholder="Descreva uma nova ação..." {...register('title', { required: true })} className="flex-grow" disabled={isSubmitting} />
        <Controller name="assignee_id" control={control} render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoadingProfiles || isSubmitting}>
            <SelectTrigger className="w-[200px]">{isLoadingProfiles ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue placeholder="Atribuir a..." />}</SelectTrigger>
            <SelectContent>{profiles.map((p: Profile) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
          </Select>
        )} />
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
      </form>
      
      {/* --- FEEDBACK VISUAL MELHORADO --- */}
      {isLoadingSubtasks ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-2">
          {subtasks.map(subtask => (
            <div key={subtask.id} className="flex items-center gap-3 p-2 border rounded-md">
              <Checkbox id={`subtask-${subtask.id}`} checked={subtask.completed} onCheckedChange={() => handleToggleComplete(subtask)} />
              <label htmlFor={`subtask-${subtask.id}`} className={`flex-grow cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>{subtask.title}</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{subtask.assignee?.full_name || 'N/A'}</span>
                <Avatar className="h-6 w-6"><AvatarImage src={subtask.assignee?.avatar_url || undefined} /><AvatarFallback className="text-xs">{getInitials(subtask.assignee?.full_name)}</AvatarFallback></Avatar>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionPlan;