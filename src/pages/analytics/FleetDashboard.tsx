import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, BarChart, Bar, LineChart, Line } from 'recharts';
import { Car, Activity, Filter, X, TrendingUp, TrendingDown, HelpCircle, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function parseNum(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number) { 
  if (Math.abs(v) >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  return `R$ ${(v / 1000).toFixed(0)}k`; 
}
function fmtPercent(v: number) { return `${v.toFixed(1)}%`; }

const COLORS_STATUS = {
  'Locado': '#10b981',
  'Disponível': '#3b82f6',
  'Manutenção': '#f59e0b',
  'Parado': '#ef4444',
  'Reserva': '#8b5cf6'
};

const UTILIZATION_COLORS = {
  excellent: '#10b981',
  good: '#3b82f6',
  regular: '#f59e0b',
  critical: '#ef4444'
};

function getUtilizationLevel(pct: number): { label: string; color: string; bg: string } {
  if (pct >= 90) return { label: 'Excelente', color: 'text-emerald-700', bg: 'bg-emerald-100' };
  if (pct >= 70) return { label: 'Bom', color: 'text-blue-700', bg: 'bg-blue-100' };
  if (pct >= 50) return { label: 'Regular', color: 'text-amber-700', bg: 'bg-amber-100' };
  return { label: 'Crítico', color: 'text-red-700', bg: 'bg-red-100' };
}

export default function FleetDashboard(): JSX.Element {
  const { data: frotaData, loading: loadingFrota } = useBIData<AnyObject[]>('dim_frota.json');
  const { data: manutencaoData } = useBIData<AnyObject[]>('fat_manutencao_os_*.json');
  const { data: contratosData } = useBIData<AnyObject[]>('dim_contratos.json');

  const frota = useMemo(() => Array.isArray(frotaData) ? frotaData : [], [frotaData]);
  const manutencao = useMemo(() => {
    const raw = (manutencaoData as any)?.data ?? manutencaoData;
    return Array.isArray(raw) ? raw : [];
  }, [manutencaoData]);
  const contratos = useMemo(() => {
    const raw = (contratosData as any)?.data ?? contratosData;
    return Array.isArray(raw) ? raw : [];
  }, [contratosData]);

  const [filterState, setFilterState] = useState<{ status: string | null; modelo: string | null }>({ status: null, modelo: null });
  const [page, setPage] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'Placa', dir: 'asc' });
  const pageSize = 15;

  const hasActiveFilters = !!(filterState.status || filterState.modelo);
  const modelos = useMemo(() => Array.from(new Set(frota.map(r => r.Modelo).filter(Boolean))).sort(), [frota]);

  const filteredData = useMemo(() => {
    return frota.filter(r => {
      if (filterState.status && r.Status !== filterState.status) return false;
      if (filterState.modelo && r.Modelo !== filterState.modelo) return false;
      return true;
    });
  }, [frota, filterState]);

  // Calcular custos de manutenção por placa
  const manutencaoByPlaca = useMemo(() => {
    const map: Record<string, number> = {};
    manutencao.forEach((m: any) => {
      const placa = m.Placa;
      if (placa) {
        map[placa] = (map[placa] || 0) + parseCurrency(m.ValorTotal);
      }
    });
    return map;
  }, [manutencao]);

  // Calcular dias locados e receita por placa
  const contratosByPlaca = useMemo(() => {
    const map: Record<string, { diasLocado: number; receita: number; contratos: number }> = {};
    const hoje = new Date();
    
    contratos.forEach((c: any) => {
      const placa = c.Placa;
      if (!placa) return;
      
      const inicio = c.DataInicio ? new Date(c.DataInicio) : null;
      const fim = c.DataFim ? new Date(c.DataFim) : hoje;
      const valorMensal = parseCurrency(c.ValorMensal);
      
      if (inicio) {
        const dias = Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
        const meses = dias / 30;
        
        if (!map[placa]) map[placa] = { diasLocado: 0, receita: 0, contratos: 0 };
        map[placa].diasLocado += dias;
        map[placa].receita += valorMensal * meses;
        map[placa].contratos += 1;
      }
    });
    return map;
  }, [contratos]);

  // Valor mensal médio dos contratos
  const valorMensalMedio = useMemo(() => {
    const ativos = contratos.filter((c: any) => c.StatusContrato === 'Ativo' || !c.DataFim);
    if (ativos.length === 0) return 3500; // fallback
    return ativos.reduce((s: number, c: any) => s + parseCurrency(c.ValorMensal), 0) / ativos.length;
  }, [contratos]);

  // Dados enriquecidos por veículo
  const enrichedData = useMemo(() => {
    const periodoAnalise = 365;
    
    return filteredData.map(v => {
      const placa = v.Placa as string;
      const valorCompra = parseCurrency(v.ValorCompra);
      const valorFipe = parseCurrency(v.ValorFipeAtual);
      const depreciacao = valorCompra - valorFipe;
      const custoManut = manutencaoByPlaca[placa] || 0;
      const contratoInfo = contratosByPlaca[placa] || { diasLocado: 0, receita: 0, contratos: 0 };
      
      const utilizacao = Math.min(100, (contratoInfo.diasLocado / periodoAnalise) * 100);
      const diasParado = Math.max(0, periodoAnalise - contratoInfo.diasLocado);
      const receita = contratoInfo.receita;
      const tco = valorCompra + custoManut;
      const margem = receita - custoManut - (depreciacao > 0 ? depreciacao * 0.1 : 0);
      const roi = valorCompra > 0 ? (margem / valorCompra) * 100 : 0;
      
      return {
        Placa: placa,
        Modelo: v.Modelo as string,
        Status: v.Status as string,
        IdadeVeiculo: parseNum(v.IdadeVeiculo),
        valorCompra,
        valorFipe,
        depreciacao,
        custoManut,
        utilizacao,
        diasLocado: contratoInfo.diasLocado,
        diasParado,
        receita,
        tco,
        margem,
        roi,
        isProdutivo: v.Status === 'Locado'
      };
    });
  }, [filteredData, manutencaoByPlaca, contratosByPlaca]);

  // KPIs Gerais
  const kpis = useMemo(() => {
    const total = enrichedData.length;
    const produtivos = enrichedData.filter(v => v.isProdutivo).length;
    const improdutivos = total - produtivos;
    const patrimonio = enrichedData.reduce((s, r) => s + r.valorFipe, 0);
    const patrimonioCompra = enrichedData.reduce((s, r) => s + r.valorCompra, 0);
    const idadeMedia = total > 0 ? enrichedData.reduce((s, r) => s + parseNum(r.IdadeVeiculo), 0) / total : 0;
    const custoManutTotal = enrichedData.reduce((s, r) => s + r.custoManut, 0);
    const tcoTotal = enrichedData.reduce((s, r) => s + r.tco, 0);
    const utilizacaoMedia = total > 0 ? enrichedData.reduce((s, r) => s + r.utilizacao, 0) / total : 0;
    const custoOciosidade = improdutivos * valorMensalMedio;
    const receitaTotal = enrichedData.reduce((s, r) => s + r.receita, 0);
    const margemTotal = enrichedData.reduce((s, r) => s + r.margem, 0);
    
    return { 
      total, produtivos, improdutivos, patrimonio, patrimonioCompra, idadeMedia, 
      custoManutTotal, tcoTotal, utilizacaoMedia, custoOciosidade, receitaTotal, margemTotal,
      taxaProdutividade: total > 0 ? (produtivos / total) * 100 : 0
    };
  }, [enrichedData, valorMensalMedio]);

  // Dados por Status
  const statusData = useMemo(() => {
    const map: Record<string, { count: number; valor: number }> = {};
    enrichedData.forEach(r => { 
      if (!map[r.Status]) map[r.Status] = { count: 0, valor: 0 };
      map[r.Status].count += 1;
      map[r.Status].valor += r.valorFipe;
    });
    return Object.entries(map).map(([name, data]) => ({ name, value: data.count, valor: data.valor }));
  }, [enrichedData]);

  // Comparativo Produtivo vs Improdutivo
  const prodVsImprod = useMemo(() => {
    const prod = enrichedData.filter(v => v.isProdutivo);
    const improd = enrichedData.filter(v => !v.isProdutivo);
    
    return {
      produtivo: {
        qtd: prod.length,
        patrimonio: prod.reduce((s, v) => s + v.valorFipe, 0),
        manutencao: prod.reduce((s, v) => s + v.custoManut, 0),
        receita: prod.reduce((s, v) => s + v.receita, 0)
      },
      improdutivo: {
        qtd: improd.length,
        patrimonio: improd.reduce((s, v) => s + v.valorFipe, 0),
        manutencao: improd.reduce((s, v) => s + v.custoManut, 0),
        custoOciosidade: improd.length * valorMensalMedio
      }
    };
  }, [enrichedData, valorMensalMedio]);

  // Distribuição de utilização
  const utilizacaoDistribuicao = useMemo(() => {
    const faixas = { 'Excelente (90-100%)': 0, 'Bom (70-89%)': 0, 'Regular (50-69%)': 0, 'Crítico (<50%)': 0 };
    enrichedData.forEach(v => {
      if (v.utilizacao >= 90) faixas['Excelente (90-100%)']++;
      else if (v.utilizacao >= 70) faixas['Bom (70-89%)']++;
      else if (v.utilizacao >= 50) faixas['Regular (50-69%)']++;
      else faixas['Crítico (<50%)']++;
    });
    return Object.entries(faixas).map(([name, value]) => ({ name, value }));
  }, [enrichedData]);

  // Ranking de utilização
  const utilizacaoRanking = useMemo(() => {
    return [...enrichedData].sort((a, b) => b.utilizacao - a.utilizacao);
  }, [enrichedData]);

  // Curva ABC de rentabilidade
  const abcRentabilidade = useMemo(() => {
    const sorted = [...enrichedData].sort((a, b) => b.margem - a.margem);
    let acumulado = 0;
    const totalMargem = sorted.reduce((s, v) => s + Math.max(0, v.margem), 0);
    
    return sorted.map((v, i) => {
      acumulado += Math.max(0, v.margem);
      const pctAcumulado = totalMargem > 0 ? (acumulado / totalMargem) * 100 : 0;
      const classe = pctAcumulado <= 80 ? 'A' : pctAcumulado <= 95 ? 'B' : 'C';
      return { ...v, pctAcumulado, classe, rank: i + 1 };
    });
  }, [enrichedData]);

  // Scatter depreciação
  const depreciationData = useMemo(() => {
    return enrichedData.map(r => ({
      placa: r.Placa,
      idade: parseNum(r.IdadeVeiculo),
      depreciacao: r.depreciacao
    })).filter(d => d.idade > 0 && d.depreciacao > -50000 && d.depreciacao < 150000);
  }, [enrichedData]);

  // Sorting
  const sortedData = useMemo(() => {
    return [...enrichedData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.dir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.dir === 'asc' 
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [enrichedData, sortConfig]);

  const pageItems = useMemo(() => sortedData.slice(page * pageSize, (page + 1) * pageSize), [sortedData, page]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const exportCSV = () => {
    const headers = ['Placa', 'Modelo', 'Status', 'Valor Compra', 'Valor FIPE', 'Depreciação', 'Idade', '% Utilização', 'Dias Locado', 'Receita', 'Custo Manut.', 'Margem', 'ROI %'];
    const rows = sortedData.map(r => [
      r.Placa, r.Modelo, r.Status, r.valorCompra, r.valorFipe, r.depreciacao, r.IdadeVeiculo, 
      r.utilizacao.toFixed(1), r.diasLocado, r.receita.toFixed(2), r.custoManut.toFixed(2), r.margem.toFixed(2), r.roi.toFixed(2)
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frota_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loadingFrota) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-slate-900">Gestão de Frota & TCO</Title>
          <Text className="text-slate-500">Análise completa de ativos, utilização e rentabilidade</Text>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/analytics/frota/metodologia" title="Ver metodologia de cálculos">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
              <HelpCircle className="w-5 h-5" />
            </Button>
          </Link>
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex gap-2 font-medium">
            <Car className="w-4 h-4" /> {kpis.total} veículos
          </div>
        </div>
      </div>

      {/* Filtros Globais */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <Text className="font-medium text-slate-700">Filtros</Text>
        </div>
        <div className="flex gap-4 flex-wrap">
          <select 
            className="border p-2 rounded text-sm w-48" 
            value={filterState.modelo || ''} 
            onChange={e => { setFilterState(p => ({...p, modelo: e.target.value || null})); setPage(0); }}
          >
            <option value="">Todos os Modelos</option>
            {modelos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select 
            className="border p-2 rounded text-sm w-48" 
            value={filterState.status || ''} 
            onChange={e => { setFilterState(p => ({...p, status: e.target.value || null})); setPage(0); }}
          >
            <option value="">Todos os Status</option>
            {Object.keys(COLORS_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {hasActiveFilters && (
            <button 
              onClick={() => { setFilterState({ status: null, modelo: null }); setPage(0); }} 
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm flex items-center gap-2"
            >
              <X size={14} /> Limpar
            </button>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="visao-geral" className="space-y-6">
        <TabsList className="bg-white border">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="produtividade">Produtiva vs Improdutiva</TabsTrigger>
          <TabsTrigger value="utilizacao">Utilização por Veículo</TabsTrigger>
          <TabsTrigger value="rentabilidade">Rentabilidade</TabsTrigger>
          <TabsTrigger value="detalhamento">Detalhamento</TabsTrigger>
        </TabsList>

        {/* ABA 1: VISÃO GERAL */}
        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card decoration="top" decorationColor="emerald">
              <Text>Total Frota</Text>
              <Metric>{kpis.total}</Metric>
            </Card>
            <Card decoration="top" decorationColor="blue">
              <Text>Patrimônio (FIPE)</Text>
              <Metric>{fmtCompact(kpis.patrimonio)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="violet">
              <Text>Taxa Utilização</Text>
              <Metric>{fmtPercent(kpis.utilizacaoMedia)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="amber">
              <Text>Custo Manutenção</Text>
              <Metric>{fmtCompact(kpis.custoManutTotal)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="cyan">
              <Text>Idade Média</Text>
              <Metric>{kpis.idadeMedia.toFixed(1)} m</Metric>
            </Card>
            <Card decoration="top" decorationColor="rose">
              <Text>Ociosidade</Text>
              <Metric>{fmtPercent(100 - kpis.taxaProdutividade)}</Metric>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Status da Frota</Title>
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      onClick={(data) => setFilterState(prev => ({ ...prev, status: prev.status === data.name ? null : data.name }))}
                      cursor="pointer"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_STATUS[entry.name as keyof typeof COLORS_STATUS] || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => [value, name]} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-slate-500" />
                <Title>Curva de Depreciação</Title>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="idade" name="Idade" unit="m" stroke="#64748b" fontSize={12} />
                    <YAxis type="number" dataKey="depreciacao" name="Depreciação" tickFormatter={fmtCompact} stroke="#64748b" fontSize={12} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: any) => fmtBRL(Number(v))} />
                    <Scatter name="Veículos" data={depreciationData} fill="#ef4444" fillOpacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ABA 2: PRODUTIVA VS IMPRODUTIVA */}
        <TabsContent value="produtividade" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Produtiva */}
            <Card className="border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <Title>Frota Produtiva</Title>
                <span className="ml-auto bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
                  {prodVsImprod.produtivo.qtd} veículos
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Text>% do Total</Text>
                  <span className="font-semibold text-emerald-700">{fmtPercent(kpis.taxaProdutividade)}</span>
                </div>
                <div className="flex justify-between">
                  <Text>Patrimônio</Text>
                  <span className="font-semibold">{fmtCompact(prodVsImprod.produtivo.patrimonio)}</span>
                </div>
                <div className="flex justify-between">
                  <Text>Custo Manutenção</Text>
                  <span className="font-semibold">{fmtCompact(prodVsImprod.produtivo.manutencao)}</span>
                </div>
                <div className="flex justify-between">
                  <Text>Receita Gerada</Text>
                  <span className="font-semibold text-emerald-700">{fmtCompact(prodVsImprod.produtivo.receita)}</span>
                </div>
              </div>
            </Card>

            {/* Card Improdutiva */}
            <Card className="border-l-4 border-l-amber-500">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-amber-500" />
                <Title>Frota Improdutiva</Title>
                <span className="ml-auto bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
                  {prodVsImprod.improdutivo.qtd} veículos
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Text>% do Total</Text>
                  <span className="font-semibold text-amber-700">{fmtPercent(100 - kpis.taxaProdutividade)}</span>
                </div>
                <div className="flex justify-between">
                  <Text>Patrimônio Parado</Text>
                  <span className="font-semibold">{fmtCompact(prodVsImprod.improdutivo.patrimonio)}</span>
                </div>
                <div className="flex justify-between">
                  <Text>Custo Manutenção</Text>
                  <span className="font-semibold">{fmtCompact(prodVsImprod.improdutivo.manutencao)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <Text>Custo Ociosidade/mês</Text>
                  </div>
                  <span className="font-semibold text-rose-600">{fmtBRL(prodVsImprod.improdutivo.custoOciosidade)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Gauge de Produtividade */}
          <Card>
            <Title>Taxa de Produtividade da Frota</Title>
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Improdutiva</span>
                <span className="font-semibold">{fmtPercent(kpis.taxaProdutividade)}</span>
                <span>Produtiva</span>
              </div>
              <Progress value={kpis.taxaProdutividade} className="h-4" />
            </div>
          </Card>

          {/* Lista Improdutivos */}
          <Card>
            <Title>Veículos Improdutivos (Candidatos a Ação)</Title>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Placa</th>
                    <th className="px-4 py-3 text-left">Modelo</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Valor FIPE</th>
                    <th className="px-4 py-3 text-center">Idade</th>
                    <th className="px-4 py-3 text-center">Dias Parado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrichedData.filter(v => !v.isProdutivo).slice(0, 10).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono">{r.Placa}</td>
                      <td className="px-4 py-3">{r.Modelo}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: `${COLORS_STATUS[r.Status as keyof typeof COLORS_STATUS]}20`, color: COLORS_STATUS[r.Status as keyof typeof COLORS_STATUS] }}>
                          {r.Status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{fmtBRL(r.valorFipe)}</td>
                      <td className="px-4 py-3 text-center">{r.IdadeVeiculo} m</td>
                      <td className="px-4 py-3 text-center text-rose-600 font-medium">{r.diasParado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ABA 3: UTILIZAÇÃO POR VEÍCULO */}
        <TabsContent value="utilizacao" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card decoration="top" decorationColor="emerald">
              <Text>Utilização Média</Text>
              <Metric>{fmtPercent(kpis.utilizacaoMedia)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="emerald">
              <Text>Excelentes (≥90%)</Text>
              <Metric>{utilizacaoDistribuicao.find(d => d.name.includes('Excelente'))?.value || 0}</Metric>
            </Card>
            <Card decoration="top" decorationColor="amber">
              <Text>Regulares (50-69%)</Text>
              <Metric>{utilizacaoDistribuicao.find(d => d.name.includes('Regular'))?.value || 0}</Metric>
            </Card>
            <Card decoration="top" decorationColor="rose">
              <Text>Críticos (&lt;50%)</Text>
              <Metric>{utilizacaoDistribuicao.find(d => d.name.includes('Crítico'))?.value || 0}</Metric>
            </Card>
          </div>

          {/* Gráfico Distribuição */}
          <Card>
            <Title>Distribuição por Faixa de Utilização</Title>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilizacaoDistribuicao} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {utilizacaoDistribuicao.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.name.includes('Excelente') ? UTILIZATION_COLORS.excellent : 
                              entry.name.includes('Bom') ? UTILIZATION_COLORS.good :
                              entry.name.includes('Regular') ? UTILIZATION_COLORS.regular : UTILIZATION_COLORS.critical} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <Title>Top 10 Mais Utilizados</Title>
              </div>
              <div className="space-y-3">
                {utilizacaoRanking.slice(0, 10).map((v, i) => {
                  const level = getUtilizationLevel(v.utilizacao);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span className="font-mono text-sm flex-1">{v.Placa}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${level.bg} ${level.color}`}>{fmtPercent(v.utilizacao)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-rose-500" />
                <Title>Top 10 Menos Utilizados</Title>
              </div>
              <div className="space-y-3">
                {utilizacaoRanking.slice(-10).reverse().map((v, i) => {
                  const level = getUtilizationLevel(v.utilizacao);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">{utilizacaoRanking.length - 9 + i}</span>
                      <span className="font-mono text-sm flex-1">{v.Placa}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${level.bg} ${level.color}`}>{fmtPercent(v.utilizacao)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Tabela Completa */}
          <Card>
            <Title>Utilização Detalhada por Veículo</Title>
            <div className="mt-4 overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">Placa</th>
                    <th className="px-4 py-3 text-left">Modelo</th>
                    <th className="px-4 py-3 text-center">% Utilização</th>
                    <th className="px-4 py-3 text-center">Dias Locado</th>
                    <th className="px-4 py-3 text-center">Dias Parado</th>
                    <th className="px-4 py-3 text-left">Nível</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {utilizacaoRanking.slice(0, 50).map((r, i) => {
                    const level = getUtilizationLevel(r.utilizacao);
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono">{r.Placa}</td>
                        <td className="px-4 py-2 text-slate-600">{r.Modelo}</td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center gap-2">
                            <Progress value={r.utilizacao} className="h-2 flex-1" />
                            <span className="w-12 text-right font-medium">{fmtPercent(r.utilizacao)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center text-emerald-600">{r.diasLocado}</td>
                        <td className="px-4 py-2 text-center text-rose-600">{r.diasParado}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${level.bg} ${level.color}`}>{level.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ABA 4: RENTABILIDADE */}
        <TabsContent value="rentabilidade" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card decoration="top" decorationColor="emerald">
              <Text>Receita Total</Text>
              <Metric>{fmtCompact(kpis.receitaTotal)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="amber">
              <Text>TCO Total</Text>
              <Metric>{fmtCompact(kpis.tcoTotal)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="cyan">
              <Text>Margem Total</Text>
              <Metric className={kpis.margemTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{fmtCompact(kpis.margemTotal)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="violet">
              <Text>ROI Médio</Text>
              <Metric>{fmtPercent(enrichedData.length > 0 ? enrichedData.reduce((s, v) => s + v.roi, 0) / enrichedData.length : 0)}</Metric>
            </Card>
          </div>

          {/* Curva ABC */}
          <Card>
            <Title>Curva ABC de Rentabilidade</Title>
            <Text className="text-slate-500 mb-4">Classificação dos veículos por contribuição na margem total</Text>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={abcRentabilidade.slice(0, 50)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rank" fontSize={12} />
                  <YAxis tickFormatter={(v) => `${v}%`} fontSize={12} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Acumulado']} />
                  <Line type="monotone" dataKey="pctAcumulado" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-4 justify-center">
              <span className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Classe A (80%)</span>
              <span className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-blue-500" /> Classe B (15%)</span>
              <span className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-slate-400" /> Classe C (5%)</span>
            </div>
          </Card>

          {/* Tabela de Rentabilidade */}
          <Card>
            <Title>Rentabilidade por Veículo</Title>
            <div className="mt-4 overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left">Placa</th>
                    <th className="px-3 py-3 text-right">Receita</th>
                    <th className="px-3 py-3 text-right">Custo Manut.</th>
                    <th className="px-3 py-3 text-right">Depreciação</th>
                    <th className="px-3 py-3 text-right">Margem</th>
                    <th className="px-3 py-3 text-right">ROI %</th>
                    <th className="px-3 py-3 text-center">Classe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {abcRentabilidade.slice(0, 30).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono">{r.Placa}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{fmtBRL(r.receita)}</td>
                      <td className="px-3 py-2 text-right text-amber-600">{fmtBRL(r.custoManut)}</td>
                      <td className="px-3 py-2 text-right text-rose-600">{fmtBRL(r.depreciacao)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${r.margem >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(r.margem)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${r.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtPercent(r.roi)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          r.classe === 'A' ? 'bg-emerald-100 text-emerald-700' :
                          r.classe === 'B' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}>{r.classe}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ABA 5: DETALHAMENTO */}
        <TabsContent value="detalhamento" className="space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
              <Title>Detalhamento Completo da Frota</Title>
              <div className="flex gap-2 items-center">
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-2" /> Exportar CSV
                </Button>
                <div className="flex gap-2">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 bg-slate-100 rounded text-sm disabled:opacity-50">←</button>
                  <span className="text-sm py-1">Pág {page + 1} de {Math.ceil(sortedData.length / pageSize)}</span>
                  <button onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= sortedData.length} className="px-3 py-1 bg-slate-100 rounded text-sm disabled:opacity-50">→</button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('Placa')}>Placa {sortConfig.key === 'Placa' && (sortConfig.dir === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('Modelo')}>Modelo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('valorCompra')}>Compra</th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('valorFipe')}>FIPE</th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('depreciacao')}>Deprec.</th>
                    <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('utilizacao')}>Utiliz. %</th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('receita')}>Receita</th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('custoManut')}>Manut.</th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('margem')}>Margem</th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('roi')}>ROI %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((r, i) => {
                    const level = getUtilizationLevel(r.utilizacao);
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono">{r.Placa}</td>
                        <td className="px-4 py-3">{r.Modelo}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: `${COLORS_STATUS[r.Status as keyof typeof COLORS_STATUS] || '#64748b'}20`, color: COLORS_STATUS[r.Status as keyof typeof COLORS_STATUS] || '#64748b' }}>
                            {r.Status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{fmtBRL(r.valorCompra)}</td>
                        <td className="px-4 py-3 text-right">{fmtBRL(r.valorFipe)}</td>
                        <td className="px-4 py-3 text-right text-rose-600">{fmtBRL(r.depreciacao)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${level.bg} ${level.color}`}>{fmtPercent(r.utilizacao)}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600">{fmtBRL(r.receita)}</td>
                        <td className="px-4 py-3 text-right text-amber-600">{fmtBRL(r.custoManut)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${r.margem >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(r.margem)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${r.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtPercent(r.roi)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
