// Aba de Usuários - Migrada de Team.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CreateUserDialog } from '@/components/team/CreateUserDialog';
import { usePresenceOptional } from '@/contexts/PresenceContext';
import { PresenceIndicator } from '@/components/presence/PresenceIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UserEditDialog from './components/UserEditDialog';
import { useGroups } from '@/hooks/useGroups';

export interface Permissoes {
  dashboard: boolean;
  kanban: boolean;
  tasks: boolean;
  projects: boolean;
  team: boolean;
  settings: boolean;
  crm: boolean;
  is_admin?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  funcao: string;
  nivelAcesso: 'Usuário' | 'Supervisão' | 'Gestão' | 'Admin';
  permissoes: Permissoes;
  tasksCount: number;
  supervisorName?: string | null;
  supervisor_id?: string | null;
  manager_id?: string | null;
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
  manager_id: null as string | null,
  permissoes: getDefaultPermissions('Usuário'),
};

const UsuariosTab = () => {
  const { user } = useAuth();
  const { groups, addUserToGroup, removeUserFromGroup, useUserGroupsQuery } = useGroups();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const presence = usePresenceOptional();
  
  const isAdmin = !!user?.isAdmin;

  const currentEditingUserId = editingMember?.id || null;
  const { data: editingUserGroupIds = [] } = useUserGroupsQuery(currentEditingUserId);
  
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  const fetchTeamMembers = useCallback(async () => {
    setIsLoading(true);
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    
    if (error) {
      toast.error("Erro ao carregar a equipe.", { description: error.message });
    } else if (profiles) {
      const lookup = (profiles || []).reduce((acc: Record<string, string>, p: { id: string; full_name?: string | null; email?: string | null }) => {
        acc[p.id] = p.full_name || p.email || '';
        return acc;
      }, {} as Record<string, string>);

      const profileIds = profiles.map((p: { id: string }) => p.id);
      const { data: uhData, error: uhError } = await supabase
        .from('user_hierarchy')
        .select('user_id, supervisor_id')
        .in('user_id', profileIds);

      const supervisorsByUser: Record<string, string[]> = {};
      if (!uhError && Array.isArray(uhData)) {
        uhData.forEach((r: { user_id: string; supervisor_id: string }) => {
          if (!supervisorsByUser[r.user_id]) supervisorsByUser[r.user_id] = [];
          supervisorsByUser[r.user_id].push(r.supervisor_id);
        });
      }

      const members = profiles.map((profile: {
        id: string;
        full_name?: string | null;
        email?: string | null;
        funcao?: string | null;
        nivelAcesso?: string | null;
        permissoes?: Permissoes | null;
        supervisor_id?: string | null;
        manager_id?: string | null;
      }) => {
        const supIds = supervisorsByUser[profile.id] || [];
        const supNames = supIds.map((id: string) => lookup[id]).filter(Boolean).join(', ');
        const managerName = profile.manager_id ? lookup[profile.manager_id] : null;
        return {
          id: profile.id,
          name: profile.full_name || 'Nome não definido',
          email: profile.email || 'Email não definido',
          funcao: profile.funcao || 'Função não definida',
          nivelAcesso: (profile.nivelAcesso as TeamMember['nivelAcesso']) || 'Usuário',
          permissoes: (profile.permissoes as Permissoes) || getDefaultPermissions((profile.nivelAcesso as TeamMember['nivelAcesso']) || 'Usuário'),
          tasksCount: 0,
          supervisorName: supNames || null,
          supervisor_id: profile.supervisor_id || null,
          manager_id: profile.manager_id || null,
          managerName: managerName || null,
        };
      });
      setTeamMembers(members);
      setFilteredMembers(members);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredMembers(
        teamMembers.filter(
          m => m.name.toLowerCase().includes(query) || 
               m.email.toLowerCase().includes(query) ||
               m.funcao.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredMembers(teamMembers);
    }
  }, [searchQuery, teamMembers]);

  const handleFormChange = (field: string, value: string | boolean | Permissoes | null) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'nivelAcesso') {
        newState.permissoes = getDefaultPermissions(value as TeamMember['nivelAcesso']);
      }
      return newState;
    });
  };

  const handleOpenDialog = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      funcao: member.funcao,
      nivelAcesso: member.nivelAcesso,
      supervisor_id: member.supervisor_id || null,
      manager_id: member.manager_id || null,
      permissoes: member.permissoes,
    });
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
    
    const updatePayload: Record<string, unknown> = {
      full_name: formData.name,
      funcao: formData.funcao,
      nivelAcesso: formData.nivelAcesso,
      permissoes: formData.permissoes,
    };

    if ('supervisor_id' in formData) {
      updatePayload.supervisor_id = formData.supervisor_id;
    }
    if ('manager_id' in formData) {
      updatePayload.manager_id = (formData as any).manager_id;
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
      fetchTeamMembers();
    }
  };

  const handleDeleteMember = async () => {
    if (!window.confirm("Tem certeza que deseja remover este membro? A ação não poderá ser desfeita.")) return;
    toast.error("Funcionalidade em desenvolvimento.", { description: "A remoção de usuários deve ser feita pelo admin do Supabase." });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
          <p className="text-muted-foreground text-sm">Gerencie os usuários do sistema, suas funções e permissões.</p>
        </div>
        {isAdmin && (
          <Button 
            className="flex items-center gap-2"
            onClick={() => setIsCreateUserDialogOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            Criar Usuário
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{teamMembers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {teamMembers.filter(m => m.nivelAcesso === 'Admin').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gestão/Supervisão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {teamMembers.filter(m => m.nivelAcesso === 'Gestão' || m.nivelAcesso === 'Supervisão').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">
              {teamMembers.filter(m => m.nivelAcesso === 'Usuário').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou função..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[35%]">Membro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Gerente</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => {
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
                      <TableCell>{member.supervisorName || '-'}</TableCell>
                              <TableCell>{(member as any).managerName || '-'}</TableCell>
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
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchQuery ? 'Nenhum usuário encontrado para a busca.' : 'Nenhum membro encontrado.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserEditDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        member={editingMember}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={handleSubmit}
        teamMembers={teamMembers}
        onResetPermissions={() =>
          setFormData(prev => ({
            ...prev,
            permissoes: getDefaultPermissions(prev.nivelAcesso),
          }))
        }
        allGroups={groups}
        selectedGroupIds={editingUserGroupIds}
        onToggleGroup={(groupId, checked) => {
          if (!editingMember) return;
          if (checked) {
            addUserToGroup({ userId: editingMember.id, groupId });
          } else {
            removeUserFromGroup({ userId: editingMember.id, groupId });
          }
        }}
      />

      <CreateUserDialog
        open={isCreateUserDialogOpen}
        onOpenChange={setIsCreateUserDialogOpen}
        onUserCreated={fetchTeamMembers}
      />
    </div>
  );
};

export default UsuariosTab;
