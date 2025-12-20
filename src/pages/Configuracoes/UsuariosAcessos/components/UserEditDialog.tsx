// Modal de Edição de Usuário - Baseado na imagem de referência
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { TeamMember, Permissoes } from '../UsuariosTab';
import type { Group } from '@/hooks/useGroups';
import { useAllAnalyticsPages, useAllAnalyticsTabs, useUserAnalyticsPermissions } from '@/hooks/useAnalyticsAccess';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUsersContext } from '@/contexts/UsersContext';

interface UserEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  formData: {
    name: string;
    email: string;
    funcao: string;
    nivelAcesso: TeamMember['nivelAcesso'];
    supervisor_id: string | null;
    manager_id?: string | null;
    permissoes: Permissoes;
  };
  onFormChange: (field: string, value: string | boolean | Permissoes | null) => void;
  onSubmit: () => void;
  teamMembers: TeamMember[];
  onResetPermissions: () => void;
  allGroups: Group[];
  selectedGroupIds: string[];
  onToggleGroup: (groupId: string, checked: boolean) => void;
}

const permissionLabels: Record<keyof Permissoes, { label: string; description: string }> = {
  dashboard: { label: 'Dashboard', description: 'Visão geral e estatísticas.' },
  kanban: { label: 'Kanban', description: 'Quadro Kanban de tarefas.' },
  tasks: { label: 'Lista de Tarefas', description: 'Acesso às tarefas.' },
  projects: { label: 'Gerenciar Projetos', description: 'Criar e editar projetos.' },
  crm: { label: 'Módulo CRM', description: 'Pós-Vendas e dashboard.' },
  team: { label: 'Gerenciar Equipe', description: 'Gerenciar membros e hierarquia.' },
  settings: { label: 'Configurações', description: 'Ajustes gerais do sistema.' },
  is_admin: { label: 'Administrador', description: 'Acesso total ao sistema.' },
};

