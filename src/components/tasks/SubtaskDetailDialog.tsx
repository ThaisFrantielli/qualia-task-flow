// src/components/tasks/SubtaskDetailDialog.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSubtask } from '@/hooks/useSubtasks';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface SubtaskDetailDialogProps {
  subtaskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SubtaskDetailDialog: React.FC<SubtaskDetailDialogProps> = ({ subtaskId, open, onOpenChange }) => {
  const { subtask, isLoading, update } = useSubtask(subtaskId);
  const [isSaving, setIsSaving] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (subtask) {
      setTitle(subtask.title);
      setDescription(subtask.description || '');
    }
  }, [subtask]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subtask) return;
    setIsSaving(true);
    const updates = { title, description };
    try {
      await update(updates);
      toast.success("Subtarefa atualizada!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao atualizar", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {isLoading ? (
          <div className="space-y-4 py-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-10 w-full" /><Skeleton className="h-20 w-full" /></div>
        ) : subtask ? (
          <>
            <DialogHeader>
              <DialogTitle>Detalhes da Ação</DialogTitle>
              <DialogDescription>Edite as informações da subtarefa abaixo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <p className="py-4">Subtarefa não encontrada ou ID inválido.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubtaskDetailDialog;