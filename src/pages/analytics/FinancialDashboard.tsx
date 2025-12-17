import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Filter, X } from 'lucide-react';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number): string { if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`; if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`; return `R$ ${v.toFixed(0)}`; }
function monthLabel(ym: string): string { if (!ym || ym.length < 7) return ym; const [y, m] = ym.split('-'); const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function FinancialDashboard(): JSX.Element {
  const { data: rawFaturamento, loading: l1 } = useBIData<AnyObject[]>('fat_faturamento_*.json');
  const { data: rawDRE } = useBIData<AnyObject[]>('agg_dre_mensal.json');
  const { data: rawInadimplencia } = useBIData<AnyObject[]>('fat_inadimplencia.json');

  const faturamento = useMemo(() => Array.isArray(rawFaturamento) ? rawFaturamento : [], [rawFaturamento]);
  const dreData = useMemo(() => Array.isArray(rawDRE) ? rawDRE : [], [rawDRE]);
  const inadimplencia = useMemo(() => Array.isArray(rawInadimplencia) ? rawInadimplencia : [], [rawInadimplencia]);

  const [activeTab, setActiveTab] = useState(0);
  const [filterPeriodo, setFilterPeriodo] = useState<string | null>(null);

  const hasFilters = !!filterPeriodo;
  const clearFilters = () => setFilterPeriodo(null);

  // KPIs
  const kpis = useMemo(() => {
    const receitaTotal = faturamento.reduce((s, f) => s + parseCurrency(f.ValorTotal), 0);
    const receitaLocacao = faturamento.reduce((s, f) => s + parseCurrency(f.ValorLocacao), 0);
    
    const saldoDevedor = inadimplencia.reduce((s, i) => s + parseCurrency(i.SaldoDevedor), 0);
    const totalVencido = inadimplencia.filter(i => i.DiasAtraso > 0).reduce((s, i) => s + parseCurrency(i.SaldoDevedor), 0);
    
    const dreReceita = dreData.reduce((s, d) => s + parseCurrency(d.Receita), 0);
    const dreDespesa = dreData.reduce((s, d) => s + parseCurrency(d.Despesa), 0);
    const margemOperacional = dreReceita > 0 ? ((dreReceita - dreDespesa) / dreReceita) * 100 : 0;

    return { receitaTotal, receitaLocacao, saldoDevedor, totalVencido, dreReceita, dreDespesa, margemOperacional };
  }, [faturamento, inadimplencia, dreData]);

  // Evolução mensal do faturamento
  const faturamentoMensal = useMemo(() => {
    const map: Record<string, { receita: number; count: number }> = {};
    faturamento.forEach(f => {
      const k = f.DataCompetencia?.substring(0, 7) || f.DataEmissao?.substring(0, 7);
      if (!k) return;
      if (!map[k]) map[k] = { receita: 0, count: 0 };
      map[k].receita += parseCurrency(f.ValorTotal);
      map[k].count += 1;
    });
    return Object.keys(map).sort().slice(-12).map(k => ({ 
      mes: k, 
      label: monthLabel(k), 
      Receita: map[k].receita,
      Notas: map[k].count
    }));
  }, [faturamento]);

  // DRE Mensal
  const dreMensal = useMemo(() => {
    const map: Record<string, { receita: number; despesa: number }> = {};
    dreData.forEach(d => {
      const k = d.Competencia;
      if (!k) return;
      if (!map[k]) map[k] = { receita: 0, despesa: 0 };
      map[k].receita += parseCurrency(d.Receita);
      map[k].despesa += parseCurrency(d.Despesa);
    });
    return Object.keys(map).sort().slice(-12).map(k => ({
      mes: k,
      label: monthLabel(k),
      Receita: map[k].receita,
      Despesa: map[k].despesa,
      Resultado: map[k].receita - map[k].despesa
    }));
  }, [dreData]);

  // Receita por cliente
  const receitaPorCliente = useMemo(() => {
    const map: Record<string, number> = {};
    faturamento.forEach(f => {
      const cliente = f.Cliente || 'Outros';
      map[cliente] = (map[cliente] || 0) + parseCurrency(f.ValorTotal);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [faturamento]);

  // Aging de inadimplência
  const agingData = useMemo(() => {
    const map: Record<string, number> = { 'A Vencer': 0, '1-30 dias': 0, '31-60 dias': 0, '61-90 dias': 0, '+90 dias': 0 };
    inadimplencia.forEach(i => {
      const faixa = i.FaixaAging || 'A Vencer';
      map[faixa] = (map[faixa] || 0) + parseCurrency(i.SaldoDevedor);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [inadimplencia]);

  // Top devedores
  const topDevedores = useMemo(() => {
    const map: Record<string, number> = {};
    inadimplencia.forEach(i => {
      const cliente = i.Cliente || 'N/D';
      map[cliente] = (map[cliente] || 0) + parseCurrency(i.SaldoDevedor);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [inadimplencia]);

  // Receita por natureza (DRE)
  const receitaPorNatureza = useMemo(() => {
    const map: Record<string, number> = {};
    dreData.filter(d => parseCurrency(d.Receita) > 0).forEach(d => {
      const nat = d.Natureza || 'Outros';
      map[nat] = (map[nat] || 0) + parseCurrency(d.Receita);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [dreData]);

  const tabs = ['Visão Geral', 'DRE', 'Inadimplência', 'Detalhamento'];

  if (l1) return <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center"><div className="animate-pulse text-slate-500">Carregando dados financeiros...</div></div>;

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Dashboard Financeiro</Title><Text className="text-slate-500">Faturamento, DRE e Inadimplência</Text></div>
        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex gap-2 font-medium"><DollarSign className="w-4 h-4"/> Hub Financeiro</div>
      </div>

      {hasFilters && (
        <div className="fixed bottom-8 right-8 z-50">
          <button onClick={clearFilters} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2"><X className="w-5 h-5" /> Limpar Filtros</button>
        </div>
      )}

      {hasFilters && (
        <Card className="bg-blue-50 border-blue-200 py-3">
          <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-blue-600" /><Text className="font-medium text-blue-700">Filtros:</Text>
            {filterPeriodo && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Período: {monthLabel(filterPeriodo)}</span>}
          </div>
        </Card>
      )}

      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
        {tabs.map((tab, idx) => (
          <button key={idx} onClick={() => setActiveTab(idx)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === idx ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card decoration="top" decorationColor="blue"><Text>Receita Total</Text><Metric>{fmtCompact(kpis.receitaTotal)}</Metric></Card>
            <Card decoration="top" decorationColor="emerald"><Text>Margem Operacional</Text><Metric className={kpis.margemOperacional >= 0 ? 'text-emerald-600' : 'text-red-600'}>{kpis.margemOperacional.toFixed(1)}%</Metric></Card>
            <Card decoration="top" decorationColor="amber"><Text>Saldo Devedor</Text><Metric>{fmtCompact(kpis.saldoDevedor)}</Metric></Card>
            <Card decoration="top" decorationColor="rose"><Text>Vencido (+0 dias)</Text><Metric className="text-red-600">{fmtCompact(kpis.totalVencido)}</Metric></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Evolução do Faturamento (12 meses)</Title>
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={faturamentoMensal}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="label" fontSize={12}/>
                    <YAxis yAxisId="left" fontSize={12} tickFormatter={fmtCompact}/>
                    <YAxis yAxisId="right" orientation="right" fontSize={12}/>
                    <Tooltip formatter={(v: any, n) => [n === 'Receita' ? fmtBRL(v) : v, n]}/>
                    <Bar yAxisId="left" dataKey="Receita" fill="#3b82f6" radius={[4,4,0,0]} cursor="pointer" onClick={(d) => setFilterPeriodo(p => p === d.mes ? null : d.mes)}/>
                    <Line yAxisId="right" type="monotone" dataKey="Notas" stroke="#f59e0b" strokeWidth={2}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <Title>Aging de Inadimplência</Title>
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                    <XAxis type="number" fontSize={12} tickFormatter={fmtCompact}/>
                    <YAxis dataKey="name" type="category" width={80} fontSize={11}/>
                    <Tooltip formatter={fmtBRL}/>
                    <Bar dataKey="value" radius={[0,4,4,0]} barSize={20}>
                      {agingData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.name === 'A Vencer' ? '#10b981' : entry.name === '1-30 dias' ? '#f59e0b' : entry.name === '31-60 dias' ? '#f97316' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <Title>Top 10 Clientes por Receita</Title>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitaPorCliente} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                  <XAxis type="number" fontSize={12} tickFormatter={fmtCompact}/>
                  <YAxis dataKey="name" type="category" width={150} fontSize={11} tick={{fill: '#475569'}}/>
                  <Tooltip formatter={fmtBRL}/>
                  <Bar dataKey="value" fill="#3b82f6" radius={[0,4,4,0]} barSize={18}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card decoration="top" decorationColor="emerald">
              <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600"/><Text>Receita (DRE)</Text></div>
              <Metric>{fmtCompact(kpis.dreReceita)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="rose">
              <div className="flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-600"/><Text>Despesa (DRE)</Text></div>
              <Metric>{fmtCompact(kpis.dreDespesa)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="blue">
              <Text>Resultado</Text>
              <Metric className={kpis.dreReceita - kpis.dreDespesa >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtCompact(kpis.dreReceita - kpis.dreDespesa)}</Metric>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Resultado Mensal (DRE)</Title>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dreMensal}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="label" fontSize={12}/>
                    <YAxis fontSize={12} tickFormatter={fmtCompact}/>
                    <Tooltip formatter={(v: any) => fmtBRL(v)}/>
                    <Legend/>
                    <Area type="monotone" dataKey="Receita" stroke="#10b981" fill="url(#colorReceita)"/>
                    <Area type="monotone" dataKey="Despesa" stroke="#ef4444" fill="url(#colorDespesa)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <Title>Receita por Natureza</Title>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={receitaPorNatureza} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name.substring(0, 15)}${name.length > 15 ? '...' : ''} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {receitaPorNatureza.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={fmtBRL}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card decoration="top" decorationColor="amber">
              <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600"/><Text>Total em Aberto</Text></div>
              <Metric>{fmtCompact(kpis.saldoDevedor)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="rose">
              <Text>Vencido</Text>
              <Metric className="text-red-600">{fmtCompact(kpis.totalVencido)}</Metric>
            </Card>
            <Card decoration="top" decorationColor="emerald">
              <Text>A Vencer</Text>
              <Metric className="text-emerald-600">{fmtCompact(kpis.saldoDevedor - kpis.totalVencido)}</Metric>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Aging Detalhado</Title>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={agingData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                      {agingData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.name === 'A Vencer' ? '#10b981' : entry.name === '1-30 dias' ? '#f59e0b' : entry.name === '31-60 dias' ? '#f97316' : entry.name === '61-90 dias' ? '#ef4444' : '#dc2626'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={fmtBRL}/>
                    <Legend/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <Title>Top 10 Devedores</Title>
              <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
                {topDevedores.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                      <span className="text-sm truncate max-w-[180px]">{item.name}</span>
                    </div>
                    <span className="font-bold text-red-600">{fmtCompact(item.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 3 && (
        <Card>
          <Title>Detalhamento de Notas</Title>
          <div className="mt-4 overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3 text-right">Valor Locação</th>
                  <th className="p-3 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {faturamento.slice(0, 100).map((f, idx) => (
                  <tr key={idx} className="border-t hover:bg-slate-50">
                    <td className="p-3">{f.DataEmissao ? new Date(f.DataEmissao).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="p-3 truncate max-w-[200px]">{f.Cliente || '-'}</td>
                    <td className="p-3 text-right">{fmtBRL(parseCurrency(f.ValorLocacao))}</td>
                    <td className="p-3 text-right font-bold text-blue-600">{fmtBRL(parseCurrency(f.ValorTotal))}</td>
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
