// src/pages/Team.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Plus, Users, ShieldCheck, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import TeamMemberDialog from '@/components/team/TeamMemberDialog';

// Componentes da UI para a Tabela
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Definição das interfaces e tipos para esta página
export interface Permissoes {
  dashboard: boolean;
  kanban: boolean;
  tasks: boolean;
  projects: boolean;
  team: boolean;
  settings: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  funcao: string;
  nivelAcesso: 'Usuário' | 'Supervisão' | 'Gestão' | 'Admin';
  permissoes: Permissoes;
  tasksCount: number;
}

// Função helper para definir permissões padrão com base no nível de acesso
const getDefaultPermissions = (nivel: TeamMember['nivelAcesso']): Permissoes => {
  const basePermissions = {
    dashboard: true,
    kanban: true,
    tasks: true,
    projects: false,
    team: false,
    settings: false,
  };
  switch (nivel) {
    case 'Admin':
      return { dashboard: true, kanban: true, tasks: true, projects: true, team: true, settings: true };
    case 'Gestão':
      return { ...basePermissions, projects: true, team: true };
    case 'Supervisão':
      return { ...basePermissions, projects: true };
    case 'Usuário':
    default:
      return basePermissions;
  }
};

const Team = () => {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  
  // Estado para o formulário do Dialog
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    funcao: 'Desenvolvedor',
    nivelAcesso: 'Usuário' as TeamMember['nivelAcesso'],
    permissoes: getDefaultPermissions('Usuário'),
  });
  
  // Função para pegar as iniciais do nome para o Avatar
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  // Efeito para buscar os membros da equipe do banco de dados ao carregar a página
  useEffect(() => {
    const fetchTeamMembers = async () => {
      setIsLoading(true);
      const { data: profiles, error } = await supabase.from('profiles').select('*');
      
      if (error) {
        toast({ title: "Erro", description: "Não foi possível carregar a equipe.", variant: "destructive" });
      } else if (profiles) {
        const members = profiles.map(profile => ({
          id: profile.id,
          name: profile.full_name || 'Nome não definido',
          email: profile.email || 'Email não definido',
          funcao: profile.funcao || 'Função não definida',
          nivelAcesso: profile.nivelAcesso || 'Usuário',
          permissoes: profile.permissoes || getDefaultPermissions(profile.nivelAcesso || 'Usuário'),
          tasksCount: 0, // A contagem de tarefas precisaria de uma consulta mais complexa
        }));
        setTeamMembers(members);
      }
      setIsLoading(false);
    };
    fetchTeamMembers();
  }, [toast]);

  // Lida com mudanças nos campos do formulário do Dialog
  const handleFormChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'nivelAcesso') {
        newState.permissoes = getDefaultPermissions(value as TeamMember['nivelAcesso']);
      }
      return newState;
    });
  };

  // Reseta o formulário para o estado inicial
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      funcao: 'Desenvolvedor',
      nivelAcesso: 'Usuário',
      permissoes: getDefaultPermissions('Usuário'),
    });
  };
  
  // Função para "Adicionar Membro" - por enquanto, mostra um aviso
  const handleAddMember = () => {
    toast({ title: 'Função em desenvolvimento', description: 'Use a página de convite ou cadastro para adicionar um novo membro.', variant: 'default' });
    setIsAddMemberOpen(false);
  };

  // Prepara o formulário para edição de um membro existente
  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      funcao: member.funcao,
      nivelAcesso: member.nivelAcesso,
      permissoes: member.permissoes,
    });
  };

  // Salva as alterações de um membro no banco de dados
  const handleUpdateMember = async () => {
    if (!editingMember) return;
    if (!formData.name.trim()) {
      toast({ title: 'Erro', description: 'O nome é obrigatório.', variant: 'destructive' });
      return;
    }
    
    const updatedData = {
      full_name: formData.name,
      funcao: formData.funcao,
      nivelAcesso: formData.nivelAcesso,
      permissoes: formData.permissoes,
    };
    
    const { error } = await supabase.from('profiles').update(updatedData).eq('id', editingMember.id);
    
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setTeamMembers(prev => prev.map(member => (member.id === editingMember.id ? { ...member, ...formData } : member)));
      setEditingMember(null);
      resetForm();
      toast({ title: 'Sucesso!', description: 'Membro atualizado com sucesso.' });
    }
  };

  // Remove um membro da lista
  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm("Tem certeza que deseja remover este membro? A ação não poderá ser desfeita.")) return;
    
    const { error } = await supabase.from('profiles').delete().eq('id', memberId);
    
    if (error) {
      toast({ title: "Erro ao remover", description: "Não foi possível remover o membro.", variant: "destructive" });
    } else {
      setTeamMembers(prev => prev.filter(member => member.id !== memberId));
      toast({ title: 'Sucesso!', description: 'Membro removido da lista.' });
    }
  };

  // Exibe um spinner de carregamento enquanto os dados são buscados
  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Equipe e Permissões</h1>
          <p className="text-gray-600">Gerencie os membros, suas funções e níveis de acesso.</p>
        </div>
        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2" onClick={() => setIsAddMemberOpen(true)}>
              <Plus className="w-4 h-4" />
              <span>Adicionar Membro</span>
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Membro</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Nível de Acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={undefined} />
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{member.funcao}</TableCell>
                  <TableCell>
                    <Badge variant={member.nivelAcesso === 'Admin' ? 'destructive' : 'secondary'}>
                      {member.nivelAcesso}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEditMember(member)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteMember(member.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Nenhum membro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs para adicionar e editar membros */}
      <TeamMemberDialog
        isOpen={isAddMemberOpen}
        onClose={() => { setIsAddMemberOpen(false); resetForm(); }}
        member={null}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={handleAddMember}
        isEditing={false}
      />
      <TeamMemberDialog
        isOpen={!!editingMember}
        onClose={() => { setEditingMember(null); resetForm(); }}
        member={editingMember}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={handleUpdateMember}
        isEditing={true}
      />
    </div>
  );
};

export default Team;