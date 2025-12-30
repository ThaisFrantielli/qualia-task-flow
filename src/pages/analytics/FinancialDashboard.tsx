import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useChartFilter } from '@/hooks/useChartFilter';
import { ChartFilterBadges, FloatingClearButton } from '@/components/analytics/ChartFilterBadges';

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
  const { filters, handleChartClick, clearFilter, clearAllFilters, hasActiveFilters, isValueSelected, getFilterValues } = useChartFilter();

  const filteredFaturamento = useMemo(() => {
    return faturamento.filter(f => {
      const periodoValues = getFilterValues('periodo');
      const clienteValues = getFilterValues('cliente');
      // const faixaValues = getFilterValues('faixa');
      
      if (periodoValues.length > 0) {
        const k = f.DataCompetencia?.substring(0, 7) || f.DataEmissao?.substring(0, 7);
        if (!periodoValues.includes(k)) return false;
      }
      if (clienteValues.length > 0 && !clienteValues.includes(f.Cliente)) return false;
      return true;
    });
  }, [faturamento, filters, getFilterValues]);

  const filteredInadimplencia = useMemo(() => {
    return inadimplencia.filter(i => {
      const faixaValues = getFilterValues('faixa');
      const clienteValues = getFilterValues('cliente');
      
      if (faixaValues.length > 0 && !faixaValues.includes(i.FaixaAging)) return false;
      if (clienteValues.length > 0 && !clienteValues.includes(i.Cliente)) return false;
      return true;
    });
  }, [inadimplencia, filters, getFilterValues]);

  const kpis = useMemo(() => {
    const receitaTotal = filteredFaturamento.reduce((s, f) => s + parseCurrency(f.ValorTotal), 0);
    const receitaLocacao = filteredFaturamento.reduce((s, f) => s + parseCurrency(f.ValorLocacao), 0);
    
    const saldoDevedor = filteredInadimplencia.reduce((s, i) => s + parseCurrency(i.SaldoDevedor), 0);
    const totalVencido = filteredInadimplencia.filter(i => i.DiasAtraso > 0).reduce((s, i) => s + parseCurrency(i.SaldoDevedor), 0);
    
    const dreReceita = dreData.reduce((s, d) => s + parseCurrency(d.Receita), 0);
    const dreDespesa = dreData.reduce((s, d) => s + parseCurrency(d.Despesa), 0);
    const margemOperacional = dreReceita > 0 ? ((dreReceita - dreDespesa) / dreReceita) * 100 : 0;

    // NOVOS KPIs: EBITDA, DMR (Dias Médios de Recebimento)
    const ebitda = dreReceita - dreDespesa; // Simplificado - resultado operacional
    
    // DMR: Média ponderada de dias de atraso
    const totalSaldo = filteredInadimplencia.reduce((s, i) => s + parseCurrency(i.SaldoDevedor), 0);
    const somaDiasPonderado = filteredInadimplencia.reduce((s, i) => {
      const dias = Math.max(0, i.DiasAtraso || 0);
      const saldo = parseCurrency(i.SaldoDevedor);
      return s + (dias * saldo);
    }, 0);
    const dmr = totalSaldo > 0 ? somaDiasPonderado / totalSaldo : 0;

    // Taxa de inadimplência
    const taxaInadimplencia = receitaTotal > 0 ? (totalVencido / receitaTotal) * 100 : 0;

    return { 
      receitaTotal, receitaLocacao, saldoDevedor, totalVencido, dreReceita, dreDespesa, margemOperacional,
      // Novos KPIs
      ebitda, dmr, taxaInadimplencia
    };
  }, [filteredFaturamento, filteredInadimplencia, dreData]);

  const faturamentoMensal = useMemo(() => {
    const map: Record<string, { receita: number; count: number }> = {};
    filteredFaturamento.forEach(f => {
      const k = f.DataCompetencia?.substring(0, 7) || f.DataEmissao?.substring(0, 7);
      if (!k) return;
      if (!map[k]) map[k] = { receita: 0, count: 0 };
      map[k].receita += parseCurrency(f.ValorTotal);
      map[k].count += 1;
    });
    return Object.keys(map).sort().slice(-12).map(k => ({ mes: k, label: monthLabel(k), Receita: map[k].receita, Notas: map[k].count }));
  }, [filteredFaturamento]);

  const dreMensal = useMemo(() => {
    const map: Record<string, { receita: number; despesa: number }> = {};
    dreData.forEach(d => {
      const k = d.Competencia;
      if (!k) return;
      if (!map[k]) map[k] = { receita: 0, despesa: 0 };
      map[k].receita += parseCurrency(d.Receita);
      map[k].despesa += parseCurrency(d.Despesa);
    });
    return Object.keys(map).sort().slice(-12).map(k => ({ mes: k, label: monthLabel(k), Receita: map[k].receita, Despesa: map[k].despesa, Resultado: map[k].receita - map[k].despesa }));
  }, [dreData]);

  const receitaPorCliente = useMemo(() => {
    const map: Record<string, number> = {};
    filteredFaturamento.forEach(f => { const cliente = f.Cliente || 'Outros'; map[cliente] = (map[cliente] || 0) + parseCurrency(f.ValorTotal); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredFaturamento]);

  const agingData = useMemo(() => {
    const map: Record<string, number> = { 'A Vencer': 0, '1-30 dias': 0, '31-60 dias': 0, '61-90 dias': 0, '+90 dias': 0 };
    filteredInadimplencia.forEach(i => { const faixa = i.FaixaAging || 'A Vencer'; map[faixa] = (map[faixa] || 0) + parseCurrency(i.SaldoDevedor); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredInadimplencia]);

  const topDevedores = useMemo(() => {
    const map: Record<string, number> = {};
    filteredInadimplencia.forEach(i => { const cliente = i.Cliente || 'N/D'; map[cliente] = (map[cliente] || 0) + parseCurrency(i.SaldoDevedor); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredInadimplencia]);

  const receitaPorNatureza = useMemo(() => {
    const map: Record<string, number> = {};
    dreData.filter(d => parseCurrency(d.Receita) > 0).forEach(d => { const nat = d.Natureza || 'Outros'; map[nat] = (map[nat] || 0) + parseCurrency(d.Receita); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [dreData]);

  // Cash Flow Data
  const cashFlowData = useMemo(() => {
    const map: Record<string, { entradas: number; saidas: number }> = {};
    dreData.forEach(d => {
      const k = d.Competencia;
      if (!k) return;
      if (!map[k]) map[k] = { entradas: 0, saidas: 0 };
      map[k].entradas += parseCurrency(d.Receita);
      map[k].saidas += parseCurrency(d.Despesa);
    });
    
    let saldoAcumulado = 0;
    return Object.keys(map).sort().slice(-12).map(k => {
      const fluxo = map[k].entradas - map[k].saidas;
      saldoAcumulado += fluxo;
      return { 
        mes: k, 
        label: monthLabel(k), 
        Entradas: map[k].entradas, 
        Saídas: map[k].saidas, 
        Fluxo: fluxo,
        Acumulado: saldoAcumulado
      };
    });
  }, [dreData]);

  const tabs = ['Visão Geral', 'DRE', 'Cash Flow', 'Inadimplência', 'Detalhamento'];

  if (l1) return <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center"><div className="animate-pulse text-slate-500">Carregando dados financeiros...</div></div>;

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Dashboard Financeiro</Title><Text className="text-slate-500">Faturamento, DRE e Inadimplência</Text></div>
        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex gap-2 font-medium"><DollarSign className="w-4 h-4"/> Hub Financeiro</div>
      </div>

      <FloatingClearButton onClick={clearAllFilters} show={hasActiveFilters} />
      <ChartFilterBadges filters={filters} onClearFilter={clearFilter} onClearAll={clearAllFilters} />

      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
        {tabs.map((tab, idx) => (
          <button key={idx} onClick={() => setActiveTab(idx)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === idx ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="space-y-6">
          {/* KPIs Principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card decoration="top" decorationColor="blue"><Text>Receita Total</Text><Metric>{fmtCompact(kpis.receitaTotal)}</Metric></Card>
            <Card decoration="top" decorationColor="emerald"><Text>Margem Operacional</Text><Metric className={kpis.margemOperacional >= 0 ? 'text-emerald-600' : 'text-red-600'}>{kpis.margemOperacional.toFixed(1)}%</Metric></Card>
            <Card decoration="top" decorationColor="amber"><Text>Saldo Devedor</Text><Metric>{fmtCompact(kpis.saldoDevedor)}</Metric></Card>
            <Card decoration="top" decorationColor="rose"><Text>Vencido (+0 dias)</Text><Metric className="text-red-600">{fmtCompact(kpis.totalVencido)}</Metric></Card>
          </div>
          
          {/* Novos KPIs: EBITDA, DMR, Taxa Inadimplência */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card decoration="top" decorationColor="indigo" className="bg-gradient-to-br from-indigo-50 to-white">
              <Text className="font-medium">EBITDA</Text>
              <Metric className={kpis.ebitda >= 0 ? 'text-indigo-700' : 'text-rose-700'}>{fmtCompact(kpis.ebitda)}</Metric>
              <Text className="text-xs text-slate-500">Resultado operacional</Text>
            </Card>
            <Card decoration="top" decorationColor="cyan" className="bg-gradient-to-br from-cyan-50 to-white">
              <Text className="font-medium">DMR (dias)</Text>
              <Metric className="text-cyan-700">{kpis.dmr.toFixed(0)}</Metric>
              <Text className="text-xs text-slate-500">Dias médios de recebimento</Text>
            </Card>
            <Card decoration="top" decorationColor={kpis.taxaInadimplencia <= 5 ? 'emerald' : kpis.taxaInadimplencia <= 15 ? 'amber' : 'rose'} className="bg-gradient-to-br from-amber-50 to-white">
              <Text className="font-medium">Taxa Inadimplência</Text>
              <Metric className={kpis.taxaInadimplencia <= 5 ? 'text-emerald-700' : kpis.taxaInadimplencia <= 15 ? 'text-amber-700' : 'text-rose-700'}>{kpis.taxaInadimplencia.toFixed(1)}%</Metric>
              <Text className="text-xs text-slate-500">Vencido / Receita</Text>
            </Card>
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
                    <Bar yAxisId="left" dataKey="Receita" fill="#3b82f6" radius={[4,4,0,0]} cursor="pointer" onClick={(d, _, e) => handleChartClick('periodo', d.mes, e as unknown as React.MouseEvent)}>
                      {faturamentoMensal.map((entry, i) => <Cell key={i} fill={isValueSelected('periodo', entry.mes) ? '#1d4ed8' : '#3b82f6'} />)}
                    </Bar>
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
                    <Bar dataKey="value" radius={[0,4,4,0]} barSize={20} cursor="pointer" onClick={(d, _, e) => handleChartClick('faixa', d.name, e as unknown as React.MouseEvent)}>
                      {agingData.map((entry, idx) => (
                        <Cell key={idx} fill={isValueSelected('faixa', entry.name) ? '#7c2d12' : (entry.name === 'A Vencer' ? '#10b981' : entry.name === '1-30 dias' ? '#f59e0b' : entry.name === '31-60 dias' ? '#f97316' : '#ef4444')} />
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
                  <Bar dataKey="value" fill="#3b82f6" radius={[0,4,4,0]} barSize={18} cursor="pointer" onClick={(d, _, e) => handleChartClick('cliente', d.name, e as unknown as React.MouseEvent)}>
                    {receitaPorCliente.map((entry, i) => <Cell key={i} fill={isValueSelected('cliente', entry.name) ? '#1d4ed8' : '#3b82f6'} />)}
                  </Bar>
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

      {/* Cash Flow Tab */}
      {activeTab === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card decoration="top" decorationColor="emerald">
              <Text className="font-medium">Total Entradas</Text>
              <Metric className="text-emerald-700">{fmtCompact(cashFlowData.reduce((s, d) => s + d.Entradas, 0))}</Metric>
            </Card>
            <Card decoration="top" decorationColor="rose">
              <Text className="font-medium">Total Saídas</Text>
              <Metric className="text-rose-700">{fmtCompact(cashFlowData.reduce((s, d) => s + d.Saídas, 0))}</Metric>
            </Card>
            <Card decoration="top" decorationColor="blue">
              <Text className="font-medium">Fluxo Líquido</Text>
              <Metric className={cashFlowData.reduce((s, d) => s + d.Fluxo, 0) >= 0 ? 'text-blue-700' : 'text-rose-700'}>
                {fmtCompact(cashFlowData.reduce((s, d) => s + d.Fluxo, 0))}
              </Metric>
            </Card>
            <Card decoration="top" decorationColor="violet">
              <Text className="font-medium">Saldo Acumulado</Text>
              <Metric className={cashFlowData.length > 0 && cashFlowData[cashFlowData.length - 1].Acumulado >= 0 ? 'text-violet-700' : 'text-rose-700'}>
                {cashFlowData.length > 0 ? fmtCompact(cashFlowData[cashFlowData.length - 1].Acumulado) : 'R$ 0'}
              </Metric>
            </Card>
          </div>

          <Card>
            <Title>Fluxo de Caixa Mensal (12 meses)</Title>
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="label" fontSize={12}/>
                  <YAxis yAxisId="left" fontSize={12} tickFormatter={fmtCompact}/>
                  <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={fmtCompact}/>
                  <Tooltip formatter={(v: any) => fmtBRL(v)}/>
                  <Legend/>
                  <Bar yAxisId="left" dataKey="Entradas" fill="#10b981" radius={[4,4,0,0]}/>
                  <Bar yAxisId="left" dataKey="Saídas" fill="#ef4444" radius={[4,4,0,0]}/>
                  <Line yAxisId="right" type="monotone" dataKey="Acumulado" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6' }}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <Title>Evolução do Fluxo Líquido</Title>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData}>
                  <defs>
                    <linearGradient id="colorFluxo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="label" fontSize={12}/>
                  <YAxis fontSize={12} tickFormatter={fmtCompact}/>
                  <Tooltip formatter={(v: any) => fmtBRL(v)}/>
                  <Area type="monotone" dataKey="Fluxo" stroke="#3b82f6" fill="url(#colorFluxo)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Inadimplência Tab */}
      {activeTab === 3 && (
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
              <Title>Aging Detalhado (Clique para filtrar)</Title>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={agingData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" onClick={(d, _, e) => handleChartClick('faixa', d.name, e as unknown as React.MouseEvent)} cursor="pointer">
                      {agingData.map((entry, idx) => (
                        <Cell key={idx} fill={isValueSelected('faixa', entry.name) ? '#7c2d12' : (entry.name === 'A Vencer' ? '#10b981' : entry.name === '1-30 dias' ? '#f59e0b' : entry.name === '31-60 dias' ? '#f97316' : entry.name === '61-90 dias' ? '#ef4444' : '#dc2626')} />
                      ))}
                    </Pie>
                    <Tooltip formatter={fmtBRL}/>
                    <Legend/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <Title>Top 10 Devedores (Clique para filtrar)</Title>
              <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
                {topDevedores.map((item, idx) => (
                  <div key={idx} onClick={(e) => handleChartClick('cliente', item.name, e)} className={`flex justify-between items-center p-2 hover:bg-slate-50 rounded cursor-pointer ${isValueSelected('cliente', item.name) ? 'bg-red-50 ring-1 ring-red-200' : ''}`}>
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
                {filteredFaturamento.slice(0, 100).map((f, idx) => (
                  <tr key={idx} className="border-t hover:bg-slate-50">
                    <td className="p-3">{f.DataEmissao ? new Date(f.DataEmissao).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="p-3 truncate max-w-[200px] cursor-pointer hover:text-blue-600" onClick={(e) => handleChartClick('cliente', f.Cliente, e)}>{f.Cliente || '-'}</td>
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
