import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const projectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().optional(),
  color: z.string().default('#2563eb'),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface CreateProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: () => void;
}

const CreateProjectForm: React.FC<CreateProjectFormProps> = ({
  open,
  onOpenChange,
  onProjectCreated,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      color: '#2563eb',
    },
  });

  const watchedColor = watch('color');

  const onSubmit = async (data: ProjectFormData) => {
    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          name: data.name,
          description: data.description || null,
          color: data.color,
        });

      if (error) throw error;

      toast.success('Projeto criado com sucesso!');
      reset();
      onOpenChange(false);
      onProjectCreated();
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      toast.error('Erro ao criar projeto. Tente novamente.');
    }
  };

  const colorOptions = [
    '#2563eb', '#dc2626', '#16a34a', '#ca8a04', 
    '#9333ea', '#c2410c', '#0891b2', '#be123c',
    '#4338ca', '#059669', '#7c2d12', '#6b21a8'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Criar Novo Projeto
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Projeto *</Label>
            <Input
              id="name"
              placeholder="Ex: Website da empresa"
              {...register('name')}
              className="custom-input"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o objetivo do projeto..."
              rows={3}
              {...register('description')}
              className="custom-textarea"
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor do Projeto</Label>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: watchedColor }}
              />
              <div className="grid grid-cols-6 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      const input = document.getElementById('color') as HTMLInputElement;
                      if (input) {
                        input.value = color;
                        const event = new Event('input', { bubbles: true });
                        input.dispatchEvent(event);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
            <input
              id="color"
              type="hidden"
              {...register('color')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="custom-button"
            >
              {isSubmitting ? 'Criando...' : 'Criar Projeto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Export do componente trigger também
export const CreateProjectTrigger: React.FC<{
  onProjectCreated: () => void;
}> = ({ onProjectCreated }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="w-4 h-4 mr-2" />
        Novo Projeto
      </Button>
      
      <CreateProjectForm
        open={open}
        onOpenChange={setOpen}
        onProjectCreated={onProjectCreated}
      />
    </>
  );
};

export default CreateProjectForm;