import { useState, useMemo, useEffect } from 'react';
import { Title, Text } from '@tremor/react';
import { DollarSign, ArrowLeft, BarChart3, Table, LineChart as LineChartIcon, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DREFiltersProvider, useDREFilters } from '@/contexts/DREFiltersContext';
import useDREData from '@/hooks/useDREData';
import DREFiltersBar from '@/components/analytics/dre/DREFiltersBar';
import DREPivotTable from '@/components/analytics/DREPivotTable';
import DREKPICard from '@/components/analytics/DREKPICard';
import MonthFilter from '@/components/analytics/MonthFilter';
import {
  buildAccountHierarchyByType,
  calculateKPIs,
  formatDREValue,
  formatCompactValue,
  formatMonthLabel,
  getAvailableMonths,
} from '@/utils/dreUtils';
import { Progress } from '@/components/ui/progress';

function DREContent() {
  const {
    transactions,
    availableMonths,
    loading,
    error,
    uniqueClientes,
    uniqueNaturezas,
    uniqueContratosComerciais,
    uniqueSituacoesContrato,
  } = useDREData();

  const { filters } = useDREFilters();
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [showHorizontalAnalysis, setShowHorizontalAnalysis] = useState(false);
  const [showVerticalAnalysis, setShowVerticalAnalysis] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');
  const [detailPage, setDetailPage] = useState(0);
  const DETAIL_PAGE_SIZE = 50;

  // Auto-select all available months (2022+)
  useEffect(() => {
    if (availableMonths.length > 0 && selectedMonths.length === 0) {
      setSelectedMonths(availableMonths);
    }
  }, [availableMonths, selectedMonths.length]);

  // Apply context filters to transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (filters.dateRange?.from) {
      const from = filters.dateRange.from;
      const to = filters.dateRange.to || from;
      filtered = filtered.filter(t => {
        const d = new Date(t.DataCompetencia);
        return d >= from && d <= to;
      });
    }

    if (filters.clientes.length > 0) {
      filtered = filtered.filter(t =>
        filters.clientes.includes(t.Cliente || '') ||
        filters.clientes.includes(t.NomeEntidade || '')
      );
    }

    if (filters.naturezas.length > 0) {
      filtered = filtered.filter(t => filters.naturezas.includes(t.Natureza));
    }

    return filtered;
  }, [transactions, filters]);

  const filteredMonths = useMemo(
    () => getAvailableMonths(filteredTransactions),
    [filteredTransactions]
  );

  const availableMonthsKey = availableMonths.join('|');
  const filteredMonthsKey = filteredMonths.join('|');
  const selectedMonthsKey = selectedMonths.join('|');

  // Keep month selection aligned with date filters to avoid empty-looking views.
  useEffect(() => {
    if (availableMonths.length === 0) return;

    const hasDateFilter = Boolean(filters.dateRange?.from || filters.dateRange?.to);
    if (hasDateFilter) {
      if (filteredMonths.length === 0) {
        if (selectedMonths.length !== 0) {
          setSelectedMonths([]);
        }
        return;
      }

      const sanitized = selectedMonths.filter((month) => filteredMonths.includes(month));
      if (sanitized.length === 0) {
        if (selectedMonthsKey !== filteredMonthsKey) {
          setSelectedMonths(filteredMonths);
        }
        return;
      }

      if (sanitized.length !== selectedMonths.length) {
        setSelectedMonths(sanitized);
      }
      return;
    }

    if (selectedMonths.length === 0) {
      setSelectedMonths(availableMonths);
    }
  }, [
    availableMonths,
    filteredMonths,
    selectedMonths,
    selectedMonthsKey,
    availableMonthsKey,
    filteredMonthsKey,
    filters.dateRange?.from,
    filters.dateRange?.to,
  ]);

  // KPIs
  const kpis = useMemo(() => calculateKPIs(filteredTransactions, selectedMonths), [filteredTransactions, selectedMonths]);

  // Hierarchy for pivot table
  const hierarchy = useMemo(() => buildAccountHierarchyByType(filteredTransactions, selectedMonths), [filteredTransactions, selectedMonths]);

  // Revenue by month for vertical analysis
  const revenueByMonth = useMemo(() => {
    const rev: Record<string, number> = {};
    selectedMonths.forEach(m => {
      rev[m] = filteredTransactions
        .filter(t => t.TipoLancamento === 'Entrada' && t.DataCompetencia?.substring(0, 7) === m)
        .reduce((sum, t) => sum + (t.Valor || 0), 0);
    });
    return rev;
  }, [filteredTransactions, selectedMonths]);

  // Chart data for evolution
  const evolutionChartData = useMemo(() => {
    return kpis.sparklineData.map(d => ({
      mes: formatMonthLabel(d.mes),
      Receita: d.receita,
      Despesa: Math.abs(d.custos),
      Lucro: d.lucro,
    }));
  }, [kpis]);

  // Waterfall data
  const waterfallData = useMemo(() => {
    const items = [
      { name: 'Receita', value: kpis.receitaTotal, fill: '#10b981' },
      { name: 'Despesas', value: kpis.custosTotal, fill: '#ef4444' },
      { name: 'Lucro Líquido', value: kpis.lucroLiquido, fill: kpis.lucroLiquido >= 0 ? '#3b82f6' : '#ef4444' },
    ];
    return items;
  }, [kpis]);

  // Top naturezas
  const topNaturezas = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions
      .filter(t => selectedMonths.includes(t.DataCompetencia?.substring(0, 7) || ''))
      .forEach(t => {
        const key = t.Natureza_Descricao || t.Natureza;
        map.set(key, (map.get(key) || 0) + Math.abs(t.Valor || 0));
      });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name: name.length > 30 ? name.substring(0, 30) + '...' : name, value }));
  }, [filteredTransactions, selectedMonths]);

  // Detail table
  const detailTransactions = useMemo(() => {
    let list = filteredTransactions.filter(t =>
      selectedMonths.includes(t.DataCompetencia?.substring(0, 7) || '')
    );
    if (detailSearch) {
      const s = detailSearch.toLowerCase();
      list = list.filter(t =>
        (t.Natureza || '').toLowerCase().includes(s) ||
        (t.NomeEntidade || '').toLowerCase().includes(s) ||
        (t.Cliente || '').toLowerCase().includes(s) ||
        String(t.Valor).includes(s)
      );
    }
    return list;
  }, [filteredTransactions, selectedMonths, detailSearch]);

  const paginatedDetail = useMemo(() => {
    const start = detailPage * DETAIL_PAGE_SIZE;
    return detailTransactions.slice(start, start + DETAIL_PAGE_SIZE);
  }, [detailTransactions, detailPage]);

  const totalDetailPages = Math.ceil(detailTransactions.length / DETAIL_PAGE_SIZE);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-slate-700 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {formatDREValue(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <DollarSign className="w-12 h-12 text-emerald-600 mx-auto animate-pulse" />
          <Title>Carregando DRE Gerencial</Title>
          <Text>Processando 187.000+ lançamentos financeiros...</Text>
          <Progress value={33} className="h-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Title className="text-red-600">Erro ao carregar dados</Title>
          <Text>{error}</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/analytics" className="p-2 hover:bg-white rounded-lg border border-slate-200 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <DollarSign className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <Title className="text-2xl text-slate-900 font-bold tracking-tight">DRE Gerencial</Title>
                <Text className="text-slate-500">
                  {filteredTransactions.length.toLocaleString('pt-BR')} lançamentos · {selectedMonths.length} meses
                </Text>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MonthFilter
              availableMonths={availableMonths}
              selectedMonths={selectedMonths}
              onChange={setSelectedMonths}
            />
          </div>
        </header>

        {/* Filters */}
        <DREFiltersBar
          clientesList={uniqueClientes}
          contratosComerciais={uniqueContratosComerciais}
          naturezasList={uniqueNaturezas}
          situacoesContratoList={uniqueSituacoesContrato}
        />

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-fit">
            <TabsTrigger value="overview" className="gap-2"><BarChart3 className="w-4 h-4" /> Visão Geral</TabsTrigger>
            <TabsTrigger value="statement" className="gap-2"><Table className="w-4 h-4" /> Demonstrativo</TabsTrigger>
            <TabsTrigger value="evolution" className="gap-2"><LineChartIcon className="w-4 h-4" /> Evolução</TabsTrigger>
            <TabsTrigger value="detail" className="gap-2"><List className="w-4 h-4" /> Detalhamento</TabsTrigger>
          </TabsList>

            <TabsContent value="overview">
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <DREKPICard
                    title="Receita Total"
                    value={kpis.receitaTotal}
                    sparklineData={kpis.sparklineData.map(d => ({ value: d.receita }))}
                    colorScheme="green"
                  />
                  <DREKPICard
                    title="Despesas Totais"
                    value={kpis.custosTotal}
                    sparklineData={kpis.sparklineData.map(d => ({ value: d.custos }))}
                    colorScheme="red"
                  />
                  <DREKPICard
                    title="EBITDA"
                    value={kpis.ebitda}
                    sparklineData={kpis.sparklineData.map(d => ({ value: d.ebitda }))}
                    colorScheme="blue"
                  />
                  <DREKPICard
                    title="Lucro Líquido"
                    value={kpis.lucroLiquido}
                    sparklineData={kpis.sparklineData.map(d => ({ value: d.lucro }))}
                    colorScheme="amber"
                  />
                  <DREKPICard
                    title="Margem Líquida"
                    value={kpis.margemLucro}
                    sparklineData={kpis.sparklineData.map(d => ({ value: d.margem }))}
                    format="percentage"
                    colorScheme={kpis.margemLucro >= 0 ? 'green' : 'red'}
                  />
                </div>

                {/* Evolution Chart */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Evolução Mensal</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evolutionChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis tickFormatter={(v) => formatCompactValue(v)} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="Receita" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                        <Area type="monotone" dataKey="Despesa" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                        <Area type="monotone" dataKey="Lucro" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Naturezas */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 10 Naturezas por Valor</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topNaturezas} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tickFormatter={(v) => formatCompactValue(v)} tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => formatDREValue(v)} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {topNaturezas.map((_, i) => (
                            <Cell key={i} fill={i < 3 ? '#10b981' : i < 6 ? '#3b82f6' : '#94a3b8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="statement">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={showHorizontalAnalysis}
                      onChange={e => setShowHorizontalAnalysis(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Análise Horizontal (AH%)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={showVerticalAnalysis}
                      onChange={e => setShowVerticalAnalysis(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Análise Vertical (AV%)
                  </label>
                </div>

                {selectedMonths.length === 0 ? (
                  <div className="text-center py-20 text-slate-500">
                    <Table className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Selecione ao menos um mês para visualizar o demonstrativo.</p>
                  </div>
                ) : (
                  <DREPivotTable
                    nodes={hierarchy}
                    selectedMonths={selectedMonths}
                    showHorizontalAnalysis={showHorizontalAnalysis}
                    showVerticalAnalysis={showVerticalAnalysis}
                    revenueByMonth={revenueByMonth}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="evolution">
              <div className="space-y-6">
                {/* Waterfall */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Composição do Resultado</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={waterfallData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                        <YAxis tickFormatter={(v) => formatCompactValue(v)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => formatDREValue(v)} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {waterfallData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monthly trend per type */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Tendência Mensal: Receita vs Despesa</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evolutionChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => formatCompactValue(v)} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="Receita" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                        <Area type="monotone" dataKey="Despesa" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Margin trend */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Margem Líquida Mensal (%)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={kpis.sparklineData.map(d => ({ mes: formatMonthLabel(d.mes), margem: d.margem }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                        <Bar dataKey="margem" radius={[4, 4, 0, 0]}>
                          {kpis.sparklineData.map((d, i) => (
                            <Cell key={i} fill={d.margem >= 0 ? '#10b981' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="detail">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={detailSearch}
                    onChange={e => { setDetailSearch(e.target.value); setDetailPage(0); }}
                    placeholder="Buscar por natureza, entidade ou valor..."
                    className="px-4 py-2 border border-slate-300 rounded-lg w-96 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <Text className="text-slate-500">
                    {detailTransactions.length.toLocaleString('pt-BR')} lançamentos
                  </Text>
                </div>

                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold uppercase">Competência</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase">Tipo</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase">Natureza</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase">Entidade</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedDetail.map((t, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm text-slate-600">{t.DataCompetencia?.substring(0, 10)}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.TipoLancamento === 'Entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {t.TipoLancamento}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm">{t.Natureza}</td>
                          <td className="px-4 py-2 text-sm text-slate-600">{t.Cliente || t.NomeEntidade || '-'}</td>
                          <td className={`px-4 py-2 text-sm text-right font-medium ${t.Valor < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                            {formatDREValue(t.Valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalDetailPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setDetailPage(p => Math.max(0, p - 1))}
                      disabled={detailPage === 0}
                      className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-slate-100"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-slate-600">
                      {detailPage + 1} de {totalDetailPages}
                    </span>
                    <button
                      onClick={() => setDetailPage(p => Math.min(totalDetailPages - 1, p + 1))}
                      disabled={detailPage >= totalDetailPages - 1}
                      className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-slate-100"
                    >
                      Próximo
                    </button>
                  </div>
                )}
              </div>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function DREGerencialDashboard() {
  return (
    <DREFiltersProvider>
      <DREContent />
    </DREFiltersProvider>
  );
}
