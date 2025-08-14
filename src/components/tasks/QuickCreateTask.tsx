// src/components/tasks/QuickCreateTask.tsx

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Plus } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useClassifications } from '@/hooks/useClassifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { TaskInsert } from '@/types';

// Schema de validação com campos adicionais
const quickTaskSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres.'),
  due_date: z.date({ required_error: 'O prazo é obrigatório.' }),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  project_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
});

type QuickTaskFormData = z.infer<typeof quickTaskSchema>;

const QuickCreateTask: React.FC = () => {
  const { user } = useAuth();
  const { createTask } = useTasks();
  const { projects } = useProjects();
  const { classifications } = useClassifications();

  const form = useForm<QuickTaskFormData>({
    resolver: zodResolver(quickTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      due_date: undefined,
      priority: 'medium',
      project_id: null,
      category_id: null,
    },
  });

  const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: QuickTaskFormData) => {
    if (!user?.id) {
      toast.error('Usuário não encontrado.');
      return;
    }

    try {
      const taskData: TaskInsert = {
        ...data,
        due_date: data.due_date.toISOString(),
        user_id: user.id,
        status: 'todo',
      };
      await createTask(taskData);
      toast.success(`Tarefa "${data.title}" criada!`);
      reset();
    } catch (error: any) {
      toast.error('Falha ao criar tarefa', { description: error.message });
    }
  };

  return (
    <div className="bg-card p-4 rounded-lg border mb-6">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
        <div className="space-y-2">
          <Input placeholder="Título da nova tarefa..." {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="Descrição da tarefa..."
            {...register('description')}
            rows={1}
            className="resize-none"
          />
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Controller
            name="due_date"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !field.value && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? format(field.value, 'PPP') : <span>Escolha um prazo</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.due_date && <p className="text-xs text-destructive">{errors.due_date.message}</p>}
        </div>

        <div className="space-y-2">
          <Controller
            name="project_id"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                value={field.value || 'none'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum projeto</SelectItem>
                  {projects
                    .filter((p) => p.id !== 'all')
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.project_id && <p className="text-xs text-destructive">{errors.project_id.message}</p>}
        </div>

        <div className="space-y-2">
          <Controller
            name="category_id"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                value={field.value || 'none'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {classifications.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Criar Tarefa
        </Button>
      </form>
    </div>
  );
};

export default QuickCreateTask;