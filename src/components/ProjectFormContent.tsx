// src/components/ProjectFormContent.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Props que este componente espera receber
interface ProjectFormContentProps {
  setOpen: (open: boolean) => void;
  onProjectCreated: () => void;
}

const ProjectFormContent: React.FC<ProjectFormContentProps> = ({ setOpen, onProjectCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth(); // Este hook agora é chamado em um local seguro

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault(); // Previne o recarregamento da página

    if (!user) {
      toast({ title: "Erro", description: "Você precisa estar logado.", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Erro", description: "O nome do projeto é obrigatório.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          name: name.trim(),
          description: description.trim(),
          user_id: user.id,
        });

      if (error) throw error;

      toast({ title: "Sucesso!", description: `Projeto "${name}" criado.` });
      onProjectCreated(); // Atualiza a lista na página pai
      setOpen(false); // Fecha o Dialog
    } catch (error: any) {
      console.error("Erro ao criar projeto:", error);
      toast({ title: "Erro!", description: "Não foi possível criar o projeto.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreateProject}>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="project-name">Nome do Projeto</Label>
          <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Lançamento do App" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-description">Descrição (Opcional)</Label>
          <Textarea id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o objetivo do projeto" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar Projeto'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default ProjectFormContent;