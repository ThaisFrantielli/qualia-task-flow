// Aba de Permissões do Analytics
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Users, BarChart3 } from 'lucide-react';

interface AnalyticsPage {
  id: string;
  key: string;
  name: string;
  description: string | null;
  route: string;
  icon: string | null;
  is_active: boolean;
  display_order: number | null;
  hub_category: string | null;
}

interface AnalyticsTab {
  id: string;
  page_id: string;
  key: string;
  name: string;
  is_active: boolean;
  display_order: number | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
}

interface GroupPermission {
  id: string;
  group_id: string;
  page_id: string;
  tab_id: string | null;
}

const AnalyticsPermissionsTab: React.FC = () => {
  const [pages, setPages] = useState<AnalyticsPage[]>([]);
  const [tabs, setTabs] = useState<AnalyticsTab[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [permissions, setPermissions] = useState<GroupPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('by-group');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoading(true);
    try {
      const [pagesRes, tabsRes, groupsRes, permsRes] = await Promise.all([
        supabase.from('analytics_pages').select('*').order('display_order'),
        supabase.from('analytics_page_tabs').select('*').order('display_order'),
        supabase.from('groups').select('*').order('name'),
        supabase.from('group_analytics_permissions').select('*'),
      ]);

      if (pagesRes.data) setPages(pagesRes.data);
      if (tabsRes.data) setTabs(tabsRes.data);
      if (groupsRes.data) setGroups(groupsRes.data);
      if (permsRes.data) setPermissions(permsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar permissões');
    }
    setLoading(false);
  };

  const hasPagePermission = (groupId: string, pageId: string) => {
    return permissions.some(p => p.group_id === groupId && p.page_id === pageId && !p.tab_id);
  };

  const hasTabPermission = (groupId: string, pageId: string, tabId: string) => {
    return permissions.some(p => p.group_id === groupId && p.page_id === pageId && p.tab_id === tabId);
  };

  const togglePagePermission = async (groupId: string, pageId: string) => {
    const exists = hasPagePermission(groupId, pageId);
    
    if (exists) {
      // Remove page and all tab permissions
      const toRemove = permissions.filter(p => p.group_id === groupId && p.page_id === pageId);
      for (const perm of toRemove) {
        await supabase.from('group_analytics_permissions').delete().eq('id', perm.id);
      }
      setPermissions(prev => prev.filter(p => !(p.group_id === groupId && p.page_id === pageId)));
    } else {
      // Add page permission
      const { data, error } = await supabase
        .from('group_analytics_permissions')
        .insert({ group_id: groupId, page_id: pageId })
        .select()
        .single();
      
      if (data && !error) {
        setPermissions(prev => [...prev, data]);
      }
    }
  };

  const toggleTabPermission = async (groupId: string, pageId: string, tabId: string) => {
    const exists = hasTabPermission(groupId, pageId, tabId);
    
    if (exists) {
      const perm = permissions.find(p => p.group_id === groupId && p.page_id === pageId && p.tab_id === tabId);
      if (perm) {
        await supabase.from('group_analytics_permissions').delete().eq('id', perm.id);
        setPermissions(prev => prev.filter(p => p.id !== perm.id));
      }
    } else {
      // First ensure page permission exists
      if (!hasPagePermission(groupId, pageId)) {
        await togglePagePermission(groupId, pageId);
      }
      
      const { data, error } = await supabase
        .from('group_analytics_permissions')
        .insert({ group_id: groupId, page_id: pageId, tab_id: tabId })
        .select()
        .single();
      
      if (data && !error) {
        setPermissions(prev => [...prev, data]);
      }
    }
  };

  const getPageTabs = (pageId: string) => {
    return tabs.filter(t => t.page_id === pageId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Permissões do Analytics</h2>
        <p className="text-muted-foreground text-sm">
          Configure quais grupos têm acesso a cada página e aba do módulo Analytics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="by-group" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Por Grupo
          </TabsTrigger>
          <TabsTrigger value="by-page" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Por Página
          </TabsTrigger>
        </TabsList>

        <TabsContent value="by-group" className="mt-6">
          <div className="grid gap-4">
            {groups.map(group => (
              <Card key={group.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                  </div>
                  {group.description && (
                    <CardDescription>{group.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {pages.map(page => {
                      const pageTabs = getPageTabs(page.id);
                      const hasPage = hasPagePermission(group.id, page.id);
                      
                      return (
                        <div key={page.id} className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                              checked={hasPage}
                              onCheckedChange={() => togglePagePermission(group.id, page.id)}
                            />
                            <span className="font-medium">{page.name}</span>
                            {!page.is_active && (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                          </div>
                          
                          {pageTabs.length > 0 && hasPage && (
                            <div className="ml-6 grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                              {pageTabs.map(tab => (
                                <label key={tab.id} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={hasTabPermission(group.id, page.id, tab.id)}
                                    onCheckedChange={() => toggleTabPermission(group.id, page.id, tab.id)}
                                  />
                                  {tab.name}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="by-page" className="mt-6">
          <div className="grid gap-4">
            {pages.map(page => {
              const pageTabs = getPageTabs(page.id);
              
              return (
                <Card key={page.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{page.name}</CardTitle>
                      {!page.is_active && (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                    {page.description && (
                      <CardDescription>{page.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {groups.map(group => {
                        const hasPage = hasPagePermission(group.id, page.id);
                        
                        return (
                          <div key={group.id} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Checkbox
                                checked={hasPage}
                                onCheckedChange={() => togglePagePermission(group.id, page.id)}
                              />
                              <span className="font-medium">{group.name}</span>
                            </div>
                            
                            {pageTabs.length > 0 && hasPage && (
                              <div className="ml-6 grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                                {pageTabs.map(tab => (
                                  <label key={tab.id} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={hasTabPermission(group.id, page.id, tab.id)}
                                      onCheckedChange={() => toggleTabPermission(group.id, page.id, tab.id)}
                                    />
                                    {tab.name}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPermissionsTab;
