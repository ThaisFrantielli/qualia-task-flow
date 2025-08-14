// src/pages/TaskSettingsPage.tsx

import React from 'react';
import { Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClassificationManager from '@/components/settings/ClassificationManager';

const TaskSettingsPage = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho da Página */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Configurações de Tarefas
        </h1>
        <p className="text-gray-600">Gerencie as opções e personalizações do módulo de tarefas.</p>
      </div>

      {/* Estrutura de Abas */}
      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          {/* 
            Placeholder para futuras abas de configuração.
            O atributo 'disabled' as torna visíveis, mas não clicáveis.
          */}
          <TabsTrigger value="statuses" disabled>Status</TabsTrigger>
          <TabsTrigger value="priorities" disabled>Prioridades</TabsTrigger>
        </TabsList>
        
        {/* Conteúdo da Aba de Categorias */}
        <TabsContent value="categories">
          {/* Renderiza o componente que você já criou para gerenciar as categorias */}
          <ClassificationManager />
        </TabsContent>
        
        {/* 
          Futuramente, o conteúdo das outras abas viria aqui.
          Exemplo:
          <TabsContent value="statuses">
            <p>Gerenciador de Status de Tarefas em breve.</p>
          </TabsContent> 
        */}
      </Tabs>
    </div>
  );
};

export default TaskSettingsPage;