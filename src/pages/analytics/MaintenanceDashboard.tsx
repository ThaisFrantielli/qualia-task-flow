import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Wrench, Filter, X, AlertCircle } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function parseNum(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number): string { return `R$ ${(v / 1000).toFixed(0)}k`; }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

export default function MaintenanceDashboard(): JSX.Element {
  const { data: osData } = useBIData<AnyObject[]>('fat_manutencao_os_*.json');
  const { data: itensData } = useBIData<AnyObject[]>('fat_manutencao_itens_*.json');

  const osList = useMemo(() => Array.isArray(osData) ? osData : [], [osData]);
  const itensList = useMemo(() => Array.isArray(itensData) ? itensData : [], [itensData]);

  const [activeTab, setActiveTab] = useState(0);
  const [filterState, setFilterState] = useState<{ mes: string | null; oficina: string | null; placa: string | null; }>({ mes: null, oficina: null, placa: null });
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const hasActiveFilters = !!(filterState.mes || filterState.oficina || filterState.placa);
  const clearFilters = () => setFilterState({ mes: null, oficina: null, placa: null });

  const filteredOS = useMemo(() => {
    return osList.filter((r: AnyObject) => {
      if (filterState.mes && getMonthKey(r.DataEntrada) !== filterState.mes) return false;
      if (filterState.oficina && r.Fornecedor !== filterState.oficina) return false;
      if (filterState.placa && r.Placa !== filterState.placa) return false;
      return true;
    });
  }, [osList, filterState]);

  const filteredItens = useMemo(() => {
    // Optimization: create Set of IDs
    const osIds = new Set(filteredOS.map(r => r.IdOrdemServico));
    return itensList.filter(i => osIds.has(i.IdOrdemServico));
  }, [itensList, filteredOS]);

  const kpis = useMemo(() => {
    const totalCost = filteredOS.reduce((s, r) => s + parseCurrency(r.ValorTotal), 0);
    const count = filteredOS.length;
    const avgCost = count > 0 ? totalCost / count : 0;
    const days = filteredOS.reduce((s, r) => s + parseNum(r.DiasParado), 0);
    const avgDays = count > 0 ? days / count : 0;
    
    // CPK Calculation (Sum Cost / Sum Km of OSs that have Km)
    const validKmOS = filteredOS.filter(r => parseNum(r.Km) > 0);
    const costValid = validKmOS.reduce((s, r) => s + parseCurrency(r.ValorTotal), 0);
    const kmValid = validKmOS.reduce((s, r) => s + parseNum(r.Km), 0); // Note: Summing odometers is weird, usually we want delta. Assuming this is monthly delta or just an indicator.
    // Better CPK approach for dashboard: Cost / (Total Fleet Km in period). Since we don't have fleet km delta here, let's use Avg Cost per Event as main metric.
    
    const stopped = filteredOS.filter(r => !r.DataSaida).length;

    return { totalCost, avgCost, avgDays, stopped };
  }, [filteredOS]);

  const monthlyData = useMemo(() => {
    const map: any = {};
    filteredOS.forEach(r => {
      const k = getMonthKey(r.DataEntrada);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Count: 0 };
      map[k].Valor += parseCurrency(r.ValorTotal);
      map[k].Count += 1;
    });
    return Object.keys(map).sort().map(k => ({ date: k, label: monthLabel(k), ...map[k] }));
  }, [filteredOS]);

  const typeData = useMemo(() => {
    const map: any = {};
    filteredOS.forEach(r => {
      const t = r.TipoManutencao || 'Outros';
      map[t] = (map[t] || 0) + parseCurrency(r.ValorTotal);
    });
    return Object.entries(map).map(([name, value]: any) => ({ name, value }));
  }, [filteredOS]);

  const topOffenders = useMemo(() => {
    const map: any = {};
    filteredOS.forEach(r => {
      const p = r.Placa || 'N/D';
      map[p] = (map[p] || 0) + parseCurrency(r.ValorTotal);
    });
    return Object.entries(map).map(([name, value]: any) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10);
  }, [filteredOS]);

  const topItems = useMemo(() => {
    const map: any = {};
    filteredItens.forEach(i => {
      const d = i.DescricaoItem || 'Item N/D';
      map[d] = (map[d] || 0) + parseCurrency(i.ValorItem);
    });
    return Object.entries(map).map(([name, value]: any) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10);
  }, [filteredItens]);

  const pageItems = useMemo(() => filteredOS.slice(page * pageSize, (page + 1) * pageSize), [filteredOS, page]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Gestão de Manutenção</Title><Text className="text-slate-500">Controle de custos, oficinas e eficiência.</Text></div>
        <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full flex gap-2 font-medium"><Wrench className="w-4 h-4"/> Hub Operacional</div>
      </div>

      {hasActiveFilters && (
        <div className="fixed bottom-8 right-8 z-50">
          <button onClick={clearFilters} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105">
            <X className="w-5 h-5" /> Limpar Filtros
          </button>
        </div>
      )}

      {hasActiveFilters && (
        <Card className="bg-blue-50 border-blue-200 py-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <Text className="font-medium text-blue-700">Filtros Ativos:</Text>
            {filterState.mes && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Mês: {monthLabel(filterState.mes)}</span>}
            {filterState.oficina && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Oficina: {filterState.oficina}</span>}
            {filterState.placa && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Placa: {filterState.placa}</span>}
          </div>
        </Card>
      )}

      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
        {['Visão Geral', 'Peças e Serviços'].map((tab, idx) => (
            <button key={idx} onClick={() => setActiveTab(idx)} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === idx ? 'bg-white shadow text-amber-600' : 'text-slate-600'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card decoration="top" decorationColor="amber"><Text>Custo Total</Text><Metric>{fmtCompact(kpis.totalCost)}</Metric></Card>
                <Card decoration="top" decorationColor="blue"><Text>Ticket Médio / OS</Text><Metric>{fmtBRL(kpis.avgCost)}</Metric></Card>
                <Card decoration="top" decorationColor="emerald"><Text>Tempo Médio Reparo</Text><Metric>{kpis.avgDays.toFixed(1)} dias</Metric></Card>
                <Card decoration="top" decorationColor="rose"><Text>Parados em Oficina</Text><Metric>{kpis.stopped}</Metric></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <Title>Evolução de Custos</Title>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="label" fontSize={12}/>
                                <YAxis yAxisId="left" fontSize={12} tickFormatter={fmtCompact}/>
                                <YAxis yAxisId="right" orientation="right" fontSize={12}/>
                                <Tooltip formatter={(v:any, n) => [n==='Valor'?fmtBRL(v):v, n]}/>
                                <Bar yAxisId="left" dataKey="Valor" fill="#f59e0b" radius={[4,4,0,0]} onClick={(d) => setFilterState(p => ({...p, mes: p.mes === d.date ? null : d.date}))} cursor="pointer"/>
                                <Line yAxisId="right" type="monotone" dataKey="Count" stroke="#3b82f6" strokeWidth={2}/>
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <Title>Custo por Tipo (R$)</Title>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" cursor="pointer">
                                    {typeData.map((_, i) => <Cell key={i} fill={['#f59e0b', '#ef4444', '#3b82f6', '#64748b'][i % 4]} />)}
                                </Pie>
                                <Tooltip formatter={fmtBRL}/>
                                <Legend verticalAlign="bottom"/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <Title>Top Ofensores (Placa)</Title>
                    <div className="mt-4 space-y-2 h-64 overflow-y-auto">
                        {topOffenders.map((item: any, idx: number) => (
                            <div key={idx} onClick={() => setFilterState(p => ({...p, placa: filterState.placa === item.name ? null : item.name}))} className={`p-2 rounded cursor-pointer flex justify-between text-sm ${filterState.placa === item.name ? 'bg-amber-100 ring-1 ring-amber-500' : 'hover:bg-slate-50'}`}>
                                <span className="font-mono">{item.name}</span>
                                <span className="font-bold">{fmtCompact(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card>
                    <Title>Lista de OS Recentes</Title>
                    <div className="mt-4 h-64 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 sticky top-0"><tr><th className="p-2">Data</th><th className="p-2">Placa</th><th className="p-2">Tipo</th><th className="p-2 text-right">Valor</th></tr></thead>
                            <tbody>
                                {pageItems.map((r: any, i: number) => (
                                    <tr key={i} className="border-t hover:bg-slate-50">
                                        <td className="p-2">{r.DataEntrada ? new Date(r.DataEntrada).toLocaleDateString('pt-BR') : '-'}</td>
                                        <td className="p-2 font-mono">{r.Placa}</td>
                                        <td className="p-2 truncate max-w-[100px]">{r.TipoManutencao}</td>
                                        <td className="p-2 text-right font-bold text-amber-600">{fmtBRL(parseCurrency(r.ValorTotal))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
      )}

      {activeTab === 1 && (
        <Card>
            <Title>Top Peças e Serviços</Title>
            <Text className="text-slate-500 text-sm mb-4">Itens mais caros no período</Text>
            <div className="mt-4 h-96 overflow-y-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topItems} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                        <XAxis type="number" fontSize={12} tickFormatter={fmtCompact}/>
                        <YAxis dataKey="name" type="category" width={200} fontSize={11} tick={{fill: '#475569'}}/>
                        <Tooltip formatter={fmtBRL}/>
                        <Bar dataKey="value" fill="#f59e0b" radius={[0,4,4,0]} barSize={20}/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
      )}
    </div>
  );
}