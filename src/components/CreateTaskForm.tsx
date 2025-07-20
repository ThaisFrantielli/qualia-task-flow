// src/components/CreateTaskForm.tsx

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';

interface CreateTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
}

// --- AQUI NÃO TEM 'export' ---
const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ open, onOpenChange, onTaskCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [projectId, setProjectId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { projects } = useProjects();

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setProjectId(null);
    }
  }, [open]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({ title: "Erro", description: "Você precisa estar logado.", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Erro", description: "O título da tarefa é obrigatório.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const newTask = {
        title: title.trim(),
        description: description.trim(),
        priority: priority,
        project_id: projectId,
        user_id: user.id,
        assignee_id: user.id,
        status: 'todo'
      };

      const { error } = await supabase.from('tasks').insert(newTask);

      if (error) throw error;

      toast({ title: "Sucesso!", description: `Tarefa "${title}" criada.` });
      onOpenChange(false);
      onTaskCreated();
    } catch (error: any) {
      console.error("Erro ao criar tarefa:", error);
      toast({ title: "Erro!", description: "Não foi possível criar a tarefa.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Nova Tarefa</DialogTitle>
          <DialogDescription>Preencha os detalhes da nova tarefa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateTask}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Título da Tarefa</Label>
              <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Descrição (Opcional)</Label>
              <Textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                  <Label>Projeto (Opcional)</Label>
                  <Select onValueChange={(value) => setProjectId(value === 'none' ? null : value)}>
                      <SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="none">Nenhum projeto</SelectItem>
                          {projects.map(project => (
                              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// --- MUDANÇA CRÍTICA AQUI: EXPORTAÇÃO PADRÃO ---
export default CreateTaskForm;