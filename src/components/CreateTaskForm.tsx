// src/components/CreateTaskForm.tsx

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClassifications } from '@/hooks/useClassifications';
import { toast } from 'sonner';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- ALTERAÇÃO: Validação da descrição tornada obrigatória ---
const taskSchema = z.object({
  title: z.string().min(3, "O título precisa ter pelo menos 3 caracteres."),
  category_id: z.string().nullable(),
  description: z.string().min(10, "A descrição é obrigatória e precisa ter pelo menos 10 caracteres."), // <-- OBRIGATÓRIO
  priority: z.string().default('medium'),
});
type TaskFormData = z.infer<typeof taskSchema>;

interface CreateTaskFormProps {
  onSuccess: () => void; // Função para ser chamada após o sucesso
}

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const { classifications, isLoading: isLoadingClassifications } = useClassifications();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', category_id: null, description: '', priority: 'medium' }
  });

  const { formState: { isSubmitting } } = form;

  const onSubmit = async (values: TaskFormData) => {
    if (!user) return toast.error("Você precisa estar logado.");

    const dataToSend = {
      ...values,
      category_id: values.category_id === 'none' ? null : values.category_id,
      user_id: user.id,
      status: 'todo',
    };
    
    const { error } = await supabase.from('tasks').insert(dataToSend);

    if (error) {
      toast.error("Erro ao criar tarefa.", { description: error.message });
    } else {
      toast.success("Tarefa criada com sucesso!");
      onSuccess(); // Chama a função de sucesso passada como prop
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card p-6 rounded-lg border space-y-4 max-w-3xl"> 
      <div>
        <Label>Categoria (Opcional)</Label>
        <Controller name="category_id" control={form.control} render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value || "none"} disabled={isLoadingClassifications}>
            <SelectTrigger><SelectValue placeholder="Selecione uma categoria..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {classifications.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )} />
      </div>

      <div>
        <Label htmlFor="title">Título da Tarefa</Label>
        <Input id="title" {...form.register('title')} />
        {form.formState.errors.title && <p className="text-sm text-red-500 mt-1">{form.formState.errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Descrição <span className="text-destructive">*</span></Label>
        <Textarea id="description" {...form.register('description')} rows={8} />
        {/* --- ALTERAÇÃO: Adiciona a mensagem de erro para descrição --- */}
        {form.formState.errors.description && <p className="text-sm text-red-500 mt-1">{form.formState.errors.description.message}</p>}
      </div>
      
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Criando...' : 'Salvar Tarefa'}
        </Button>
      </div>
    </form>
  );
};

export default CreateTaskForm;