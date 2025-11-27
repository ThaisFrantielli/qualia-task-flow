// src/pages/Configuracoes/ConfiguracoesEquipes/index.tsx
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users } from 'lucide-react';
import DepartamentosTab from './DepartamentosTab';
import HierarquiaTab from './HierarquiaTab';

const ConfiguracoesEquipesPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
          <Users className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações de Equipes</h1>
          <p className="text-gray-600 text-sm">Gerencie departamentos, hierarquia e estrutura organizacional</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="departamentos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="departamentos">Departamentos</TabsTrigger>
          <TabsTrigger value="hierarquia">Hierarquia</TabsTrigger>
        </TabsList>

        <TabsContent value="departamentos" className="mt-6">
          <DepartamentosTab />
        </TabsContent>

        <TabsContent value="hierarquia" className="mt-6">
          <HierarquiaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracoesEquipesPage;
