// src/pages/Configuracoes/GerenciarEquipes.tsx
import React, { useState } from 'react';
import { Users, Plus, Trash2, UserCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useUsersContext } from '@/contexts/UsersContext';
import {
  useTeamMembers,
  useTeamHierarchyFull,
  useTeamCount,
  useDirectSupervisor,
  useAddTeamMember,
  useRemoveTeamMember,
} from '@/hooks/useTeamHierarchy';
import { Skeleton } from '@/components/ui/skeleton';

const GerenciarEquipesPage: React.FC = () => {
  const { user } = useAuth();
  const { users } = useUsersContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { data: teamMembers, isLoading: loadingMembers } = useTeamMembers();
  const { data: fullHierarchy, isLoading: loadingHierarchy } = useTeamHierarchyFull();
  const { data: teamCount } = useTeamCount();
  const { data: mySupervisor } = useDirectSupervisor(user?.id);
  
  const addMemberMutation = useAddTeamMember();
  const removeMemberMutation = useRemoveTeamMember();

  const handleAddMember = () => {
    if (selectedUserId) {
      addMemberMutation.mutate(selectedUserId, {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          setSelectedUserId('');
        },
      });
    }
  };

  const handleRemoveMember = (hierarchyId: string) => {
    if (confirm('Tem certeza que deseja remover este membro da sua equipe?')) {
      removeMemberMutation.mutate(hierarchyId);
    }
  };

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

  // Filtrar usuários disponíveis (que não estão na equipe e não são o próprio usuário)
  const availableUsers = users.filter(u => 
    u.id !== user?.id && 
    !teamMembers?.some(tm => tm.user_id === u.id)
  );

  const isLoading = loadingMembers || loadingHierarchy;

  if (!user) {
    return (
      <div className="p-6">
        <p>Carregando...</p>
      </div>
    );
  }

  const canManageTeam = user.nivelAcesso === 'Admin' || 
                        user.nivelAcesso === 'Gestão' || 
                        user.nivelAcesso === 'Supervisão';

  if (!canManageTeam) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Minha Equipe</h1>
            <p className="text-gray-600 text-sm">Visualize sua estrutura organizacional</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações da Equipe</CardTitle>
            <CardDescription>Sua posição na hierarquia organizacional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mySupervisor && (
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={mySupervisor.avatar_url || ''} />
                  <AvatarFallback>{getInitials(mySupervisor.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Seu supervisor:</p>
                  </div>
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
            )}
            
            {!mySupervisor && (
              <div className="text-center p-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Você não está vinculado a nenhum supervisor no momento.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciar Equipe</h1>
            <p className="text-gray-600 text-sm">Configure a hierarquia e gerencie sua equipe</p>
          </div>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Membro
        </Button>
      </div>

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
      <Card>
        <CardHeader>
          <CardTitle>Membros Diretos da Equipe</CardTitle>
          <CardDescription>Pessoas que reportam diretamente para você</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={removeMemberMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
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

      {/* Equipe Completa (Hierarquia) */}
      {fullHierarchy && fullHierarchy.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Equipe Completa (Hierarquia)</CardTitle>
            <CardDescription>Todos os membros sob sua supervisão (incluindo subordinados indiretos)</CardDescription>
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

      {/* Dialog Adicionar Membro */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
            <DialogDescription>
              Selecione um usuário para adicionar à sua equipe. Você se tornará o supervisor direto desta pessoa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex items-center gap-2">
                      <span>{u.full_name || u.email}</span>
                      <span className="text-xs text-muted-foreground">
                        ({u.nivelAcesso || 'Usuário'})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddMember} 
              disabled={!selectedUserId || addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GerenciarEquipesPage;
