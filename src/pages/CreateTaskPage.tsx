// src/pages/CreateTaskPage.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClassifications } from '@/hooks/useClassifications';
import { toast } from 'sonner';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Schema de validação (sem alterações)
const taskSchema = z.object({
  title: z.string().min(3, "O título precisa ter pelo menos 3 caracteres."),
  category_id: z.string().nullable(),
  description: z.string().optional(),
  priority: z.string().default('medium'),
});
type TaskFormData = z.infer<typeof taskSchema>;

const CreateTaskPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { classifications, isLoading: isLoadingClassifications } = useClassifications();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      category_id: null,
      description: '',
      priority: 'medium',
    }
  });

  const { formState: { isSubmitting } } = form;

  const handleCategoryChange = (categoryId: string) => {
    // Se o usuário selecionar "Nenhuma", não faz nada aqui
    if (categoryId === 'none') {
        form.setValue('priority', 'medium');
        form.setValue('description', '');
        return;
    }

    const selectedCategory = classifications.find(c => c.id === categoryId);
    if (!selectedCategory) return;
    
    form.setValue('priority', selectedCategory.default_priority || 'medium');
    form.setValue('description', selectedCategory.default_description_template || '');
    if (selectedCategory.default_title_prefix && !form.getValues('title')) {
      form.setValue('title', selectedCategory.default_title_prefix);
    }
  };
  
  const onSubmit = async (values: TaskFormData) => {
    if (!user) return toast.error("Você precisa estar logado.");

    // --- CORREÇÃO 2: Converte 'none' de volta para null antes de enviar ---
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
      navigate('/tasks');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-full">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/tasks')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a Lista
          </Button>
          <h1 className="text-3xl font-bold">Criar Nova Tarefa</h1>
          <p className="text-muted-foreground mt-1">Selecione uma categoria para começar ou preencha manualmente.</p>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card p-6 sm:p-8 rounded-xl shadow-md border space-y-4">
          
          <div>
            <Label>Categoria (Opcional)</Label>
            <Controller
              name="category_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleCategoryChange(value);
                  }}
                  // Garante que o valor do Select seja uma string para o placeholder funcionar
                  value={field.value || ""} 
                  disabled={isLoadingClassifications}
                >
                  <SelectTrigger>{isLoadingClassifications ? 'Carregando...' : <SelectValue placeholder="Selecione uma categoria..." />}</SelectTrigger>
                  <SelectContent>
                    {/* --- CORREÇÃO 1: O valor agora é 'none' em vez de "" --- */}
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {classifications.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="title">Título da Tarefa</Label>
            <Input id="title" {...form.register('title')} />
            {form.formState.errors.title && <p className="text-sm text-red-500 mt-1">{form.formState.errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" {...form.register('description')} rows={6} />
          </div>
          
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Criando...' : 'Criar Tarefa'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskPage;