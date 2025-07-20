// src/components/CreateProjectForm.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext'; // 1. Importar o hook de autenticação
import { Plus } from 'lucide-react';

interface CreateProjectFormProps {
  onProjectCreated: () => void;
}

export const CreateProjectForm: React.FC<CreateProjectFormProps> = ({ onProjectCreated }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth(); // 2. Pegar o objeto do usuário logado

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    // 3. Verificação de segurança: garantir que há um usuário logado
    if (!user) {
      toast({ title: "Erro", description: "Você precisa estar logado para criar um projeto.", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Erro", description: "O nome do projeto é obrigatório.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // 4. Montar o objeto a ser inserido, incluindo o user_id
      const newProject = {
        name: name.trim(),
        description: description.trim(),
        user_id: user.id, // <-- AQUI! Vinculando o projeto ao usuário
      };
      
      const { error } = await supabase.from('projects').insert(newProject);

      if (error) throw error;

      toast({ title: "Sucesso!", description: `Projeto "${name}" criado.` });
      setName(''); // Limpa o formulário
      setDescription('');
      setOpen(false); // Fecha o modal
      onProjectCreated(); // Avisa a página pai para recarregar os dados
    } catch (error: any) {
      console.error("Erro ao criar projeto:", error);
      toast({ title: "Erro!", description: "Não foi possível criar o projeto.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
          <DialogDescription>Organize suas tarefas em um novo projeto.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateProject}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Nome do Projeto</Label>
              <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Descrição (Opcional)</Label>
              <Textarea id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Projeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};