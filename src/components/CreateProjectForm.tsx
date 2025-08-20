// src/components/CreateProjectForm.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams } from '@/hooks/useTeams';
import { useUsersContext } from '@/contexts/UsersContext';
import { Plus, UserPlus } from 'lucide-react';

interface CreateProjectFormProps {
  onProjectCreated: () => void;
  defaultPortfolioId?: string;
}


export const CreateProjectForm: React.FC<CreateProjectFormProps> = ({ onProjectCreated, defaultPortfolioId }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { teams } = useTeams();
  const { users } = useUsersContext();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<'organization' | 'team' | 'private'>('organization');
  // Members: [{ user_id, role }]
  const [members, setMembers] = useState<{ user_id: string; role: string }[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('colaborador');

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Erro", description: "Você precisa estar logado para criar um projeto.", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Erro", description: "O nome do projeto é obrigatório.", variant: "destructive" });
      return;
    }
    if (!teamId) {
      toast({ title: "Erro", description: "Selecione uma equipe.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // 1. Criar projeto
      const newProject: any = {
        name: name.trim(),
        description: description.trim(),
        user_id: user.id,
        team_id: teamId,
        privacy,
      };
      if (defaultPortfolioId) {
        newProject.portfolio_id = defaultPortfolioId;
      }
      const { data, error } = await supabase.from('projects').insert(newProject).select('id').single();
      if (error) throw error;
      const projectId = data?.id;
      // 2. Adicionar membros (inclui o criador como owner)
      const membersToInsert = [
        { user_id: user.id, role: 'owner', project_id: projectId },
        ...members.filter(m => m.user_id !== user.id).map(m => ({ ...m, project_id: projectId })),
      ];
      if (projectId && membersToInsert.length > 0) {
        const { error: memberError } = await supabase.from('project_members').insert(membersToInsert);
        if (memberError) throw memberError;
      }
      toast({ title: "Sucesso!", description: `Projeto "${name}" criado.` });
      setName('');
      setDescription('');
      setTeamId(null);
      setPrivacy('organization');
      setMembers([]);
      setOpen(false);
      onProjectCreated();
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
            <div className="space-y-2">
              <Label htmlFor="team-select">Equipe</Label>
              <Select value={teamId ?? ''} onValueChange={setTeamId}>
                <SelectTrigger id="team-select">
                  <SelectValue placeholder="Selecione uma equipe" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Privacidade</Label>
              <RadioGroup value={privacy} onValueChange={v => setPrivacy(v as 'organization' | 'team' | 'private')} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="organization" id="privacy-org" />
                  <Label htmlFor="privacy-org">Organização</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="team" id="privacy-team" />
                  <Label htmlFor="privacy-team">Equipe</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="private" id="privacy-private" />
                  <Label htmlFor="privacy-private">Privado</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Membros do Projeto</Label>
              <div className="flex gap-2 items-end">
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Adicionar membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.id !== user?.id && !members.some(m => m.user_id === u.id)).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aprovador">Aprovador</SelectItem>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                    <SelectItem value="leitor">Leitor</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!selectedMember}
                  onClick={() => {
                    if (selectedMember && !members.some(m => m.user_id === selectedMember)) {
                      setMembers([...members, { user_id: selectedMember, role: selectedRole }]);
                      setSelectedMember('');
                      setSelectedRole('colaborador');
                    }
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
              {members.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {members.map((m, idx) => {
                    const u = users.find(u => u.id === m.user_id);
                    return (
                      <li key={m.user_id} className="flex items-center gap-2 text-sm bg-muted rounded px-2 py-1">
                        <span className="flex-1">{u?.full_name || u?.email}</span>
                        <span className="text-xs text-gray-500">{m.role}</span>
                        <Button type="button" size="icon" variant="ghost" onClick={() => setMembers(members.filter((_, i) => i !== idx))}>
                          ×
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="text-xs text-gray-500 mt-1">O criador será adicionado automaticamente como <b>owner</b>.</div>
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