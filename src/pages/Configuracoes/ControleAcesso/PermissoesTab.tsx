import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GroupPermissionMatrix from './components/GroupPermissionMatrix';
import UserPermissionMatrix from './components/UserPermissionMatrix';

const PermissoesTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Gerenciar Permissões</h2>
        <p className="text-sm text-muted-foreground">
          Configure quem pode acessar cada módulo do sistema
        </p>
      </div>

      <Tabs defaultValue="grupos" className="w-full">
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
