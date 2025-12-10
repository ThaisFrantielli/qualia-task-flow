import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, DonutChart } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { Wrench, Filter, X, AlertCircle } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseNum(v: any): number {
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
export default function MaintenanceDashboard(): JSX.Element {
  // *** MIGRAÇÃO: Usa fat_manutencao_os_*.json e fat_manutencao_itens_*.json ***
  const { data: osData } = useBIData<AnyObject[]>('fat_manutencao_os_*.json');
  const { data: itensData } = useBIData<AnyObject[]>('fat_manutencao_itens_*.json');

  const osList = useMemo((): AnyObject[] => {
    const raw = (osData as any)?.data || osData;
    return Array.isArray(raw) ? raw : [];
  }, [osData]);

  const itensList = useMemo((): AnyObject[] => {
    const raw = (itensData as any)?.data || itensData;
    return Array.isArray(raw) ? raw : [];
  }, [itensData]);

  // *** ESTADO DE FILTROS INTERATIVOS (PowerBI Style) ***
  const [filterState, setFilterState] = useState<{
    mes: string | null;
    oficina: string | null;
    placa: string | null;
  }>({
    mes: null,
    oficina: null,
    placa: null
  });

  const [activeTab, setActiveTab] = useState(0);

  const hasActiveFilters = useMemo(() => {
    return !!(filterState.mes || filterState.oficina || filterState.placa);
  }, [filterState]);

  const clearFilters = () => {
    setFilterState({ mes: null, oficina: null, placa: null });
  };

  // *** DADOS FILTRADOS (Derivados do filterState) ***
  const filteredOS = useMemo(() => {
    return osList.filter((r: AnyObject) => {
      if (filterState.mes && getMonthKey(r.DataEntrada) !== filterState.mes) return false;
      if (filterState.oficina && r.Fornecedor !== filterState.oficina) return false;
      if (filterState.placa && r.Placa !== filterState.placa) return false;
      return true;
    });
  }, [osList, filterState]);

  // Filtered Items (based on filtered OS IDs)
  const filteredItens = useMemo(() => {
    const osIds = new Set(filteredOS.map((r: AnyObject) => r.NumeroOS));
    return itensList.filter((i: AnyObject) => osIds.has(i.NumeroOS));
  }, [itensList, filteredOS]);

  // *** KPIs ***
  const kpis = useMemo(() => {
    const totalCost = filteredOS.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorTotal), 0);
    const valorReembolsavel = filteredOS.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorReembolsavel || r.ValorReembolsadoCliente || 0), 0);
    const countOS = filteredOS.length;
    const avgCost = countOS > 0 ? totalCost / countOS : 0;

    // Avg Repair Time
    const totalDays = filteredOS.reduce((s: number, r: AnyObject) => s + (parseCurrency(r.DiasParado) || 0), 0);
    const avgTime = countOS > 0 ? totalDays / countOS : 0;

    // Vehicles Stopped Today (Open OS)
    const stopped = filteredOS.filter((r: AnyObject) => !r.DataSaida).length;

    // Top Oficina
    const oficinaMap: Record<string, number> = {};
    filteredOS.forEach((r: AnyObject) => {
      const o = r.Fornecedor || 'N/D';
      oficinaMap[o] = (oficinaMap[o] || 0) + parseCurrency(r.ValorTotal);
    });
    const topOficina = Object.entries(oficinaMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/D';

    return { totalCost, avgCost, avgTime, stopped, topOficina, valorReembolsavel };
  }, [filteredOS]);

  // === GRÁFICOS INTERATIVOS ===

  // 1. Evolução de Custo Mensal
  const monthlyData = useMemo(() => {
    const map: Record<string, { Valor: number; Km: number }> = {};
    filteredOS.forEach((r: AnyObject) => {
      const k = getMonthKey(r.DataEntrada);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Km: 0 };
      map[k].Valor += parseCurrency(r.ValorTotal);
      const km = parseNum(r.Km || r.KmRodado || r.KmMensal || r.Kilometragem || 0);
      map[k].Km += km;
    });
    return Object.keys(map).sort().map(k => ({
      date: k,
      label: monthLabel(k),
      Valor: map[k].Valor,
      Km: map[k].Km,
      CPK: map[k].Km > 0 ? map[k].Valor / map[k].Km : 0
    }));
  }, [filteredOS]);

  // 2. Top Ofensores (Placas)
  const topOffenders = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOS.forEach((r: AnyObject) => {
      const p = r.Placa || 'N/A';
      map[p] = (map[p] || 0) + parseCurrency(r.ValorTotal);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredOS]);

  // 3. Top Peças/Serviços (da tabela de Itens)
  const topPecasServicos = useMemo(() => {
    const map: Record<string, number> = {};
    filteredItens.forEach((i: AnyObject) => {
      const desc = i.DescricaoItem || i.ItemDescricao || 'N/D';
      map[desc] = (map[desc] || 0) + parseCurrency(i.ValorItem);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [filteredItens]);

  // 4. Tipo de Manutenção (Preventiva vs Corretiva)
  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOS.forEach((r: AnyObject) => {
      const t = r.TipoManutencao || 'Outros';
      map[t] = (map[t] || 0) + parseCurrency(r.ValorTotal);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredOS]);

  // === HANDLERS DE CLIQUE (Interatividade PowerBI) ===
  const handleMonthClick = (data: any) => {
    setFilterState(prev => ({ ...prev, mes: prev.mes === data.date ? null : data.date }));
  };

  const handlePlacaClick = (data: any) => {
    setFilterState(prev => ({ ...prev, placa: prev.placa === data.name ? null : data.name }));
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Maintenance Dashboard</Title>
          <Text className="mt-1 text-slate-500">
            Controle de custos, oficinas e eficiência de reparo. Clique nos gráficos para filtrar.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <Wrench className="w-4 h-4" /> Hub Operacional
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
            {filterState.mes && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                Mês: <strong>{monthLabel(filterState.mes)}</strong>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState(prev => ({ ...prev, mes: null }))} />
              </span>
            )}
            {filterState.oficina && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                Oficina: <strong>{filterState.oficina}</strong>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState(prev => ({ ...prev, oficina: null }))} />
              </span>
            )}
            {filterState.placa && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                Placa: <strong>{filterState.placa}</strong>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterState(prev => ({ ...prev, placa: null }))} />
              </span>
            )}
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="amber" className="bg-white shadow-sm">
          <Text className="text-slate-500">Custo Total</Text>
          <Metric className="text-slate-900">{fmtCompact(kpis.totalCost)}</Metric>
          <Text className="text-xs text-slate-400 mt-1">{filteredOS.length} OSs</Text>
        </Card>
        <Card decoration="top" decorationColor="blue" className="bg-white shadow-sm">
          <Text className="text-slate-500">Ticket Médio / OS</Text>
          <Metric className="text-slate-900">{fmtBRL(kpis.avgCost)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="emerald" className="bg-white shadow-sm">
          <Text className="text-slate-500">Tempo Médio Reparo</Text>
          <Metric className="text-slate-900">{kpis.avgTime.toFixed(1)} dias</Metric>
        </Card>
        <Card decoration="top" decorationColor="rose" className="bg-white shadow-sm">
          <Text className="text-slate-500">Veículos Parados Hoje</Text>
          <Metric className="text-slate-900">{kpis.stopped}</Metric>
          <Text className="text-xs text-slate-400 mt-1">Top: {kpis.topOficina}</Text>
        </Card>
      </div>

      {/* Abas (simplified) */}
      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setActiveTab(0)} className={`px-4 py-2 rounded ${activeTab === 0 ? 'bg-amber-600 text-white' : 'bg-white border'}`}>
            Visão Geral
          </button>
          <button onClick={() => setActiveTab(1)} className={`px-4 py-2 rounded ${activeTab === 1 ? 'bg-amber-600 text-white' : 'bg-white border'}`}>
            Técnica
          </button>
        </div>

        {activeTab === 0 && (
          <div className="space-y-6">
              {/* Row 1: Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Evolução Mensal */}
                <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
                  <Title className="text-slate-900">Custo Mensal</Title>
                  <Text className="text-slate-500 text-sm mb-4">
                    {filterState.mes ? `Filtrado: ${monthLabel(filterState.mes)}` : 'Clique nas barras para filtrar'}
                  </Text>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} stroke="#64748b" />
                        <Tooltip
                          formatter={(v: any) => fmtBRL(v)}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Bar dataKey="Valor" radius={[4, 4, 0, 0]} onClick={(data) => handleMonthClick(data)}>
                          {monthlyData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={filterState.mes === entry.date ? '#ef4444' : '#f59e0b'}
                              cursor="pointer"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card className="bg-white shadow-sm">
                  <Title className="text-slate-900">Recuperação de Custos</Title>
                  <Text className="text-slate-500 text-sm mb-2">Soma de valores reembolsáveis cobrados do cliente</Text>
                  <div className="mt-2">
                    <Metric className="text-slate-900">{fmtCompact(kpis.valorReembolsavel)}</Metric>
                    <Text className="text-xs text-slate-400 mt-1">Total reembolsado / cobrado</Text>
                  </div>
                </Card>

                <Card className="bg-white shadow-sm">
                  <Title className="text-slate-900">Evolução do CPK (Custo por KM)</Title>
                  <Text className="text-slate-500 text-sm mb-2">CPK mensal calculado como Custo / Km</Text>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${Number(v).toFixed(2)}`} stroke="#64748b" />
                        <Tooltip formatter={(v: any) => fmtBRL(Number(v))} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        <Bar dataKey="CPK" fill="#10b981" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Top Ofensores (Placas) */}
                <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
                  <Title className="text-slate-900">Top Ofensores (Placa)</Title>
                  <Text className="text-slate-500 text-sm mb-4">
                    {filterState.placa ? `Filtrado: ${filterState.placa}` : 'Clique para filtrar'}
                  </Text>
                  <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
                    {topOffenders.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${
                          filterState.placa === item.name
                            ? 'bg-amber-100 border-l-4 border-amber-500'
                            : 'hover:bg-slate-50'
                        }`}
                        onClick={() => handlePlacaClick(item)}
                      >
                        <Text className="text-slate-700 text-sm font-medium">{item.name}</Text>
                        <Text className="text-slate-900 font-bold ml-2">{fmtCompact(item.value)}</Text>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Row 2: Tipo de Manutenção */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-white shadow-sm">
                  <Title className="text-slate-900">Custo por Tipo</Title>
                  <DonutChart
                    data={typeData}
                    category="value"
                    index="name"
                    valueFormatter={(v) => fmtBRL(v)}
                    colors={['amber', 'rose', 'blue', 'slate']}
                    className="h-60 mt-4"
                  />
                </Card>

                {/* Insight Card */}
                <Card className="bg-white shadow-sm">
                  <Title className="text-slate-900 mb-4">Insights</Title>
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div>
                          <Text className="font-medium text-amber-700 text-sm">Tempo Médio de Reparo</Text>
                          <Text className="text-xs text-amber-600 mt-1">
                            {kpis.avgTime > 5
                              ? `${kpis.avgTime.toFixed(1)} dias está acima do ideal (5 dias). Revisar processos.`
                              : `${kpis.avgTime.toFixed(1)} dias está dentro do padrão.`}
                          </Text>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div>
                          <Text className="font-medium text-blue-700 text-sm">Ticket Médio</Text>
                          <Text className="text-xs text-blue-600 mt-1">
                            {kpis.avgCost > 1000
                              ? `${fmtBRL(kpis.avgCost)} por OS. Custos elevados detectados.`
                              : `${fmtBRL(kpis.avgCost)} por OS está controlado.`}
                          </Text>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Lista de OSs Recentes */}
              <Card className="bg-white shadow-sm">
                <Title className="text-slate-900 mb-4">OSs Recentes</Title>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">OS</th>
                        <th className="px-4 py-3">Placa</th>
                        <th className="px-4 py-3">Entrada</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Fornecedor</th>
                        <th className="px-4 py-3 text-right">Valor Total</th>
                        <th className="px-4 py-3 text-right">Dias Parado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOS
                        .sort((a, b) => (b.DataEntrada || '').localeCompare(a.DataEntrada || ''))
                        .slice(0, 15)
                        .map((r, i) => (
                          <tr key={`os-${i}`} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{r.NumeroOS}</td>
                            <td className="px-4 py-3">{r.Placa}</td>
                            <td className="px-4 py-3">{r.DataEntrada ? new Date(r.DataEntrada).toLocaleDateString('pt-BR') : '-'}</td>
                            <td className="px-4 py-3">{r.TipoManutencao}</td>
                            <td className="px-4 py-3 truncate max-w-[150px]">{r.Fornecedor}</td>
                            <td className="px-4 py-3 text-right font-medium text-amber-700">{fmtBRL(parseCurrency(r.ValorTotal))}</td>
                            <td className="px-4 py-3 text-right">{r.DiasParado || 0}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* === ABA 2: TÉCNICA (Peças/Serviços) === */}
        {activeTab === 1 && (
          <div className="space-y-6">
              <Card className="bg-white shadow-sm">
                <Title className="text-slate-900">Top Peças/Serviços</Title>
                <Text className="text-slate-500 text-sm mb-4">Análise baseada nos itens das OSs</Text>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <Text className="font-medium text-slate-700 mb-3">Top 15 por Valor</Text>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {topPecasServicos.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded hover:bg-slate-50">
                          <Text className="text-slate-700 text-sm truncate max-w-[300px]">{item.name}</Text>
                          <Text className="text-slate-900 font-bold ml-2">{fmtCompact(item.value)}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topPecasServicos.slice(0, 10)} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} stroke="#64748b" />
                        <YAxis dataKey="name" type="category" width={150} fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" />
                        <Tooltip formatter={(v: any) => fmtBRL(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>
          )}
      </div>
    </div>
  );
}
