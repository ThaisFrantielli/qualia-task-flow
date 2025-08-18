// src/components/tasks/ActionPlan.tsx (VERSÃO FINAL E AJUSTADA)

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';

// Hooks, Tipos e Utilitários
import { useSubtasks } from '@/hooks/useSubtasks';
import { useUsers } from '@/hooks/useUsers';
import type { Subtask, SubtaskWithDetails } from '@/types';
import { getInitials } from '@/lib/utils';
import { format } from 'date-fns';

// Componentes da UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Calendar as CalendarIcon, ListTodo, Edit, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import SubtaskDetailSheet from './SubtaskDetailSheet';
import SubtaskDeadline from './SubtaskDeadline';

interface ActionPlanProps {
  taskId: string;
}

// O tipo do formulário não precisa de mudanças
type FormData = {
  title: string;
  assignee_id: string | null;
  due_date: Date | null;
  priority: 'low' | 'medium' | 'high';
};

const ActionPlan: React.FC<ActionPlanProps> = ({ taskId }) => {
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);

  // 1. Chamada dos hooks de forma direta. O tratamento de erro é feito com a variável 'error' retornada.
  const { subtasks, isLoading: isLoadingSubtasks, error: subtasksError, add, update } = useSubtasks(taskId);
  const { users: profiles, loading: isLoadingProfiles } = useUsers();

  const { register, handleSubmit, control, reset, formState: { isSubmitting, errors } } = useForm<FormData>({
    defaultValues: {
      title: '',
      assignee_id: null,
      due_date: null,
      priority: 'medium'
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      await add({
        task_id: taskId,
        title: data.title,
        assignee_id: data.assignee_id === 'none' ? null : data.assignee_id, // Permite desatribuir
        due_date: data.due_date ? data.due_date.toISOString() : null,
        priority: data.priority,
      });
      toast.success("Ação adicionada ao plano!");
      reset(); // Limpa o formulário
    } catch (error: any) {
      toast.error("Erro ao adicionar ação", { description: error.message });
    }
  };
  
  const handleToggleComplete = async (subtask: Subtask) => {
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
      toast.error("Erro ao atualizar ação", { description: error.message });
    }
  };

  // 2. Se o hook de subtarefas retornar um erro, mostramos uma mensagem clara.
  if (subtasksError) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          <p>Erro ao carregar o plano de ação.</p>
          <p className="text-sm mt-1">{subtasksError.message}</p>
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
          {/* Formulário de Adição */}
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-[1fr_200px_160px_120px_auto] gap-2 items-start">
            <div className="w-full">
              <Input
                placeholder="Descreva uma nova ação..."
                {...register('title', { required: "O título é obrigatório" })}
                disabled={isSubmitting}
              />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
            </div>
            
            <Controller
              name="assignee_id"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                  value={field.value || "none"}
                  disabled={isLoadingProfiles || isSubmitting}
                >
                  <SelectTrigger><SelectValue placeholder="Atribuir a..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
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
                    <Button variant="outline" className="font-normal w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "dd/MM/yy") : <span>Prazo</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} /></PopoverContent>
                </Popover>
              )}
            />
            
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high"><div className="flex items-center gap-2"><ArrowUp className="h-4 w-4 text-red-500" /> Alta</div></SelectItem>
                    <SelectItem value="medium"><div className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-yellow-500" /> Média</div></SelectItem>
                    <SelectItem value="low"><div className="flex items-center gap-2"><ArrowDown className="h-4 w-4 text-gray-500" /> Baixa</div></SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            
            <Button type="submit" disabled={isSubmitting} size="icon"><Plus className="h-4 w-4" /></Button>
          </form>
          
          {/* Lista de Subtarefas */}
          {isLoadingSubtasks ? (
            <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          ) : subtasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma ação definida ainda.</p>
              <p className="text-sm">Adicione ações acima para criar um plano detalhado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subtasks.map(subtask => (
                <div key={subtask.id} className="group flex items-center justify-between gap-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 cursor-pointer flex-grow" onClick={() => handleToggleComplete(subtask)}>
                    <Checkbox id={`action-plan-cb-${subtask.id}`} checked={subtask.completed} />
                    <label htmlFor={`action-plan-cb-${subtask.id}`} className={`cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>{subtask.title}</label>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="w-28 text-right"><SubtaskDeadline subtask={subtask as SubtaskWithDetails} /></div>
                    <Avatar className="h-6 w-6" title={subtask.assignee?.full_name || 'Não atribuído'}>
                      <AvatarImage src={subtask.assignee?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{getInitials(subtask.assignee?.full_name)}</AvatarFallback>
                    </Avatar>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingSubtaskId(subtask.id)}><Edit className="h-4 w-4" /></Button>
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