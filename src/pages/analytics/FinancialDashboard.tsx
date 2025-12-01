import { useMemo, useState, useEffect } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList } from '@tremor/react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell } from 'recharts';
import { Wallet, AlertTriangle, TrendingDown, Filter } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- FUNÇÕES AUXILIARES ---

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

function fmtBRL(v: number): string {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
  catch (e) { return String(v); }
}

function fmtCompact(v: number): string {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${v}`;
}

function parseCurrency(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  let s = String(v).trim();
  if (s === '') return 0;
  s = s.replace(/R\$|\s/g, '');
  if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  } else if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes('.') && !s.includes(',')) {
    if (/^[-+]?\d{1,3}(?:\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    }
  }
  s = s.replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function getQty(row: AnyObject): number {
  if (!row) return 0;
  const candidates = ['QtdVeiculos', 'QtdVeiculo', 'QtdVeic', 'QuantidadeVeiculos', 'QuantidadeVeiculo', 'qtdVeiculos', 'qtd', 'Quantidade'];
  for (const k of candidates) {
    if (k in row) return parseCurrency(row[k]);
  }
  return 0;
}

// --- COMPONENTE PRINCIPAL ---
export default function FinancialDashboard(): JSX.Element {
  const { data: financeiroData } = useBIData<AnyObject[]>('financeiro_completo.json');

  const financeiro = useMemo(() => {
    const raw = (financeiroData as any)?.data || financeiroData || [];
    return Array.isArray(raw) ? raw : [];
  }, [financeiroData]);

  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);

  // Cross-filtering state
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const clientesList = useMemo(() =>
    Array.from(new Set(financeiro.map(r => r.Cliente).filter(Boolean))).sort()
    , [financeiro]);

  // Base Filter (Date Range & Clients)
  const baseFiltered = useMemo(() => {
    return financeiro.filter((r) => {
      const d = r.DataCompetencia || r.DataEmissao || r.Data;
      if (!d) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (selectedClientes.length > 0 && !selectedClientes.includes(String(r.Cliente))) return false;
      return true;
    });
  }, [financeiro, dateFrom, dateTo, selectedClientes]);

  // Fully Filtered (Base + Cross-filter Month)
  const finalFiltered = useMemo(() => {
    if (!selectedMonth) return baseFiltered;
    return baseFiltered.filter(r => {
      const k = getMonthKey(r.DataCompetencia || r.DataEmissao || r.Data);
      return k === selectedMonth;
    });
  }, [baseFiltered, selectedMonth]);

  // KPIs
  const kpis = useMemo(() => {
    const total = finalFiltered.reduce((s, r) => s + parseCurrency(r.ValorFaturadoItem || r.ValorTotal || r.ValorLocacao), 0);
    const veiculosSet = new Set(finalFiltered.map(r => r.IdVeiculo).filter(Boolean));
    const qtdVeiculosFallback = finalFiltered.reduce((s, r) => s + getQty(r), 0);
    const qtdVeiculos = veiculosSet.size > 0 ? veiculosSet.size : Math.round(qtdVeiculosFallback);
    return {
      faturamento: total,
      veiculos: qtdVeiculos,
      ticket: qtdVeiculos > 0 ? total / qtdVeiculos : 0
    };
  }, [finalFiltered]);

  // Monthly Data (Always based on baseFiltered to show trend, but highlights selected)
  const monthlyOverview = useMemo(() => {
    const map: Record<string, { fat: number; veicSet: Set<any> }> = {};
    baseFiltered.forEach((r) => {
      const k = getMonthKey(r.DataCompetencia || r.DataEmissao || r.Data);
      if (!k) return;
      if (!map[k]) map[k] = { fat: 0, veicSet: new Set() };
      map[k].fat += parseCurrency(r.ValorFaturadoItem || r.ValorTotal || r.ValorLocacao);
      if (r.IdVeiculo) map[k].veicSet.add(r.IdVeiculo);
    });

    return Object.keys(map).sort().map(k => ({
      key: k,
      month: monthLabel(k),
      faturamento: map[k].fat,
      ticket: map[k].veicSet.size > 0 ? map[k].fat / map[k].veicSet.size : 0
    }));
  }, [baseFiltered]);

  // Top Clients (Based on finalFiltered)
  const topClients = useMemo(() => {
    const map: Record<string, number> = {};
    finalFiltered.forEach(r => {
      const c = r.Cliente || 'N/A';
      map[c] = (map[c] || 0) + parseCurrency(r.ValorFaturadoItem || r.ValorTotal || r.ValorLocacao);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [finalFiltered]);

  // Table Data
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const tableData = useMemo(() => finalFiltered.slice().sort((a, b) => {
    const da = a.DataEmissao ? new Date(a.DataEmissao).getTime() : 0;
    const db = b.DataEmissao ? new Date(b.DataEmissao).getTime() : 0;
    return db - da;
  }), [finalFiltered]);

  const pageItems = tableData.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(tableData.length / pageSize));

  // Insights Logic
  const insights = useMemo(() => {
    const alerts = [];

    // 1. Client Dependency
    if (topClients.length > 0 && kpis.faturamento > 0) {
      const topClientShare = topClients[0].value / kpis.faturamento;
      if (topClientShare > 0.20) {
        alerts.push({
          type: 'warning',
          title: 'Alta Dependência de Cliente',
          msg: `O cliente ${topClients[0].name} representa ${(topClientShare * 100).toFixed(1)}% do faturamento.`
        });
      }
    }

    // 2. Revenue Trend (Last 3 months of available data)
    if (monthlyOverview.length >= 3) {
      const last3 = monthlyOverview.slice(-3);
      if (last3[2].faturamento < last3[1].faturamento && last3[1].faturamento < last3[0].faturamento) {
        alerts.push({
          type: 'danger',
          title: 'Tendência de Queda',
          msg: 'O faturamento caiu nos últimos 3 meses consecutivos.'
        });
      }
    }

    return alerts;
  }, [topClients, kpis.faturamento, monthlyOverview]);

  // Handlers
  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const payload = data.activePayload[0].payload;
      if (payload && payload.key) {
        setSelectedMonth(prev => prev === payload.key ? null : payload.key);
        setPage(1);
      }
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Financial Core</Title>
          <Text className="mt-1 text-slate-500">Gestão financeira consolidada e análise de receita.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Hub Financeiro
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <Text className="font-medium text-slate-700">Filtros Globais</Text>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Text className="text-xs text-slate-500 mb-1">Período</Text>
            <div className="flex gap-2">
              <input type="date" className="border border-slate-300 p-2 rounded-md w-full text-sm outline-none focus:ring-2 focus:ring-blue-500" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
              <input type="date" className="border border-slate-300 p-2 rounded-md w-full text-sm outline-none focus:ring-2 focus:ring-blue-500" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div>
            <Text className="text-xs text-slate-500 mb-1">Cliente</Text>
            <select multiple className="w-full border border-slate-300 rounded-md p-2 text-sm h-10 outline-none focus:ring-2 focus:ring-blue-500" value={selectedClientes} onChange={e => { setSelectedClientes(Array.from(e.target.selectedOptions).map(o => o.value)); setPage(1); }}>
              {clientesList.slice(0, 50).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 w-full py-2 rounded-md text-sm transition-colors"
              onClick={() => {
                setDateFrom(`${currentYear}-01-01`);
                setDateTo(`${currentYear}-12-31`);
                setSelectedClientes([]);
                setSelectedMonth(null);
                setPage(1);
              }}
            >
              Limpar Filtros
            </button>
          </div>
          {selectedMonth && (
            <div className="flex items-end">
              <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-md text-sm w-full flex justify-between items-center">
                <span>Filtrando: <strong>{monthLabel(selectedMonth)}</strong></span>
                <button onClick={() => setSelectedMonth(null)} className="text-blue-500 hover:text-blue-800 ml-2">✕</button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Insights Section */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((alert, idx) => (
            <div key={idx} className={`p-4 rounded-lg border flex items-start gap-3 ${alert.type === 'danger' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
              {alert.type === 'danger' ? <TrendingDown className="w-5 h-5 mt-0.5" /> : <AlertTriangle className="w-5 h-5 mt-0.5" />}
              <div>
                <h4 className="font-semibold text-sm">{alert.title}</h4>
                <p className="text-xs opacity-90">{alert.msg}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card decoration="top" decorationColor="blue" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Faturamento Total</Text>
          <Metric className="text-slate-900">{fmtBRL(kpis.faturamento)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="emerald" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Ticket Médio</Text>
          <Metric className="text-slate-900">{fmtBRL(kpis.ticket)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="violet" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Veículos Faturados</Text>
          <Metric className="text-slate-900">{kpis.veiculos}</Metric>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm">
          <Title className="text-slate-900">Evolução Mensal</Title>
          <Text className="text-slate-500 text-sm mb-4">Clique nas barras para filtrar os detalhes.</Text>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyOverview} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} stroke="#64748b" />
                <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} stroke="#64748b" />
                <Tooltip
                  formatter={(v: any) => fmtBRL(v)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="faturamento" radius={[4, 4, 0, 0]} name="Faturamento">
                  {monthlyOverview.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={selectedMonth === entry.key ? '#2563eb' : '#93c5fd'} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="ticket" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Ticket Médio" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <Title className="text-slate-900">Top 10 Clientes</Title>
          <div className="mt-4 h-80 overflow-y-auto pr-2">
            <BarList data={topClients} valueFormatter={(v) => fmtBRL(v)} color="blue" />
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <Title className="text-slate-900 mb-4">Detalhamento de Notas</Title>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Nota</th>
                <th className="px-4 py-3 font-medium">Data Emissão</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium text-right">Valor Faturado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((r, i) => (
                <tr key={`fin-${i}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-600">{r.Nota || r.NumeroNota || r.Documento || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.DataEmissao ? new Date(r.DataEmissao).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.Cliente || '-'}</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-medium">{fmtBRL(Number(r.ValorTotal) || 0)}</td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500">Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, tableData.length)} de {tableData.length}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors">Anterior</button>
            <Text className="text-slate-600">Página {page} / {totalPages}</Text>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors">Próximo</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
