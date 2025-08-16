import React, { useState } from 'react';
import { useSubtasks } from '@/hooks/useSubtasks';
import { useUsers } from '@/hooks/useUsers';
import type { Subtask, SubtaskWithDetails } from '@/types';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Calendar as CalendarIcon, ListTodo, Edit, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SubtaskDetailSheet from './SubtaskDetailSheet';
import SubtaskDeadline from './SubtaskDeadline';
import { format } from 'date-fns';
import { getInitials } from '@/lib/utils';

interface ActionPlanProps {
  taskId: string;
}

type FormData = {
  title: string;
  assignee_id: string | null;
  due_date: Date | null;
  priority: 'low' | 'medium' | 'high';
};

const ActionPlan: React.FC<ActionPlanProps> = ({ taskId }) => {
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);

  let subtasksData;
  let usersData;

  try {
    subtasksData = useSubtasks(taskId);
  } catch (error) {
    console.error('Erro no hook useSubtasks:', error);
    subtasksData = {
      subtasks: [],
      isLoading: false,
      error: { message: 'Erro ao carregar subtarefas' },
      add: async () => {},
      update: async () => {},
    };
  }

  try {
    usersData = useUsers();
  } catch (error) {
    console.error('Erro no hook useUsers:', error);
    usersData = {
      users: [],
      loading: false,
      error: 'Erro ao carregar usuários',
      refetch: async () => {},
    };
  }

  const { subtasks = [], isLoading: isLoadingSubtasks = false, error, add, update } = subtasksData;
  const { users: profiles = [], loading: isLoadingProfiles = false } = usersData;

  const { register, handleSubmit, control, reset, formState: { isSubmitting } } = useForm<FormData>({ 
    defaultValues: { 
      title: '', 
      assignee_id: null, 
      due_date: null,
      priority: 'medium'
    }
  });

  const onSubmit = async (data: FormData) => {
    if (!add) return;
    
    try {
      await add({ 
        ...data, 
        task_id: taskId,
        due_date: data.due_date ? data.due_date.toISOString() : null,
      });
      toast.success("Ação adicionada ao plano!");
      reset();
    } catch (error: any) {
      toast.error("Erro ao adicionar ação", { description: error?.message || 'Erro desconhecido' });
    }
  };
  
  const handleToggleComplete = async (subtask: Subtask) => {
    if (!update) return;
    
    try {
      await update({ 
        id: subtask.id, 
        updates: { 
          completed: !subtask.completed, 
          status: !subtask.completed ? 'done' : 'todo' 
        } 
      });
      toast.success(subtask.completed ? "Ação marcada como pendente" : "Ação concluída!");
    } catch (error: any) {
      toast.error("Erro ao atualizar ação", { description: error?.message || 'Erro desconhecido' });
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Erro ao carregar o plano de ação</p>
            <p className="text-sm mt-1">{error?.message || 'Erro desconhecido'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-none shadow-none">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListTodo className="h-5 w-5" />
            Plano de Ação
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-[1fr_200px_160px_120px_auto] gap-2 items-center">
            <Input 
              placeholder="Descreva uma nova ação..." 
              {...register('title', { required: true })} 
              disabled={isSubmitting} 
            />
            
            <Controller 
              name="assignee_id" 
              control={control} 
              render={({ field }) => (
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || ""} 
                  disabled={isLoadingProfiles || isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Atribuir a..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(profiles) && profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
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
                    <Button variant="outline" className="font-normal w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "dd/MM/yy") : <span>Prazo</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={field.value || undefined} 
                      onSelect={field.onChange} 
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <ArrowUp className="h-4 w-4 text-red-500" /> Alta
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-yellow-500" /> Média
                      </div>
                    </SelectItem>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="h-4 w-4 text-gray-500" /> Baixa
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </form>
          
          {isLoadingSubtasks ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !Array.isArray(subtasks) || subtasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma ação definida ainda</p>
              <p className="text-sm">Adicione ações para criar um plano detalhado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subtasks.map(subtask => (
                <div 
                  key={subtask.id} 
                  className="group flex items-center justify-between gap-3 p-3 border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div 
                    className="flex items-center gap-3 cursor-pointer flex-grow" 
                    onClick={() => setEditingSubtaskId(subtask.id)}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        id={`action-plan-checkbox-${subtask.id}`}
                        checked={subtask.completed} 
                        onCheckedChange={() => handleToggleComplete(subtask)} 
                      />
                    </div>
                    <label 
                      htmlFor={`action-plan-checkbox-${subtask.id}`}
                      className={`cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {subtask.title}
                    </label>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="w-28 text-right">
                      <SubtaskDeadline subtask={subtask as SubtaskWithDetails} />
                    </div>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={subtask.assignee?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(subtask.assignee?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEditingSubtaskId(subtask.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SubtaskDetailSheet
        subtaskId={editingSubtaskId}
        open={!!editingSubtaskId}
        onOpenChange={(isOpen) => !isOpen && setEditingSubtaskId(null)}
      />
    </>
  );
};

export default ActionPlan;