// Aba de Módulos e Grupos - Combina Módulos, Grupos e Permissões
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModulosTab from '../ControleAcesso/ModulosTab';
import GruposTab from '../ControleAcesso/GruposTab';
import PermissoesTab from '../ControleAcesso/PermissoesTab';

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
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
          <TabsTrigger value="grupos">Grupos</TabsTrigger>
          <TabsTrigger value="permissoes">Permissões</TabsTrigger>
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
      </Tabs>
    </div>
  );
};

export default ModulosGruposTab;
