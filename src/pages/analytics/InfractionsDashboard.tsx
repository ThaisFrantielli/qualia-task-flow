import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ComposedChart, Line } from 'recharts';
import { AlertOctagon, Filter, X, TrendingUp } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number): string { 
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`; 
  return `R$ ${v.toFixed(0)}`;
}
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

const COLORS = ['#f43f5e', '#f97316', '#fbbf24', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

export default function InfractionsDashboard(): JSX.Element {
  const { data: multasData, loading } = useBIData<AnyObject[]>('fat_multas_*.json');
  const multas = useMemo(() => Array.isArray(multasData) ? multasData : [], [multasData]);

  const [activeTab, setActiveTab] = useState(0);
  const [filterState, setFilterState] = useState<{ mes: string | null; condutor: string | null; tipo: string | null; }>({ mes: null, condutor: null, tipo: null });

  const hasActiveFilters = !!(filterState.mes || filterState.condutor || filterState.tipo);
  const clearFilters = () => setFilterState({ mes: null, condutor: null, tipo: null });

  const filteredMultas = useMemo(() => {
    return multas.filter((r: AnyObject) => {
      if (filterState.mes && getMonthKey(r.DataInfracao) !== filterState.mes) return false;
      if (filterState.condutor && r.Condutor !== filterState.condutor) return false;
      if (filterState.tipo && r.TipoInfracao !== filterState.tipo) return false;
      return true;
    });
  }, [multas, filterState]);

  const kpis = useMemo(() => {
    const valorTotal = filteredMultas.reduce((s, r) => s + parseCurrency(r.ValorMulta), 0);
    const qtdInfracoes = filteredMultas.length;
    const valorReembolsado = filteredMultas.reduce((s, r) => s + parseCurrency(r.ValorReembolsado), 0);
    const percReembolso = valorTotal > 0 ? (valorReembolsado / valorTotal) * 100 : 0;
    const ticketMedio = qtdInfracoes > 0 ? valorTotal / qtdInfracoes : 0;
    return { valorTotal, qtdInfracoes, valorReembolsado, percReembolso, ticketMedio };
  }, [filteredMultas]);

  const evolutionData = useMemo(() => {
    const map: Record<string, { Valor: number; Qtd: number }> = {};
    filteredMultas.forEach(r => {
      const k = getMonthKey(r.DataInfracao);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Qtd: 0 };
      map[k].Valor += parseCurrency(r.ValorMulta);
      map[k].Qtd += 1;
    });
    return Object.keys(map).sort().slice(-24).map(k => ({ date: k, label: monthLabel(k), ...map[k] }));
  }, [filteredMultas]);

  const topInfratores = useMemo(() => {
    const map: Record<string, number> = {};
    filteredMultas.forEach(r => {
      const c = r.Condutor || 'Desconhecido';
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredMultas]);

  const tiposData = useMemo(() => {
    const map: Record<string, { valor: number; qtd: number }> = {};
    filteredMultas.forEach(r => {
      const t = r.TipoInfracao || 'Outros';
      if (!map[t]) map[t] = { valor: 0, qtd: 0 };
      map[t].valor += parseCurrency(r.ValorMulta);
      map[t].qtd += 1;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name: name.length > 50 ? name.substring(0, 50) + '...' : name, fullName: name, ...data }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 15);
  }, [filteredMultas]);

  const placasData = useMemo(() => {
    const map: Record<string, { valor: number; qtd: number }> = {};
    filteredMultas.forEach(r => {
      const p = r.Placa || 'N/D';
      if (!map[p]) map[p] = { valor: 0, qtd: 0 };
      map[p].valor += parseCurrency(r.ValorMulta);
      map[p].qtd += 1;
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.valor - a.valor).slice(0, 15);
  }, [filteredMultas]);

  const tabs = ['Visão Geral', 'Por Tipo', 'Por Condutor', 'Por Veículo', 'Detalhamento'];

  if (loading) return <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center"><div className="animate-pulse text-slate-500">Carregando dados de multas...</div></div>;

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-slate-900">Gestão de Multas</Title>
          <Text className="text-slate-500">Controle de infrações e condutores</Text>
        </div>
        <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full flex gap-2 font-medium">
          <AlertOctagon className="w-4 h-4" /> Hub Operacional
        </div>
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
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-blue-600" />
            <Text className="font-medium text-blue-700">Filtros Ativos:</Text>
            {filterState.mes && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Mês: {monthLabel(filterState.mes)}</span>}
            {filterState.condutor && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800 truncate max-w-[200px]">Condutor: {filterState.condutor}</span>}
            {filterState.tipo && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800 truncate max-w-[300px]">Tipo: {filterState.tipo}</span>}
          </div>
        </Card>
      )}

      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
        {tabs.map((tab, idx) => (
          <button key={idx} onClick={() => setActiveTab(idx)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === idx ? 'bg-white shadow text-rose-600' : 'text-slate-600 hover:text-slate-900'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card decoration="top" decorationColor="rose">
              <Text>Valor Total Multas</Text>
              <Metric>{fmtCompact(kpis.valorTotal)}</Metric>
              <Text className="text-xs text-slate-400 mt-1">{kpis.qtdInfracoes.toLocaleString('pt-BR')} infrações</Text>
            </Card>
            <Card decoration="top" decorationColor="emerald">
              <Text>Valor Reembolsado</Text>
              <Metric className="text-emerald-600">{fmtCompact(kpis.valorReembolsado)}</Metric>
              <Text className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {kpis.percReembolso.toFixed(1)}% recuperado
              </Text>
            </Card>
            <Card decoration="top" decorationColor="amber">
              <Text>Qtd Infrações</Text>
              <Metric>{kpis.qtdInfracoes.toLocaleString('pt-BR')}</Metric>
            </Card>
            <Card decoration="top" decorationColor="blue">
              <Text>Ticket Médio</Text>
              <Metric>{fmtBRL(kpis.ticketMedio)}</Metric>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <Title>Evolução de Multas (24 meses)</Title>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} interval={Math.max(0, Math.floor(evolutionData.length / 12) - 1)} />
                    <YAxis yAxisId="left" fontSize={12} tickFormatter={fmtCompact} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} />
                    <Tooltip formatter={(v: any, n) => [n === 'Valor' ? fmtBRL(v) : v, n === 'Valor' ? 'Valor' : 'Quantidade']} />
                    <Bar yAxisId="left" dataKey="Valor" fill="#f43f5e" radius={[4, 4, 0, 0]} onClick={(d) => setFilterState(p => ({ ...p, mes: p.mes === d.date ? null : d.date }))} cursor="pointer">
                      {evolutionData.map((e, i) => <Cell key={i} fill={filterState.mes === e.date ? '#be123c' : '#f43f5e'} />)}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="Qtd" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <Title>Top 10 Infratores</Title>
              <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
                {topInfratores.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setFilterState(p => ({ ...p, condutor: filterState.condutor === item.name ? null : item.name }))} 
                    className={`flex justify-between items-center p-2 rounded cursor-pointer transition-all ${filterState.condutor === item.name ? 'bg-rose-100 ring-1 ring-rose-500' : 'hover:bg-slate-100'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs flex items-center justify-center font-bold flex-shrink-0">{idx + 1}</span>
                      <Text className="truncate">{item.name}</Text>
                    </div>
                    <Text className="font-bold text-rose-600 flex-shrink-0 ml-2">{item.value} multas</Text>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div className="space-y-6">
          <Card>
            <Title>Top 15 Tipos de Infração por Valor (R$)</Title>
            <div className="h-[500px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tiposData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={12} tickFormatter={fmtCompact} />
                  <YAxis dataKey="name" type="category" width={280} fontSize={10} tick={{ fill: '#475569' }} interval={0} />
                  <Tooltip 
                    formatter={(v: any) => fmtBRL(v)} 
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={20} cursor="pointer" onClick={(d) => setFilterState(p => ({ ...p, tipo: p.tipo === d.fullName ? null : d.fullName }))}>
                    {tiposData.map((entry, i) => (
                      <Cell key={i} fill={filterState.tipo === entry.fullName ? '#be123c' : COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <Title>Detalhamento por Tipo de Infração</Title>
            <div className="mt-4 overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="p-3 text-left">Tipo de Infração</th>
                    <th className="p-3 text-center">Qtd</th>
                    <th className="p-3 text-right">Valor Total</th>
                    <th className="p-3 text-right">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {tiposData.map((t, idx) => (
                    <tr key={idx} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => setFilterState(p => ({ ...p, tipo: p.tipo === t.fullName ? null : t.fullName }))}>
                      <td className="p-3 max-w-[400px]"><span className="line-clamp-2">{t.fullName}</span></td>
                      <td className="p-3 text-center">{t.qtd}</td>
                      <td className="p-3 text-right font-medium text-rose-600">{fmtBRL(t.valor)}</td>
                      <td className="p-3 text-right">{fmtBRL(t.qtd > 0 ? t.valor / t.qtd : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 2 && (
        <div className="space-y-6">
          <Card>
            <Title>Multas por Condutor (Top 15)</Title>
            <div className="h-[400px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topInfratores.slice(0, 15)} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={200} fontSize={11} tick={{ fill: '#475569' }} interval={0} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={18} name="Qtd Multas" cursor="pointer" onClick={(d) => setFilterState(p => ({ ...p, condutor: p.condutor === d.name ? null : d.name }))}>
                    {topInfratores.map((entry, i) => (
                      <Cell key={i} fill={filterState.condutor === entry.name ? '#be123c' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 3 && (
        <div className="space-y-6">
          <Card>
            <Title>Top 15 Veículos com Mais Multas (R$)</Title>
            <div className="h-[400px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={placasData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={12} tickFormatter={fmtCompact} />
                  <YAxis dataKey="name" type="category" width={100} fontSize={11} tick={{ fill: '#475569' }} interval={0} />
                  <Tooltip formatter={(v: any) => fmtBRL(v)} />
                  <Bar dataKey="valor" fill="#f97316" radius={[0, 4, 4, 0]} barSize={18} name="Valor">
                    {placasData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <Title>Detalhamento por Veículo</Title>
            <div className="mt-4 overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="p-3 text-left">Placa</th>
                    <th className="p-3 text-center">Qtd Multas</th>
                    <th className="p-3 text-right">Valor Total</th>
                    <th className="p-3 text-right">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {placasData.map((p, idx) => (
                    <tr key={idx} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-mono">{p.name}</td>
                      <td className="p-3 text-center">{p.qtd}</td>
                      <td className="p-3 text-right font-medium text-rose-600">{fmtBRL(p.valor)}</td>
                      <td className="p-3 text-right">{fmtBRL(p.qtd > 0 ? p.valor / p.qtd : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 4 && (
        <Card>
          <Title>Detalhamento de Multas</Title>
          <div className="mt-4 overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-rose-50 text-rose-800 sticky top-0">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Placa</th>
                  <th className="p-3">Condutor</th>
                  <th className="p-3">Tipo de Infração</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3 text-right">Reembolso</th>
                </tr>
              </thead>
              <tbody>
                {filteredMultas.slice(0, 100).map((r: AnyObject, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 border-t">
                    <td className="p-3 whitespace-nowrap">{r.DataInfracao ? new Date(r.DataInfracao).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="p-3 font-mono">{r.Placa || '-'}</td>
                    <td className="p-3 truncate max-w-[150px]">{r.Condutor || '-'}</td>
                    <td className="p-3 max-w-[300px]"><span className="line-clamp-2 text-xs">{r.TipoInfracao || '-'}</span></td>
                    <td className="p-3 text-right font-bold text-rose-600">{fmtBRL(parseCurrency(r.ValorMulta))}</td>
                    <td className="p-3 text-right text-emerald-600">{fmtBRL(parseCurrency(r.ValorReembolsado))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