const UserEditDialog = ({
  isOpen,
  onClose,
  member,
  formData,
  onFormChange,
  onSubmit,
  teamMembers,
  onResetPermissions,
  allGroups,
  selectedGroupIds,
  onToggleGroup,
}: UserEditDialogProps) => {
  if (!member) return null;

  const handlePermissionChange = (key: keyof Permissoes, checked: boolean) => {
    const newPermissions = { ...formData.permissoes, [key]: checked };
    onFormChange('permissoes', newPermissions);
  };

  // Filtrar supervisores potenciais (todos exceto o próprio usuário)
  const { users: allUsers } = useUsersContext();
  const potentialSupervisors = teamMembers.filter(m => m.id !== member.id);
  // Use the global users list for manager selection (includes everyone)
  const potentialManagers = allUsers.filter(u => u.id !== member.id).map(u => ({ id: u.id, name: u.full_name || u.email, nivelAcesso: u.nivelAcesso || 'Usuário' } as any));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>{formData.email}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 pb-20 overflow-auto">
          <div className="space-y-6 py-4">
            {/* Nome e Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => onFormChange('name', e.target.value)}
                  placeholder="Nome do usuário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="funcao">Função</Label>
                <Input
                  id="funcao"
                  value={formData.funcao}
                  onChange={(e) => onFormChange('funcao', e.target.value)}
                  placeholder="Ex: Desenvolvedor, Gerente..."
                />
              </div>
            </div>

            {/* Nível de Acesso */}
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select
                value={formData.nivelAcesso}
                onValueChange={(value) => onFormChange('nivelAcesso', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Usuário">Usuário</SelectItem>
                  <SelectItem value="Supervisão">Supervisão</SelectItem>
                  <SelectItem value="Gestão">Gestão</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Supervisor */}
            <div className="space-y-2">
              <Label>Supervisor</Label>
              <Select
                value={formData.supervisor_id || 'none'}
                onValueChange={(value) => onFormChange('supervisor_id', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {potentialSupervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.nivelAcesso})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Você não pode selecionar o próprio usuário como supervisor.
              </p>
            </div>

            {/* Gerente (novo) */}
            <div className="space-y-2">
              <Label>Gerente</Label>
              <Select
                value={formData.manager_id || 'none'}
                onValueChange={(value) => onFormChange('manager_id', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um gerente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {potentialManagers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.nivelAcesso})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">O gerente é usado para visualizações por gerente. Opcional.</p>
            </div>

            {/* Grupos de Acesso */}
            <div className="space-y-2">
              <Label>Grupos de Acesso</Label>
              <p className="text-xs text-muted-foreground">
                Grupos controlam o acesso padrão aos módulos (Dashboard, Projetos, etc.).
                Ajustes finos podem ser feitos nas permissões detalhadas abaixo.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {allGroups.map((group) => (
                  <div key={group.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`group-${group.id}`}
                      checked={selectedGroupIds.includes(group.id)}
                      onCheckedChange={(checked) =>
                        onToggleGroup(group.id, Boolean(checked))
                      }
                    />
                    <Label htmlFor={`group-${group.id}`} className="text-sm">
                      {group.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Permissões Detalhadas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-base font-semibold">Permissões Detalhadas</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onResetPermissions}
                >
                  Resetar para padrão do nível
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Essas permissões funcionam como ajustes finos em relação ao nível de acesso selecionado.
                Use o botão de reset para voltar ao comportamento padrão do nível.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
                {(Object.keys(permissionLabels) as (keyof Permissoes)[]).map((key) => {
                  if (key === 'is_admin') return null; // Não exibir is_admin aqui
                  const { label, description } = permissionLabels[key];
                  return (
                    <div
                      key={key}
                      className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50"
                    >
                      <Checkbox
                        id={key}
                        checked={!!formData.permissoes[key]}
                        onCheckedChange={(checked) => handlePermissionChange(key, !!checked)}
                      />
                      <div className="flex-1">
                        <label htmlFor={key} className="text-sm font-medium">
                          {label}
                        </label>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Analytics Permissions */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Permissões Analytics</Label>
                <Button variant="ghost" size="sm" onClick={async () => {
                  // refresh will be handled by queries; placeholder
                }}>Atualizar</Button>
              </div>
              <p className="text-xs text-muted-foreground">Controle de acesso a páginas e abas do módulo Analytics para este usuário (overrides individuais).</p>

              <AnalyticsPermissionsForUser userId={member.id} />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t sticky bottom-0 bg-background">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserEditDialog;

// Child component to render analytics permissions for a specific user
const AnalyticsPermissionsForUser: React.FC<{ userId: string }> = ({ userId }) => {
  const pagesQuery = useAllAnalyticsPages();
  const { data: userPerms = [], refetch: refetchUserPerms } = useUserAnalyticsPermissions(userId);

  const hasPagePerm = (pageId: string) => userPerms.some((p: any) => p.page_id === pageId && !p.tab_id);
  const hasTabPerm = (pageId: string, tabId: string) => userPerms.some((p: any) => p.page_id === pageId && p.tab_id === tabId);

  const togglePage = async (pageId: string) => {
    try {
      const exists = hasPagePerm(pageId);
      if (exists) {
        const { error } = await supabase.from('user_analytics_permissions').delete().eq('user_id', userId).eq('page_id', pageId);
        if (error) throw error;
        toast.success('Permissões da página removidas para o usuário.');
      } else {
        const { error } = await supabase.from('user_analytics_permissions').insert({ user_id: userId, page_id: pageId });
        if (error) throw error;
        toast.success('Permissão da página concedida ao usuário.');
      }
    } catch (err: any) {
      toast.error('Erro ao atualizar permissões da página', { description: String(err?.message || err) });
    } finally {
      await refetchUserPerms();
    }
  };

  const toggleTab = async (pageId: string, tabId: string) => {
    try {
      const exists = hasTabPerm(pageId, tabId);
      if (exists) {
        const { error } = await supabase.from('user_analytics_permissions').delete().eq('user_id', userId).eq('page_id', pageId).eq('tab_id', tabId);
        if (error) throw error;
        toast.success('Permissão da aba removida para o usuário.');
      } else {
        // ensure page perm exists
        if (!hasPagePerm(pageId)) {
          const { error: err1 } = await supabase.from('user_analytics_permissions').insert({ user_id: userId, page_id: pageId });
          if (err1) throw err1;
        }
        const { error } = await supabase.from('user_analytics_permissions').insert({ user_id: userId, page_id: pageId, tab_id: tabId });
        if (error) throw error;
        toast.success('Permissão da aba concedida ao usuário.');
      }
    } catch (err: any) {
      toast.error('Erro ao atualizar permissões da aba', { description: String(err?.message || err) });
    } finally {
      await refetchUserPerms();
    }
  };

  if (pagesQuery.isLoading) return <p className="text-sm text-muted-foreground">Carregando analytics...</p>;

  const pages = pagesQuery.data || [];

  return (
    <div className="space-y-3">
      {pages.map((page: any) => (
        <div key={page.id} className="border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Checkbox checked={hasPagePerm(page.id)} onCheckedChange={() => togglePage(page.id)} />
            <span className="font-medium">{page.name}</span>
            {!page.is_active && <Badge variant="secondary">Inativo</Badge>}
          </div>
          <AnalyticsTabsForPage pageId={page.id} userId={userId} userPerms={userPerms} toggleTab={toggleTab} />
        </div>
      ))}
    </div>
  );
};

const AnalyticsTabsForPage: React.FC<{ pageId: string; userId: string; userPerms: any[]; toggleTab: (p:string,t:string)=>Promise<void> }> = ({ pageId, userId, userPerms, toggleTab }) => {
  const tabsQuery = useAllAnalyticsTabs(pageId);
  if (tabsQuery.isLoading) return null;
  const tabs = tabsQuery.data || [];
  if (tabs.length === 0) return null;
  return (
    <div className="ml-6 grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
      {tabs.map((tab: any) => (
        <label key={tab.id} className="flex items-center gap-2 text-sm">
          <Checkbox checked={userPerms.some(p => p.page_id === pageId && p.tab_id === tab.id)} onCheckedChange={() => toggleTab(pageId, tab.id)} />
          {tab.name}
        </label>
      ))}
    </div>
  );
};
