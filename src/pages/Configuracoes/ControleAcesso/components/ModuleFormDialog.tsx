import React from 'react';
import { useForm } from 'react-hook-form';
import { Module } from '@/hooks/useModules';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface ModuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  initialData?: Partial<Module>;
  title: string;
}

const ModuleFormDialog: React.FC<ModuleFormDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      name: initialData?.name || '',
      key: initialData?.key || '',
      description: initialData?.description || '',
      icon: initialData?.icon || 'Box',
      route: initialData?.route || '',
      is_active: initialData?.is_active ?? true,
      display_order: initialData?.display_order || 0,
    },
  });

  const isActive = watch('is_active');

  const handleFormSubmit = (data: any) => {
    if (initialData?.id) {
      onSubmit({ ...data, id: initialData.id });
    } else {
      onSubmit(data);
    }
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Módulo *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Nome é obrigatório' })}
              placeholder="Ex: Tarefas"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="key">Chave Única *</Label>
            <Input
              id="key"
              {...register('key', { required: 'Chave é obrigatória' })}
              placeholder="Ex: tasks"
              disabled={!!initialData?.id}
            />
            {errors.key && (
              <p className="text-sm text-destructive">{errors.key.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descreva o módulo"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Ícone (Lucide)</Label>
              <Input
                id="icon"
                {...register('icon')}
                placeholder="Ex: CheckSquare"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Ordem de Exibição</Label>
              <Input
                id="display_order"
                type="number"
                {...register('display_order', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="route">Rota *</Label>
            <Input
              id="route"
              {...register('route', { required: 'Rota é obrigatória' })}
              placeholder="/tasks"
            />
            {errors.route && (
              <p className="text-sm text-destructive">{errors.route.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="is_active">Módulo Ativo</Label>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModuleFormDialog;
