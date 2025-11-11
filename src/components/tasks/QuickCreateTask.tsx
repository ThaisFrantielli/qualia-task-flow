// src/components/tasks/QuickCreateTask.tsx

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Plus } from 'lucide-react';
import { calendarDateToISO } from '@/lib/dateUtils';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// Schema de validação
const quickTaskSchema = z.object({
  title: z.string().min(3, "O título é obrigatório."),
  description: z.string().min(10, "A descrição é obrigatória."),
  due_date: z.date({ required_error: "O prazo é obrigatório." }),
});
type QuickTaskFormData = z.infer<typeof quickTaskSchema>;

interface QuickCreateTaskProps {
  onTaskCreated: () => void; // Para avisar a página pai para recarregar a lista
}

const QuickCreateTask: React.FC<QuickCreateTaskProps> = ({ onTaskCreated }) => {
  const { user } = useAuth();
  const { createTask } = useTasks();
  
  const form = useForm<QuickTaskFormData>({
    resolver: zodResolver(quickTaskSchema),
    defaultValues: { title: '', description: '', due_date: undefined }
  });
  const { formState: { isSubmitting }, control, register, handleSubmit, reset } = form;

  const onSubmit = async (data: QuickTaskFormData) => {
    if (!user) return toast.error("Usuário não encontrado.");

    try {
      await createTask({
        title: data.title,
        description: data.description,
        due_date: calendarDateToISO(data.due_date) || '',
        user_id: user.id,
        status: 'todo',
        priority: 'medium',
      });
      toast.success(`Tarefa "${data.title}" criada!`);
      reset();
      onTaskCreated(); // Chama a função para recarregar
    } catch (error: any) {
      toast.error("Falha ao criar tarefa", { description: error.message });
    }
  };

  return (
    <div className="bg-card p-4 rounded-lg border mb-6">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        <div className="md:col-span-2 space-y-2">
          <Input placeholder="Título da nova tarefa..." {...register('title')} />
          {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
          <Textarea placeholder="Descrição da tarefa..." {...register('description')} rows={1} className="resize-none" />
          {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
        </div>
        <div className="space-y-2">
          <Controller name="due_date" control={control} render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value ? format(field.value, "PPP") : <span>Escolha um prazo</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
              </PopoverContent>
            </Popover>
          )} />
          {form.formState.errors.due_date && <p className="text-xs text-destructive">{form.formState.errors.due_date.message}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Criar Tarefa Rápida
        </Button>
      </form>
    </div>
  );
};
export default QuickCreateTask;