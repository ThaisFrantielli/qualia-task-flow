import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { ShieldX, Filter, X } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number): string { return `R$ ${(v / 1000).toFixed(0)}k`; }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

export default function ClaimsDashboard(): JSX.Element {
  const { data: sinistrosData } = useBIData<AnyObject[]>('fat_sinistros_*.json');
  const sinistros = useMemo(() => Array.isArray(sinistrosData) ? sinistrosData : [], [sinistrosData]);

  const [filterState, setFilterState] = useState<{ mes: string | null; culpa: string | null; tipo: string | null; }>({ mes: null, culpa: null, tipo: null });

  const hasActiveFilters = !!(filterState.mes || filterState.culpa || filterState.tipo);
  const clearFilters = () => setFilterState({ mes: null, culpa: null, tipo: null });

  const filteredSinistros = useMemo(() => {
    return sinistros.filter((r: AnyObject) => {
      if (filterState.mes && getMonthKey(r.DataSinistro) !== filterState.mes) return false;
      if (filterState.culpa && r.Culpabilidade !== filterState.culpa) return false;
      if (filterState.tipo && r.TipoDano !== filterState.tipo) return false;
      return true;
    });
  }, [sinistros, filterState]);

  const kpis = useMemo(() => {
    const valorSinistros = filteredSinistros.reduce((s, r) => s + parseCurrency(r.ValorSinistro), 0);
    const valorRecuperado = filteredSinistros.reduce((s, r) => s + parseCurrency(r.ValorRecuperado), 0);
    const qtd = filteredSinistros.length;
    const uniqueVeiculos = new Set(filteredSinistros.map(r => r.Placa).filter(Boolean)).size;
    return { valorSinistros, valorRecuperado, qtd, uniqueVeiculos };
  }, [filteredSinistros]);

  const evolutionData = useMemo(() => {
    const map: any = {};
    filteredSinistros.forEach(r => {
      const k = getMonthKey(r.DataSinistro);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Qtd: 0 };
      map[k].Valor += parseCurrency(r.ValorSinistro);
      map[k].Qtd += 1;
    });
    return Object.keys(map).sort().map(k => ({ date: k, label: monthLabel(k), ...map[k] }));
  }, [filteredSinistros]);

  const culpaData = useMemo(() => {
    const map: any = {};
    filteredSinistros.forEach(r => {
      const c = r.Culpabilidade || 'N/D';
      map[c] = (map[c] || 0) + parseCurrency(r.ValorSinistro);
    });
    return Object.entries(map).map(([name, value]: any) => ({ name, value }));
  }, [filteredSinistros]);

  const tipoDanoData = useMemo(() => {
    const map: any = {};
    filteredSinistros.forEach(r => {
      const t = r.TipoDano || 'Outros';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]: any) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [filteredSinistros]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Gestão de Sinistros</Title><Text className="text-slate-500">Controle de acidentes e recuperação.</Text></div>
        <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full flex gap-2 font-medium"><ShieldX className="w-4 h-4"/> Hub Operacional</div>
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
            {filterState.culpa && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Culpa: {filterState.culpa}</span>}
            {filterState.tipo && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Tipo: {filterState.tipo}</span>}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="red"><Text>Valor Sinistros</Text><Metric>{fmtCompact(kpis.valorSinistros)}</Metric><Text className="text-xs text-slate-400">{kpis.qtd} ocorrências</Text></Card>
        <Card decoration="top" decorationColor="emerald"><Text>Valor Recuperado</Text><Metric>{fmtCompact(kpis.valorRecuperado)}</Metric><Text className="text-xs text-slate-400">Seguradora</Text></Card>
        <Card decoration="top" decorationColor="amber"><Text>Veículos Envolvidos</Text><Metric>{kpis.uniqueVeiculos}</Metric></Card>
        <Card decoration="top" decorationColor="blue"><Text>Ticket Médio</Text><Metric>{fmtBRL(kpis.qtd > 0 ? kpis.valorSinistros / kpis.qtd : 0)}</Metric></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
            <Title>Evolução de Sinistros</Title>
            <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evolutionData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="label" fontSize={12}/>
                        <YAxis fontSize={12} tickFormatter={fmtCompact}/>
                        <Tooltip formatter={(v:any, n) => [n==='Valor'?fmtBRL(v):v, n]}/>
                        <Bar dataKey="Valor" radius={[4,4,0,0]} onClick={(d) => setFilterState(p => ({...p, mes: p.mes === d.date ? null : d.date}))} cursor="pointer">
                            {evolutionData.map((e, i) => <Cell key={i} fill={filterState.mes === e.date ? '#b91c1c' : '#ef4444'} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
        <Card>
            <Title>Culpabilidade (Valor R$)</Title>
            <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={culpaData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" onClick={(d) => setFilterState(p => ({...p, culpa: p.culpa === d.name ? null : d.name}))} cursor="pointer">
                            {culpaData.map((_, i) => <Cell key={i} fill={['#ef4444', '#f59e0b', '#64748b'][i % 3]} />)}
                        </Pie>
                        <Tooltip formatter={fmtBRL}/>
                        <Legend verticalAlign="bottom"/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
            <Title>Tipos de Dano (Top 5)</Title>
            <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tipoDanoData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                        <XAxis type="number" fontSize={12}/>
                        <YAxis dataKey="name" type="category" width={150} fontSize={10}/>
                        <Tooltip/>
                        <Bar dataKey="value" fill="#f97316" radius={[0,4,4,0]} onClick={(d) => setFilterState(p => ({...p, tipo: p.tipo === d.name ? null : d.name}))} cursor="pointer"/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
        <Card>
            <Title>Detalhamento Recente</Title>
            <div className="overflow-x-auto h-64">
                <table className="w-full text-sm text-left">
                    <thead className="bg-red-50 text-red-800"><tr><th className="p-2">Data</th><th className="p-2">Placa</th><th className="p-2">Culpa</th><th className="p-2 text-right">Valor</th></tr></thead>
                    <tbody>
                        {filteredSinistros.slice(0, 15).map((r: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50 border-t">
                                <td className="p-2">{r.DataSinistro ? new Date(r.DataSinistro).toLocaleDateString('pt-BR') : '-'}</td>
                                <td className="p-2 font-mono">{r.Placa}</td>
                                <td className="p-2"><span className={`px-2 py-1 rounded text-xs ${r.Culpabilidade === 'Motorista' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{r.Culpabilidade}</span></td>
                                <td className="p-2 text-right font-bold text-red-600">{fmtBRL(r.ValorSinistro)}</td>
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