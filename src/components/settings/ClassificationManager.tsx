// src/components/settings/ClassificationManager.tsx

import { useState, useEffect } from 'react';
import { useClassifications } from '@/hooks/useClassifications';
import type { TaskCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const ClassificationManager = () => {
  const { classifications, isLoading, create, update, delete: deleteClassification } = useClassifications();
  
  // Estados para controlar os modais e o formulário
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<TaskCategory | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#6B7280' });

  useEffect(() => {
    // Popula o formulário quando uma categoria é selecionada para edição
    if (currentCategory) {
      setFormData({
        name: currentCategory.name,
        color: currentCategory.color || '#6B7280',
      });
    } else {
      // Reseta para o estado de "nova categoria"
      setFormData({ name: '', color: '#6B7280' });
    }
  }, [currentCategory]);

  const handleOpenDialog = (category: TaskCategory | null = null) => {
    setCurrentCategory(category);
    setIsDialogOpen(true);
  };

  const handleOpenAlert = (category: TaskCategory) => {
    setCurrentCategory(category);
    setIsAlertOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("O nome da categoria é obrigatório.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (currentCategory) { // Editando
        await update({ id: currentCategory.id, updates: formData });
        toast.success("Categoria atualizada com sucesso!");
      } else { // Criando
        await create(formData);
        toast.success("Categoria criada com sucesso!");
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error("Ocorreu um erro", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentCategory) return;
    try {
      await deleteClassification(currentCategory.id);
      toast.success(`Categoria "${currentCategory.name}" excluída.`);
    } catch (error: any) {
      toast.error("Falha ao excluir.", { description: error.message });
    } finally {
      setIsAlertOpen(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Categorias de Tarefas</CardTitle>
              <CardDescription>Adicione ou remova categorias para organizar as tarefas.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}><Plus className="mr-2 h-4 w-4" /> Nova</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-2">
              {classifications.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color || '#ccc' }} />
                    <span className="font-medium">{c.name}</span>
                  </div>
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(c)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenAlert(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Adicionar/Editar Categoria */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            <DialogDescription>
              {currentCategory ? 'Altere o nome e a cor da categoria.' : 'Crie uma nova categoria para suas tarefas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nome</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">Cor</Label>
              <Input id="color" type="color" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} className="col-span-1 p-1 h-10" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleFormSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para Confirmação de Exclusão */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Excluir a categoria
              <strong className="mx-1">"{currentCategory?.name}"</strong>
              a removerá de todas as tarefas associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClassificationManager;