import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Settings, Car, Package, DollarSign } from 'lucide-react';
import { ParametrosTab } from '@/components/precificacao/ParametrosTab';
import { ModelosVeiculosTab } from '@/components/precificacao/ModelosVeiculosTab';
import { PacotesKmTab } from '@/components/precificacao/PacotesKmTab';
import { CustosImplantacaoTab } from '@/components/precificacao/CustosImplantacaoTab';

export default function PrecificacaoConfigPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8" />
          Configurações de Precificação
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie parâmetros, modelos de veículos, pacotes de KM e custos de implantação
        </p>
      </div>

      <Card>
        <Tabs defaultValue="parametros" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="parametros" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Parâmetros
            </TabsTrigger>
            <TabsTrigger value="modelos" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Modelos de Veículos
            </TabsTrigger>
            <TabsTrigger value="pacotes-km" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pacotes de KM
            </TabsTrigger>
            <TabsTrigger value="implantacao" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Custos Implantação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parametros" className="mt-6">
            <ParametrosTab />
          </TabsContent>

          <TabsContent value="modelos" className="mt-6">
            <ModelosVeiculosTab />
          </TabsContent>

          <TabsContent value="pacotes-km" className="mt-6">
            <PacotesKmTab />
          </TabsContent>

          <TabsContent value="implantacao" className="mt-6">
            <CustosImplantacaoTab />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
