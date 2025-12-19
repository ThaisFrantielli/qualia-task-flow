// Aba de Módulos e Grupos - Componentes inline
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Shield, Package, Users } from 'lucide-react';

interface Module {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  route: string | null;
  is_active: boolean;
  display_order: number | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
}

interface GroupModule {
  id: string;
  group_id: string;
  module_id: string;
}

// Sub-componente: Módulos
const ModulosSection: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Module | null>(null);
  const [formData, setFormData] = useState({ name: '', key: '', description: '', route: '', is_active: true });

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    const { data } = await supabase.from('modules').select('*').order('display_order');
    if (data) setModules(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (editing) {
      const { error } = await supabase.from('modules').update({
        name: formData.name,
        key: formData.key,
        description: formData.description || null,
        route: formData.route || null,
        is_active: formData.is_active,
      }).eq('id', editing.id);
      
      if (error) {
        toast.error('Erro ao atualizar módulo');
        return;
      }
      toast.success('Módulo atualizado');
    } else {
      const { error } = await supabase.from('modules').insert({
        name: formData.name,
        key: formData.key,
        description: formData.description || null,
        route: formData.route || null,
        is_active: formData.is_active,
      });
      
      if (error) {
        toast.error('Erro ao criar módulo');
        return;
      }
      toast.success('Módulo criado');
    }
    setDialogOpen(false);
    setEditing(null);
    setFormData({ name: '', key: '', description: '', route: '', is_active: true });
    loadModules();
  };

  const handleEdit = (mod: Module) => {
    setEditing(mod);
    setFormData({
      name: mod.name,
      key: mod.key,
      description: mod.description || '',
      route: mod.route || '',
      is_active: mod.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este módulo?')) return;
    await supabase.from('modules').delete().eq('id', id);
    toast.success('Módulo excluído');
    loadModules();
  };

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-lg" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Módulos do Sistema</h3>
          <p className="text-sm text-muted-foreground">Gerencie os módulos disponíveis</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormData({ name: '', key: '', description: '', route: '', is_active: true }); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Módulo
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Rota</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map(mod => (
            <TableRow key={mod.id}>
              <TableCell className="font-medium">{mod.name}</TableCell>
              <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{mod.key}</code></TableCell>
              <TableCell>{mod.route || '-'}</TableCell>
              <TableCell>
                <Badge variant={mod.is_active ? 'default' : 'secondary'}>
                  {mod.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(mod)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(mod.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Key (identificador único)</Label>
              <Input value={formData.key} onChange={e => setFormData(p => ({ ...p, key: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <Label>Rota</Label>
              <Input value={formData.route} onChange={e => setFormData(p => ({ ...p, route: e.target.value }))} placeholder="/exemplo" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={formData.is_active} onCheckedChange={c => setFormData(p => ({ ...p, is_active: c as boolean }))} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sub-componente: Grupos
const GruposSection: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const { data } = await supabase.from('groups').select('*').order('name');
    if (data) setGroups(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (editing) {
      const { error } = await supabase.from('groups').update({
        name: formData.name,
        description: formData.description || null,
      }).eq('id', editing.id);
      
      if (error) {
        toast.error('Erro ao atualizar grupo');
        return;
      }
      toast.success('Grupo atualizado');
    } else {
      const { error } = await supabase.from('groups').insert({
        name: formData.name,
        description: formData.description || null,
      });
      
      if (error) {
        toast.error('Erro ao criar grupo');
        return;
      }
      toast.success('Grupo criado');
    }
    setDialogOpen(false);
    setEditing(null);
    setFormData({ name: '', description: '' });
    loadGroups();
  };

  const handleEdit = (group: Group) => {
    setEditing(group);
    setFormData({ name: group.name, description: group.description || '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este grupo?')) return;
    await supabase.from('groups').delete().eq('id', id);
    toast.success('Grupo excluído');
    loadGroups();
  };

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-lg" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Grupos de Acesso</h3>
          <p className="text-sm text-muted-foreground">Gerencie os grupos de usuários</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormData({ name: '', description: '' }); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Grupo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map(group => (
          <Card key={group.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {group.name}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(group)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(group.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{group.description || 'Sem descrição'}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sub-componente: Permissões (Matriz Grupo x Módulo)
const PermissoesSection: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupModules, setGroupModules] = useState<GroupModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [modsRes, groupsRes, gmRes] = await Promise.all([
      supabase.from('modules').select('*').eq('is_active', true).order('display_order'),
      supabase.from('groups').select('*').order('name'),
      supabase.from('group_modules').select('*'),
    ]);
    if (modsRes.data) setModules(modsRes.data);
    if (groupsRes.data) setGroups(groupsRes.data);
    if (gmRes.data) setGroupModules(gmRes.data);
    setLoading(false);
  };

  const hasPermission = (groupId: string, moduleId: string) => {
    return groupModules.some(gm => gm.group_id === groupId && gm.module_id === moduleId);
  };

  const togglePermission = async (groupId: string, moduleId: string) => {
    const existing = groupModules.find(gm => gm.group_id === groupId && gm.module_id === moduleId);
    
    if (existing) {
      await supabase.from('group_modules').delete().eq('id', existing.id);
      setGroupModules(prev => prev.filter(gm => gm.id !== existing.id));
      toast.success('Permissão removida');
    } else {
      const { data, error } = await supabase
        .from('group_modules')
        .insert({ group_id: groupId, module_id: moduleId })
        .select()
        .single();
      
      if (data && !error) {
        setGroupModules(prev => [...prev, data]);
        toast.success('Permissão adicionada');
      }
    }
  };

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-lg" />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Matriz de Permissões</h3>
        <p className="text-sm text-muted-foreground">Configure quais grupos têm acesso a cada módulo</p>
      </div>

      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background">Grupo</TableHead>
              {modules.map(mod => (
                <TableHead key={mod.id} className="text-center min-w-[100px]">
                  {mod.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map(group => (
              <TableRow key={group.id}>
                <TableCell className="sticky left-0 bg-background font-medium">
                  {group.name}
                </TableCell>
                {modules.map(mod => (
                  <TableCell key={mod.id} className="text-center">
                    <Checkbox
                      checked={hasPermission(group.id, mod.id)}
                      onCheckedChange={() => togglePermission(group.id, mod.id)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// Componente principal
const ModulosGruposTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Módulos e Grupos de Acesso</h2>
        <p className="text-muted-foreground text-sm">
          Gerencie os módulos do sistema, grupos de usuários e suas permissões
        </p>
      </div>

      <Tabs defaultValue="modulos" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="modulos" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Módulos
          </TabsTrigger>
          <TabsTrigger value="grupos" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Grupos
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Permissões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modulos" className="mt-6">
          <ModulosSection />
        </TabsContent>

        <TabsContent value="grupos" className="mt-6">
          <GruposSection />
        </TabsContent>

        <TabsContent value="permissoes" className="mt-6">
          <PermissoesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModulosGruposTab;
