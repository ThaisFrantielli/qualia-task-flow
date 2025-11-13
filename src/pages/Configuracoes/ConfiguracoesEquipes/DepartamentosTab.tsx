// src/pages/Configuracoes/ConfiguracoesEquipes/DepartamentosTab.tsx
import React, { useState } from 'react';
import { Building2, Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams } from '@/hooks/useTeams';
import { useToast } from '@/hooks/use-toast';
import { useUsersContext } from '@/contexts/UsersContext';
import { supabase } from '@/integrations/supabase/client';

const DepartamentosTab: React.FC = () => {
  const { user } = useAuth();
  const { teams, loading: isLoading, refetch } = useTeams();
  const { users } = useUsersContext();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [teamMembersSelected, setTeamMembersSelected] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast({ 
        title: 'Erro', 
        description: 'O nome da equipe é obrigatório.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('teams')
        .insert({
          name: newTeamName.trim(),
          description: newTeamDescription.trim() || null,
          owner_id: user?.id,
        });

      if (error) throw error;

      toast({ 
        title: 'Sucesso!', 
        description: `Equipe "${newTeamName}" criada com sucesso.` 
      });
      
      setNewTeamName('');
      setNewTeamDescription('');
      setIsCreateDialogOpen(false);
      refetch();
    } catch (error: any) {
      console.error('Erro ao criar equipe:', error);
      toast({ 
        title: 'Erro ao Criar Equipe', 
        description: error.message || 'Não foi possível criar a equipe.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTeam = async () => {
    if (!editingTeam || !editingTeam.name.trim()) {
      toast({ 
        title: 'Erro', 
        description: 'O nome da equipe é obrigatório.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: editingTeam.name.trim(),
          description: editingTeam.description?.trim() || null,
        })
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

      toast({ 
        title: 'Sucesso!', 
        description: `Equipe "${editingTeam.name}" atualizada com sucesso.` 
      });

      setIsEditDialogOpen(false);
      setEditingTeam(null);
      refetch();
    } catch (error: any) {
      console.error('Erro ao editar equipe:', error);
      toast({ 
        title: 'Erro ao Editar Equipe', 
        description: error.message || 'Não foi possível editar a equipe.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Tem certeza que deseja deletar a equipe "${teamName}"?\n\nISTO NÃO DELETARÁ os projetos, apenas removerá o vínculo com a equipe.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      toast({ 
        title: 'Equipe Deletada', 
        description: `A equipe "${teamName}" foi removida.` 
      });
      
      refetch();
    } catch (error: any) {
      console.error('Erro ao deletar equipe:', error);
      toast({ 
        title: 'Erro ao Deletar', 
        description: error.message || 'Não foi possível deletar a equipe.', 
        variant: 'destructive' 
      });
    }
  };

  const openEditDialog = (team: any) => {
    setEditingTeam({ ...team });
    setIsEditDialogOpen(true);
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

  if (!user) {
    return <div className="p-6"><p>Carregando...</p></div>;
  }

  const isAdmin = user.nivelAcesso === 'Admin';

  return (
    <div className="space-y-6">
      {/* Header da Tab */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Departamentos/Equipes</h2>
          <p className="text-gray-500 text-sm">Crie e organize as equipes da sua organização</p>
        </div>
        
        {isAdmin && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Equipe
          </Button>
        )}
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">
                <strong>Equipes/Departamentos</strong> são unidades organizacionais da sua empresa 
                (Marketing, TI, Vendas, etc).
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>Use equipes para organizar projetos por departamento</li>
                <li>Projetos podem ser vinculados a uma equipe específica</li>
                <li>A privacidade "Equipe" mostra o projeto apenas para membros da equipe</li>
                <li>Diferentes de "Membros do Projeto" (papéis específicos de cada projeto)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total de Equipes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{teams?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Equipes */}
      <Card>
        <CardHeader>
          <CardTitle>Equipes Cadastradas</CardTitle>
          <CardDescription>
            {isAdmin ? 'Gerencie as equipes da organização' : 'Visualize as equipes disponíveis'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : teams && teams.length > 0 ? (
            <div className="space-y-3">
              {teams.map(team => (
                <div 
                  key={team.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{team.name}</h3>
                      {team.description && (
                        <p className="text-sm text-gray-500 mt-1">{team.description}</p>
                      )}
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(team)}
                        title="Editar equipe"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Deletar equipe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma Equipe Cadastrada
              </h3>
              <p className="text-gray-500 mb-6">
                {isAdmin 
                  ? 'Comece criando sua primeira equipe/departamento.' 
                  : 'Aguarde um administrador criar as equipes.'}
              </p>
              {isAdmin && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Equipe
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Criar Equipe */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Equipe/Departamento</DialogTitle>
            <DialogDescription>
              Adicione uma nova equipe à sua organização (ex: Marketing, TI, Vendas).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Nome da Equipe *</Label>
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Ex: Marketing, TI, Vendas, Suporte..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="team-description">Descrição (Opcional)</Label>
              <Textarea
                id="team-description"
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
                placeholder="Descreva o propósito e responsabilidades desta equipe..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewTeamName('');
                setNewTeamDescription('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateTeam}
              disabled={isSubmitting || !newTeamName.trim()}
            >
              {isSubmitting ? 'Criando...' : 'Criar Equipe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Equipe */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Equipe/Departamento</DialogTitle>
            <DialogDescription>
              Atualize as informações da equipe.
            </DialogDescription>
          </DialogHeader>
          
          {editingTeam && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-team-name">Nome da Equipe *</Label>
                <Input
                  id="edit-team-name"
                  value={editingTeam.name}
                  onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                  placeholder="Ex: Marketing, TI, Vendas..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-team-description">Descrição (Opcional)</Label>
                <Textarea
                  id="edit-team-description"
                  value={editingTeam.description || ''}
                  onChange={(e) => setEditingTeam({ ...editingTeam, description: e.target.value })}
                  placeholder="Descreva o propósito e responsabilidades..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Membros da Equipe (opcional)</Label>
                {membersLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando membros...</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-auto">
                    {users && users.length > 0 ? users.map(u => (
                      <label key={u.id} className="flex items-center gap-2 p-2 border rounded">
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
                        <span className="text-sm">{u.full_name || u.email}</span>
                      </label>
                    )) : (
                      <p className="text-sm text-muted-foreground">Nenhum usuário disponível.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingTeam(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEditTeam}
              disabled={isSubmitting || !editingTeam?.name.trim()}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartamentosTab;
