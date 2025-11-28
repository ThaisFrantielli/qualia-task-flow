import React, { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { PlusCircle, XCircle, PieChart as PieIcon } from 'lucide-react';

type AnyObject = { [k: string]: any };

function fmtBRL(v: number) {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
  catch (e) { return String(v); }
}

export default function ChurnDashboard(): JSX.Element {
  const { data } = useBIData<AnyObject[]>('churn_contratos.json');

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

  // UI filters
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const clients = useMemo(() => Array.from(new Set(records.map((r) => r.Cliente).filter(Boolean))), [records]);
  const filiais = useMemo(() => Array.from(new Set(records.map((r) => r.Filial).filter(Boolean))), [records]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedFiliais, setSelectedFiliais] = useState<string[]>([]);

  // active filters coming from clicking charts
  const [activeMonthFilter, setActiveMonthFilter] = useState<string | null>(null);
  const [activeMotivoFilter, setActiveMotivoFilter] = useState<string | null>(null);

  // base filtered by period / cliente / filial
  const baseFiltered = useMemo(() => {
    return records.filter((r) => {
      if (dateFrom) {
        if (!r.DataEvento) return false;
        if (new Date(r.DataEvento) < new Date(dateFrom + 'T00:00:00')) return false;
      }
      if (dateTo) {
        if (!r.DataEvento) return false;
        if (new Date(r.DataEvento) > new Date(dateTo + 'T23:59:59')) return false;
      }
      if (selectedClients.length > 0 && !selectedClients.includes(String(r.Cliente || ''))) return false;
      if (selectedFiliais.length > 0 && !selectedFiliais.includes(String(r.Filial || ''))) return false;
      return true;
    });
  }, [records, dateFrom, dateTo, selectedClients, selectedFiliais]);

  // group by month YYYY-MM from baseFiltered
  const monthly = useMemo(() => {
    const map: Record<string, { month: string; Novos: number; Cancelados: number; ValorNovos: number; ValorPerdido: number }> = {};
    baseFiltered.forEach((r) => {
      const d = r.DataEvento ? new Date(r.DataEvento) : null;
      const month = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'unknown';
      if (!map[month]) map[month] = { month, Novos: 0, Cancelados: 0, ValorNovos: 0, ValorPerdido: 0 };
      const tipo = String(r.TipoEvento || '').toLowerCase();
      const valor = Number(r.Valor) || 0;
      if (tipo === 'iniciado') {
        map[month].Novos += 1;
        map[month].ValorNovos += valor;
      } else if (tipo === 'encerrado') {
        map[month].Cancelados += 1;
        map[month].ValorPerdido += valor;
      }
    });
    // produce sorted array
    return Object.keys(map).sort().map((k) => ({
      month: map[k].month,
      Novos: map[k].Novos,
      Cancelados: map[k].Cancelados,
      ValorNovos: map[k].ValorNovos,
      ValorPerdido: map[k].ValorPerdido,
      Saldo: map[k].Novos - map[k].Cancelados,
    }));
  }, [baseFiltered]);

  const totals = useMemo(() => {
    const totalNovos = monthly.reduce((s, m) => s + (m.Novos || 0), 0);
    const totalCancelados = monthly.reduce((s, m) => s + (m.Cancelados || 0), 0);
    const totalValorNovos = monthly.reduce((s, m) => s + (m.ValorNovos || 0), 0);
    const totalValorPerdido = monthly.reduce((s, m) => s + (m.ValorPerdido || 0), 0);
    const churnRate = (totalNovos + totalCancelados) ? (totalCancelados / (totalNovos + totalCancelados)) * 100 : 0;
    return { totalNovos, totalCancelados, totalValorNovos, totalValorPerdido, netSaldo: totalNovos - totalCancelados, churnRate };
  }, [monthly]);

  // donut: motivos de encerramento
  const motivos = useMemo(() => {
    const map: Record<string, number> = {};
    baseFiltered.forEach((r) => {
      if (String((r.TipoEvento || '')).toLowerCase() !== 'encerrado') return;
      const motivo = r.Motivo || 'Não informado';
      map[motivo] = (map[motivo] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [baseFiltered]);

  // table pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const tableData = useMemo(() => baseFiltered.slice().sort((a, b) => {
    const da = a.DataEvento ? new Date(a.DataEvento).getTime() : 0;
    const db = b.DataEvento ? new Date(b.DataEvento).getTime() : 0;
    return db - da;
  }), [baseFiltered]);

  const tableFiltered = useMemo(() => {
    return tableData.filter((r) => {
      if (activeMonthFilter) {
        const d = r.DataEvento ? new Date(r.DataEvento) : null;
        const month = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'unknown';
        if (month !== activeMonthFilter) return false;
      }
      if (activeMotivoFilter) {
        const motivo = r.Motivo || 'Não informado';
        if (motivo !== activeMotivoFilter) return false;
      }
      return true;
    });
  }, [tableData, activeMonthFilter, activeMotivoFilter]);

  const pageItems = tableFiltered.slice((page - 1) * pageSize, page * pageSize);

  // handlers for chart clicks and CSV export
  function handleBarClick(data: any, index?: number) {
    const maybePayload = data?.payload ?? data;
    const month = maybePayload?.month ?? (typeof index === 'number' && monthly?.[index]?.month) ?? null;
    if (month) {
      setActiveMonthFilter(month);
      setPage(1);
    }
  }

  function handleMotivoClick(motivo: string) {
    setActiveMotivoFilter(motivo);
    setPage(1);
  }

  function exportCSV() {
    const rows = tableFiltered;
    if (!rows || rows.length === 0) return;
    const keys = ['DataEvento', 'TipoEvento', 'Cliente', 'Placa', 'Valor', 'Motivo'];
    const header = keys.join(',');
    const csvRows = rows.map((r) => keys.map((k) => {
      const v = r[k] ?? '';
      const s = String(v).replace(/"/g, '""');
      return (s.includes(',') || s.includes('\n')) ? `"${s}"` : s;
    }).join(','));
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abertura_encerramento_contrato_events_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-slate-50 p-6 min-h-screen">
      <div>
        <Title>Abertura e Encerramento Contrato</Title>
        <Text className="mt-1">Visão de entradas, cancelamentos e impacto em receita recorrente.</Text>
      </div>

      {/* Filters */}
      <div className="mt-4">
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Text>Data de (início)</Text>
              <input className="border rounded p-2 w-full" type="date" value={dateFrom ?? ''} onChange={(e) => { setDateFrom(e.target.value || null); setPage(1); }} />
            </div>

            <div>
              <Text>Data até</Text>
              <input className="border rounded p-2 w-full" type="date" value={dateTo ?? ''} onChange={(e) => { setDateTo(e.target.value || null); setPage(1); }} />
            </div>

            <div>
              <Text>Cliente</Text>
              <select multiple size={3} className="border rounded p-2 w-full" value={selectedClients} onChange={(e) => { const opts = Array.from(e.target.selectedOptions).map(o => o.value); setSelectedClients(opts); setPage(1); }}>
                {clients.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <Text>Filial</Text>
              <select multiple size={3} className="border rounded p-2 w-full" value={selectedFiliais} onChange={(e) => { const opts = Array.from(e.target.selectedOptions).map(o => o.value); setSelectedFiliais(opts); setPage(1); }}>
                {filiais.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button onClick={() => { setDateFrom(null); setDateTo(null); setSelectedClients([]); setSelectedFiliais([]); setActiveMonthFilter(null); setActiveMotivoFilter(null); setPage(1); }} className="px-3 py-1 rounded bg-gray-200">Limpar filtros</button>
            <button onClick={() => exportCSV()} className="px-3 py-1 rounded bg-blue-600 text-white">Exportar CSV</button>
            {activeMonthFilter || activeMotivoFilter ? (
              <div className="ml-auto text-sm text-gray-600">Filtrando: {activeMonthFilter ? `Mês ${activeMonthFilter}` : ''} {activeMotivoFilter ? `Motivo: ${activeMotivoFilter}` : ''}</div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-sky-50"><PlusCircle className="text-sky-600" size={18} /></div>
            <div>
              <Text className="text-sm">Saldo Líquido do Período</Text>
              <Metric className={totals.netSaldo < 0 ? 'text-red-600' : ''}>{totals.netSaldo > 0 ? `+${totals.netSaldo}` : String(totals.netSaldo)} contratos</Metric>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-emerald-50"><PlusCircle className="text-emerald-600" size={18} /></div>
            <div>
              <Text className="text-sm">Valor Adicionado / Perdido</Text>
              <Metric>{fmtBRL(totals.totalValorNovos)} / <span className="text-red-600">{fmtBRL(totals.totalValorPerdido)}</span></Metric>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-red-50"><XCircle className="text-red-600" size={18} /></div>
            <div>
              <Text className="text-sm">Taxa de Abertura e Encerramento Contrato</Text>
              <Metric>{totals.churnRate.toFixed(2)}%</Metric>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" style={{ height: 340 }}>
          <Text>Fluxo de Contratos</Text>
          <div style={{ width: '100%', height: 280, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(v: any, name: any) => [typeof v === 'number' ? String(v) : v, name]} />
                <Legend />
                <Bar dataKey="Novos" name="Novos" fill="#10b981" />
                <Bar dataKey="Novos" name="Novos" fill="#10b981" onClick={(data, index) => handleBarClick(data, index)} />
                <Bar dataKey="Cancelados" name="Cancelados" fill="#ef4444" onClick={(data, index) => handleBarClick(data, index)} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card style={{ height: 340 }}>
          <Text>Motivos de Encerramento</Text>
          <div style={{ width: '100%', height: 280, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={motivos} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label={({ percent }: any) => `${Math.round(percent * 100)}%`}>
                  {motivos.map((m, idx) => (
                    <Cell key={String(idx)} fill={["#ef4444", "#f97316", "#f59e0b", "#3b82f6", "#10b981"][idx % 5]} onClick={() => handleMotivoClick(m.name)} style={{ cursor: 'pointer' }} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, name: any) => [String(v), String(name)]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <Text className="mb-3">Detalhamento de Eventos</Text>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="text-left p-2">Data</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-left p-2">Placa</th>
                  <th className="text-right p-2">Valor</th>
                  <th className="text-left p-2">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r, i) => (
                  <tr key={`abertura_encerramento-${i}`} className="border-t">
                    <td className="p-2">{r.DataEvento ? new Date(r.DataEvento).toLocaleString() : '-'}</td>
                    <td className="p-2">{String(r.TipoEvento || '') .toLowerCase() === 'iniciado' ? <span className="inline-block bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Iniciado</span> : <span className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded">Encerrado</span>}</td>
                    <td className="p-2">{r.Cliente || '-'}</td>
                    <td className="p-2">{r.Placa || '-'}</td>
                    <td className="p-2 text-right">{fmtBRL(Number(r.Valor) || 0)}</td>
                    <td className="p-2 text-sm text-gray-700">{r.Motivo || '-'}</td>
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
