// src/pages/Configuracoes/EquipesHierarquiaUnificada.tsx
import React, { useState } from 'react';
import { Users, Building2, Shield, Plus, Trash2, Edit, UserCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useUsersContext } from '@/contexts/UsersContext';
import { useTeams } from '@/hooks/useTeams';
import {
  useTeamMembers,
  useTeamHierarchyFull,
  useTeamCount,
  useDirectSupervisor,
  useAddTeamMember,
  useRemoveTeamMember,
  useUpdateTeamMember,
} from '@/hooks/useTeamHierarchy';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDateSafe } from '@/lib/dateUtils';

const EquipesHierarquiaUnificada: React.FC = () => {
  const { user } = useAuth();
  const { users } = useUsersContext();
  const { teams, loading: teamsLoading, refetch: refetchTeams } = useTeams();
  
  // Estados para Departamentos
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const [isEditTeamDialogOpen, setIsEditTeamDialogOpen] = useState(false);
  const [isEditMemberDialogOpen, setIsEditMemberDialogOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<any>(null);
  const [memberNewNivel, setMemberNewNivel] = useState<string>('Usuário');
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [teamMembersSelected, setTeamMembersSelected] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Estados para Hierarquia
  const [isAddHierarchyDialogOpen, setIsAddHierarchyDialogOpen] = useState(false);
  const [isEditHierarchyDialogOpen, setIsEditHierarchyDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [editingHierarchy, setEditingHierarchy] = useState<any>(null);
  const [hierarchySource, setHierarchySource] = useState<'team' | 'direct'>('direct');

  const { data: teamMembers, isLoading: loadingMembers } = useTeamMembers();
  const { data: fullHierarchy, isLoading: loadingHierarchy } = useTeamHierarchyFull();
  const { data: teamCount } = useTeamCount();
  const { data: mySupervisor } = useDirectSupervisor(user?.id);
  
  const addMemberMutation = useAddTeamMember();
  const removeMemberMutation = useRemoveTeamMember();
  const updateMemberMutation = useUpdateTeamMember();

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getBadgeVariant = (nivel: string | null) => {
    switch (nivel) {
      case 'Admin':
        return 'destructive';
      case 'Gestão':
        return 'default';
      case 'Supervisão':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const canManageTeam = !!user?.isSupervisor || !!user?.isAdmin;

  // Handlers para Departamentos
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('Por favor, insira um nome para o departamento');
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .insert({ name: newTeamName, owner_id: user?.id });
      
      if (error) throw error;
      
      toast.success('Departamento criado com sucesso!');
      setNewTeamName('');
      setIsCreateTeamDialogOpen(false);
      refetchTeams();
    } catch (error) {
      console.error('Erro ao criar departamento:', error);
      toast.error('Erro ao criar departamento');
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam || !editingTeam.name.trim()) {
      toast.error('Por favor, insira um nome válido');
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: editingTeam.name })
        .eq('id', editingTeam.id);
      
      if (error) throw error;
      
      // Sincronizar membros da equipe (tabela team_members)
      try {
        const { data: existingData, error: fetchErr } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', editingTeam.id);

        if (fetchErr) throw fetchErr;

        const existing = (existingData || []).map((d: any) => d.user_id);

        const toAdd = teamMembersSelected.filter(id => !existing.includes(id));
        const toRemove = existing.filter(id => !teamMembersSelected.includes(id));

        if (toRemove.length > 0) {
          await supabase
            .from('team_members')
            .delete()
            .eq('team_id', editingTeam.id)
            .in('user_id', toRemove);
        }

        if (toAdd.length > 0) {
          const inserts = toAdd.map((userId) => ({ team_id: editingTeam.id, user_id: userId }));
          await supabase.from('team_members').insert(inserts);
        }
      } catch (syncErr) {
        console.error('Erro ao sincronizar membros da equipe:', syncErr);
      }

      toast.success('Departamento atualizado com sucesso!');
      setIsEditTeamDialogOpen(false);
      setEditingTeam(null);
      refetchTeams();
    } catch (error) {
      console.error('Erro ao atualizar departamento:', error);
      toast.error('Erro ao atualizar departamento');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Tem certeza que deseja excluir este departamento?')) return;

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      
      if (error) throw error;
      
      toast.success('Departamento excluído com sucesso!');
      refetchTeams();
    } catch (error) {
      console.error('Erro ao excluir departamento:', error);
      toast.error('Erro ao excluir departamento');
    }
  };

  // Handlers para Hierarquia
  const handleAddHierarchy = async () => {
    if (!selectedUserId) {
      toast.error('Selecione um usuário');
      return;
    }

    const supervisorId = hierarchySource === 'direct' ? user?.id : selectedSupervisorId;

    if (!supervisorId) {
      toast.error('Selecione um supervisor');
      return;
    }

    try {
      await addMemberMutation.mutateAsync(selectedUserId);
      toast.success('Membro adicionado à hierarquia!');
      setIsAddHierarchyDialogOpen(false);
      setSelectedUserId('');
      setSelectedSupervisorId('');
      setHierarchySource('direct');
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      toast.error('Erro ao adicionar membro');
    }
  };

  const handleEditHierarchy = async () => {
    if (!editingHierarchy || !selectedSupervisorId) {
      toast.error('Dados inválidos');
      return;
    }

    try {
      await updateMemberMutation.mutateAsync({
        hierarchyId: editingHierarchy.id,
        newSupervisorId: selectedSupervisorId,
      });
      toast.success('Hierarquia atualizada com sucesso!');
      setIsEditHierarchyDialogOpen(false);
      setEditingHierarchy(null);
      setSelectedSupervisorId('');
    } catch (error) {
      console.error('Erro ao atualizar hierarquia:', error);
      toast.error('Erro ao atualizar hierarquia');
    }
  };

  const handleRemoveHierarchy = async (hierarchyId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro da hierarquia?')) return;

    try {
      await removeMemberMutation.mutate(hierarchyId);
      toast.success('Membro removido da hierarquia!');
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error('Erro ao remover membro');
    }
  };

  const openEditHierarchy = (member: any) => {
    setEditingHierarchy(member);
    setSelectedSupervisorId(member.supervisor_id || '');
    setIsEditHierarchyDialogOpen(true);
  };

  const openEditTeam = (team: any) => {
    setEditingTeam({ ...team });
    setIsEditTeamDialogOpen(true);
    if (team?.id) fetchTeamMembers(team.id);
  };

  // Busca membros já vinculados à equipe (tabela `team_members` no Supabase)
  const fetchTeamMembers = async (teamId: string) => {
    setMembersLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);

      if (error) throw error;

      setTeamMembersSelected((data || []).map((d: any) => d.user_id));
    } catch (err) {
      console.error('Erro ao buscar membros da equipe:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  // Filtrar usuários disponíveis
  const availableUsersForHierarchy = users.filter(u => 
    u.id !== user?.id && 
    !teamMembers?.some(tm => tm.user_id === u.id)
  );

  // Filtrar supervisores potenciais (Admin, Gestão, Supervisão)
  const potentialSupervisors = users.filter(u => {
    const derivedIsAdmin = (u as any).isAdmin === true;
    const derivedIsSupervisor = (u as any).isSupervisor === true;
    const legacyRole = ['Admin', 'Gestão', 'Supervisão'].includes(u.nivelAcesso || '');
    return (derivedIsAdmin || derivedIsSupervisor || legacyRole) && u.id !== selectedUserId;
  });

  const isLoading = loadingMembers || loadingHierarchy || teamsLoading;

  if (!user) {
    return (
      <div className="p-6">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipes & Hierarquia</h1>
          <p className="text-gray-600 text-sm">Gerencie departamentos, hierarquia organizacional e permissões</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="departamentos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="departamentos">
            <Building2 className="w-4 h-4 mr-2" />
            Departamentos
          </TabsTrigger>
          <TabsTrigger value="hierarquia">
            <Users className="w-4 h-4 mr-2" />
            Hierarquia de Usuários
          </TabsTrigger>
          <TabsTrigger value="permissoes">
            <Shield className="w-4 h-4 mr-2" />
            Permissões
          </TabsTrigger>
        </TabsList>

        {/* Aba Departamentos */}
        <TabsContent value="departamentos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Departamentos (Equipes)</CardTitle>
                <CardDescription>Gerencie os departamentos da organização</CardDescription>
              </div>
              {(user?.isAdmin || user?.isSupervisor) && (
                <Button onClick={() => setIsCreateTeamDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Departamento
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : teams && teams.length > 0 ? (
                <div className="space-y-3">
                  {teams.map(team => (
                    <div key={team.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{team.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Criado em {formatDateSafe(team.created_at, 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                      {(user?.isAdmin || user?.isSupervisor) && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditTeam(team)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTeam(team.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum departamento cadastrado ainda.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Hierarquia */}
        <TabsContent value="hierarquia" className="space-y-4">
          {/* Cards de Estatísticas */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Equipe Direta</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamMembers?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Subordinados diretos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Equipe Total</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Incluindo subordinados indiretos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Seu Nível</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{user.nivelAcesso || 'Usuário'}</div>
                <p className="text-xs text-muted-foreground">
                  Nível de acesso atual
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Meu Supervisor */}
          {mySupervisor && (
            <Card>
              <CardHeader>
                <CardTitle>Meu Supervisor</CardTitle>
                <CardDescription>Pessoa para quem você reporta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={mySupervisor.avatar_url || ''} />
                    <AvatarFallback>{getInitials(mySupervisor.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{mySupervisor.full_name}</p>
                    <p className="text-sm text-muted-foreground">{mySupervisor.email}</p>
                    {mySupervisor.funcao && (
                      <p className="text-sm text-muted-foreground italic">{mySupervisor.funcao}</p>
                    )}
                  </div>
                  <Badge variant={getBadgeVariant(mySupervisor.nivelAcesso)}>
                    {mySupervisor.nivelAcesso || 'Usuário'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Membros Diretos da Equipe */}
          {canManageTeam && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Membros Diretos da Equipe</CardTitle>
                  <CardDescription>Pessoas que reportam diretamente para você</CardDescription>
                </div>
                <Button onClick={() => setIsAddHierarchyDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Membro
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : teamMembers && teamMembers.length > 0 ? (
                  <div className="space-y-3">
                    {teamMembers.map(member => (
                      <div key={member.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={member.user?.avatar_url || ''} />
                          <AvatarFallback>{getInitials(member.user?.full_name || null)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{member.user?.full_name || 'Sem nome'}</p>
                          <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                          {member.user?.funcao && (
                            <p className="text-sm text-muted-foreground italic">{member.user.funcao}</p>
                          )}
                        </div>
                        <Badge variant={getBadgeVariant(member.user?.nivelAcesso || null)}>
                          {member.user?.nivelAcesso || 'Usuário'}
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditHierarchy(member)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveHierarchy(member.id)}
                            disabled={removeMemberMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Você ainda não tem membros diretos na sua equipe.</p>
                    <p className="text-sm">Clique em "Adicionar Membro" para começar.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Equipe Completa */}
          {fullHierarchy && fullHierarchy.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Equipe Completa (Hierarquia)</CardTitle>
                <CardDescription>
                  Todos os membros sob sua supervisão (incluindo subordinados indiretos)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {fullHierarchy.map(member => (
                    <div key={member.id} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.avatar_url || ''} />
                        <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                      <Badge variant={getBadgeVariant(member.nivelAcesso)} className="text-xs">
                        {member.nivelAcesso || 'Usuário'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Aba Permissões */}
        <TabsContent value="permissoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Níveis de Acesso e Visibilidade</CardTitle>
              <CardDescription>
                Entenda como funciona a hierarquia de visibilidade no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="destructive">Admin</Badge>
                    <p className="font-semibold">Administrador</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    • Acesso total ao sistema<br />
                    • Visualiza todas as atividades de todos os usuários<br />
                    • Pode gerenciar departamentos e hierarquia completa
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">Gestão (Diretoria)</Badge>
                    <p className="font-semibold">Diretor</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    • Visualiza atividades dos gerentes da sua unidade<br />
                    • Gerentes reportam para a diretoria<br />
                    • Pode gerenciar sua equipe e subordinados indiretos
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Supervisão (Gerente)</Badge>
                    <p className="font-semibold">Gerente</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    • Visualiza apenas atividades da gerência do seu diretor<br />
                    • Visualiza seus supervisores diretos<br />
                    • Pode gerenciar sua equipe de supervisores
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Supervisão</Badge>
                    <p className="font-semibold">Supervisor</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    • Visualiza somente seus subordinados diretos<br />
                    • Pode atribuir e gerenciar tarefas da sua equipe<br />
                    • Reporta para um gerente
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Usuário</Badge>
                    <p className="font-semibold">Colaborador</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    • Visualiza apenas suas próprias tarefas<br />
                    • Pode ver informações do seu supervisor<br />
                    • Executa as atividades atribuídas
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 border-l-4 border-primary bg-muted/50">
                <p className="font-semibold mb-2">💡 Regra de Visibilidade Hierárquica:</p>
                <p className="text-sm text-muted-foreground">
                  Cada usuário pode visualizar e gerenciar apenas os usuários que estão abaixo dele na hierarquia organizacional. 
                  Esta estrutura garante que as informações fluam de forma organizada e segura dentro da organização.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Criar Departamento */}
      <Dialog open={isCreateTeamDialogOpen} onOpenChange={setIsCreateTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Departamento</DialogTitle>
            <DialogDescription>
              Crie um novo departamento para organizar sua equipe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Nome do Departamento</Label>
              <Input
                id="teamName"
                placeholder="Ex: Vendas, Marketing, TI..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTeamDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTeam}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Departamento */}
      <Dialog open={isEditTeamDialogOpen} onOpenChange={setIsEditTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Departamento</DialogTitle>
            <DialogDescription>
              Altere o nome do departamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editTeamName">Nome do Departamento</Label>
              <Input
                id="editTeamName"
                value={editingTeam?.name || ''}
                onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Membros da Equipe (opcional)</Label>
              {membersLoading ? (
                <p className="text-sm text-muted-foreground">Carregando membros...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-auto">
                  {users && users.length > 0 ? users.map(u => (
                    <div key={u.id} className="flex items-center justify-between gap-2 p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={teamMembersSelected.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTeamMembersSelected(prev => [...prev, u.id]);
                            } else {
                              setTeamMembersSelected(prev => prev.filter(id => id !== u.id));
                            }
                          }}
                        />
                        <div className="text-sm">
                          <div className="font-medium">{u.full_name || u.email}</div>
                          <div className="text-xs text-muted-foreground">{u.nivelAcesso || 'Usuário'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {teamMembersSelected.includes(u.id) && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => { setMemberToEdit(u); setMemberNewNivel(u.nivelAcesso || 'Usuário'); setIsEditMemberDialogOpen(true); }}>
                              Editar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={async () => {
                              // remover membro imediatamente
                              if (!editingTeam?.id) return;
                              if (!confirm(`Remover ${u.full_name || u.email} deste departamento?`)) return;
                              try {
                                const { error } = await supabase.from('team_members').delete().eq('team_id', editingTeam.id).eq('user_id', u.id);
                                if (error) throw error;
                                setTeamMembersSelected(prev => prev.filter(id => id !== u.id));
                                toast.success('Membro removido da equipe');
                              } catch (err) {
                                console.error('Erro ao remover membro:', err);
                                toast.error('Erro ao remover membro');
                              }
                            }}>
                              Remover
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">Nenhum usuário disponível.</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTeamDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateTeam}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Membro (altera nivelAcesso globalmente) */}
      <Dialog open={isEditMemberDialogOpen} onOpenChange={setIsEditMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
            <DialogDescription>Altere o nível de acesso deste usuário (mudança global).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {memberToEdit ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={memberToEdit.avatar_url || ''} />
                    <AvatarFallback>{getInitials(memberToEdit.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{memberToEdit.full_name}</p>
                    <p className="text-sm text-muted-foreground">{memberToEdit.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nível de Acesso</Label>
                  <Select value={memberNewNivel} onValueChange={(v: string) => setMemberNewNivel(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Usuário">Usuário</SelectItem>
                      <SelectItem value="Supervisão">Supervisão</SelectItem>
                      <SelectItem value="Gestão">Gestão</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <p>Nenhum membro selecionado.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditMemberDialogOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!memberToEdit) return;
              try {
                const { error } = await supabase.from('profiles').update({ nivelAcesso: memberNewNivel }).eq('id', memberToEdit.id);
                if (error) throw error;
                toast.success('Nível de acesso atualizado');
                // refresh users list
                refetchTeams && refetchTeams();
                setIsEditMemberDialogOpen(false);
              } catch (err) {
                console.error('Erro ao atualizar nível:', err);
                toast.error('Erro ao atualizar nível de acesso');
              }
            }}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar à Hierarquia */}
      <Dialog open={isAddHierarchyDialogOpen} onOpenChange={setIsAddHierarchyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro à Hierarquia</DialogTitle>
            <DialogDescription>
              Adicione um usuário à hierarquia organizacional
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Vinculação</Label>
              <Select value={hierarchySource} onValueChange={(v: 'team' | 'direct') => setHierarchySource(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direto para mim</SelectItem>
                  <SelectItem value="team">Para outro supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsersForHierarchy.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.nivelAcesso || 'Usuário'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hierarchySource === 'team' && (
              <div className="space-y-2">
                <Label>Supervisor</Label>
                <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {potentialSupervisors.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email} ({u.nivelAcesso})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddHierarchyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddHierarchy} disabled={addMemberMutation.isPending}>
              {addMemberMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Hierarquia */}
      <Dialog open={isEditHierarchyDialogOpen} onOpenChange={setIsEditHierarchyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Hierarquia</DialogTitle>
            <DialogDescription>
              Altere o supervisor deste membro
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Membro</Label>
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={editingHierarchy?.user?.avatar_url || ''} />
                  <AvatarFallback>{getInitials(editingHierarchy?.user?.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{editingHierarchy?.user?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{editingHierarchy?.user?.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Novo Supervisor</Label>
              <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {potentialSupervisors.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.nivelAcesso})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditHierarchyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditHierarchy} disabled={updateMemberMutation.isPending}>
              {updateMemberMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipesHierarquiaUnificada;
