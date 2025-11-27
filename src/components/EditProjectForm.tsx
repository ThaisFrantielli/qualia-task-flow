import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTeams } from '@/hooks/useTeams';
import { useUsersContext } from '@/contexts/UsersContext';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { UserPlus, Pencil } from 'lucide-react';

interface EditProjectFormProps {
  project: any;
  onProjectUpdated: () => void;
}

export const EditProjectForm: React.FC<EditProjectFormProps> = ({ project, onProjectUpdated }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name || '');
  const [description, setDescription] = useState(project.description || '');
  const [teamId, setTeamId] = useState<string | null>(project.team_id || null);
  const [privacy, setPrivacy] = useState<'organization' | 'team' | 'private'>(project.privacy || 'organization');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { teams } = useTeams();
  const { users } = useUsersContext();
  const { members, refetch: refetchMembers } = useProjectMembers(project.id);
  const [editMembers, setEditMembers] = useState<{ user_id: string; role: string }[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('colaborador');

  useEffect(() => {
    if (members) {
      setEditMembers(members.map(m => ({ user_id: m.user_id, role: m.role || 'colaborador' })));
    }
  }, [members]);

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Erro', description: 'O nome do projeto é obrigatório.', variant: 'destructive' });
      return;
    }
    if (!teamId) {
      toast({ title: 'Erro', description: 'Selecione uma equipe.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // Atualiza projeto
      const { error } = await supabase.from('projects').update({
        name: name.trim(),
        description: description.trim(),
        team_id: teamId,
        privacy,
      }).eq('id', project.id);
      if (error) throw error;
      // Atualiza membros (remove todos e insere novamente)
      await supabase.from('project_members').delete().eq('project_id', project.id);
      if (editMembers.length > 0) {
        const membersToInsert = editMembers.map(m => ({ ...m, project_id: project.id }));
        const { error: memberError } = await supabase.from('project_members').insert(membersToInsert);
        if (memberError) throw memberError;
      }
      toast({ title: 'Sucesso!', description: 'Projeto atualizado.' });
      setOpen(false);
      onProjectUpdated();
      refetchMembers();
    } catch (error: any) {
      console.error('Erro ao atualizar projeto:', error);
      toast({ title: 'Erro!', description: 'Não foi possível atualizar o projeto.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary"><Pencil className="mr-2 h-4 w-4" /> Editar Projeto</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Projeto</DialogTitle>
          <DialogDescription>Atualize as informações do projeto.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpdateProject}>
          <div className="space-y-6 py-4">
            <div className="space-y-1">
              <Label htmlFor="project-name-edit">Nome do Projeto</Label>
              <p className="text-xs text-muted-foreground mb-1">Defina um nome claro e objetivo para o projeto.</p>
              <Input id="project-name-edit" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Novo Website" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="project-description-edit">Descrição</Label>
              <p className="text-xs text-muted-foreground mb-1">Descreva brevemente o objetivo ou escopo do projeto (opcional).</p>
              <Textarea id="project-description-edit" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Desenvolvimento de um novo site institucional" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="team-select-edit">Equipe</Label>
              <p className="text-xs text-muted-foreground mb-1">Selecione a equipe responsável por este projeto.</p>
              <Select value={teamId ?? ''} onValueChange={setTeamId}>
                <SelectTrigger id="team-select-edit">
                  <SelectValue placeholder="Selecione uma equipe" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Privacidade</Label>
              <p className="text-xs text-muted-foreground mb-1">
                <b>Organização:</b> visível para todos da empresa. <b>Equipe:</b> apenas membros da equipe selecionada. <b>Privado:</b> somente membros adicionados manualmente.
              </p>
              <RadioGroup value={privacy} onValueChange={v => setPrivacy(v as 'organization' | 'team' | 'private')} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="organization" id="privacy-org-edit" />
                  <Label htmlFor="privacy-org-edit">Organização</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="team" id="privacy-team-edit" />
                  <Label htmlFor="privacy-team-edit">Equipe</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="private" id="privacy-private-edit" />
                  <Label htmlFor="privacy-private-edit">Privado</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-1">
              <Label>Membros do Projeto</Label>
              <p className="text-xs text-muted-foreground mb-1">Adicione membros e defina suas funções neste projeto.</p>
              <div className="flex gap-2 items-end">
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Adicionar membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => !editMembers.some(m => m.user_id === u.id)).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Responsável</SelectItem>
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
                    if (selectedMember && !editMembers.some(m => m.user_id === selectedMember)) {
                      setEditMembers([...editMembers, { user_id: selectedMember, role: selectedRole }]);
                      setSelectedMember('');
                      setSelectedRole('colaborador');
                    }
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
              {editMembers.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {editMembers.map((m, idx) => {
                    const u = users.find(u => u.id === m.user_id);
                    return (
                      <li key={m.user_id} className="flex items-center gap-2 text-sm bg-muted rounded px-2 py-1">
                        <span className="flex-1">{u?.full_name || u?.email}</span>
                        <span className="text-xs text-gray-500">{m.role === 'owner' ? 'Responsável' : m.role.charAt(0).toUpperCase() + m.role.slice(1)}</span>
                        <Button type="button" size="icon" variant="ghost" onClick={() => setEditMembers(editMembers.filter((_, i) => i !== idx))}>
                          ×
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
