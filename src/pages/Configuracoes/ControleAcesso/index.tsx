import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModulosTab from './ModulosTab';
import GruposTab from './GruposTab';
import PermissoesTab from './PermissoesTab';
import AnalyticsPermissions from './AnalyticsPermissions';
import { Shield } from 'lucide-react';

const ControleAcessoPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Acesso</h1>
          <p className="text-gray-600 text-sm">Gerencie módulos, grupos e permissões de usuários</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="modulos" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
          <TabsTrigger value="grupos">Grupos</TabsTrigger>
          <TabsTrigger value="permissoes">Permissões</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="modulos" className="mt-6">
          <ModulosTab />
        </TabsContent>

        <TabsContent value="grupos" className="mt-6">
          <GruposTab />
        </TabsContent>

        <TabsContent value="permissoes" className="mt-6">
          <PermissoesTab />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsPermissions />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ControleAcessoPage;
