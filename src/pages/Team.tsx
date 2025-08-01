// src/pages/Team.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner'; // Usando sonner para toasts
import TeamMemberDialog from '@/components/team/TeamMemberDialog';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Tipos exportados para serem usados em outros lugares, como no Dialog
export interface Permissoes {
  dashboard: boolean;
  kanban: boolean;
  tasks: boolean;
  projects: boolean;
  team: boolean;
  settings: boolean;
  crm: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  funcao: string;
  nivelAcesso: 'Usuário' | 'Supervisão' | 'Gestão' | 'Admin';
  permissoes: Permissoes;
  tasksCount: number; // Placeholder, pode ser preenchido no futuro
}

const getDefaultPermissions = (nivel: TeamMember['nivelAcesso']): Permissoes => {
  const basePermissions: Permissoes = {
    dashboard: true,
    kanban: true,
    tasks: true,
    crm: false,
    projects: false,
    team: false,
    settings: false,
  };
  switch (nivel) {
    case 'Admin':
      return { dashboard: true, kanban: true, tasks: true, crm: true, projects: true, team: true, settings: true };
    case 'Gestão':
      return { ...basePermissions, projects: true, team: true, crm: true };
    case 'Supervisão':
      return { ...basePermissions, projects: true };
    case 'Usuário':
    default:
      return basePermissions;
  }
};

const initialFormData = {
  name: '',
  email: '',
  funcao: '',
  nivelAcesso: 'Usuário' as TeamMember['nivelAcesso'],
  permissoes: getDefaultPermissions('Usuário'),
};

const Team = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  const fetchTeamMembers = useCallback(async () => {
    setIsLoading(true);
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    
    if (error) {
      toast.error("Erro ao carregar a equipe.", { description: error.message });
    } else if (profiles) {
      const members = profiles.map(profile => ({
        id: profile.id,
        name: profile.full_name || 'Nome não definido',
        email: profile.email || 'Email não definido',
        funcao: profile.funcao || 'Função não definida',
        nivelAcesso: profile.nivelAcesso || 'Usuário',
        permissoes: profile.permissoes as Permissoes || getDefaultPermissions(profile.nivelAcesso || 'Usuário'),
        tasksCount: 0,
      }));
      setTeamMembers(members);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      // ATUALIZAÇÃO AUTOMÁTICA DAS PERMISSÕES AO MUDAR NÍVEL DE ACESSO
      if (field === 'nivelAcesso') {
        newState.permissoes = getDefaultPermissions(value as TeamMember['nivelAcesso']);
      }
      return newState;
    });
  };

  const handleOpenDialog = (member: TeamMember | null) => {
    if (member) { // Editando
      setEditingMember(member);
      setFormData({
        name: member.name,
        email: member.email,
        funcao: member.funcao,
        nivelAcesso: member.nivelAcesso,
        permissoes: member.permissoes,
      });
    } else { // Adicionando (funcionalidade desabilitada por enquanto)
      setEditingMember(null);
      setFormData(initialFormData);
      toast.info('Adicionar Membro', { description: 'A adição de novos membros deve ser feita pela página de cadastro.' });
      return; // Impede a abertura do modal para adição
    }
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMember(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async () => {
    if (!editingMember) return;
    if (!formData.name.trim()) {
      toast.error('O nome é obrigatório.');
      return;
    }
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.name,
        funcao: formData.funcao,
        nivelAcesso: formData.nivelAcesso,
        permissoes: formData.permissoes,
      })
      .eq('id', editingMember.id);
    
    if (error) {
      toast.error("Erro ao salvar alterações", { description: error.message });
    } else {
      toast.success('Membro atualizado com sucesso!');
      handleCloseDialog();
      fetchTeamMembers(); // Recarrega os dados para garantir consistência
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm("Tem certeza que deseja remover este membro? A ação não poderá ser desfeita.")) return;
    
    toast.error("Funcionalidade em desenvolvimento.", { description: "A remoção de usuários deve ser feita pelo admin do Supabase." });
  };

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
        <Button className="flex items-center space-x-2" onClick={() => handleOpenDialog(null)}>
          <Plus className="w-4 h-4" />
          <span>Adicionar Membro</span>
        </Button>
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
                        {/* <AvatarImage src={undefined} /> */}
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
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(member)}>
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

      <TeamMemberDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        member={editingMember}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={handleSubmit}
        isEditing={!!editingMember}
      />
    </div>
  );
};

export default Team;