// Aba de Hierarquia - Migrada de ConfiguracoesEquipes/HierarquiaTab
import React, { useState, useMemo } from 'react';
import { Users, Plus, Trash2, UserCheck, ArrowRight, Edit, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import UserEditDialog from './components/UserEditDialog';
import { useGroups } from '@/hooks/useGroups';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUsersContext } from '@/contexts/UsersContext';
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
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const HierarquiaTab: React.FC = () => {
  const { user } = useAuth();
  const { users } = useUsersContext();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'gerente' | 'supervisor' | 'usuario'>('gerente');
  const [viewTargetId, setViewTargetId] = useState<string | null>(null);

  const effectiveViewId = useMemo(() => {
    if (viewMode === 'gerente') return selectedManagerId || user?.id || null;
    if (viewMode === 'supervisor') return viewTargetId || user?.id || null;
    return viewTargetId || user?.id || null; // usuario mode - inspect this user
  }, [viewMode, selectedManagerId, viewTargetId, user?.id]);

  const { data: teamMembers, isLoading: loadingMembers } = useTeamMembers(effectiveViewId);
  const { data: fullHierarchy, isLoading: loadingHierarchy } = useTeamHierarchyFull(effectiveViewId || undefined);
  const { data: teamCount } = useTeamCount();
  const { data: mySupervisor } = useDirectSupervisor(user?.id);
  
  const addMemberMutation = useAddTeamMember();
  const removeMemberMutation = useRemoveTeamMember();
  const updateSupervisorMutation = useUpdateTeamMember();

  // user edit modal state (reuse same dialog used in UsuariosTab)
  const { groups, addUserToGroup, removeUserFromGroup, useUserGroupsQuery } = useGroups();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const initialFormData = {
    name: '',
    email: '',
    funcao: '',
    nivelAcesso: 'Usuário',
    supervisor_id: null,
    manager_id: null,
    permissoes: {
      dashboard: true,
      kanban: true,
      tasks: true,
      crm: false,
      projects: false,
      team: false,
      settings: false,
    },
  } as any;
  const getDefaultPermissions = (nivel: string) => {
    const base = { dashboard: true, kanban: true, tasks: true, crm: false, projects: false, team: false, settings: false };
    switch (nivel) {
      case 'Admin': return { dashboard: true, kanban: true, tasks: true, crm: true, projects: true, team: true, settings: true };
      case 'Gestão': return { ...base, projects: true, team: true, crm: true };
      case 'Supervisão': return { ...base, projects: true };
      default: return base;
    }
  };
  const [formData, setFormData] = useState(initialFormData);

  const currentEditingUserId = editingMember?.id || null;
  const { data: editingUserGroupIds = [] } = useUserGroupsQuery(currentEditingUserId);

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'nivelAcesso') newState.permissoes = getDefaultPermissions(value);
      return newState;
    });
  };

  const handleOpenDialogForId = async (id: string) => {
    try {
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      const memberObj = {
        id,
        name: profile?.full_name || profile?.email || 'Sem nome',
        email: profile?.email || '',
        funcao: profile?.funcao || '',
        nivelAcesso: profile?.nivelAcesso || 'Usuário',
        permissoes: profile?.permissoes || getDefaultPermissions(profile?.nivelAcesso || 'Usuário'),
        supervisor_id: profile?.supervisor_id || null,
        manager_id: profile?.manager_id || null,
      };
      setEditingMember(memberObj);
      setFormData({
        name: memberObj.name,
        email: memberObj.email,
        funcao: memberObj.funcao,
        nivelAcesso: memberObj.nivelAcesso,
        supervisor_id: memberObj.supervisor_id,
        manager_id: memberObj.manager_id,
        permissoes: memberObj.permissoes,
      });
      setIsDialogOpen(true);
    } catch (err: any) {
      console.error('Erro ao abrir editor', err);
      toast.error('Erro ao carregar dados do usuário');
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMember(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async () => {
    if (!editingMember) return;
    if (!formData.name || !formData.name.trim()) { toast.error('O nome é obrigatório.'); return; }
    const updatePayload: any = {
      full_name: formData.name,
      funcao: formData.funcao,
      nivelAcesso: formData.nivelAcesso,
      permissoes: formData.permissoes,
    };
    if ('supervisor_id' in formData) updatePayload.supervisor_id = formData.supervisor_id;
    if ('manager_id' in formData) updatePayload.manager_id = formData.manager_id;
    try {
      const { error } = await supabase.from('profiles').update(updatePayload).eq('id', editingMember.id);
      if (error) throw error;
      toast.success('Membro atualizado com sucesso!');
      handleCloseDialog();
      // refresh hierarchy and invalidate users cache so other screens refresh
      const childrenResult = await loadHierarchyTree(effectiveViewId as string | null);
      try { queryClient.invalidateQueries(['users']); } catch(e) { /* ignore */ }

      // expand path to the updated node and focus it
      const newChildren = childrenResult?.children || childrenMap;
      const parentMap: Record<string, string> = {};
      Object.entries(newChildren || {}).forEach(([parentId, arr]) => {
        (arr as string[]).forEach((childId) => { parentMap[childId] = parentId; });
      });

      const nodeId = editingMember.id;
      const toExpand: Record<string, boolean> = {};
      let cur = nodeId;
      while (cur && cur !== (effectiveViewId as string | null)) {
        const p = parentMap[cur];
        if (!p) break;
        toExpand[p] = true;
        cur = p;
      }
      setExpandedIds(prev => ({ ...prev, ...toExpand }));
      setSelectedNodeId(nodeId);
      setTimeout(() => {
        try {
          const el = document.getElementById(`node-${nodeId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (el && typeof (el as HTMLElement).focus === 'function') (el as HTMLElement).focus();
        } catch(e) { /* ignore */ }
      }, 200);
    } catch (err: any) {
      toast.error('Erro ao salvar alterações', { description: String(err?.message || err) });
    }
  };

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingHierarchyItem, setEditingHierarchyItem] = useState<{ id: string; supervisor_id?: string } | null>(null);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');

  const handleAddMember = () => {
    if (selectedUserId) {
      addMemberMutation.mutate(selectedUserId, {
        onSuccess: async (data: { id: string }) => {
          try {
            const supervisorToUse = selectedSupervisorId || user?.id || '';
            if (supervisorToUse && supervisorToUse !== (user?.id || '')) {
              await updateSupervisorMutation.mutateAsync({ hierarchyId: data.id, newSupervisorId: supervisorToUse });
            }
          } catch {
            // errors handled by hooks
          }
          setIsAddDialogOpen(false);
          setSelectedUserId('');
          setSelectedSupervisorId('');
        }
      });
    }
  };

  const handleRemoveMember = (hierarchyId: string) => {
    if (confirm('Tem certeza que deseja remover este membro da sua equipe?')) {
      removeMemberMutation.mutate(hierarchyId);
    }
  };

  const openEditSupervisorDialog = (item: { id: string; supervisor_id?: string }) => {
    setEditingHierarchyItem(item);
    setSelectedSupervisorId(item.supervisor_id || user?.id || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateSupervisor = async () => {
    if (!editingHierarchyItem) return;
    try {
      await updateSupervisorMutation.mutateAsync({ hierarchyId: editingHierarchyItem.id, newSupervisorId: selectedSupervisorId });
      setIsEditDialogOpen(false);
      setEditingHierarchyItem(null);
      setSelectedSupervisorId('');
    } catch {
      // errors handled by hook
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Hierarchy tree state
  const [hierarchyProfiles, setHierarchyProfiles] = React.useState<Record<string, any>>({});
  const [childrenMap, setChildrenMap] = React.useState<Record<string, string[]>>({});
  const [roots, setRoots] = React.useState<string[]>([]);
  const [treeLoading, setTreeLoading] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Record<string, boolean>>({});
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<{ full_name?: string; funcao?: string; nivelAcesso?: string; supervisor_id?: string | null; manager_id?: string | null }>({});

  const expandAll = () => {
    const allIds = Object.keys(hierarchyProfiles);
    const newMap: Record<string, boolean> = {};
    allIds.forEach(id => { newMap[id] = true; });
    setExpandedIds(newMap);
  };

  const collapseAll = () => setExpandedIds({});

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const loadHierarchyTree = async (managerId: string | null) => {
    if (!managerId) {
      setHierarchyProfiles({});
      setChildrenMap({});
      setRoots([]);
      return { children: {}, profilesById: {}, rootIds: [], managerId: null };
    }
    setTreeLoading(true);
    try {
      const { data: idsData, error: idsErr } = await supabase.rpc('get_subordinates_of_manager', { manager_id: managerId });
      if (idsErr) throw idsErr;
      const ids: string[] = Array.isArray(idsData)
        ? idsData.map((it: any) => (typeof it === 'string' ? it : (it.id || it.team_member_id || String(it))))
        : [];

      // Fetch relations and profiles
      const relRes = await supabase.from('user_hierarchy').select('user_id, supervisor_id').in('user_id', ids);
      const relData = relRes.data || [];

      const profileIds = Array.from(new Set([...ids, managerId]));
      const profilesRes = await supabase.from('profiles').select('id, full_name, avatar_url, email, nivelAcesso, funcao').in('id', profileIds);
      const profiles = profilesRes.data || [];

      const profilesById: Record<string, any> = {};
      profiles.forEach((p: any) => { profilesById[p.id] = p; });

      const children: Record<string, string[]> = {};
      relData.forEach((r: any) => {
        if (!children[r.supervisor_id]) children[r.supervisor_id] = [];
        children[r.supervisor_id].push(r.user_id);
      });
      const rootIds = children[managerId] || [];

      // Prefer rendering the manager as the top node so the tree shows the manager + its subordinates
      const rootsToSet = profilesById[managerId] ? [managerId] : rootIds;

      setHierarchyProfiles(profilesById);
      setChildrenMap(children);
      setRoots(rootsToSet);
      // initialize expanded for manager (if present)
      if (managerId) setExpandedIds({ [managerId]: true });

      return { children, profilesById, rootIds, managerId };
    } catch (e) {
      console.error('Erro ao carregar hierarquia', e);
    } finally {
      setTreeLoading(false);
    }
  };

  React.useEffect(() => {
    loadHierarchyTree(effectiveViewId as string | null);
  }, [effectiveViewId]);

  const getBadgeVariant = (nivel: string | null): 'destructive' | 'default' | 'secondary' | 'outline' => {
    switch (nivel) {
      case 'Admin': return 'destructive';
      case 'Gestão': return 'default';
      case 'Supervisão': return 'secondary';
      default: return 'outline';
    }
  };

  // Render tree node recursively em formato de "fluxograma" vertical
  const renderTreeNode = (id: string, depth: number) => {
    const profile = hierarchyProfiles[id];
    if (!profile) return null;
    const children = childrenMap[id] || [];
    const isExpanded = !!expandedIds[id];
    const isSelected = selectedNodeId === id;

    const borderClass = depth === 0
      ? 'border-primary/40 bg-primary/5'
      : depth === 1
      ? 'border-blue-200 bg-background'
      : 'border-border bg-card';

    return (
      <div
        key={id}
        id={`node-${id}`}
        tabIndex={-1}
        className={depth === 0 ? 'relative flex flex-col items-center' : 'relative ml-4'}
      >
        {/* Linha vertical que conecta os níveis */}
        {depth > 0 && (
          <div className="absolute -left-3 top-0 bottom-0 w-px bg-border" />
        )}

        {/* Caixinha do nó */}
        <div
          className={`inline-flex items-center gap-3 px-3 py-2 rounded-xl border shadow-sm cursor-pointer transition-all min-w-[240px] ${borderClass} ${isSelected ? 'ring-2 ring-primary/40' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleExpanded(id); setSelectedNodeId(id); }}
        >
          {children.length > 0 ? (
            <button
              onClick={(ev) => { ev.stopPropagation(); toggleExpanded(id); }}
              className="text-muted-foreground"
              title={isExpanded ? 'Recolher' : 'Expandir'}
              aria-label={isExpanded ? 'Recolher' : 'Expandir'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <Avatar className="w-8 h-8">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-tight">{profile.full_name}</span>
            <span className="text-[11px] text-muted-foreground leading-tight">{profile.funcao || profile.email}</span>
          </div>
          <Badge variant={getBadgeVariant(profile.nivelAcesso)} className="text-[10px] ml-1">
            {profile.nivelAcesso || 'Usuário'}
          </Badge>
          {/* Ações rápidas no nó */}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={(ev) => { ev.stopPropagation(); handleOpenDialogForId(id); }} title="Editar usuário">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(ev) => { ev.stopPropagation(); handleRemoveMember(id); }} title="Remover membro">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Filhos alinhados em coluna, com borda lateral para parecer árvore */}
        {children.length > 0 && (
          <div
            className={`mt-3 ml-8 space-y-3 border-l pl-6 ${isExpanded ? 'block' : 'hidden'}`}
          >
            {children.map(childId => renderTreeNode(childId, depth + 1))}
          </div>
        )}

        {/* Inline editor: aparece abaixo do nó quando em edição */}
        {editingNodeId === id && (
          <div className="mt-3 ml-8 p-3 bg-background border rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Label>Nome</Label>
                <Input value={editForm.full_name || ''} onChange={(e) => setEditForm(s => ({ ...s, full_name: e.target.value }))} />
              </div>
              <div>
                <Label>Função</Label>
                <Input value={editForm.funcao || ''} onChange={(e) => setEditForm(s => ({ ...s, funcao: e.target.value }))} />
              </div>
              <div>
                <Label>Nível de Acesso</Label>
                <Select value={editForm.nivelAcesso || 'Usuário'} onValueChange={(v) => setEditForm(s => ({ ...s, nivelAcesso: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nível" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Usuário">Usuário</SelectItem>
                    <SelectItem value="Supervisão">Supervisão</SelectItem>
                    <SelectItem value="Gestão">Gestão</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Supervisor</Label>
                <Select value={editForm.supervisor_id || 'none'} onValueChange={(v) => setEditForm(s => ({ ...s, supervisor_id: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Supervisor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button onClick={async () => {
                try {
                  const payload: any = {
                    full_name: editForm.full_name,
                    funcao: editForm.funcao,
                    nivelAcesso: editForm.nivelAcesso,
                    supervisor_id: editForm.supervisor_id,
                    manager_id: editForm.manager_id,
                  };
                  const { error } = await supabase.from('profiles').update(payload).eq('id', id);
                  if (error) throw error;
                  setHierarchyProfiles(prev => ({ ...prev, [id]: { ...prev[id], ...payload } }));
                  toast.success('Usuário atualizado com sucesso');
                  setEditingNodeId(null);
                } catch (err: any) {
                  toast.error('Erro ao atualizar usuário', { description: String(err?.message || err) });
                }
              }}>Salvar</Button>
              <Button variant="outline" onClick={() => setEditingNodeId(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render the UserEditDialog modal (shared with UsuariosTab)
  

  const availableUsers = users.filter(u => 
    u.id !== (effectiveViewId || user?.id) && 
    !teamMembers?.some(tm => tm.user_id === u.id)
  );

  const isLoading = loadingMembers || loadingHierarchy;

  if (!user) {
    return <div className="p-6"><p>Carregando...</p></div>;
  }

  const canManageTeam = !!user?.isSupervisor || !!user?.isAdmin;

  if (!canManageTeam) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Minha Equipe</h2>
          <p className="text-muted-foreground text-sm">Visualize sua estrutura organizacional</p>
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Hierarquia e Equipe</h2>
          <p className="text-muted-foreground text-sm">Configure a hierarquia e gerencie as equipes</p>
        </div>
        <div className="ml-auto sticky top-4 bg-background z-10 p-3 rounded-md shadow-sm border">
          <div className="flex items-center gap-3">
          <Select value={viewMode} onValueChange={(v) => { setViewMode(v as any); setViewTargetId(null); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Visualização" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gerente">Por Gerente</SelectItem>
              <SelectItem value="supervisor">Por Supervisor</SelectItem>
              <SelectItem value="usuario">Por Usuário</SelectItem>
            </SelectContent>
          </Select>

          {viewMode === 'gerente' && (
            <Select
              value={selectedManagerId || user.id}
              onValueChange={(value) => setSelectedManagerId(value === user.id ? null : value)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Selecione o gerente base" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={user.id}>Eu (minha equipe)</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {viewMode === 'supervisor' && (
            <Select value={viewTargetId || 'none'} onValueChange={(v) => setViewTargetId(v === 'none' ? null : v)}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Selecione um supervisor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (minha visão)</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {viewMode === 'usuario' && (
            <Select value={viewTargetId || 'none'} onValueChange={(v) => setViewTargetId(v === 'none' ? null : v)}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione um usuário</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Adicionar Membro agora está no card de Hierarquia */}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="col-span-3 flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={expandAll}>Expandir Tudo</Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>Recolher Tudo</Button>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted/20 rounded-md"><Users className="h-4 w-4 text-muted-foreground" /></div>
              <CardTitle className="text-sm font-medium">Equipe Direta</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Subordinados diretos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted/20 rounded-md"><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
              <CardTitle className="text-sm font-medium">Equipe Total</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamCount || 0}</div>
            <p className="text-xs text-muted-foreground">Incluindo subordinados indiretos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted/20 rounded-md"><UserCheck className="h-4 w-4 text-muted-foreground" /></div>
              <CardTitle className="text-sm font-medium">Seu Nível</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.nivelAcesso || 'Usuário'}</div>
            <p className="text-xs text-muted-foreground">Nível de acesso atual</p>
          </CardContent>
        </Card>
      </div>

      {mySupervisor && (
        <Card>
          <CardHeader>
            <CardTitle>Meu Supervisor</CardTitle>
            <CardDescription>Pessoa para quem você reporta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border">
              <Avatar className="w-12 h-12">
                <AvatarImage src={mySupervisor.avatar_url || ''} />
                <AvatarFallback>{getInitials(mySupervisor.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{mySupervisor.full_name}</p>
                <p className="text-sm text-muted-foreground">{mySupervisor.email}</p>
              </div>
              <Badge variant={getBadgeVariant(mySupervisor.nivelAcesso)}>
                {mySupervisor.nivelAcesso || 'Usuário'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Membros Diretos da Equipe removido: funcionalidade consolidada na hierarquia */}

      <Card>
        <CardHeader className="flex items-start justify-between">
          <div>
            <CardTitle>Equipe Completa (Hierarquia)</CardTitle>
            <CardDescription>Fluxograma da equipe: clique nas caixinhas para expandir níveis</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Membro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/20 p-4 overflow-x-auto">
            {treeLoading ? (
              <p className="text-sm text-muted-foreground">Carregando hierarquia...</p>
            ) : roots && roots.length > 0 ? (
              <div className="space-y-4 min-w-[260px]">
                {roots.map(rootId => (
                  <div key={rootId}>
                    {renderTreeNode(rootId, 0)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 text-muted-foreground">Nenhum membro encontrado para a supervisão selecionada.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Painel de detalhes à direita */}
      {selectedNodeId && hierarchyProfiles[selectedNodeId] && (
        <div className="fixed right-8 top-[120px] w-80 z-20">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Membro</CardTitle>
              <CardDescription>Informações rápidas e ações</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={hierarchyProfiles[selectedNodeId].avatar_url || ''} />
                  <AvatarFallback>{getInitials(hierarchyProfiles[selectedNodeId].full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{hierarchyProfiles[selectedNodeId].full_name}</p>
                  <p className="text-xs text-muted-foreground">{hierarchyProfiles[selectedNodeId].email}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">Função: {hierarchyProfiles[selectedNodeId].funcao || '—'}</p>
                <p className="text-xs text-muted-foreground">Nível: {hierarchyProfiles[selectedNodeId].nivelAcesso || 'Usuário'}</p>
              </div>
            </CardContent>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setViewMode('usuario'); setViewTargetId(selectedNodeId); }}>Ver no contexto</Button>
              <Button size="sm" onClick={() => setSelectedNodeId(null)}>Fechar</Button>
            </DialogFooter>
          </Card>
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
            <DialogDescription>
              Selecione um usuário para adicionar à sua equipe.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.nivelAcesso || 'Usuário'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Supervisor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={user?.id || ''}>Eu (você)</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Supervisor</DialogTitle>
            <DialogDescription>Escolha um novo supervisor para este membro.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
              <SelectTrigger><SelectValue placeholder="Selecione supervisor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={user?.id || ''}>Eu (você)</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateSupervisor} disabled={updateSupervisorMutation.isPending}>
              {updateSupervisorMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserEditDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        member={editingMember}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={handleSubmit}
        teamMembers={teamMembers || []}
        onResetPermissions={() => setFormData(prev => ({ ...prev, permissoes: getDefaultPermissions(prev.nivelAcesso) }))}
        allGroups={groups}
        selectedGroupIds={editingUserGroupIds}
        onToggleGroup={(groupId: string, checked: boolean) => {
          if (!editingMember) return;
          if (checked) addUserToGroup({ userId: editingMember.id, groupId });
          else removeUserFromGroup({ userId: editingMember.id, groupId });
        }}
      />
    </div>
  );
};

export default HierarquiaTab;
