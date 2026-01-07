import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Wrench, Download } from 'lucide-react';
import { useChartFilter } from '@/hooks/useChartFilter';
import { MaintenanceFiltersProvider, useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';
import { GlobalFiltersBar } from '@/components/analytics/maintenance/GlobalFiltersBar';
import { DrillDownControl, GranularityLevel } from '@/components/analytics/DrillDownControl';
import VazaoTab from '@/components/analytics/maintenance/VazaoTab';
// ProjecaoRepactuacaoTab removido da navegação principal - mover para Hub Financeiro se necessário
import AnaliseVeiculoTab from '@/components/analytics/maintenance/AnaliseVeiculoTab';
import LeadTimeTab from '@/components/analytics/maintenance/LeadTimeTab';
import CustosDetalhadosTab from '@/components/analytics/maintenance/CustosDetalhadosTab';
import AnalisePecasTab from '@/components/analytics/maintenance/AnalisePecasTab';
import { KPITooltip } from '@/components/analytics/KPITooltip';
import { OSDetailsModal } from '@/components/analytics/maintenance/OSDetailsModal';
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
function fmtCompact(v: number): string { if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`; if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`; return `R$ ${v.toFixed(0)}`; }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function getYearKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 4); }
function getDayKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0]; }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }
function yearLabel(y: string): string { return y || ''; }
function dayLabel(d: string): string { if (!d) return ''; const [, m, day] = d.split('-'); return `${day}/${m}`; }

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
  const { data: manutencaoCompletaRaw, loading: loadingCompleta } = useBIData<AnyObject[]>('fat_manutencao_completa.json');

  const { data: manutencaoUnificadoRaw } = useBIData<AnyObject[]>('fat_manutencao_unificado.json');
  const { data: faturamentoRaw } = useBIData<AnyObject[]>('fat_faturamentos_*.json');
  const { data: frotaRaw } = useBIData<AnyObject[]>('dim_frota.json');
  const { data: contratosRaw } = useBIData<AnyObject[]>('dim_contratos_locacao.json');

  const osList = useMemo(() => Array.isArray(osData) ? osData : [], [osData]);
  const manutencaoCompleta = useMemo(() => Array.isArray(manutencaoCompletaRaw) ? manutencaoCompletaRaw : [], [manutencaoCompletaRaw]);
  const manutencaoUnificado = useMemo(() => Array.isArray(manutencaoUnificadoRaw) ? manutencaoUnificadoRaw : [], [manutencaoUnificadoRaw]);
  const faturamentoData = useMemo(() => Array.isArray(faturamentoRaw) ? faturamentoRaw : [], [faturamentoRaw]);
  const frotaData = useMemo(() => Array.isArray(frotaRaw) ? frotaRaw : [], [frotaRaw]);
  const contratosData = useMemo(() => Array.isArray(contratosRaw) ? contratosRaw : [], [contratosRaw]);

  const { filters: globalFilters, setTimeGranularity } = useMaintenanceFilters();
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Modal de detalhes da OS
  const [selectedOS, setSelectedOS] = useState<AnyObject | null>(null);
  const [isOSModalOpen, setIsOSModalOpen] = useState(false);

  const { filters, handleChartFilter, isValueSelected, getFilterValues } = useChartFilter();

  const handleOSClick = (os: AnyObject) => {
    setSelectedOS(os);
    setIsOSModalOpen(true);
  };



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

  const filteredManutencaoCompleta = useMemo(() => {
    return manutencaoCompleta.filter((r: AnyObject) => {
      // Filtro de data range - usando DataEntradaOficina para manutenção completa
      if (globalFilters.dateRange?.from && r.DataEntradaOficina) {
        const dataEntrada = normalizeDate(r.DataEntradaOficina);
        const fromDate = new Date(globalFilters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);

        if (dataEntrada < fromDate) return false;

        if (globalFilters.dateRange.to) {
          const toDate = new Date(globalFilters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (dataEntrada > toDate) return false;
        }
      }

      // TODOS os filtros globais
      if (globalFilters.fornecedores.length > 0 && !globalFilters.fornecedores.includes(r.Fornecedor)) return false;
      if (globalFilters.modelos.length > 0 && !globalFilters.modelos.includes(r.Modelo)) return false;
      if (globalFilters.tiposOcorrencia.length > 0 && !globalFilters.tiposOcorrencia.includes(r.TipoOcorrencia)) return false;
      if (globalFilters.clientes.length > 0 && !globalFilters.clientes.includes(r.Cliente)) return false;
      if (globalFilters.placas.length > 0 && !globalFilters.placas.includes(r.Placa)) return false;

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
  }, [manutencaoCompleta, globalFilters]);

  const filteredManutencaoUnificado = useMemo(() => {
    // Data de hoje às 23:59:59 para filtrar datas futuras
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return manutencaoUnificado.filter((r: AnyObject) => {
      // CRÍTICO: Filtrar datas futuras ANTES de qualquer outro filtro
      if ((r as any).IsFuture === 1 || (r as any).IsFuture === '1') return false;
      if (!r.DataEvento && (r as any).DayKey === undefined && (r as any).DataEventoTs === undefined) return false;

      // Construir data efetiva para validações (usar DayKey > DataEvento > DataEventoTs)
      let dataEvento: Date | null = null;
      if ((r as any).DayKey) {
        const [y, m, d] = String((r as any).DayKey).split('-').map(Number);
        if (y && m && d) dataEvento = new Date(y, m - 1, d);
      } else if (r.DataEvento) {
        const dateStr = String(r.DataEvento).split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        dataEvento = new Date(year, month - 1, day);
      } else if ((r as any).DataEventoTs) {
        const ts = Number((r as any).DataEventoTs);
        if (!Number.isNaN(ts)) dataEvento = new Date(ts * 1000);
      }
      if (dataEvento && dataEvento > todayEnd) return false;

      // Filtro de data range (se houver)
      if (globalFilters.dateRange?.from && dataEvento) {
        const fromDate = new Date(globalFilters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        if (dataEvento < fromDate) return false;

        if (globalFilters.dateRange.to) {
          const toDate = new Date(globalFilters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (dataEvento > toDate) return false;
        }
      }

      // TODOS os filtros globais
      if (globalFilters.fornecedores.length > 0 && r.Fornecedor && !globalFilters.fornecedores.includes(r.Fornecedor)) return false;
      if (globalFilters.modelos.length > 0 && r.Modelo && !globalFilters.modelos.includes(r.Modelo)) return false;
      if (globalFilters.tiposOcorrencia.length > 0 && r.TipoOcorrencia && !globalFilters.tiposOcorrencia.includes(r.TipoOcorrencia)) return false;
      if (globalFilters.clientes.length > 0 && r.Cliente && !globalFilters.clientes.includes(r.Cliente)) return false;
      if (globalFilters.placas.length > 0 && r.Placa && !globalFilters.placas.includes(r.Placa)) return false;

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
  }, [manutencaoUnificado, globalFilters]);

  const kpis = useMemo(() => {
    const totalCost = filteredOS.reduce((s, r) => s + parseCurrency(r.ValorTotal), 0);
    const count = filteredOS.length;
    const avgCost = count > 0 ? totalCost / count : 0;
    const days = filteredOS.reduce((s, r) => s + parseNum(r.DiasParado), 0);
    const avgDays = count > 0 ? days / count : 0;
    const totalKm = filteredOS.reduce((s, r) => s + parseNum(r.Km), 0);
    const cpk = totalKm > 0 ? totalCost / totalKm : 0;
    const stopped = filteredOS.filter(r => parseNum(r.DiasParado) > 0).length;

    // NOVOS KPIs: MTTR, MTBF, Taxa de Reincidência
    // MTTR (Mean Time to Repair): Média de dias parado por OS concluída
    const osConcluidas = filteredOS.filter(r => r.DataSaida || r.DataConclusao);
    const mttr = osConcluidas.length > 0
      ? osConcluidas.reduce((s, r) => s + parseNum(r.DiasParado), 0) / osConcluidas.length
      : 0;

    // MTBF (Mean Time Between Failures): Intervalo médio entre OS por veículo
    const osByPlaca: Record<string, Date[]> = {};
    filteredOS.forEach(r => {
      if (r.Placa && r.DataEntrada) {
        if (!osByPlaca[r.Placa]) osByPlaca[r.Placa] = [];
        osByPlaca[r.Placa].push(normalizeDate(r.DataEntrada));
      }
    });

    let totalIntervalos = 0;
    let countIntervalos = 0;
    Object.values(osByPlaca).forEach(datas => {
      if (datas.length < 2) return;
      datas.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < datas.length; i++) {
        const diff = (datas[i].getTime() - datas[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        if (diff > 0) { totalIntervalos += diff; countIntervalos++; }
      }
    });
    const mtbf = countIntervalos > 0 ? totalIntervalos / countIntervalos : 0;

    // Taxa de Reincidência: OS do mesmo veículo em menos de 30 dias com mesmo tipo
    let reincidencias = 0;
    Object.keys(osByPlaca).forEach((placa) => {
      const osVeiculo = filteredOS.filter(r => r.Placa === placa).sort((a, b) => {
        const da = a.DataEntrada ? new Date(a.DataEntrada).getTime() : 0;
        const db = b.DataEntrada ? new Date(b.DataEntrada).getTime() : 0;
        return da - db;
      });
      for (let i = 1; i < osVeiculo.length; i++) {
        const current = osVeiculo[i];
        const prev = osVeiculo[i - 1];
        if (!current.DataEntrada || !prev.DataEntrada) continue;
        const diff = (new Date(current.DataEntrada).getTime() - new Date(prev.DataEntrada).getTime()) / (1000 * 60 * 60 * 24);
        if (diff <= 30 && current.TipoManutencao === prev.TipoManutencao) {
          reincidencias++;
        }
      }
    });
    const taxaReincidencia = count > 0 ? (reincidencias / count) * 100 : 0;

    // Preventiva vs Corretiva
    const osPreventiva = filteredOS.filter(r =>
      (r.TipoManutencao || '').toLowerCase().includes('preventiv') ||
      (r.TipoOcorrencia || '').toLowerCase().includes('preventiv')
    ).length;
    const osCorretiva = count - osPreventiva;
    const pctPreventiva = count > 0 ? (osPreventiva / count) * 100 : 0;

    return {
      totalCost, avgCost, avgDays, stopped, cpk, count,
      // Novos KPIs
      mttr, mtbf, taxaReincidencia, osPreventiva, osCorretiva, pctPreventiva
    };
  }, [filteredOS]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { Valor: number; Count: number }> = {};
    const getKeyFn = globalFilters.timeGranularity === 'year' ? getYearKey : globalFilters.timeGranularity === 'day' ? getDayKey : getMonthKey;
    const getLabelFn = globalFilters.timeGranularity === 'year' ? yearLabel : globalFilters.timeGranularity === 'day' ? dayLabel : monthLabel;

    filteredOS.forEach(r => {
      const k = getKeyFn(r.DataEntrada);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Count: 0 };
      map[k].Valor += parseCurrency(r.ValorTotal);
      map[k].Count += 1;
    });

    const sortedKeys = Object.keys(map).sort();
    const limitedKeys = globalFilters.timeGranularity === 'day' ? sortedKeys.slice(-90) : globalFilters.timeGranularity === 'month' ? sortedKeys.slice(-24) : sortedKeys;

    return limitedKeys.map(k => ({ date: k, label: getLabelFn(k), ...map[k] }));
  }, [filteredOS, globalFilters.timeGranularity]);

  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOS.forEach(r => { const t = r.TipoManutencao || 'Outros'; map[t] = (map[t] || 0) + parseCurrency(r.ValorTotal); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredOS]);

  const topOffenders = useMemo(() => {
    const map: Record<string, { valor: number; count: number }> = {};
    filteredOS.forEach(r => { const p = r.Placa || 'N/D'; if (!map[p]) map[p] = { valor: 0, count: 0 }; map[p].valor += parseCurrency(r.ValorTotal); map[p].count += 1; });
    return Object.entries(map).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [filteredOS]);

  const topFornecedores = useMemo(() => {
    const map: Record<string, { valor: number; count: number }> = {};
    filteredOS.forEach(r => { const f = r.Fornecedor || 'N/D'; if (!map[f]) map[f] = { valor: 0, count: 0 }; map[f].valor += parseCurrency(r.ValorTotal); map[f].count += 1; });
    return Object.entries(map).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [filteredOS]);

  // Lists for filters
  const fornecedoresList = useMemo(() => [...new Set([...osList.map(o => o.Fornecedor), ...manutencaoCompleta.map(m => m.Fornecedor)].filter(Boolean))], [osList, manutencaoCompleta]);
  const tiposOcorrenciaList = useMemo(() => [...new Set(manutencaoCompleta.map(m => m.TipoOcorrencia).filter(Boolean))], [manutencaoCompleta]);
  const clientesList = useMemo(() => [...new Set([...faturamentoData.map(f => f.Cliente), ...manutencaoCompleta.map(m => m.Cliente)].filter(Boolean))], [faturamentoData, manutencaoCompleta]);
  const modelosList = useMemo(() => [...new Set(manutencaoCompleta.map(m => m.Modelo).filter(Boolean))], [manutencaoCompleta]);
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

  const tabs = ['Visão Geral', 'Performance', 'Custos', 'Fluxo', 'Peças', 'Detalhamento'];

  const isLoading = loading || loadingCompleta;

  if (isLoading) return <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center"><div className="animate-pulse text-slate-500">Carregando dados de manutenção...</div></div>;

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Gestão de Manutenção</Title><Text className="text-slate-500">Controle de custos, oficinas e eficiência</Text></div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex gap-2 font-medium hover:bg-emerald-200 transition-all">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full flex gap-2 font-medium"><Wrench className="w-4 h-4" /> Hub Operacional</div>

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

      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit flex-wrap">
        {tabs.map((tab, idx) => (
          <button key={idx} onClick={() => setActiveTab(idx)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === idx ? 'bg-white shadow text-amber-600' : 'text-slate-600 hover:text-slate-900'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="space-y-6">
          {/* KPIs Principais - 2 linhas compactas */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <Card decoration="top" decorationColor="amber"><Text>Custo Total</Text><Metric>{fmtCompact(kpis.totalCost)}</Metric><Text className="text-xs text-slate-400">{kpis.count} OS</Text></Card>
            <Card decoration="top" decorationColor="blue"><Text>Ticket Médio</Text><Metric>{fmtBRL(kpis.avgCost)}</Metric></Card>
            <Card decoration="top" decorationColor="emerald">
              <div className="flex items-center">
                <Text>MTTR</Text>
                <KPITooltip
                  title="MTTR - Mean Time to Repair"
                  description="Tempo médio de reparo das ordens de serviço concluídas. Indica a eficiência operacional das oficinas."
                  formula="avg(dias_parado) para OS concluídas"
                  benchmark="< 3 dias = Excelente | 3-5 dias = Bom | > 5 dias = Atenção"
                />
              </div>
              <Metric>{kpis.mttr.toFixed(1)}d</Metric>
              <Text className="text-xs text-slate-400">Tempo médio reparo</Text>
            </Card>
            <Card decoration="top" decorationColor="cyan">
              <div className="flex items-center">
                <Text>MTBF</Text>
                <KPITooltip
                  title="MTBF - Mean Time Between Failures"
                  description="Intervalo médio em dias entre manutenções do mesmo veículo. Quanto maior, melhor a confiabilidade da frota."
                  formula="avg(dias_entre_OS) por veículo"
                  benchmark="> 90 dias = Excelente | 60-90 dias = Bom | < 60 dias = Atenção"
                />
              </div>
              <Metric>{kpis.mtbf.toFixed(0)}d</Metric>
              <Text className="text-xs text-slate-400">Entre falhas</Text>
            </Card>
            <Card decoration="top" decorationColor={kpis.taxaReincidencia <= 5 ? 'emerald' : kpis.taxaReincidencia <= 15 ? 'amber' : 'rose'}>
              <div className="flex items-center">
                <Text>Reincidência</Text>
                <KPITooltip
                  title="Taxa de Reincidência"
                  description="Percentual de OS do mesmo tipo que ocorrem em menos de 30 dias no mesmo veículo. Indica qualidade do reparo."
                  formula="(OS_repetidas_<30d / total_OS) * 100"
                  benchmark="< 5% = Excelente | 5-15% = Aceitável | > 15% = Crítico"
                />
              </div>
              <Metric className={kpis.taxaReincidencia <= 5 ? 'text-emerald-600' : kpis.taxaReincidencia <= 15 ? 'text-amber-600' : 'text-rose-600'}>{kpis.taxaReincidencia.toFixed(1)}%</Metric>
            </Card>
          </div>

          {/* Mini-cards Preventiva/Corretiva + Em Manutenção */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-gradient-to-br from-emerald-50 to-white">
              <div className="flex items-center justify-between">
                <div><Text className="font-medium">Preventiva</Text><Metric className="text-emerald-600">{kpis.osPreventiva}</Metric></div>
                <div className="text-right"><Text className="text-xs text-slate-500">{kpis.pctPreventiva.toFixed(0)}%</Text></div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-rose-50 to-white">
              <div className="flex items-center justify-between">
                <div><Text className="font-medium">Corretiva</Text><Metric className="text-rose-600">{kpis.osCorretiva}</Metric></div>
                <div className="text-right"><Text className="text-xs text-slate-500">{(100 - kpis.pctPreventiva).toFixed(0)}%</Text></div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-white">
              <div className="flex items-center justify-between">
                <div><Text className="font-medium">Em Manutenção</Text><Metric className="text-amber-600">{kpis.stopped}</Metric></div>
                <div className="text-right"><Text className="text-xs text-slate-500">veículos</Text></div>
              </div>
            </Card>
          </div>

          {/* Gráficos lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <Title>Evolução de Custos</Title>
                <DrillDownControl currentLevel={globalFilters.timeGranularity} onLevelChange={(level: GranularityLevel) => setTimeGranularity(level)} />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis yAxisId="left" fontSize={11} tickFormatter={fmtCompact} />
                    <YAxis yAxisId="right" orientation="right" fontSize={11} />
                    <Tooltip formatter={(v: any, n) => [n === 'Valor' ? fmtBRL(v) : v, n]} />
                    <Bar yAxisId="left" dataKey="Valor" fill="#f59e0b" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d, _, e) => handleChartClick('mes', d.date, e as unknown as React.MouseEvent)}>
                      {monthlyData.map((entry) => (<Cell key={entry.date} fill={isValueSelected('mes', entry.date) ? '#d97706' : '#f59e0b'} />))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="Count" stroke="#3b82f6" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <Title>Top 10 Ofensores</Title>
              <div className="mt-4 space-y-1.5 max-h-64 overflow-y-auto">
                {topOffenders.map((item, idx) => (
                  <div key={idx} onClick={(e) => handleChartClick('placa', item.name, e)} className={`p-2 rounded cursor-pointer flex justify-between text-sm ${isValueSelected('placa', item.name) ? 'bg-amber-100 ring-1 ring-amber-500' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                      <span className="font-mono text-xs">{item.name}</span>
                      <span className="text-slate-400 text-xs">({item.count})</span>
                    </div>
                    <span className="font-bold text-amber-600 text-xs">{fmtCompact(item.valor)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Distribuição por Tipo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Custo por Tipo</Title>
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" cursor="pointer" onClick={(d, _, e) => handleChartClick('tipo', d.name, e as unknown as React.MouseEvent)}>
                      {typeData.map((entry, i) => (<Cell key={i} fill={isValueSelected('tipo', entry.name) ? '#b45309' : ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#64748b'][i % 6]} />))}
                    </Pie>
                    <Tooltip formatter={fmtBRL} /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <Title>Top 10 Fornecedores</Title>
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topFornecedores} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={10} tickFormatter={fmtCompact} />
                    <YAxis dataKey="name" type="category" width={120} fontSize={9} />
                    <Tooltip formatter={(v: any) => fmtBRL(v)} />
                    <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={14} cursor="pointer" onClick={(d, _, e) => handleChartClick('oficina', d.name, e as unknown as React.MouseEvent)}>
                      {topFornecedores.map((entry) => (<Cell key={entry.name} fill={isValueSelected('oficina', entry.name) ? '#b45309' : '#f59e0b'} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Aba Performance = antigo Lead Time */}
      {activeTab === 1 && <LeadTimeTab manutencaoData={filteredManutencaoCompleta} />}

      {/* Aba Custos */}
      {activeTab === 2 && <CustosDetalhadosTab manutencaoData={filteredManutencaoCompleta} />}

      {/* Aba Fluxo = antigo Vazão */}
      {activeTab === 3 && <VazaoTab vazaoData={filteredManutencaoUnificado} />}

      {/* Aba Peças = Nova aba de análise de peças */}
      {activeTab === 4 && <AnalisePecasTab />}

      {/* Aba Detalhamento = antiga Detalhamento + Por Veículo */}
      {activeTab === 5 && (
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
                    <tr
                      key={idx}
                      className="border-t hover:bg-amber-50 cursor-pointer transition-colors"
                      onClick={() => handleOSClick(r)}
                    >
                      <td className="p-2 text-xs">{r.DataEntrada ? new Date(r.DataEntrada).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className={`p-2 font-mono text-xs hover:text-amber-600 ${isValueSelected('placa', r.Placa) ? 'text-amber-600 font-bold' : ''}`} onClick={(e) => { e.stopPropagation(); handleChartClick('placa', r.Placa, e); }}>{r.Placa}</td>
                      <td className="p-2 truncate max-w-[100px] text-xs">{r.Modelo || '-'}</td>
                      <td className={`p-2 truncate max-w-[120px] text-xs hover:text-amber-600 ${isValueSelected('oficina', r.Fornecedor) ? 'text-amber-600 font-bold' : ''}`} onClick={(e) => { e.stopPropagation(); handleChartClick('oficina', r.Fornecedor, e); }}>{r.Fornecedor || '-'}</td>
                      <td className={`p-2 truncate max-w-[80px] text-xs hover:text-amber-600 ${isValueSelected('tipo', r.TipoManutencao) ? 'text-amber-600 font-bold' : ''}`} onClick={(e) => { e.stopPropagation(); handleChartClick('tipo', r.TipoManutencao, e); }}>{r.TipoManutencao || '-'}</td>
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
      )}

      {/* Modal de Detalhes da OS */}
      {selectedOS && (
        <OSDetailsModal
          isOpen={isOSModalOpen}
          onClose={() => setIsOSModalOpen(false)}
          osData={selectedOS}
        />
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
