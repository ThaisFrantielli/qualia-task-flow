// UI de Administração de Permissões do Analytics
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useGroups, Group } from '@/hooks/useGroups';
import { useProfiles } from '@/hooks/useProfiles';
import {
  useAllAnalyticsPages,
  useGroupAnalyticsPermissions,
  useUserAnalyticsPermissions,
} from '@/hooks/useAnalyticsAccess';
import { useQueryClient } from '@tanstack/react-query';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AnalyticsPage {
  id: string;
  key: string;
  name: string;
  hub_category: string;
}

export default function AnalyticsPermissions() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Permissões do Analytics</h2>
        <p className="text-muted-foreground">
          Gerencie quais grupos e usuários podem acessar cada página e aba do Analytics.
        </p>
      </div>

      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups">Por Grupo</TabsTrigger>
          <TabsTrigger value="users">Por Usuário</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-4">
          <GroupPermissionsPanel />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UserPermissionsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GroupPermissionsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const { groups, isLoading: loadingGroups } = useGroups();
  const { data: pages, isLoading: loadingPages } = useAllAnalyticsPages();
  const { data: currentPermissions, isLoading: loadingPerms } = useGroupAnalyticsPermissions(selectedGroupId);

  useEffect(() => {
    if (currentPermissions) {
      const perms = new Set<string>();
      currentPermissions.forEach((p) => {
        if (p.tab_id) {
          perms.add(`tab:${p.tab_id}`);
        } else {
          perms.add(`page:${p.page_id}`);
        }
      });
      setSelectedPermissions(perms);
    }
  }, [currentPermissions]);

  const handleTogglePage = (pageId: string, checked: boolean) => {
    const newPerms = new Set(selectedPermissions);
    if (checked) {
      newPerms.add(`page:${pageId}`);
    } else {
      newPerms.delete(`page:${pageId}`);
    }
    setSelectedPermissions(newPerms);
  };

  const handleSave = async () => {
    if (!selectedGroupId) return;
    setSaving(true);

    try {
      // Remove permissões antigas
      await supabase
        .from('group_analytics_permissions')
        .delete()
        .eq('group_id', selectedGroupId);

      // Insere novas permissões
      const newPerms: { group_id: string; page_id: string; tab_id: null }[] = [];
      selectedPermissions.forEach((perm) => {
        if (perm.startsWith('page:')) {
          newPerms.push({
            group_id: selectedGroupId,
            page_id: perm.replace('page:', ''),
            tab_id: null,
          });
        }
      });

      if (newPerms.length > 0) {
        const { error } = await supabase
          .from('group_analytics_permissions')
          .insert(newPerms);
        if (error) throw error;
      }

      toast({ title: 'Permissões salvas com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['group-analytics-permissions'] });
    } catch (error) {
      const err = error as Error;
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isLoading = loadingGroups || loadingPages;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões por Grupo</CardTitle>
        <CardDescription>
          Selecione um grupo e marque as páginas que ele pode acessar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedGroupId || ''} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecione um grupo" />
          </SelectTrigger>
          <SelectContent>
            {groups?.map((group: Group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading && (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Carregando...</span>
          </div>
        )}

        {selectedGroupId && !isLoading && (
          <>
            {loadingPerms ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Carregando permissões...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pages?.map((page: AnalyticsPage) => (
                  <PagePermissionCard
                    key={page.id}
                    page={page}
                    checked={selectedPermissions.has(`page:${page.id}`)}
                    onCheckedChange={(checked) => handleTogglePage(page.id, checked)}
                  />
                ))}
              </div>
            )}

            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Permissões
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function UserPermissionsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const { profiles, loading: loadingUsers } = useProfiles();
  const { data: pages, isLoading: loadingPages } = useAllAnalyticsPages();
  const { data: currentPermissions, isLoading: loadingPerms } = useUserAnalyticsPermissions(selectedUserId);

  useEffect(() => {
    if (currentPermissions) {
      const perms = new Set<string>();
      currentPermissions.forEach((p) => {
        if (p.tab_id) {
          perms.add(`tab:${p.tab_id}`);
        } else {
          perms.add(`page:${p.page_id}`);
        }
      });
      setSelectedPermissions(perms);
    }
  }, [currentPermissions]);

  const handleTogglePage = (pageId: string, checked: boolean) => {
    const newPerms = new Set(selectedPermissions);
    if (checked) {
      newPerms.add(`page:${pageId}`);
    } else {
      newPerms.delete(`page:${pageId}`);
    }
    setSelectedPermissions(newPerms);
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);

    try {
      await supabase
        .from('user_analytics_permissions')
        .delete()
        .eq('user_id', selectedUserId);

      const newPerms: { user_id: string; page_id: string; tab_id: null }[] = [];
      selectedPermissions.forEach((perm) => {
        if (perm.startsWith('page:')) {
          newPerms.push({
            user_id: selectedUserId,
            page_id: perm.replace('page:', ''),
            tab_id: null,
          });
        }
      });

      if (newPerms.length > 0) {
        const { error } = await supabase
          .from('user_analytics_permissions')
          .insert(newPerms);
        if (error) throw error;
      }

      toast({ title: 'Permissões salvas com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['user-analytics-permissions'] });
    } catch (error) {
      const err = error as Error;
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isLoading = loadingUsers || loadingPages;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões por Usuário</CardTitle>
        <CardDescription>
          Atribua permissões individuais que sobrescrevem as do grupo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecione um usuário" />
          </SelectTrigger>
          <SelectContent>
            {profiles?.map((user: Profile) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading && (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Carregando...</span>
          </div>
        )}

        {selectedUserId && !isLoading && (
          <>
            {loadingPerms ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Carregando permissões...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pages?.map((page: AnalyticsPage) => (
                  <PagePermissionCard
                    key={page.id}
                    page={page}
                    checked={selectedPermissions.has(`page:${page.id}`)}
                    onCheckedChange={(checked) => handleTogglePage(page.id, checked)}
                  />
                ))}
              </div>
            )}

            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Permissões
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PagePermissionCard({
  page,
  checked,
  onCheckedChange,
}: {
  page: AnalyticsPage;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const categoryColors: Record<string, string> = {
    ativos: 'bg-blue-100 text-blue-800',
    financeiro: 'bg-green-100 text-green-800',
    operacional: 'bg-orange-100 text-orange-800',
    auditoria: 'bg-red-100 text-red-800',
    comercial: 'bg-purple-100 text-purple-800',
    clientes: 'bg-cyan-100 text-cyan-800',
    executive: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        checked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
      onClick={() => onCheckedChange(!checked)}
    >
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{page.name}</div>
        <Badge variant="secondary" className={`text-xs ${categoryColors[page.hub_category] || ''}`}>
          {page.hub_category}
        </Badge>
      </div>
    </div>
  );
}
