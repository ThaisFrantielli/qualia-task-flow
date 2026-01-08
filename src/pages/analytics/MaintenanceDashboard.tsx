import { useMemo, useState, lazy, Suspense } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text } from '@tremor/react';
import { Wrench, Download } from 'lucide-react';
import { useChartFilter } from '@/hooks/useChartFilter';
import { MaintenanceFiltersProvider, useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';
import { GlobalFiltersBar } from '@/components/analytics/maintenance/GlobalFiltersBar';

import useMaintenanceAlerts from '@/hooks/useMaintenanceAlerts';

// Lazy loading das abas para melhor performance
const VisaoGeralTab = lazy(() => import('@/components/analytics/maintenance/VisaoGeralTab'));
const OperacionalTab = lazy(() => import('@/components/analytics/maintenance/OperacionalTab'));
const LeadTimeTabNew = lazy(() => import('@/components/analytics/maintenance/LeadTimeTabNew'));
const CustosROITab = lazy(() => import('@/components/analytics/maintenance/CustosROITab'));
const AuditoriaTab = lazy(() => import('@/components/analytics/maintenance/AuditoriaTab'));
const AnaliseVeiculoTab = lazy(() => import('@/components/analytics/maintenance/AnaliseVeiculoTab'));
const WorkflowTab = lazy(() => import('@/components/analytics/maintenance/WorkflowTab'));
const FluxoTab = lazy(() => import('@/components/analytics/maintenance/FluxoTab'));

type AnyObject = { [k: string]: any };

// Função para normalizar data para meia-noite no timezone local (evita problemas de UTC)
function normalizeDate(dateString: string): Date {
  // Se a string já tem horário, pega apenas a parte da data
  const dateOnly = dateString.split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  // Cria data no timezone local (não UTC)
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function parseNum(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }

function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }


// Map raw status strings into categories used by filters: Produtiva, Improdutiva, Inativa
function getCategoryFromStatus(status: string | undefined | null): 'Produtiva' | 'Improdutiva' | 'Inativa' {
  const s = (status || '').toUpperCase();
  if (['LOCADO', 'LOCADO VEÍCULO RESERVA', 'USO INTERNO', 'EM MOBILIZAÇÃO', 'EM MOBILIZACAO'].includes(s)) return 'Produtiva';
  if ([
    'DEVOLVIDO', 'ROUBO / FURTO', 'BAIXADO', 'VENDIDO', 'SINISTRO PERDA TOTAL',
    'DISPONIVEL PRA VENDA', 'DISPONIVEL PARA VENDA', 'DISPONÍVEL PARA VENDA', 'DISPONÍVEL PRA VENDA',
    'NÃO DISPONÍVEL', 'NAO DISPONIVEL', 'NÃO DISPONIVEL', 'NAO DISPONÍVEL',
    'EM DESMOBILIZAÇÃO', 'EM DESMOBILIZACAO'
  ].includes(s)) return 'Inativa';
  return 'Improdutiva';
}
function MaintenanceDashboardContent(): JSX.Element {
  const { data: osData, loading } = useBIData<AnyObject[]>('fat_manutencao_unificado.json');
  
  const { data: faturamentoRaw } = useBIData<AnyObject[]>('fat_faturamentos_*.json');
  const { data: frotaRaw } = useBIData<AnyObject[]>('dim_frota.json');
  const { data: contratosRaw } = useBIData<AnyObject[]>('dim_contratos_locacao.json');
  // Histórico de situação de veículos (gestão de pátio / monitoramento)
  const { data: historicoRaw } = useBIData<AnyObject[]>('historico_situacao_veiculos.json');

  const osList = useMemo(() => {
    if (!Array.isArray(osData)) return [];
    // Validações de campos null e defaults (preserva TODOS os campos originais)
    return osData.map((os: any) => ({
      ...os, // Mantém TODOS os campos originais (Placa, DataEntrada, etc)
      Modelo: os.Modelo || 'N/D',
      Fornecedor: os.Fornecedor || 'N/D',
      Cliente: os.Cliente || 'N/D',
      TipoOcorrencia: os.TipoOcorrencia || 'Outros',
      TipoManutencao: os.TipoManutencao || 'Outros',
      CategoriaVeiculo: os.CategoriaVeiculo || 'N/D',
      ValorTotal: os.ValorTotal ?? 0,
      DiasParado: os.DiasParado ?? os.LeadTimeTotalDias ?? 0
    }));
  }, [osData]);

  const faturamentoData = useMemo(() => Array.isArray(faturamentoRaw) ? faturamentoRaw : [], [faturamentoRaw]);
  const frotaData = useMemo(() => Array.isArray(frotaRaw) ? frotaRaw : [], [frotaRaw]);
  const contratosData = useMemo(() => Array.isArray(contratosRaw) ? contratosRaw : [], [contratosRaw]);
  const historicoData = useMemo(() => Array.isArray(historicoRaw) ? historicoRaw : [], [historicoRaw]);

  const { filters: globalFilters } = useMaintenanceFilters();
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { filters, handleChartClick, isValueSelected, getFilterValues } = useChartFilter();



  const filteredOS = useMemo(() => {
    return osList.filter((r: AnyObject) => {
      const mesFilters = getFilterValues('mes');
      const oficinaFilters = getFilterValues('oficina');
      const placaFilters = getFilterValues('placa');
      const tipoFilters = getFilterValues('tipo');
      
      // Filtro de data range (do Context) - aplica a DataEntrada (data de chegada na oficina)
      if (globalFilters.dateRange?.from && r.DataEntrada) {
        const dataEntrada = normalizeDate(r.DataEntrada);
        const fromDate = new Date(globalFilters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        
        if (dataEntrada < fromDate) return false;
        
        if (globalFilters.dateRange.to) {
          const toDate = new Date(globalFilters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (dataEntrada > toDate) return false;
        }
      }
      
      // TODOS os filtros globais do Context
      if (globalFilters.fornecedores.length > 0 && !globalFilters.fornecedores.includes(r.Fornecedor)) return false;
      if (globalFilters.modelos.length > 0 && !globalFilters.modelos.includes(r.Modelo)) return false;
      if (globalFilters.tiposOcorrencia.length > 0 && !globalFilters.tiposOcorrencia.includes(r.TipoOcorrencia)) return false;
      if (globalFilters.clientes.length > 0 && !globalFilters.clientes.includes(r.Cliente)) return false;
      if (globalFilters.placas.length > 0 && !globalFilters.placas.includes(r.Placa)) return false;
      
      // Filtros do useChartFilter (mantidos para drill-down interativo)
      if (mesFilters.length > 0 && !mesFilters.includes(getMonthKey(r.DataEntrada))) return false;
      if (oficinaFilters.length > 0 && !oficinaFilters.includes(r.Fornecedor)) return false;
      if (placaFilters.length > 0 && !placaFilters.includes(r.Placa)) return false;
      if (tipoFilters.length > 0 && !tipoFilters.includes(r.TipoManutencao)) return false;

      // Filtro por status (opcional) - utiliza r.Status quando disponível
      if (globalFilters.status && globalFilters.status !== 'Todos') {
        const rawStatus = r.Status || r.Situacao || r.StatusManutencao || '';
        const cat = getCategoryFromStatus(rawStatus);
        if (globalFilters.status === 'Ativa') {
          if (!(cat === 'Produtiva' || cat === 'Improdutiva')) return false;
        } else {
          if (cat !== globalFilters.status) return false;
        }
      }
      return true;
    });
  }, [osList, globalFilters, filters, getFilterValues]);

  // Lists for filters (agora usando apenas osList unificado)
  const fornecedoresList = useMemo(() => [...new Set(osList.map(o => o.Fornecedor).filter(Boolean))].sort(), [osList]);
  const tiposOcorrenciaList = useMemo(() => [...new Set(osList.map(m => m.TipoOcorrencia).filter(Boolean))].sort(), [osList]);
  const clientesList = useMemo(() => [...new Set([...faturamentoData.map(f => f.Cliente), ...osList.map(m => m.Cliente)].filter(Boolean))].sort(), [faturamentoData, osList]);
  const modelosList = useMemo(() => [...new Set(osList.map(m => m.Modelo).filter(Boolean))].sort(), [osList]);
  const contratosComerciais = useMemo(() => [...new Set(contratosData.map(c => c.NumeroContrato).filter(Boolean))], [contratosData]);
  const contratosLocacao = useMemo(() => {
    // Contratos de locação podem ter formato LOC-XXXX ou ser apenas o ID numérico
    const arr = contratosData
      .map(c => {
        const raw = c.IdContratoLocacao;
        if (!raw) return null;
        const loc = String(raw).trim();
        return loc.startsWith('LOC-') ? loc : `LOC-${loc}`;
      })
      .filter((v): v is string => typeof v === 'string');

    return [...new Set(arr)].sort();
  }, [contratosData]);
  const placasList = useMemo(() => [...new Set([...frotaData.map(f => f.Placa), ...osList.map(o => o.Placa)].filter(Boolean))], [frotaData, osList]);

  const pageItems = useMemo(() => filteredOS.slice(page * pageSize, (page + 1) * pageSize), [filteredOS, page]);
  const totalPages = Math.ceil(filteredOS.length / pageSize);

  const exportCSV = () => {
    const headers = ['DataEntrada', 'Placa', 'Modelo', 'Fornecedor', 'TipoManutencao', 'ValorTotal', 'DiasParado', 'Km'];
    const rows = filteredOS.map(r => headers.map(h => r[h] || '').join(';'));
    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'manutencao_os.csv';
    link.click();
  };

  const tabs = ['Visão Geral', 'Operacional', 'Performance & SLA', 'Custos & ROI', 'Workflow', 'Fluxo', 'Auditoria', 'Detalhamento'];

  // Hook de alertas para badge
  const { resumo, temAlertasCriticos } = useMaintenanceAlerts();

  if (loading) return <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center"><div className="animate-pulse text-slate-500">Carregando dados de manutenção...</div></div>;

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Gestão de Manutenção</Title><Text className="text-slate-500">Controle de custos, oficinas e eficiência</Text></div>
        <div className="flex items-center gap-3">
          {temAlertasCriticos && (
            <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full flex gap-2 font-medium animate-pulse">
              <span className="text-lg font-bold">{resumo.criticos}</span>
              <span>Alertas Críticos</span>
            </div>
          )}
          <button onClick={exportCSV} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex gap-2 font-medium hover:bg-emerald-200 transition-all">
            <Download className="w-4 h-4"/> Exportar
          </button>
          <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full flex gap-2 font-medium"><Wrench className="w-4 h-4"/> Hub Operacional</div>
          
        </div>
      </div>

      <GlobalFiltersBar
        fornecedoresList={fornecedoresList}
        tiposOcorrenciaList={tiposOcorrenciaList}
        clientesList={clientesList}
        modelosList={modelosList}
        contratosComerciais={contratosComerciais}
        contratosLocacao={contratosLocacao}
        placasList={placasList}
      />

      {/* Indicador rápido de histórico de situação (gestão de pátio) */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <Title className="text-sm">Registros Histórico (DW)</Title>
              <Text className="text-xs text-slate-500">Últimos eventos de situação / localização</Text>
            </div>
            <div className="text-amber-600 font-bold text-lg">{historicoData.length ?? 0}</div>
          </div>
        </Card>
      </div>

      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit flex-wrap">
        {tabs.map((tab, idx) => (
          <button key={idx} onClick={() => setActiveTab(idx)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === idx ? 'bg-white shadow text-amber-600' : 'text-slate-600 hover:text-slate-900'}`}>{tab}</button>
        ))}
      </div>

      {/* Aba Visão Geral - NOVO COMPONENTE */}
      {activeTab === 0 && (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-pulse text-slate-500">Carregando visão geral...</div></div>}>
          <VisaoGeralTab />
        </Suspense>
      )}

      {/* Aba Operacional - NOVO COMPONENTE */}
      {activeTab === 1 && (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-pulse text-slate-500">Carregando monitoramento...</div></div>}>
          <OperacionalTab />
        </Suspense>
      )}

      {/* Aba Performance & SLA - NOVO COMPONENTE */}
      {activeTab === 2 && (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-pulse text-slate-500">Carregando performance...</div></div>}>
          <LeadTimeTabNew />
        </Suspense>
      )}

      {/* Aba Custos & ROI - NOVO COMPONENTE */}
      {activeTab === 3 && (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-pulse text-slate-500">Carregando custos...</div></div>}>
          <CustosROITab />
        </Suspense>
      )}

      {/* Aba Workflow - REFATORADO */}
      {activeTab === 4 && (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-pulse text-slate-500">Carregando workflow...</div></div>}>
          <WorkflowTab />
        </Suspense>
      )}

      {/* Aba Fluxo - NOVO COMPONENTE */}
      {activeTab === 5 && (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-pulse text-slate-500">Carregando análise de fluxo...</div></div>}>
          <FluxoTab />
        </Suspense>
      )}

      {/* Aba Auditoria - NOVO COMPONENTE */}
      {activeTab === 6 && (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-pulse text-slate-500">Carregando auditoria...</div></div>}>
          <AuditoriaTab />
        </Suspense>
      )}

      {/* Aba Detalhamento */}
      {activeTab === 7 && (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-pulse text-slate-500">Carregando detalhamento...</div></div>}>
          <div className="space-y-6">
            <AnaliseVeiculoTab frotaData={frotaData} contratosData={contratosData} manutencaoData={osList} />
          
          <Card>
            <div className="flex items-center justify-between mb-4"><Title>Detalhamento de OS</Title><Text className="text-slate-500">{filteredOS.length} registros</Text></div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 sticky top-0">
                  <tr><th className="p-2">Data</th><th className="p-2">Placa</th><th className="p-2">Modelo</th><th className="p-2">Fornecedor</th><th className="p-2">Tipo</th><th className="p-2 text-right">Dias</th><th className="p-2 text-right">Valor</th></tr>
                </thead>
                <tbody>
                  {pageItems.map((r, idx) => (
                    <tr key={idx} className="border-t hover:bg-slate-50">
                      <td className="p-2 text-xs">{r.DataEntrada ? new Date(r.DataEntrada).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className={`p-2 font-mono text-xs cursor-pointer hover:text-amber-600 ${isValueSelected('placa', r.Placa) ? 'text-amber-600 font-bold' : ''}`} onClick={(e) => handleChartClick('placa', r.Placa, e)}>{r.Placa}</td>
                      <td className="p-2 truncate max-w-[100px] text-xs">{r.Modelo || '-'}</td>
                      <td className={`p-2 truncate max-w-[120px] text-xs cursor-pointer hover:text-amber-600 ${isValueSelected('oficina', r.Fornecedor) ? 'text-amber-600 font-bold' : ''}`} onClick={(e) => handleChartClick('oficina', r.Fornecedor, e)}>{r.Fornecedor || '-'}</td>
                      <td className={`p-2 truncate max-w-[80px] text-xs cursor-pointer hover:text-amber-600 ${isValueSelected('tipo', r.TipoManutencao) ? 'text-amber-600 font-bold' : ''}`} onClick={(e) => handleChartClick('tipo', r.TipoManutencao, e)}>{r.TipoManutencao || '-'}</td>
                      <td className="p-2 text-right text-xs">{parseNum(r.DiasParado)}</td>
                      <td className="p-2 text-right font-bold text-amber-600 text-xs">{fmtBRL(parseCurrency(r.ValorTotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Text className="text-slate-500 text-xs">Página {page + 1} de {totalPages}</Text>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-xs">Anterior</button>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-xs">Próxima</button>
                </div>
              </div>
            )}
          </Card>
        </div>
        </Suspense>
      )}
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
