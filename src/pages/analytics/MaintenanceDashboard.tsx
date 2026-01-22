import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlobalFiltersBar } from '@/components/analytics/maintenance/GlobalFiltersBar';
import { MaintenanceFiltersProvider } from '@/contexts/MaintenanceFiltersContext';
import useBIData from '@/hooks/useBIData';
import VisaoGeralTab from '@/components/analytics/maintenance/VisaoGeralTab';
import OperacionalTab from '@/components/analytics/maintenance/OperacionalTab';
import LeadTimeTabNew from '@/components/analytics/maintenance/LeadTimeTabNew';
import CustosROITab from '@/components/analytics/maintenance/CustosROITab';
import WorkflowTab from '@/components/analytics/maintenance/WorkflowTab';
import FluxoTab from '@/components/analytics/maintenance/FluxoTab';
import TimelineTab from '@/components/analytics/maintenance/TimelineTab';
import AuditoriaTab from '@/components/analytics/maintenance/AuditoriaTab';
import DetailTab from '@/components/analytics/maintenance/DetailTab';

type ManutencaoUnificado = {
  Ocorrencia: number;
  Tipo: string;
  Fornecedor: string;
  Placa: string;
  Modelo: string;
  Cliente: string;
  ContratoComercial: string;
  ContratoLocacao: string;
};

function MaintenanceDashboardContent() {
  const { data: manutencoes = [], loading } = useBIData<ManutencaoUnificado[]>('fat_manutencao_unificado.json');

  // Extrair listas únicas de todas as dimensões
  const fornecedores = React.useMemo(() => {
    if (!manutencoes || !Array.isArray(manutencoes)) return [];
    return [...new Set(manutencoes.map(m => m.Fornecedor).filter(Boolean))].sort();
  }, [manutencoes]);

  const tiposOcorrencia = React.useMemo(() => {
    if (!manutencoes || !Array.isArray(manutencoes)) return [];
    return [...new Set(manutencoes.map(m => m.Tipo).filter(Boolean))].sort();
  }, [manutencoes]);

  const clientes = React.useMemo(() => {
    if (!manutencoes || !Array.isArray(manutencoes)) return [];
    return [...new Set(manutencoes.map(m => m.Cliente).filter(Boolean))].sort();
  }, [manutencoes]);

  const modelos = React.useMemo(() => {
    if (!manutencoes || !Array.isArray(manutencoes)) return [];
    return [...new Set(manutencoes.map(m => m.Modelo).filter(Boolean))].sort();
  }, [manutencoes]);

  const contratosComerciais = React.useMemo(() => {
    if (!manutencoes || !Array.isArray(manutencoes)) return [];
    return [...new Set(manutencoes.map(m => m.ContratoComercial).filter(Boolean))].sort();
  }, [manutencoes]);

  const contratosLocacao = React.useMemo(() => {
    if (!manutencoes || !Array.isArray(manutencoes)) return [];
    return [...new Set(manutencoes.map(m => m.ContratoLocacao).filter(Boolean))].sort();
  }, [manutencoes]);

  const placas = React.useMemo(() => {
    if (!manutencoes || !Array.isArray(manutencoes)) return [];
    return [...new Set(manutencoes.map(m => m.Placa).filter(Boolean))].sort();
  }, [manutencoes]);

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center">
        <div className="text-slate-600">Carregando dados de manutenção...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      <div className="max-w-[1400px] mx-auto">
        <GlobalFiltersBar 
          fornecedoresList={fornecedores}
          tiposOcorrenciaList={tiposOcorrencia}
          clientesList={clientes}
          modelosList={modelos}
          contratosComerciais={contratosComerciais}
          contratosLocacao={contratosLocacao}
          placasList={placas}
        />

        <Tabs defaultValue="visao-geral" className="space-y-6 mt-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="operacional">Operacional</TabsTrigger>
            <TabsTrigger value="performance">Performance & SLA</TabsTrigger>
            <TabsTrigger value="custos">Custos & ROI</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="fluxo">Fluxo</TabsTrigger>
            <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
            <TabsTrigger value="detalhamento">Detalhamento</TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral">
            <VisaoGeralTab />
          </TabsContent>

          <TabsContent value="operacional">
            <OperacionalTab />
          </TabsContent>

          <TabsContent value="performance">
            <LeadTimeTabNew />
          </TabsContent>

          <TabsContent value="custos">
            <CustosROITab />
          </TabsContent>

          <TabsContent value="workflow">
            <WorkflowTab />
          </TabsContent>

          <TabsContent value="fluxo">
            <FluxoTab />
          </TabsContent>

          <TabsContent value="timeline">
            <TimelineTab />
          </TabsContent>

          <TabsContent value="auditoria">
            <AuditoriaTab />
          </TabsContent>

          <TabsContent value="detalhamento">
            <DetailTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function MaintenanceDashboard(): JSX.Element {
  return (
    <MaintenanceFiltersProvider>
      <MaintenanceDashboardContent />
    </MaintenanceFiltersProvider>
  );
}
