import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useModules } from '@/hooks/useModules';
import { useUserModules } from '@/hooks/useUserModules';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GroupPermissionMatrix from './components/GroupPermissionMatrix';
import UserPermissionMatrix from './components/UserPermissionMatrix';

const PermissoesTab: React.FC = () => {
  const { modules, isLoading: loadingModules } = useModules();
  const { data: userModules, isLoading: loadingUserModules } = useUserModules();
  const { assignModuleToUser, removeModuleFromUser } = useModulePermissions();
  const { user } = useAuth();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  useEffect(() => {
    if (!userModules) return;
    // userModules pode vir como (string | null)[] ou como objetos — normalizamos para ids string[]
    const ids = userModules
      .map((m: any) => {
        if (m == null) return null;
        if (typeof m === 'string') return m;
        return m.id ?? m.key ?? null;
      })
      .filter((id: string | null): id is string => id != null);
    setSelectedModules(ids);
  }, [userModules]);

  if (loadingModules || loadingUserModules) {
    return <div>Carregando permissões...</div>;
  }

  if (!modules || modules.length === 0) {
    return <div>Nenhum módulo cadastrado.</div>;
  }

  const toggle = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    // Remove todos os módulos não selecionados
    await Promise.all(
      modules.map(async (mod: any) => {
        const id = mod.id ?? mod.key;
        if (!selectedModules.includes(id)) {
          await removeModuleFromUser({ userId: user.id, moduleId: id });
        }
      })
    );
    // Adiciona selecionados
    await Promise.all(
      selectedModules.map(async moduleId => {
        await assignModuleToUser({ userId: user.id, moduleId });
      })
    );
    // Feedback
    console.log('Permissões atualizadas:', selectedModules);
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Permissões por Módulo</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {modules.map((mod: any) => {
          const id = mod.id ?? mod.key;
          const checked = selectedModules.includes(id);
          return (
            <label key={id} className="flex items-center gap-3 p-3 border rounded bg-white/80">
              <Checkbox checked={checked} onCheckedChange={() => toggle(id)} />
              <div className="flex-1">
                <div className="font-medium">{mod.name}</div>
                {mod.description && <div className="text-sm text-muted-foreground">{mod.description}</div>}
              </div>
              <div className="text-sm text-muted-foreground">{mod.route}</div>
            </label>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => { setSelectedModules([]); }}>
          Limpar
        </Button>
        <Button onClick={handleSave}>Salvar Permissões</Button>
      </div>

      {/* Sub-tabs originais */}
      <Tabs defaultValue="grupos" className="w-full mt-8">
        <TabsList>
          <TabsTrigger value="grupos">Permissões por Grupo</TabsTrigger>
          <TabsTrigger value="usuarios">Permissões Individuais</TabsTrigger>
        </TabsList>

        <TabsContent value="grupos" className="mt-6">
          <GroupPermissionMatrix />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
          <UserPermissionMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PermissoesTab;
