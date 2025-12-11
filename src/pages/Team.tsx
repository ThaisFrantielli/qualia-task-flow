// src/pages/Team.tsx

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import TeamMemberDialog from '@/components/team/TeamMemberDialog';
import { CreateUserDialog } from '@/components/team/CreateUserDialog';
import { usePresenceOptional } from '@/contexts/PresenceContext';
import { PresenceIndicator } from '@/components/presence/PresenceIndicator';
import { useAuth } from '@/contexts/AuthContext';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  // flag administrativa para controle de acesso global
  is_admin?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  funcao: string;
  nivelAcesso: 'Usuário' | 'Supervisão' | 'Gestão' | 'Admin';
  permissoes: Permissoes;
  tasksCount: number; // Placeholder, pode ser preenchido no futuro
  supervisorName?: string | null;
  supervisor_id?: string | null;
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
  supervisor_id: null as string | null,
  permissoes: getDefaultPermissions('Usuário'),
};

const Team = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const presence = usePresenceOptional();
  
  const isAdmin = !!user?.isAdmin;
  
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  const fetchTeamMembers = useCallback(async () => {
    setIsLoading(true);
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    
    if (error) {
      toast.error("Erro ao carregar a equipe.", { description: error.message });
    } else if (profiles) {
      const lookup = (profiles || []).reduce((acc: Record<string, string>, p: any) => {
        acc[p.id] = p.full_name || p.email || '';
        return acc;
      }, {} as Record<string, string>);

      // Fetch user_hierarchy relations for these profiles to list supervisors (many-to-many)
      const profileIds = profiles.map((p: any) => p.id);
      const { data: uhData, error: uhError } = await supabase
        .from('user_hierarchy')
        .select('user_id, supervisor_id')
        .in('user_id', profileIds);

      const supervisorsByUser: Record<string, string[]> = {};
      if (!uhError && Array.isArray(uhData)) {
        uhData.forEach((r: any) => {
          if (!supervisorsByUser[r.user_id]) supervisorsByUser[r.user_id] = [];
          supervisorsByUser[r.user_id].push(r.supervisor_id);
        });
      }

      const members = profiles.map(profile => {
        const supIds = supervisorsByUser[profile.id] || [];
        const supNames = supIds.map((id: string) => lookup[id]).filter(Boolean).join(', ');
        return {
          id: profile.id,
          name: profile.full_name || 'Nome não definido',
          email: profile.email || 'Email não definido',
          funcao: profile.funcao || 'Função não definida',
          nivelAcesso: (profile.nivelAcesso as any) || 'Usuário',
          permissoes: (profile.permissoes as any) || getDefaultPermissions(profile.nivelAcesso as any || 'Usuário'),
          tasksCount: 0,
          supervisorName: supNames || null,
          supervisor_id: profile.supervisor_id || null,
        };
      });
      setTeamMembers(members as any);
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
        supervisor_id: (member as any).supervisor_id || null,
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
    
    const updatePayload: any = {
      full_name: formData.name,
      funcao: formData.funcao,
      nivelAcesso: formData.nivelAcesso,
      permissoes: formData.permissoes as any,
    };

    // Incluir supervisor_id se definido (pode ser null para remover)
    if ('supervisor_id' in formData) {
      updatePayload.supervisor_id = formData.supervisor_id;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', editingMember.id);
    
    if (error) {
      toast.error("Erro ao salvar alterações", { description: error.message });
    } else {
      toast.success('Membro atualizado com sucesso!');
      handleCloseDialog();
      fetchTeamMembers(); // Recarrega os dados para garantir consistência
    }
  };

  const handleDeleteMember = async () => {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Usuários</h1>
          <p className="text-gray-600">Gerencie os usuários do sistema, suas funções e permissões.</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button 
              variant="default" 
              className="flex items-center gap-2"
              onClick={() => setIsCreateUserDialogOpen(true)}
            >
              <UserPlus className="w-4 h-4" />
              <span>Criar Usuário</span>
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[35%]">Membro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Nível de Acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.length > 0 ? (
              teamMembers.map((member) => {
                const userPresence = presence?.getUserPresence(member.id);
                return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        {userPresence && (
                          <span className="absolute -bottom-0.5 -right-0.5">
                            <PresenceIndicator 
                              status={userPresence.status} 
                              size="sm" 
                              showTooltip={false} 
                            />
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {userPresence ? (
                      <div className="flex items-center gap-2">
                        <PresenceIndicator status={userPresence.status} size="md" />
                        <span className="text-xs text-muted-foreground">
                          {userPresence.currentPage && userPresence.currentPage !== '/' && (
                            <>Em: {userPresence.currentPage.split('/')[1] || 'Dashboard'}</>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Offline</span>
                    )}
                  </TableCell>
                  <TableCell>{member.funcao}</TableCell>
                  <TableCell>{(member as any).supervisorName || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={member.nivelAcesso === 'Admin' ? 'destructive' : 'secondary'}>
                      {member.nivelAcesso}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(member)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleDeleteMember}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
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

      <CreateUserDialog
        open={isCreateUserDialogOpen}
        onOpenChange={setIsCreateUserDialogOpen}
        onUserCreated={fetchTeamMembers}
      />
    </div>
  );
};

export default Team;