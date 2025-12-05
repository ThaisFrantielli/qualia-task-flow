import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, DonutChart } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ScatterChart, Scatter, Cell } from 'recharts';
import { ShoppingBag, Filter, ShieldAlert } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function fmtBRL(v: number): string {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
  catch (e) { return String(v); }
}

function fmtCompact(v: number): string {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${v}`;
}

// Helper to safely get FIPE value with fallbacks
function getFipeValue(record: any): number {
  // Try multiple possible field names
  const fipeValue = record.ValorFipeNaCompra
    || record.ValorFipeCompra
    || record.ValorAtualFIPE
    || record.ValorFipe
    || 0;

  return parseCurrency(fipeValue);
}

function getMonthKey(dateString?: string): string {
  if (!dateString || typeof dateString !== 'string') return '';
  return dateString.split('T')[0].substring(0, 7);
}

// --- COMPONENTE PRINCIPAL ---
export default function PurchasesDashboard(): JSX.Element {
  // Novo Hook com dados ricos
  const { data: rawData } = useBIData<AnyObject[]>('compras_full.json');

  const compras = useMemo(() => {
    const raw = (rawData as any)?.data || rawData || [];
    const result = Array.isArray(raw) ? raw : [];

    // Debug: Log first record to understand data structure
    if (result.length > 0) {
      console.log('🔍 DEBUG - First purchase record:', result[0]);
      console.log('🔍 DEBUG - ValorFipeNaCompra value:', result[0].ValorFipeNaCompra);
      console.log('🔍 DEBUG - Available fields:', Object.keys(result[0]));

      // Check for FIPE code variations
      console.log('🔍 DEBUG - CodigoFIPE:', result[0].CodigoFIPE);
      console.log('🔍 DEBUG - CodigoFipe:', result[0].CodigoFipe);
      console.log('🔍 DEBUG - codigoFIPE:', result[0].codigoFIPE);

      // Check for Situacao variations
      console.log('🔍 DEBUG - SituacaoVeiculo:', result[0].SituacaoVeiculo);
      console.log('🔍 DEBUG - SituacaoFinanceiraVeiculo:', result[0].SituacaoFinanceiraVeiculo);
    }

    return result;
  }, [rawData]);

  // Filtros Globais
  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);

  // Tab State
  const [activeTab, setActiveTab] = useState(0);

  // ========== INTERACTIVE FILTERS (PowerBI-style) ==========
  const [activeFilters, setActiveFilters] = useState<{
    fornecedor: string | null;
    mes: string | null;
    montadora: string[];
    modelo: string[];
    banco: string[];
  }>({
    fornecedor: null,
    mes: null,
    montadora: [],
    modelo: [],
    banco: []
  });

  // Check if any interactive filter is active
  const hasActiveFilters = useMemo(() => {
    return !!(
      activeFilters.fornecedor ||
      activeFilters.mes ||
      activeFilters.montadora.length > 0 ||
      activeFilters.modelo.length > 0 ||
      activeFilters.banco.length > 0
    );
  }, [activeFilters]);

  // Clear all interactive filters
  const clearInteractiveFilters = () => {
    setActiveFilters({
      fornecedor: null,
      mes: null,
      montadora: [],
      modelo: [],
      banco: []
    });
  };

  // ========== CHART CLICK HANDLERS (PowerBI-style) ==========

  const handleMonthClick = (mes: string) => {
    setActiveFilters(prev => ({
      ...prev,
      mes: prev.mes === mes ? null : mes // Toggle
    }));
  };

  // Dados Filtrados (Date Range + Interactive Filters with AND logic)
  const filteredData = useMemo(() => {
    return compras.filter(r => {
      // Date range filter
      const d = r.DataCompra;
      if (!d) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;

      // Interactive filter: Fornecedor (single selection from chart click)
      if (activeFilters.fornecedor && r.Fornecedor !== activeFilters.fornecedor) {
        return false;
      }

      // Interactive filter: Mes (single selection from chart click)
      if (activeFilters.mes) {
        const recordMonth = getMonthKey(r.DataCompra);
        if (recordMonth !== activeFilters.mes) return false;
      }

      // Multi-select filter: Montadora (AND logic - must be in selected list)
      if (activeFilters.montadora.length > 0) {
        if (!activeFilters.montadora.includes(r.Montadora)) return false;
      }

      // Multi-select filter: Modelo (AND logic)
      if (activeFilters.modelo.length > 0) {
        if (!activeFilters.modelo.includes(r.Modelo)) return false;
      }

      // Multi-select filter: Banco (AND logic)
      if (activeFilters.banco.length > 0) {
        if (!activeFilters.banco.includes(r.Banco)) return false;
      }

      return true;
    });
  }, [compras, dateFrom, dateTo, activeFilters]);

  // --- ABA 1: AQUISIÇÃO E EFICIÊNCIA ---
  const acquisitionKPIs = useMemo(() => {
    const totalInvest = filteredData.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
    const count = filteredData.length;
    const totalAcessorios = filteredData.reduce((s, r) => s + parseCurrency(r.ValorAcessorios), 0);

    // Deságio Médio (usando ValorFipeNaCompra)
    let totalDesagio = 0;
    let validCount = 0;
    filteredData.forEach(r => {
      const fipe = getFipeValue(r);
      const compra = parseCurrency(r.ValorCompra);
      if (fipe > 0 && compra > 0) {
        totalDesagio += (1 - (compra / fipe));
        validCount++;
      }
    });
    const avgDesagio = validCount > 0 ? (totalDesagio / validCount) * 100 : 0;

    return { totalInvest, count, totalAcessorios, avgDesagio };
  }, [filteredData]);

  const supplierRanking = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      const f = r.Fornecedor || 'Desconhecido';
      map[f] = (map[f] || 0) + parseCurrency(r.ValorCompra);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  const evolutionData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      const k = getMonthKey(r.DataCompra);
      if (!k) return;
      map[k] = (map[k] || 0) + parseCurrency(r.ValorCompra);
    });
    return Object.keys(map).sort().map(k => ({
      date: k,
      Valor: map[k]
    }));
  }, [filteredData]);

  const scatterData = useMemo(() => {
    return filteredData.map(r => ({
      x: new Date(r.DataCompra).getTime(),
      y: parseCurrency(r.ValorCompra),
      name: r.Modelo || 'Veículo'
    })).slice(0, 200); // Limit points for performance
  }, [filteredData]);

  // --- ABA 2: FUNDING E DÍVIDA ---
  const fundingKPIs = useMemo(() => {
    const totalFinanced = filteredData.reduce((s, r) => s + parseCurrency(r.ValorFinanciado), 0);
    const totalCompra = filteredData.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
    const leverage = totalCompra > 0 ? (totalFinanced / totalCompra) * 100 : 0;

    const totalParcela = filteredData.reduce((s, r) => s + parseCurrency(r.ValorParcela), 0);
    // Média de parcela por contrato financiado
    const financedCount = filteredData.filter(r => parseCurrency(r.ValorFinanciado) > 0).length;
    const avgParcela = financedCount > 0 ? totalParcela / financedCount : 0;

    return { totalFinanced, leverage, avgParcela };
  }, [filteredData]);

  const capitalMix = useMemo(() => {
    const totalCompra = filteredData.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
    const totalFinanced = filteredData.reduce((s, r) => s + parseCurrency(r.ValorFinanciado), 0);
    const ownCapital = Math.max(0, totalCompra - totalFinanced);

    return [
      { name: 'Recurso Próprio', value: ownCapital },
      { name: 'Financiado (Dívida)', value: totalFinanced }
    ];
  }, [filteredData]);

  const debtByBank = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      const b = r.Banco || 'N/A';
      map[b] = (map[b] || 0) + parseCurrency(r.ValorFinanciado);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const maturitySchedule = useMemo(() => {
    // Estimativa: DataCompra + 36 meses
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      if (!r.DataCompra || parseCurrency(r.ValorFinanciado) <= 0) return;
      const d = new Date(r.DataCompra);
      d.setMonth(d.getMonth() + 36); // +3 anos
      const k = getMonthKey(d.toISOString());
      map[k] = (map[k] || 0) + parseCurrency(r.ValorFinanciado); // Valor total vencendo (simplificado)
    });
    return Object.keys(map).sort().map(k => ({
      date: k,
      Vencimento: map[k]
    }));
  }, [filteredData]);

  // --- ABA 3: AUDITORIA ---
  const auditList = useMemo(() => {
    const results = filteredData.map(r => {
      const compra = parseCurrency(r.ValorCompra);
      const fipe = getFipeValue(r);
      const acessorios = parseCurrency(r.ValorAcessorios);

      const agio = compra > fipe && fipe > 0;
      const acessoriosCaros = compra > 0 && (acessorios / compra) > 0.15;

      if (!agio && !acessoriosCaros) return null;

      return {
        placa: r.Placa,
        modelo: r.Modelo,
        fornecedor: r.Fornecedor,
        // Try multiple variations for CodigoFIPE
        codigoFipe: r.CodigoFIPE || r.CodigoFipe || r.codigoFIPE || r.codigoFipe,
        // Try multiple variations for SituacaoVeiculo
        situacao: r.SituacaoVeiculo || r.SituacaoFinanceiraVeiculo,
        compra,
        fipe,
        acessorios,
        diff: compra - fipe,
        reason: agio && acessoriosCaros ? 'Ágio + Acessórios' : agio ? 'Ágio (Acima da FIPE)' : 'Acessórios Excessivos'
      };
    }).filter(Boolean) as any[];

    // Debug logging
    if (results.length > 0) {
      console.log('📊 DEBUG - Audit List:', results.length, 'items');
      console.log('📊 DEBUG - First audit item:', results[0]);
      console.log('📊 DEBUG - FIPE value:', results[0].fipe);
      console.log('📊 DEBUG - SituacaoFinanceiraVeiculo:', results[0].situacao);
    }

    return results;
  }, [filteredData]);


  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Gestão de Compras 2.0</Title>
          <Text className="mt-1 text-slate-500">Visão integrada de aquisição, funding e compliance.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> Hub Compras
          </div>
        </div>
      </div>

      {/* Global Filters */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <Text className="font-medium text-slate-700">Período de Análise</Text>
        </div>
        <div className="flex gap-4">
          <input type="date" className="border p-2 rounded text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="border p-2 rounded text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </Card>

      {/* Custom Tabs */}
      <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
        {['Aquisição e Eficiência', 'Funding e Dívida', 'Auditoria (Compliance)'].map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === idx
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {/* ABA 1: AQUISIÇÃO */}
        {activeTab === 0 && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card decoration="top" decorationColor="emerald" className="bg-white border border-slate-200">
                <Text className="text-slate-500">Total Investido</Text>
                <Metric className="text-slate-900">{fmtCompact(acquisitionKPIs.totalInvest)}</Metric>
              </Card>
              <Card decoration="top" decorationColor="blue" className="bg-white border border-slate-200">
                <Text className="text-slate-500">Veículos Adquiridos</Text>
                <Metric className="text-slate-900">{acquisitionKPIs.count}</Metric>
              </Card>
              <Card decoration="top" decorationColor="amber" className="bg-white border border-slate-200">
                <Text className="text-slate-500">Deságio Médio</Text>
                <Metric className="text-slate-900">{acquisitionKPIs.avgDesagio.toFixed(2)}%</Metric>
              </Card>
              <Card decoration="top" decorationColor="violet" className="bg-white border border-slate-200">
                <Text className="text-slate-500">Gasto com Acessórios</Text>
                <Metric className="text-slate-900">{fmtCompact(acquisitionKPIs.totalAcessorios)}</Metric>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-white border border-slate-200">
                <Title>Evolução de Compras</Title>
                <Text className="text-xs text-slate-500 mt-1">Clique em uma barra para filtrar por mês</Text>
                <div className="h-80 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                      <YAxis fontSize={12} tickFormatter={fmtCompact} />
                      <Tooltip formatter={(v: any) => fmtBRL(v)} />
                      <Bar
                        dataKey="Valor"
                        radius={[4, 4, 0, 0]}
                        onClick={(data) => handleMonthClick(data.date)}
                        cursor="pointer"
                      >
                        {evolutionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={activeFilters.mes === entry.date ? '#059669' : '#10b981'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="bg-white border border-slate-200">
                <Title>Top Fornecedores</Title>
                <Text className="text-xs text-slate-500 mt-1">Clique em um fornecedor para filtrar</Text>
                <div className="mt-4 h-80 overflow-y-auto">
                  <BarList
                    data={supplierRanking}
                    valueFormatter={(v) => fmtCompact(v)}
                    color="emerald"
                  />
                </div>
              </Card>
            </div>

            <Card className="bg-white border border-slate-200">
              <Title>Dispersão de Preços (Scatter)</Title>
              <Text>Relação Data vs Valor de Compra</Text>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="x" name="Data" domain={['auto', 'auto']} tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                    <YAxis type="number" dataKey="y" name="Valor" tickFormatter={fmtCompact} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: any, name: string) => name === 'Data' ? new Date(v).toLocaleDateString() : fmtBRL(v)} />
                    <Scatter name="Compras" data={scatterData} fill="#8884d8">
                      {scatterData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill="#10b981" />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* ABA 2: FUNDING */}
        {activeTab === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card decoration="top" decorationColor="indigo" className="bg-white border border-slate-200">
                <Text className="text-slate-500">Total Financiado</Text>
                <Metric className="text-slate-900">{fmtCompact(fundingKPIs.totalFinanced)}</Metric>
              </Card>
              <Card decoration="top" decorationColor="indigo" className="bg-white border border-slate-200">
                <Text className="text-slate-500">Alavancagem (LTV)</Text>
                <Metric className="text-slate-900">{fundingKPIs.leverage.toFixed(1)}%</Metric>
              </Card>
              <Card decoration="top" decorationColor="indigo" className="bg-white border border-slate-200">
                <Text className="text-slate-500">Parcela Média</Text>
                <Metric className="text-slate-900">{fmtBRL(fundingKPIs.avgParcela)}</Metric>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border border-slate-200">
                <Title>Mix de Capital</Title>
                <DonutChart
                  className="mt-6 h-60"
                  data={capitalMix}
                  category="value"
                  index="name"
                  valueFormatter={fmtCompact}
                  colors={['emerald', 'indigo']}
                />
              </Card>
              <Card className="bg-white border border-slate-200">
                <Title>Exposição por Banco</Title>
                <div className="mt-4 h-60 overflow-y-auto">
                  <BarList data={debtByBank} valueFormatter={fmtCompact} color="indigo" />
                </div>
              </Card>
            </div>

            <Card className="bg-white border border-slate-200">
              <Title>Cronograma Estimado de Vencimento (36 meses)</Title>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={maturitySchedule}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                    <YAxis fontSize={12} tickFormatter={fmtCompact} />
                    <Tooltip formatter={(v: any) => fmtBRL(v)} />
                    <Line type="monotone" dataKey="Vencimento" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* ABA 3: AUDITORIA */}
        {activeTab === 2 && (
          <div className="mt-6">
            <Card className="bg-white border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <Title>Compras Fora do Padrão</Title>
              </div>
              <Text className="mb-4">Listando apenas compras com Ágio (Valor {'>'} FIPE) ou Acessórios excessivos ({'>'} 15%).</Text>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Placa</th>
                      <th className="px-4 py-3">Modelo</th>
                      <th className="px-4 py-3">Código FIPE</th>
                      <th className="px-4 py-3">Fornecedor</th>
                      <th className="px-4 py-3 text-right">Compra</th>
                      <th className="px-4 py-3 text-right">FIPE na Data</th>
                      <th className="px-4 py-3 text-right">Diferença</th>
                      <th className="px-4 py-3 text-center">Situação</th>
                      <th className="px-4 py-3 text-center">Alerta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditList.map((r, i) => {
                      const getBadgeColor = (situacao: string) => {
                        if (!situacao) return 'bg-slate-100 text-slate-700';
                        const s = situacao.toLowerCase();
                        // Disponível -> Verde
                        if (s.includes('disponível') || s.includes('disponivel')) return 'bg-emerald-100 text-emerald-700';
                        // Locado -> Azul
                        if (s.includes('locado') || s.includes('alugado')) return 'bg-blue-100 text-blue-700';
                        // Manutenção -> Amarelo
                        if (s.includes('manutenção') || s.includes('manutencao')) return 'bg-amber-100 text-amber-700';
                        // Vendido -> Cinza
                        if (s.includes('vendido') || s.includes('baixado')) return 'bg-slate-100 text-slate-700';
                        // Outros -> Slate
                        return 'bg-slate-100 text-slate-700';
                      };

                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{r.placa}</td>
                          <td className="px-4 py-3 text-slate-600">{r.modelo}</td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">{r.codigoFipe || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{r.fornecedor}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">{fmtBRL(r.compra)}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{fmtBRL(r.fipe)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${r.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {r.diff > 0 ? '+' : ''}{fmtBRL(r.diff)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(r.situacao)}`}>
                              {r.situacao || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              {r.reason}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {auditList.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-400">Nenhuma inconformidade encontrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Floating Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={clearInteractiveFilters}
          className="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all z-50"
        >
          <Filter className="w-5 h-5" />
          Limpar Filtros
        </button>
      )}
    </div>
  );
}
