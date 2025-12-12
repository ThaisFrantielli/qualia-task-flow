import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { AlertOctagon, Filter, X } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number): string { return `R$ ${(v / 1000).toFixed(0)}k`; }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

export default function InfractionsDashboard(): JSX.Element {
  const { data: multasData } = useBIData<AnyObject[]>('fat_multas_*.json');
  const multas = useMemo(() => Array.isArray(multasData) ? multasData : [], [multasData]);

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
    return { valorTotal, qtdInfracoes, valorReembolsado, percReembolso };
  }, [filteredMultas]);

  const evolutionData = useMemo(() => {
    const map: any = {};
    filteredMultas.forEach(r => {
      const k = getMonthKey(r.DataInfracao);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Qtd: 0 };
      map[k].Valor += parseCurrency(r.ValorMulta);
      map[k].Qtd += 1;
    });
    return Object.keys(map).sort().map(k => ({ date: k, label: monthLabel(k), ...map[k] }));
  }, [filteredMultas]);

  const topInfratores = useMemo(() => {
    const map: any = {};
    filteredMultas.forEach(r => {
      const c = r.Condutor || 'Desconhecido';
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]: any) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10);
  }, [filteredMultas]);

  const tiposData = useMemo(() => {
    const map: any = {};
    filteredMultas.forEach(r => {
      const t = r.TipoInfracao || 'Outros';
      map[t] = (map[t] || 0) + parseCurrency(r.ValorMulta);
    });
    return Object.entries(map).map(([name, value]: any) => ({ name, value }));
  }, [filteredMultas]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Gestão de Multas</Title><Text className="text-slate-500">Controle de infrações e condutores.</Text></div>
        <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full flex gap-2 font-medium"><AlertOctagon className="w-4 h-4"/> Hub Operacional</div>
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
            {filterState.condutor && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Condutor: {filterState.condutor}</span>}
            {filterState.tipo && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Tipo: {filterState.tipo}</span>}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="rose"><Text>Valor Multas</Text><Metric>{fmtCompact(kpis.valorTotal)}</Metric><Text className="text-xs text-slate-400">{kpis.qtdInfracoes} infrações</Text></Card>
        <Card decoration="top" decorationColor="emerald"><Text>Reembolsado</Text><Metric>{fmtCompact(kpis.valorReembolsado)}</Metric><Text className="text-xs text-slate-400">{kpis.percReembolso.toFixed(1)}% recup.</Text></Card>
        <Card decoration="top" decorationColor="amber"><Text>Qtd Infrações</Text><Metric>{kpis.qtdInfracoes}</Metric></Card>
        <Card decoration="top" decorationColor="blue"><Text>Ticket Médio</Text><Metric>{fmtBRL(kpis.qtdInfracoes > 0 ? kpis.valorTotal / kpis.qtdInfracoes : 0)}</Metric></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
            <Title>Evolução de Multas</Title>
            <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evolutionData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="label" fontSize={12}/>
                        <YAxis fontSize={12} tickFormatter={fmtCompact}/>
                        <Tooltip formatter={(v:any, n) => [n==='Valor'?fmtBRL(v):v, n]}/>
                        <Bar dataKey="Valor" fill="#f43f5e" radius={[4,4,0,0]} onClick={(d) => setFilterState(p => ({...p, mes: p.mes === d.date ? null : d.date}))} cursor="pointer">
                            {evolutionData.map((e, i) => <Cell key={i} fill={filterState.mes === e.date ? '#be123c' : '#f43f5e'} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
        <Card>
            <Title>Top Infratores (Condutores)</Title>
            <div className="mt-4 space-y-2 h-64 overflow-y-auto">
                {topInfratores.map((item: any, idx: number) => (
                    <div key={idx} onClick={() => setFilterState(p => ({...p, condutor: filterState.condutor === item.name ? null : item.name}))} className={`flex justify-between items-center p-2 rounded cursor-pointer ${filterState.condutor === item.name ? 'bg-rose-100 ring-1 ring-rose-500' : 'hover:bg-slate-50'}`}>
                        <Text className="truncate max-w-[70%]">{item.name}</Text>
                        <Text className="font-bold">{item.value} multas</Text>
                    </div>
                ))}
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
            <Title>Tipos de Infração (R$)</Title>
            <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={tiposData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" onClick={(d) => setFilterState(p => ({...p, tipo: p.tipo === d.name ? null : d.name}))} cursor="pointer">
                            {tiposData.map((_, i) => <Cell key={i} fill={['#f43f5e', '#fbbf24', '#f97316', '#ef4444', '#ec4899'][i % 5]} />)}
                        </Pie>
                        <Tooltip formatter={fmtBRL}/>
                        <Legend verticalAlign="bottom"/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
        <Card>
            <Title>Detalhamento Recente</Title>
            <div className="overflow-x-auto h-64">
                <table className="w-full text-sm text-left">
                    <thead className="bg-rose-50 text-rose-800"><tr><th className="p-2">Data</th><th className="p-2">Placa</th><th className="p-2">Condutor</th><th className="p-2 text-right">Valor</th></tr></thead>
                    <tbody>
                        {filteredMultas.slice(0, 15).map((r: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50 border-t">
                                <td className="p-2">{r.DataInfracao ? new Date(r.DataInfracao).toLocaleDateString('pt-BR') : '-'}</td>
                                <td className="p-2 font-mono">{r.Placa}</td>
                                <td className="p-2 truncate max-w-[150px]">{r.Condutor}</td>
                                <td className="p-2 text-right font-bold text-rose-600">{fmtBRL(r.ValorMulta)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
      </div>
    </div>
  );
}