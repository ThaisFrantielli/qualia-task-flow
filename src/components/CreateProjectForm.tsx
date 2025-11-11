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
import { FormFieldTooltip } from '@/components/FormFieldTooltip';
import { MemberRolesInfo } from '@/components/MemberRolesInfo';

// Tooltips de ajuda para cada campo
const FORM_TOOLTIPS = {
  name: {
    title: 'Nome do Projeto',
    description: 'Escolha um nome claro e descritivo que identifique facilmente o projeto.',
    examples: [
      'Desenvolvimento do Site 2024',
      'Campanha Black Friday',
      'Implementação CRM'
    ]
  },
  description: {
    title: 'Descrição',
    description: 'Adicione detalhes sobre objetivos, escopo e entregas esperadas do projeto.',
    examples: [
      'Objetivo: Aumentar conversões em 30%',
      'Prazo: 3 meses',
      'Entregáveis: Site responsivo + painel admin'
    ]
  },
  team: {
    title: 'Equipe (Opcional)',
    description: 'Selecione o departamento/setor responsável. Deixe em branco se o projeto for cross-funcional ou não pertencer a uma equipe específica.',
    examples: [
      'Marketing: Para campanhas e comunicação',
      'TI: Para projetos técnicos',
      'Nenhuma: Projetos que envolvem várias áreas'
    ]
  },
  privacy: {
    title: 'Privacidade do Projeto',
    description: 'Defina quem pode visualizar este projeto na organização.',
    examples: [
      '🔓 Organização: Todos podem ver (recomendado)',
      '👥 Equipe: Apenas a equipe selecionada',
      '🔒 Privado: Somente membros adicionados'
    ]
  },
  members: {
    title: 'Membros do Projeto',
    description: 'Adicione pessoas e defina suas permissões específicas neste projeto. Você será automaticamente adicionado como Proprietário.',
    examples: [
      '👤 Colaborador: Cria e edita tarefas',
      '✅ Aprovador: Aprova entregas e Prazos',
      '👁️ Leitor: Apenas visualiza o projeto'
    ]
  }
};

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
    // Campo equipe agora é opcional
    // if (!teamId) {
    //   toast({ title: "Erro", description: "Selecione uma equipe.", variant: "destructive" });
    //   return;
    // }
    setLoading(true);
    try {
      // 1. Criar projeto
      const newProject: any = {
        name: name.trim(),
        description: description.trim(),
        user_id: user.id,
        privacy,
      };
      // Adicionar team_id apenas se foi selecionado
      if (teamId) {
        newProject.team_id = teamId;
      }
      if (defaultPortfolioId) {
        newProject.portfolio_id = defaultPortfolioId;
      }
      const { data, error } = await supabase.from('projects').insert(newProject).select('id').single();
      if (error) {
        console.error("Erro ao criar projeto:", error);
        throw new Error(`Erro ao criar projeto: ${error.message}`);
      }
      const projectId = data?.id;
      // 2. Adicionar membros (inclui o criador como Proprietário)
      const membersToInsert = [
        { user_id: user.id, role: 'owner', project_id: projectId },
        ...members.filter(m => m.user_id !== user.id).map(m => ({ ...m, project_id: projectId })),
      ];
      if (projectId && membersToInsert.length > 0) {
        const { error: memberError } = await supabase.from('project_members').insert(membersToInsert);
        if (memberError) {
          console.error("Erro ao adicionar membros:", memberError);
          throw new Error(`Erro ao adicionar membros: ${memberError.message}`);
        }
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
      const errorMessage = error?.message || "Não foi possível criar o projeto.";
      toast({ 
        title: "Erro ao Criar Projeto", 
        description: errorMessage, 
        variant: "destructive" 
      });
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
              <Label htmlFor="project-name" className="flex items-center">
                Nome do Projeto
                <FormFieldTooltip {...FORM_TOOLTIPS.name} />
              </Label>
              <Input 
                id="project-name" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Desenvolvimento Site 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description" className="flex items-center">
                Descrição (Opcional)
                <FormFieldTooltip {...FORM_TOOLTIPS.description} />
              </Label>
              <Textarea 
                id="project-description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva os objetivos e escopo do projeto..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-select" className="flex items-center">
                Equipe (Opcional)
                <FormFieldTooltip {...FORM_TOOLTIPS.team} />
              </Label>
              <Select value={teamId ?? ''} onValueChange={setTeamId}>
                <SelectTrigger id="team-select">
                  <SelectValue placeholder="Selecione uma equipe" />
                </SelectTrigger>
                <SelectContent>
                  {teams.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      Nenhuma equipe cadastrada
                    </div>
                  ) : (
                    teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {teams.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Você pode criar o projeto sem equipe por enquanto
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center">
                Privacidade
                <FormFieldTooltip {...FORM_TOOLTIPS.privacy} />
              </Label>
              <RadioGroup value={privacy} onValueChange={v => setPrivacy(v as 'organization' | 'team' | 'private')} className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer">
                  <RadioGroupItem value="organization" id="privacy-org" className="mt-0.5" />
                  <Label htmlFor="privacy-org" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <span>🔓</span>
                      <span>Organização</span>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Recomendado</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Visível para todos na empresa
                    </p>
                  </Label>
                </div>
                <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${!teamId ? 'opacity-50 cursor-not-allowed border-gray-200' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'}`}>
                  <RadioGroupItem value="team" id="privacy-team" className="mt-0.5" disabled={!teamId} />
                  <Label htmlFor="privacy-team" className={`flex-1 ${!teamId ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <div className="flex items-center gap-2 font-medium">
                      <span>👥</span>
                      <span>Equipe</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Apenas membros da equipe selecionada
                      {!teamId && <span className="text-orange-600 ml-1">(selecione uma equipe primeiro)</span>}
                    </p>
                  </Label>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer">
                  <RadioGroupItem value="private" id="privacy-private" className="mt-0.5" />
                  <Label htmlFor="privacy-private" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <span>🔒</span>
                      <span>Privado</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Somente membros adicionados podem visualizar
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Membros do Projeto
                <FormFieldTooltip {...FORM_TOOLTIPS.members} />
                <MemberRolesInfo />
              </Label>
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
                    <SelectItem value="aprovador">✅ Aprovador</SelectItem>
                    <SelectItem value="colaborador">👤 Colaborador</SelectItem>
                    <SelectItem value="leitor">👁️ Leitor</SelectItem>
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