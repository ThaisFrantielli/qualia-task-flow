import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, DonutChart } from '@tremor/react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { ShoppingBag, Filter, ShieldAlert, X } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  if (typeof v === 'string') {
    const s = v.replace(/[R$\s.]/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
  return 0;
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

function getMonthKey(dateString?: string): string {
  if (!dateString || typeof dateString !== 'string') return '';
  return dateString.split('T')[0].substring(0, 7);
}

function monthLabel(ym: string): string {
  if (!ym || ym.length < 7) return ym;
  const [y, m] = ym.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${months[Number(m) - 1]}/${String(y).slice(2)}`;
}

// --- COMPONENTE PRINCIPAL ---
export default function PurchasesDashboard(): JSX.Element {
  // *** MIGRAÇÃO: Usa dim_compras.json ***
  const { data: rawCompras } = useBIData<AnyObject[]>('dim_compras.json');
  // Também trazemos dívidas/alienações
  const { data: rawAlienacoes } = useBIData<AnyObject[]>('dim_alienacoes.json');

  const compras: AnyObject[] = useMemo(() => {
    if (Array.isArray(rawCompras)) return rawCompras;
    return (rawCompras as any)?.data || [];
  }, [rawCompras]);

  const alienacoes: AnyObject[] = useMemo(() => {
    if (Array.isArray(rawAlienacoes)) return rawAlienacoes;
    return (rawAlienacoes as any)?.data || [];
  }, [rawAlienacoes]);

  // *** ESTADO DE FILTROS INTERATIVOS (PowerBI Style) ***
  const [filterState, setFilterState] = useState<{
    fornecedor: string | null;
    mes: string | null;
    montadora: string | null;
    banco: string | null;
  }>({
    fornecedor: null,
    mes: null,
    montadora: null,
    banco: null
  });

  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const hasActiveFilters = useMemo(() => {
    return !!(filterState.fornecedor || filterState.mes || filterState.montadora || filterState.banco);
  }, [filterState]);

  const clearFilters = () => {
    setFilterState({ fornecedor: null, mes: null, montadora: null, banco: null });
    setPage(0);
  };

  // *** DADOS FILTRADOS (Derivados do filterState) ***
  const filteredCompras = useMemo(() => {
    return compras.filter((r: AnyObject) => {
      if (filterState.fornecedor && r.Fornecedor !== filterState.fornecedor) return false;
      if (filterState.mes && getMonthKey(r.DataCompra) !== filterState.mes) return false;
      if (filterState.montadora && r.Montadora !== filterState.montadora) return false;
      if (filterState.banco && r.Banco !== filterState.banco) return false;
      return true;
    });
  }, [compras, filterState]);

  // FILTRO CRUZADO: (mantido, calcular quando necessário)

  // === ABA 1: AQUISIÇÃO ===
  const acquisitionKPIs = useMemo(() => {
    const totalInvest = filteredCompras.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorCompra), 0);
    const count = filteredCompras.length;
    const totalAcessorios = filteredCompras.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorAcessorios), 0);

    let somaDesagio = 0;
    let countDesagio = 0;
    filteredCompras.forEach((r: AnyObject) => {
      const compra = parseCurrency(r.ValorCompra);
      const fipe = parseCurrency(r.ValorFipeAtual || 0);
      if (fipe > 0 && compra > 0) {
        somaDesagio += (1 - (compra / fipe));
        countDesagio++;
      }
    });
    const avgDesagio = countDesagio > 0 ? (somaDesagio / countDesagio) * 100 : 0;

    return { totalInvest, count, totalAcessorios, avgDesagio };
  }, [filteredCompras]);

  const supplierRanking = useMemo(() => {
    const map: Record<string, number> = {};
    filteredCompras.forEach((r: AnyObject) => {
      const f = r.Fornecedor || 'Desconhecido';
      map[f] = (map[f] || 0) + parseCurrency(r.ValorCompra);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredCompras]);

  // modelRanking: calculado quando necessário

  const evolutionData = useMemo(() => {
    const map: Record<string, { Valor: number, Qtd: number }> = {};
    filteredCompras.forEach((r: AnyObject) => {
      const k = getMonthKey(r.DataCompra);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Qtd: 0 };
      map[k].Valor += parseCurrency(r.ValorCompra);
      map[k].Qtd += 1;
    });
    return Object.keys(map).sort().map(k => ({
      date: k,
      label: monthLabel(k),
      ...map[k]
    }));
  }, [filteredCompras]);

  const detailedAcquisitions = useMemo(() => {
    return filteredCompras.map((r: AnyObject) => {
      const compra = parseCurrency(r.ValorCompra);
      const fipeAtual = parseCurrency(r.ValorFipeAtual || 0);
      const percentFipe = fipeAtual > 0 ? (compra / fipeAtual) * 100 : 0;
      return {
        placa: r.Placa,
        montadora: r.Montadora,
        modelo: r.Modelo,
        ano: r.AnoModelo || r.AnoFabricacao,
        dataCompra: r.DataCompra,
        fornecedor: r.Fornecedor,
        valorCompra: compra,
        valorFipeAtual: fipeAtual,
        percentFipe
      };
    });
  }, [filteredCompras]);

  const paginatedAcquisitions = useMemo(() => {
    const start = page * pageSize;
    return detailedAcquisitions.slice(start, start + pageSize);
  }, [detailedAcquisitions, page]);

  // === ABA 2: FUNDING ===
  const fundingKPIs = useMemo(() => {
    const totalFinanced = filteredCompras.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorFinanciado), 0);
    const totalInvest = acquisitionKPIs.totalInvest;
    const leverage = totalInvest > 0 ? (totalFinanced / totalInvest) * 100 : 0;
    return { totalFinanced, leverage };
  }, [filteredCompras, acquisitionKPIs]);

  // Dívida / Alienações (se houver dados)
  const debtKPIs = useMemo(() => {
    const saldoDevedor = alienacoes.reduce((s: number, r: AnyObject) => s + parseCurrency(r.SaldoRemanescente || r.SaldoDevedor), 0);
    const fluxoMensal = alienacoes.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorParcela || r.Parcela), 0);
    const contratos = alienacoes.length;
    return { saldoDevedor, fluxoMensal, contratos };
  }, [alienacoes]);

  const capitalMix = useMemo(() => {
    const totalInvest = acquisitionKPIs.totalInvest;
    const totalFinanced = fundingKPIs.totalFinanced;
    return [
      { name: 'Recurso Próprio', value: Math.max(0, totalInvest - totalFinanced) },
      { name: 'Financiado', value: totalFinanced }
    ];
  }, [acquisitionKPIs, fundingKPIs]);

  const bankData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredCompras.forEach((r: AnyObject) => {
      const b = r.Banco || r.Instituicao || 'Sem Financiamento';
      map[b] = (map[b] || 0) + parseCurrency(r.ValorFinanciado);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredCompras]);

  // === ABA 3: AUDITORIA ===
  const auditList = useMemo(() => {
    return filteredCompras
      .map((r: AnyObject) => {
        const compra = parseCurrency(r.ValorCompra);
        const fipeAtual = parseCurrency(r.ValorFipeAtual || 0);
        const acessorios = parseCurrency(r.ValorAcessorios);

        const anomalies = [];
        if (fipeAtual > 0 && compra > (fipeAtual * 1.10)) anomalies.push('Valor > 110% da FIPE Atual');
        if (compra > 0 && (acessorios / compra) > 0.15) anomalies.push('Acessórios Excessivos (> 15%)');

        if (anomalies.length === 0) return null;

        return {
          ...r,
          compra,
          fipe: fipeAtual,
          diff: compra - fipeAtual,
          reason: anomalies.join(', ')
        };
      })
      .filter((x: any) => x !== null);
  }, [filteredCompras]);

  // *** HANDLERS DE CLIQUE (Interatividade PowerBI) ***
  const handleFornecedorClick = (data: any) => {
    setFilterState(prev => ({ ...prev, fornecedor: prev.fornecedor === data.name ? null : data.name }));
    setPage(0);
  };

  const handleMonthClick = (data: any) => {
    setFilterState(prev => ({ ...prev, mes: prev.mes === data.date ? null : data.date }));
    setPage(0);
  };

  const handleBancoClick = (data: any) => {
    setFilterState(prev => ({ ...prev, banco: prev.banco === data.name ? null : data.name }));
    setPage(0);
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Purchases & Acquisitions Dashboard</Title>
          <Text className="mt-1 text-slate-500">
            Análise de aquisições, funding e auditoria. Clique nos gráficos para filtrar.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> Hub de Ativos
          </div>
        </div>
      </div>

      {/* Botão Limpar Filtros (Flutuante) */}
      {hasActiveFilters && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={clearFilters}
            className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105"
          >
            <X className="w-5 h-5" />
            Limpar Filtros
          </button>
        </div>
      )}

      {/* Filtros Ativos */}
      {hasActiveFilters && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-blue-600" />
            <Text className="font-medium text-blue-700">Filtros Ativos:</Text>
            {filterState.fornecedor && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                Fornecedor: <strong>{filterState.fornecedor}</strong>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState(prev => ({ ...prev, fornecedor: null }))} />
              </span>
            )}
            {filterState.mes && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                Mês: <strong>{monthLabel(filterState.mes)}</strong>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState(prev => ({ ...prev, mes: null }))} />
              </span>
            )}
            {filterState.montadora && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                Montadora: <strong>{filterState.montadora}</strong>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState(prev => ({ ...prev, montadora: null }))} />
              </span>
            )}
            {filterState.banco && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                Banco: <strong>{filterState.banco}</strong>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState(prev => ({ ...prev, banco: null }))} />
              </span>
            )}
          </div>
        </Card>
      )}

          {/* Abas (simplified) */}
          <div className="mb-6">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab(0)}
                className={`px-4 py-2 rounded ${activeTab === 0 ? 'bg-blue-600 text-white' : 'bg-white border'}`}
              >
                Aquisição
              </button>
              <button
                onClick={() => setActiveTab(1)}
                className={`px-4 py-2 rounded ${activeTab === 1 ? 'bg-blue-600 text-white' : 'bg-white border'}`}
              >
                Funding
              </button>
              <button
                onClick={() => setActiveTab(2)}
                className={`px-4 py-2 rounded ${activeTab === 2 ? 'bg-blue-600 text-white' : 'bg-white border'}`}
              >
                Auditoria
              </button>
            </div>

            {activeTab === 0 && (
              <div className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card decoration="top" decorationColor="blue" className="bg-white shadow-sm">
                    <Text className="text-slate-500">Investimento Total</Text>
                    <Metric className="text-slate-900">{fmtCompact(acquisitionKPIs.totalInvest)}</Metric>
                    <Text className="text-xs text-slate-400 mt-1">{acquisitionKPIs.count} veículos</Text>
                  </Card>
                  <Card decoration="top" decorationColor="emerald" className="bg-white shadow-sm">
                    <Text className="text-slate-500">Deságio Médio</Text>
                    <Metric className="text-slate-900">{acquisitionKPIs.avgDesagio.toFixed(1)}%</Metric>
                    <Text className="text-xs text-slate-400 mt-1">vs FIPE Atual</Text>
                  </Card>
                  <Card decoration="top" decorationColor="amber" className="bg-white shadow-sm">
                    <Text className="text-slate-500">Total Acessórios</Text>
                    <Metric className="text-slate-900">{fmtCompact(acquisitionKPIs.totalAcessorios)}</Metric>
                  </Card>
                  <Card decoration="top" decorationColor="rose" className="bg-white shadow-sm">
                    <Text className="text-slate-500">Ticket Médio</Text>
                    <Metric className="text-slate-900">
                      {fmtCompact(acquisitionKPIs.count > 0 ? acquisitionKPIs.totalInvest / acquisitionKPIs.count : 0)}
                    </Metric>
                  </Card>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Evolução Mensal */}
                  <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
                    <Title className="text-slate-900">Evolução de Compras</Title>
                    <Text className="text-slate-500 text-sm mb-4">
                      {filterState.mes ? `Filtrado: ${monthLabel(filterState.mes)}` : 'Clique nas barras para filtrar'}
                    </Text>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={evolutionData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                          <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} stroke="#64748b" />
                          <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                          <Bar yAxisId="left" dataKey="Valor" fill="#3b82f6" radius={[4, 4, 0, 0]} onClick={(data) => handleMonthClick(data)}>
                            {evolutionData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={filterState.mes === entry.date ? '#ef4444' : '#3b82f6'}
                                cursor="pointer"
                              />
                            ))}
                          </Bar>
                          <Line yAxisId="right" type="monotone" dataKey="Qtd" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Top Fornecedores */}
                  <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
                    <Title className="text-slate-900">Top Fornecedores</Title>
                    <Text className="text-slate-500 text-sm mb-4">
                      {filterState.fornecedor ? `Filtrado: ${filterState.fornecedor}` : 'Clique para filtrar'}
                    </Text>
                    <div className="mt-4 space-y-2">
                      {supplierRanking.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${
                            filterState.fornecedor === item.name
                              ? 'bg-blue-100 border-l-4 border-blue-500'
                              : 'hover:bg-slate-50'
                          }`}
                          onClick={() => handleFornecedorClick(item)}
                        >
                          <Text className="text-slate-700 text-sm font-medium truncate">{item.name}</Text>
                          <Text className="text-slate-900 font-bold ml-2">{fmtCompact(item.value)}</Text>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Tabela Detalhada */}
                <Card className="bg-white shadow-sm">
                  <Title className="text-slate-900 mb-4">Detalhamento de Aquisições</Title>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3">Placa</th>
                          <th className="px-4 py-3">Modelo</th>
                          <th className="px-4 py-3">Fornecedor</th>
                          <th className="px-4 py-3 text-right">Valor Compra</th>
                          <th className="px-4 py-3 text-right">% FIPE</th>
                          <th className="px-4 py-3">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedAcquisitions.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{r.placa}</td>
                            <td className="px-4 py-3">{r.modelo}</td>
                            <td className="px-4 py-3">{r.fornecedor}</td>
                            <td className="px-4 py-3 text-right">{fmtBRL(r.valorCompra)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={r.percentFipe <= 100 ? 'text-emerald-600' : 'text-rose-600'}>
                                {r.percentFipe.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3">{r.dataCompra ? new Date(r.dataCompra).toLocaleDateString('pt-BR') : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between mt-4">
                    <Text className="text-slate-500 text-sm">
                      Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, detailedAcquisitions.length)} de {detailedAcquisitions.length}
                    </Text>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="px-3 py-1 rounded bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(Math.ceil(detailedAcquisitions.length / pageSize) - 1, p + 1))}
                        disabled={(page + 1) * pageSize >= detailedAcquisitions.length}
                        className="px-3 py-1 rounded bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200"
                      >
                        Próximo
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 1 && (
              <div className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card decoration="top" decorationColor="purple" className="bg-white shadow-sm">
                    <Text className="text-slate-500">Total Financiado</Text>
                    <Metric className="text-slate-900">{fmtCompact(fundingKPIs.totalFinanced)}</Metric>
                  </Card>
                  <Card decoration="top" decorationColor="rose" className="bg-white shadow-sm">
                    <Text className="text-slate-500">Saldo Devedor (Alienações)</Text>
                    <Metric className="text-slate-900">{fmtCompact(debtKPIs.saldoDevedor)}</Metric>
                    <Text className="text-xs text-slate-400 mt-1">{debtKPIs.contratos} contratos</Text>
                  </Card>
                  <Card decoration="top" decorationColor="indigo" className="bg-white shadow-sm">
                    <Text className="text-slate-500">Alavancagem</Text>
                    <Metric className="text-slate-900">{fundingKPIs.leverage.toFixed(1)}%</Metric>
                  </Card>
                  <Card decoration="top" decorationColor="cyan" className="bg-white shadow-sm">
                    <Text className="text-slate-500">Recurso Próprio</Text>
                    <Metric className="text-slate-900">{fmtCompact(acquisitionKPIs.totalInvest - fundingKPIs.totalFinanced)}</Metric>
                  </Card>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Mix de Capital */}
                  <Card className="bg-white shadow-sm">
                    <Title className="text-slate-900">Mix de Capital</Title>
                    <DonutChart
                      data={capitalMix}
                      category="value"
                      index="name"
                      valueFormatter={(v) => fmtBRL(v)}
                      colors={['emerald', 'purple']}
                      className="h-64 mt-4"
                    />
                  </Card>

                  {/* Top Bancos */}
                  <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
                    <Title className="text-slate-900">Top Instituições Financeiras</Title>
                    <Text className="text-slate-500 text-sm mb-4">
                      {filterState.banco ? `Filtrado: ${filterState.banco}` : 'Clique para filtrar (afeta Auditoria também)'}
                    </Text>
                    <div className="mt-4 space-y-2">
                      {bankData.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${
                            filterState.banco === item.name
                              ? 'bg-purple-100 border-l-4 border-purple-500'
                              : 'hover:bg-slate-50'
                          }`}
                          onClick={() => handleBancoClick(item)}
                        >
                          <Text className="text-slate-700 text-sm font-medium truncate">{item.name}</Text>
                          <Text className="text-slate-900 font-bold ml-2">{fmtCompact(item.value)}</Text>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="space-y-6">
                <Card className="bg-amber-50 border-amber-200">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                    <Text className="font-medium text-amber-700">
                      {auditList.length} anomalias detectadas nos filtros atuais.
                    </Text>
                  </div>
                </Card>

                <Card className="bg-white shadow-sm">
                  <Title className="text-slate-900 mb-4">Operações com Divergências</Title>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3">Placa</th>
                          <th className="px-4 py-3">Modelo</th>
                          <th className="px-4 py-3 text-right">Compra</th>
                          <th className="px-4 py-3 text-right">FIPE</th>
                          <th className="px-4 py-3 text-right">Diferença</th>
                          <th className="px-4 py-3">Motivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditList.slice(0, 20).map((r: any, i) => (
                          <tr key={i} className="hover:bg-amber-50">
                            <td className="px-4 py-3 font-medium">{r.Placa}</td>
                            <td className="px-4 py-3">{r.Modelo}</td>
                            <td className="px-4 py-3 text-right">{fmtBRL(r.compra)}</td>
                            <td className="px-4 py-3 text-right">{fmtBRL(r.fipe)}</td>
                            <td className="px-4 py-3 text-right text-rose-600 font-medium">{fmtBRL(r.diff)}</td>
                            <td className="px-4 py-3 text-amber-700 text-xs">{r.reason}</td>
                          </tr>
                        ))}
                        {auditList.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                              Nenhuma anomalia detectada. Todas as operações estão dentro dos parâmetros.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </div>
    </div>
  );
}
