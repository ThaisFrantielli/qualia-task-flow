// Aba de Departamentos - Migrada de ConfiguracoesEquipes/DepartamentosTab
import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Edit, Users as UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [editingTeam, setEditingTeam] = useState<{ id: string; name: string; description?: string | null } | null>(null);
  const [teamMembersSelected, setTeamMembersSelected] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [teamMemberCounts, setTeamMemberCounts] = useState<Record<string, number>>({});
  
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (teams && teams.length > 0) {
      const fetchMemberCounts = async () => {
        const counts: Record<string, number> = {};
        for (const team of teams) {
          const { count, error } = await supabase
            .from('team_members')
            .select('user_id', { count: 'exact', head: true })
            .eq('team_id', team.id);
          
          if (!error && count !== null) {
            counts[team.id] = count;
          }
        }
        setTeamMemberCounts(counts);
      };
      fetchMemberCounts();
    }
  }, [teams]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast({ title: 'Erro', description: 'O nome da equipe é obrigatório.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('teams').insert({
        name: newTeamName.trim(),
        description: newTeamDescription.trim() || null,
        owner_id: user?.id,
      });

      if (error) throw error;

      toast({ title: 'Sucesso!', description: `Equipe "${newTeamName}" criada com sucesso.` });
      setNewTeamName('');
      setNewTeamDescription('');
      setIsCreateDialogOpen(false);
      refetch();
    } catch (error) {
      const err = error as Error;
      toast({ title: 'Erro ao Criar Equipe', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTeam = async () => {
    if (!editingTeam || !editingTeam.name.trim()) {
      toast({ title: 'Erro', description: 'O nome da equipe é obrigatório.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: editingTeam.name.trim(), description: editingTeam.description?.trim() || null })
        .eq('id', editingTeam.id);

      if (error) throw error;

      // Sync team members
      const { data: existingData, error: fetchErr } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', editingTeam.id);

      if (!fetchErr) {
        const existing = (existingData || []).map((d: { user_id: string }) => d.user_id);
        const toAdd = teamMembersSelected.filter(id => !existing.includes(id));
        const toRemove = existing.filter(id => !teamMembersSelected.includes(id));

        if (toRemove.length > 0) {
          await supabase.from('team_members').delete().eq('team_id', editingTeam.id).in('user_id', toRemove);
        }

        if (toAdd.length > 0) {
          const inserts = toAdd.map((userId) => ({ team_id: editingTeam.id, user_id: userId }));
          await supabase.from('team_members').insert(inserts);
        }
      }

      toast({ title: 'Sucesso!', description: `Equipe "${editingTeam.name}" atualizada com sucesso.` });
      setIsEditDialogOpen(false);
      setEditingTeam(null);
      refetch();
    } catch (error) {
      const err = error as Error;
      toast({ title: 'Erro ao Editar Equipe', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Tem certeza que deseja deletar a equipe "${teamName}"?`)) return;

    try {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;
      toast({ title: 'Equipe Deletada', description: `A equipe "${teamName}" foi removida.` });
      refetch();
    } catch (error) {
      const err = error as Error;
      toast({ title: 'Erro ao Deletar', description: err.message, variant: 'destructive' });
    }
  };

  const openEditDialog = async (team: { id: string; name: string; description?: string | null }) => {
    setEditingTeam({ ...team });
    setIsEditDialogOpen(true);
    setMembersLoading(true);
    try {
      const { data, error } = await supabase.from('team_members').select('user_id').eq('team_id', team.id);
      if (!error) setTeamMembersSelected((data || []).map((d: { user_id: string }) => d.user_id));
    } catch {
      // ignore
    } finally {
      setMembersLoading(false);
    }
  };

  if (!user) return <div className="p-6"><p>Carregando...</p></div>;

  const isAdmin = !!user?.isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Departamentos/Equipes</h2>
          <p className="text-muted-foreground text-sm">Crie e organize as equipes da sua organização</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Equipe
          </Button>
        )}
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-blue-600 mt-1" />
            <div className="space-y-2 text-sm">
              <p><strong>Equipes/Departamentos</strong> são unidades organizacionais (Marketing, TI, Vendas, etc).</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Use equipes para organizar projetos por departamento</li>
                <li>Projetos podem ser vinculados a uma equipe específica</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Equipes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{teams?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

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
                    <div className="h-5 bg-muted rounded w-1/3 animate-pulse" />
                    <div className="h-4 bg-muted/50 rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : teams && teams.length > 0 ? (
            <div className="space-y-3">
              {teams.map(team => (
                <div 
                  key={team.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{team.name}</h3>
                        {teamMemberCounts[team.id] !== undefined && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            <UsersIcon className="w-3 h-3" />
                            {teamMemberCounts[team.id]}
                          </span>
                        )}
                      </div>
                      {team.description && (
                        <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
                      )}
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(team)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
              <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma Equipe Cadastrada</h3>
              <p className="text-muted-foreground mb-6">
                {isAdmin ? 'Comece criando sua primeira equipe.' : 'Aguarde um administrador criar as equipes.'}
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

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Equipe/Departamento</DialogTitle>
            <DialogDescription>Adicione uma nova equipe à sua organização.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Nome da Equipe *</Label>
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Ex: Marketing, TI, Vendas..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="team-description">Descrição (Opcional)</Label>
              <Textarea
                id="team-description"
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
                placeholder="Descreva o propósito desta equipe..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateTeam} disabled={isSubmitting || !newTeamName.trim()}>
              {isSubmitting ? 'Criando...' : 'Criar Equipe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Equipe/Departamento</DialogTitle>
            <DialogDescription>Atualize as informações da equipe.</DialogDescription>
          </DialogHeader>
          
          {editingTeam && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label>Nome da Equipe *</Label>
                  <Input
                    value={editingTeam.name}
                    onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                    placeholder="Ex: Comercial..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Descrição (Opcional)</Label>
                  <Textarea
                    value={editingTeam.description || ''}
                    onChange={(e) => setEditingTeam({ ...editingTeam, description: e.target.value })}
                    placeholder="Descrição da equipe..."
                    rows={2}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Membros da Equipe</Label>
                  {membersLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando membros...</p>
                  ) : (
                    <div className="border rounded-lg p-3 max-h-60 overflow-auto space-y-2">
                      {users.map(u => (
                        <div
                          key={u.id}
                          className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            setTeamMembersSelected(prev =>
                              prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                            );
                          }}
                        >
                          <Checkbox
                            checked={teamMembersSelected.includes(u.id)}
                            onCheckedChange={(checked) => {
                              setTeamMembersSelected(prev =>
                                checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                              );
                            }}
                          />
                          <span className="text-sm">{u.full_name || u.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditTeam} disabled={isSubmitting || !editingTeam?.name.trim()}>
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartamentosTab;
