import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSubtasks } from '@/hooks/useSubtasks';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Plus, ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddSubtaskInlineProps {
  taskId: string;
}

type FormData = { title: string };

const priorityConfig = {
  low: { icon: ArrowDown, color: 'text-gray-500' },
  medium: { icon: ArrowRight, color: 'text-yellow-500' },
  high: { icon: ArrowUp, color: 'text-red-500' },
};

const AddSubtaskInline: React.FC<AddSubtaskInlineProps> = ({ taskId }) => {
  const { add } = useSubtasks(taskId);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>();
  
  // --- State para controlar a prioridade selecionada ---
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  const CurrentPriorityIcon = priorityConfig[priority].icon;
  const currentPriorityColor = priorityConfig[priority].color;

  const onSubmit = async (data: FormData) => {
    if (!data.title.trim() || !add) return;
    
    try {
      // --- Incluir a prioridade no objeto enviado ---
      await add({ task_id: taskId, title: data.title.trim(), priority: priority });
      reset();
      setPriority('medium'); // Reseta a prioridade para o padrão
    } catch (error: any) {
      toast.error("Não foi possível adicionar a ação.", { description: error.message });
    }
  };
  
  const handlePrioritySelect = (p: 'low' | 'medium' | 'high') => {
    setPriority(p);
    setPopoverOpen(false); // Fecha o popover após a seleção
  };

  return (
    <TableRow className="bg-white hover:bg-white">
      <TableCell colSpan={5} className="pl-12 py-1">
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Adicionar uma ação e pressionar Enter..."
            className="h-8 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 text-sm flex-grow"
            autoComplete="off"
            disabled={isSubmitting}
            {...register('title')}
          />
          
          {/* --- POPOVER PARA SELEÇÃO DE PRIORIDADE --- */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("h-7 w-7", currentPriorityColor)}>
                <CurrentPriorityIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1">
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={() => handlePrioritySelect('high')}>
                  <ArrowUp className="h-4 w-4 text-red-500" /> Alta
                </Button>
                <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={() => handlePrioritySelect('medium')}>
                  <ArrowRight className="h-4 w-4 text-yellow-500" /> Média
                </Button>
                <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={() => handlePrioritySelect('low')}>
                  <ArrowDown className="h-4 w-4 text-gray-500" /> Baixa
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </form>
      </TableCell>
    </TableRow>
  );
};

export default AddSubtaskInline;