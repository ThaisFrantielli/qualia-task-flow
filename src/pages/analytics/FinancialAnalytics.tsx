import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList } from '@tremor/react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Wallet, TrendingUp, AlertCircle, FileText } from 'lucide-react';

type AnyObject = { [k: string]: any };

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return null;
  return d;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function daysBetweenInclusive(a: Date, b: Date) {
  if (b < a) return 0;
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY) + 1;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mi = Number(m) - 1;
  return `${months[mi]}/${String(y).slice(2)}`;
}

function fmtBRL(v: number) {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
  catch (e) { return String(v); }
}

export default function FinancialAnalytics(): JSX.Element {
  // Data sources
  const { data: financeiroData } = useBIData<AnyObject[]>('financeiro_completo.json');
  const { data: contratosData } = useBIData<AnyObject[]>('contratos_ativos.json');

  // Normalize payloads
  const financeiro: AnyObject[] = useMemo(() => {
    if (!financeiroData) return [];
    if (Array.isArray(financeiroData)) return financeiroData as AnyObject[];
    if ((financeiroData as any).data && Array.isArray((financeiroData as any).data)) return (financeiroData as any).data;
    const keys = Object.keys(financeiroData as any);
    for (const k of keys) if (Array.isArray((financeiroData as any)[k])) return (financeiroData as any)[k];
    return [];
  }, [financeiroData]);

  const contratos: AnyObject[] = useMemo(() => {
    if (!contratosData) return [];
    if (Array.isArray(contratosData)) return contratosData as AnyObject[];
    if ((contratosData as any).data && Array.isArray((contratosData as any).data)) return (contratosData as any).data;
    const keys = Object.keys(contratosData as any);
    for (const k of keys) if (Array.isArray((contratosData as any)[k])) return (contratosData as any)[k];
    return [];
  }, [contratosData]);

  // Filters used in Visão Geral (tab 1)
  const clientes = useMemo(() => Array.from(new Set(financeiro.map(r => r.Cliente).filter(Boolean))), [financeiro]);
  const situacoes = useMemo(() => Array.from(new Set(financeiro.map(r => r.SituacaoNota).filter(Boolean))), [financeiro]);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedSituacoes, setSelectedSituacoes] = useState<string[]>([]);

  const filteredFin = useMemo(() => {
    return financeiro.filter((r) => {
      if (dateFrom) {
        const d = r.DataCompetencia ? new Date(r.DataCompetencia) : null;
        if (!d) return false;
        if (d < new Date(dateFrom + 'T00:00:00')) return false;
      }
      if (dateTo) {
        const d = r.DataCompetencia ? new Date(r.DataCompetencia) : null;
        if (!d) return false;
        if (d > new Date(dateTo + 'T23:59:59')) return false;
      }
      if (selectedClientes.length > 0 && !selectedClientes.includes(String(r.Cliente || ''))) return false;
      if (selectedSituacoes.length > 0 && !selectedSituacoes.includes(String(r.SituacaoNota || ''))) return false;
      return true;
    });
  }, [financeiro, dateFrom, dateTo, selectedClientes, selectedSituacoes]);

  // KPIs for Visão Geral
  const faturamentoLocacao = useMemo(() => filteredFin.reduce((s, r) => s + (Number(r.ValorLocacao) || 0), 0), [filteredFin]);
  const totalFaturado = useMemo(() => filteredFin.reduce((s, r) => s + (Number(r.ValorTotal) || 0), 0), [filteredFin]);
  const totalVeiculos = useMemo(() => filteredFin.reduce((s, r) => s + (Number(r.QtdVeiculos) || 0), 0), [filteredFin]);
  const ticketMedio = totalVeiculos > 0 ? (totalFaturado / totalVeiculos) : 0;

  // Monthly aggregation
  const monthly = useMemo(() => {
    const map: Record<string, { faturamento: number; veiculos: number }> = {};
    filteredFin.forEach((r) => {
      const d = r.DataCompetencia ? new Date(r.DataCompetencia) : null;
      if (!d) return;
      const k = monthKey(d);
      if (!map[k]) map[k] = { faturamento: 0, veiculos: 0 };
      map[k].faturamento += Number(r.ValorTotal) || 0;
      map[k].veiculos += Number(r.QtdVeiculos) || 0;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({
        month: monthLabel(k),
        faturamento: v.faturamento,
        ticket: v.veiculos > 0 ? v.faturamento / v.veiculos : 0,
      }));
  }, [filteredFin]);

  // Top 10 clients
  const topClients = useMemo(() => {
    const map: Record<string, number> = {};
    filteredFin.forEach((r) => {
      const c = r.Cliente || 'N/A';
      map[c] = (map[c] || 0) + (Number(r.ValorTotal) || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredFin]);

  // --- TAB 2: AUDITORIA DE RECEITA (GAP) ---
  // Logic: for a selected month, compare "Contratos Ativos" vs "Faturamento Realizado".
  // We need a month selector for this tab. Default to current month or last available.
  const [selectedMonth, setSelectedMonth] = useState<string>('2024-03'); // default example
  const availableMonths = useMemo(() => {
    // collect months from contracts and financial data
    const s = new Set<string>();
    financeiro.forEach(r => { if (r.DataCompetencia) s.add(monthKey(new Date(r.DataCompetencia))); });
    contratos.forEach(c => {
      // contracts have start/end dates. We can just list all months in range? 
      // For simplicity, let's just pick months present in financeiro for now, 
      // or we can generate a range. Let's stick to financeiro months + current.
      if (c.DataInicio) s.add(monthKey(new Date(c.DataInicio)));
    });
    return Array.from(s).sort().reverse();
  }, [financeiro, contratos]);

  // Calculate GAP for selectedMonth
  // 1. Expected Revenue: Iterate contracts. If active in selectedMonth, calculate pro-rata revenue.
  // 2. Realized Revenue: Filter financeiro for selectedMonth.
  // 3. Gap = Expected - Realized.

  const gapAnalysis = useMemo(() => {
    if (!selectedMonth) return { expected: 0, realized: 0, gap: 0, details: [] };

    const [y, m] = selectedMonth.split('-').map(Number);
    const startM = new Date(y, m - 1, 1);
    const endM = new Date(y, m, 0);
    const daysInMonth = endM.getDate();

    // Realized
    const realizedRecords = financeiro.filter(r => {
      if (!r.DataCompetencia) return false;
      return monthKey(new Date(r.DataCompetencia)) === selectedMonth;
    });
    const realizedTotal = realizedRecords.reduce((s, r) => s + (Number(r.ValorTotal) || 0), 0);

    // Expected from Contracts
    // Contract has: DataInicio, DataFim (optional), ValorMensal
    let expectedTotal = 0;
    const contractDetails: any[] = [];

    contratos.forEach(c => {
      const startC = parseDate(c.DataInicio);
      const endC = parseDate(c.DataFim); // if null, assumes active indefinitely? or check status
      const val = Number(c.ValorMensal) || 0;

      if (!startC) return;

      // Check overlap with selected month
      // Overlap start: max(startM, startC)
      // Overlap end: min(endM, endC || infinity)

      const effectiveEnd = endC || new Date('2099-12-31');

      if (effectiveEnd < startM || startC > endM) return; // no overlap

      const overlapStart = startC > startM ? startC : startM;
      const overlapEnd = effectiveEnd < endM ? effectiveEnd : endM;

      const daysActive = daysBetweenInclusive(overlapStart, overlapEnd);
      if (daysActive <= 0) return;

      // Pro-rata
      const revenue = (val / 30) * daysActive; // using 30 days base or daysInMonth? Let's use daysInMonth for accuracy or 30 standard.
      // Let's use daysInMonth of the selected month for pro-rata base if we want exactness, or 30.
      // Standard commercial often uses 30. Let's use daysInMonth for physical calendar.
      const proRata = (val / daysInMonth) * daysActive;

      expectedTotal += proRata;
      contractDetails.push({
        cliente: c.Cliente,
        placa: c.Placa,
        contrato: c.NumeroContrato,
        diasAtivos: daysActive,
        valorEsperado: proRata
      });
    });

    // Match realized by client/contract to find specific gaps? 
    // This is complex because financeiro might group by client, not contract.
    // For now, we show global numbers and list of expected contracts.

    return {
      expected: expectedTotal,
      realized: realizedTotal,
      gap: expectedTotal - realizedTotal,
      details: contractDetails
    };

  }, [selectedMonth, financeiro, contratos]);

  // Tabs state
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title className="text-slate-900">Financial Core</Title>
          <Text className="mt-1 text-slate-500">Análise financeira, faturamento e auditoria de receita.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Hub Financeiro
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab(0)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 0 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab(1)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 1 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Auditoria de Receita (Gap)
        </button>
      </div>

      {activeTab === 0 && (
        <>
          {/* Filters */}
          <Card className="bg-white shadow-sm border border-slate-200">
            <Text className="text-slate-700 font-medium mb-2">Filtros</Text>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Text className="text-slate-500 text-xs mb-1">Período (De - Até)</Text>
                <div className="flex gap-2">
                  <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={dateFrom || ''} onChange={e => setDateFrom(e.target.value)} />
                  <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={dateTo || ''} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>
              <div>
                <Text className="text-slate-500 text-xs mb-1">Cliente</Text>
                <select multiple size={3} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={selectedClientes} onChange={e => setSelectedClientes(Array.from(e.target.selectedOptions).map(o => o.value))}>
                  {clientes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Text className="text-slate-500 text-xs mb-1">Situação da Nota</Text>
                <select multiple size={3} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={selectedSituacoes} onChange={e => setSelectedSituacoes(Array.from(e.target.selectedOptions).map(o => o.value))}>
                  {situacoes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => { setDateFrom(null); setDateTo(null); setSelectedClientes([]); setSelectedSituacoes([]); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-sm transition-colors">
                  Limpar Filtros
                </button>
              </div>
            </div>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-blue-500">
              <Text className="text-slate-500">Faturamento Total</Text>
              <Metric className="text-slate-900">{fmtBRL(totalFaturado)}</Metric>
            </Card>
            <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-blue-500">
              <Text className="text-slate-500">Faturamento Locação</Text>
              <Metric className="text-slate-900">{fmtBRL(faturamentoLocacao)}</Metric>
            </Card>
            <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-blue-500">
              <Text className="text-slate-500">Ticket Médio</Text>
              <Metric className="text-slate-900">{fmtBRL(ticketMedio)}</Metric>
            </Card>
            <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-blue-500">
              <Text className="text-slate-500">Veículos Faturados</Text>
              <Metric className="text-slate-900">{Math.round(totalVeiculos)}</Metric>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-200">
              <Title className="text-slate-900">Evolução de Faturamento e Ticket Médio</Title>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar yAxisId="left" dataKey="faturamento" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Faturamento" />
                    <Line yAxisId="right" type="monotone" dataKey="ticket" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Ticket Médio" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="bg-white shadow-sm border border-slate-200">
              <Title className="text-slate-900">Top 10 Clientes</Title>
              <div className="mt-4 h-80 overflow-y-auto pr-2">
                <BarList
                  data={topClients}
                  valueFormatter={(v) => fmtBRL(v)}
                  color="blue"
                  className="mt-2"
                />
              </div>
            </Card>
          </div>
        </>
      )}

      {activeTab === 1 && (
        <>
          <Card className="bg-white shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <Title className="text-slate-900">Auditoria de Receita (Revenue Gap)</Title>
                <Text className="text-slate-500">Comparativo entre Receita Esperada (Contratos) e Realizada (Faturamento).</Text>
              </div>
              <div className="w-full md:w-48">
                <Text className="text-slate-500 text-xs mb-1">Mês de Referência</Text>
                <select
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <Text className="text-slate-500">Receita Esperada</Text>
                <Metric className="text-blue-600">{fmtBRL(gapAnalysis.expected)}</Metric>
                <Text className="text-xs text-slate-400 mt-1">Baseado em contratos ativos</Text>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <Text className="text-slate-500">Receita Realizada</Text>
                <Metric className="text-emerald-600">{fmtBRL(gapAnalysis.realized)}</Metric>
                <Text className="text-xs text-slate-400 mt-1">Baseado em notas emitidas</Text>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <Text className="text-slate-500">Gap (Diferença)</Text>
                <Metric className={`${gapAnalysis.gap > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {fmtBRL(gapAnalysis.gap)}
                </Metric>
                <Text className="text-xs text-slate-400 mt-1">
                  {gapAnalysis.gap > 0 ? 'Possível receita não faturada' : 'Faturamento acima do esperado'}
                </Text>
              </div>
            </div>

            <Title className="text-slate-900 mb-4">Detalhamento de Contratos Ativos no Mês</Title>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Contrato</th>
                    <th className="px-4 py-3 font-medium">Placa</th>
                    <th className="px-4 py-3 font-medium text-right">Dias Ativos</th>
                    <th className="px-4 py-3 font-medium text-right">Valor Esperado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gapAnalysis.details.slice(0, 50).map((d: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{d.cliente}</td>
                      <td className="px-4 py-3 text-slate-600">{d.contrato}</td>
                      <td className="px-4 py-3 text-slate-600">{d.placa}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{d.diasAtivos}</td>
                      <td className="px-4 py-3 text-right text-slate-900 font-medium">{fmtBRL(d.valorEsperado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-center text-xs text-slate-400">
                Mostrando os primeiros 50 registros.
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
