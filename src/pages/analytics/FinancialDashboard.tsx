import React, { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

type AnyObject = { [k: string]: any };

function fmtBRL(v: number) {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
  catch (e) { return String(v); }
}

function monthLabel(ym: string) {
  // ym = YYYY-MM
  const [y, m] = ym.split('-');
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const mi = Number(m) - 1;
  return `${months[mi]}/${String(y).slice(2)}`;
}

export default function FinancialDashboard(): JSX.Element {
  const { data, loading, error } = useBIData<AnyObject[]>('financeiro_completo.json');

  const records: AnyObject[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data as AnyObject[];
    if ((data as any).data && Array.isArray((data as any).data)) return (data as any).data;
    const keys = Object.keys(data as any);
    for (const k of keys) {
      if (Array.isArray((data as any)[k])) return (data as any)[k];
    }
    return [];
  }, [data]);

  // Filters: DataCompetencia range, Cliente, SituacaoNota
  const clientes = useMemo(() => Array.from(new Set(records.map(r => r.Cliente).filter(Boolean))), [records]);
  const situacoes = useMemo(() => Array.from(new Set(records.map(r => r.SituacaoNota).filter(Boolean))), [records]);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedSituacoes, setSelectedSituacoes] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
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
  }, [records, dateFrom, dateTo, selectedClientes, selectedSituacoes]);

  // KPIs
  const faturamentoLocacao = useMemo(() => filtered.reduce((s, r) => s + (Number(r.ValorLocacao) || 0), 0), [filtered]);
  const totalFaturado = useMemo(() => filtered.reduce((s, r) => s + (Number(r.ValorTotal) || 0), 0), [filtered]);
  const totalVeiculos = useMemo(() => filtered.reduce((s, r) => s + (Number(r.QtdVeiculos) || 0), 0), [filtered]);
  const ticketMedio = totalVeiculos > 0 ? (totalFaturado / totalVeiculos) : 0;

  // Monthly aggregations (by DataCompetencia month)
  const monthly = useMemo(() => {
    const map: Record<string, { month: string; faturamentoLocacao: number; totalFaturado: number; totalVeiculos: number }> = {};
    filtered.forEach((r) => {
      const d = r.DataCompetencia ? new Date(r.DataCompetencia) : (r.DataEmissao ? new Date(r.DataEmissao) : null);
      const month = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}` : 'unknown';
      if (!map[month]) map[month] = { month, faturamentoLocacao: 0, totalFaturado: 0, totalVeiculos: 0 };
      map[month].faturamentoLocacao += Number(r.ValorLocacao) || 0;
      map[month].totalFaturado += Number(r.ValorTotal) || 0;
      map[month].totalVeiculos += Number(r.QtdVeiculos) || 0;
    });
    return Object.keys(map).sort().map(k => ({
      month: map[k].month,
      label: monthLabel(map[k].month),
      faturamentoLocacao: Number((map[k].faturamentoLocacao || 0).toFixed(2)),
      ticketMedio: (map[k].totalVeiculos > 0) ? Number((map[k].totalFaturado / map[k].totalVeiculos).toFixed(2)) : 0,
    }));
  }, [filtered]);

  // Top 10 clientes by faturamento (ValorTotal)
  const topClients = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => { const c = r.Cliente || 'Sem Cliente'; map[c] = (map[c] || 0) + (Number(r.ValorTotal) || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filtered]);

  // Details table
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const tableData = useMemo(() => filtered.slice().sort((a,b) => {
    const da = a.DataEmissao ? new Date(a.DataEmissao).getTime() : 0;
    const db = b.DataEmissao ? new Date(b.DataEmissao).getTime() : 0;
    return db - da;
  }), [filtered]);

  const tableFiltered = useMemo(() => tableData, [tableData]);
  const pageItems = tableFiltered.slice((page - 1) * pageSize, page * pageSize);

  function getNotaId(r: AnyObject) {
    return r.Nota || r.NumeroNota || r.Documento || r.Chave || r.ID || r.Id || '-';
  }

  return (
    <div className="bg-slate-50 p-6 min-h-screen">
      <div className="mb-4">
        <Title>Financeiro - Visão Consolidada</Title>
        <Text className="mt-1">Dashboard financeiro inspirado em PowerBI — filtros, KPIs e análises mensais.</Text>
      </div>

      {/* Filters Grid (top) */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="md:col-span-2">
          <Text>Data Competência (Início)</Text>
          <input type="date" value={dateFrom ?? ''} onChange={(e) => { setDateFrom(e.target.value || null); setPage(1); }} className="w-full p-2 border rounded" />
        </div>
        <div className="md:col-span-2">
          <Text>Data Competência (Fim)</Text>
          <input type="date" value={dateTo ?? ''} onChange={(e) => { setDateTo(e.target.value || null); setPage(1); }} className="w-full p-2 border rounded" />
        </div>
        <div className="md:col-span-1">
          <Text>Cliente</Text>
          <select multiple size={3} value={selectedClientes} onChange={(e) => { const opts = Array.from(e.target.selectedOptions).map(o => o.value); setSelectedClientes(opts); setPage(1); }} className="w-full p-2 border rounded">
            {clientes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="md:col-span-1">
          <Text>Situação</Text>
          <select multiple size={3} value={selectedSituacoes} onChange={(e) => { const opts = Array.from(e.target.selectedOptions).map(o => o.value); setSelectedSituacoes(opts); setPage(1); }} className="w-full p-2 border rounded">
            {situacoes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6">
        <div className="bg-slate-900 text-white rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Text className="text-sm">Faturamento Locação</Text>
              <Metric className="text-white">{fmtBRL(faturamentoLocacao)}</Metric>
            </div>
            <div>
              <Text className="text-sm">Ticket Médio</Text>
              <Metric className="text-white">{fmtBRL(ticketMedio)}</Metric>
            </div>
            <div>
              <Text className="text-sm">Qt Veículos Faturados</Text>
              <Metric className="text-white">{totalVeiculos}</Metric>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <Text>Faturamento Locação por Mês</Text>
          <div style={{ width: '100%', height: 320, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(v:any) => [fmtBRL(Number(v)), 'Faturamento']} />
                <Bar dataKey="faturamentoLocacao" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <Text>Ticket Médio Mensal</Text>
          <div style={{ width: '100%', height: 320, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(v:any) => [fmtBRL(Number(v)), 'Ticket Médio']} />
                <Bar dataKey="ticketMedio" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom: Top 10 + Details */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <Title>Top 10 Clientes</Title>
          <div className="mt-3">
            <BarList data={topClients.map(c => ({ name: c.name, value: Math.round(c.value) }))} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <Title>Detalhamento de Notas</Title>
          <Text className="mb-2">Lista paginada de notas filtradas</Text>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="text-left p-2">Nota</th>
                  <th className="text-left p-2">Data Emissão</th>
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-right p-2">Valor Faturado</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r, i) => (
                  <tr key={`fin-${i}`} className="border-t">
                    <td className="p-2">{getNotaId(r)}</td>
                    <td className="p-2">{r.DataEmissao ? new Date(r.DataEmissao).toLocaleString() : '-'}</td>
                    <td className="p-2">{r.Cliente || '-'}</td>
                    <td className="p-2 text-right">{fmtBRL(Number(r.ValorTotal) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, tableFiltered.length)} de {tableFiltered.length}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Anterior</button>
              <Text>Página {page} / {Math.max(1, Math.ceil(tableFiltered.length / pageSize))}</Text>
              <button onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(tableFiltered.length / pageSize)), p + 1))} disabled={page >= Math.max(1, Math.ceil(tableFiltered.length / pageSize))} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Próximo</button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
