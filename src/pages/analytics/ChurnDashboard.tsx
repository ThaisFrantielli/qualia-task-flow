import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { PlusCircle, XCircle, TrendingDown } from 'lucide-react';

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
  const totalPages = Math.max(1, Math.ceil(tableFiltered.length / pageSize));

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
    a.download = `abertura_encerramento_contrato_events_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title className="text-slate-900">Abertura e Encerramento de Contratos</Title>
          <Text className="mt-1 text-slate-500">Visão de entradas, cancelamentos e impacto em receita recorrente.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Hub Comercial
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <Text className="text-slate-700 font-medium mb-2">Filtros</Text>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Text className="text-slate-500 text-xs mb-1">Período (De - Até)</Text>
            <div className="flex gap-2">
              <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none" value={dateFrom || ''} onChange={(e) => { setDateFrom(e.target.value || null); setPage(1); }} />
              <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none" value={dateTo || ''} onChange={(e) => { setDateTo(e.target.value || null); setPage(1); }} />
            </div>
          </div>
          <div>
            <Text className="text-slate-500 text-xs mb-1">Cliente</Text>
            <select multiple size={3} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none" value={selectedClients} onChange={(e) => { const opts = Array.from(e.target.selectedOptions).map(o => o.value); setSelectedClients(opts); setPage(1); }}>
              {clients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Text className="text-slate-500 text-xs mb-1">Filial</Text>
            <select multiple size={3} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none" value={selectedFiliais} onChange={(e) => { const opts = Array.from(e.target.selectedOptions).map(o => o.value); setSelectedFiliais(opts); setPage(1); }}>
              {filiais.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setDateFrom(null); setDateTo(null); setSelectedClients([]); setSelectedFiliais([]); setActiveMonthFilter(null); setActiveMotivoFilter(null); setPage(1); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-sm transition-colors w-full"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button onClick={() => exportCSV()} className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-100 rounded-md text-sm hover:bg-violet-100 transition-colors">
            Exportar CSV
          </button>
          {activeMonthFilter || activeMotivoFilter ? (
            <div className="ml-auto text-sm text-slate-600">
              Filtrando: {activeMonthFilter ? `Mês ${activeMonthFilter}` : ''} {activeMotivoFilter ? `Motivo: ${activeMotivoFilter}` : ''}
            </div>
          ) : null}
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-50">
              <PlusCircle className="text-violet-600" size={20} />
            </div>
            <div>
              <Text className="text-slate-500 text-sm">Saldo Líquido do Período</Text>
              <Metric className={totals.netSaldo < 0 ? 'text-red-600' : 'text-slate-900'}>
                {totals.netSaldo > 0 ? `+${totals.netSaldo}` : String(totals.netSaldo)} contratos
              </Metric>
            </div>
          </div>
        </Card>

        <Card className="bg-white shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <PlusCircle className="text-emerald-600" size={20} />
            </div>
            <div>
              <Text className="text-slate-500 text-sm">Valor Adicionado / Perdido</Text>
              <Metric className="text-slate-900">
                {fmtBRL(totals.totalValorNovos)} / <span className="text-red-600">{fmtBRL(totals.totalValorPerdido)}</span>
              </Metric>
            </div>
          </div>
        </Card>

        <Card className="bg-white shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <XCircle className="text-red-600" size={20} />
            </div>
            <div>
              <Text className="text-slate-500 text-sm">Taxa de Churn</Text>
              <Metric className="text-slate-900">{totals.churnRate.toFixed(2)}%</Metric>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-200">
          <Title className="text-slate-900">Fluxo de Contratos</Title>
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: any, name: any) => [typeof v === 'number' ? String(v) : v, name]}
                />
                <Legend />
                <Bar dataKey="Novos" name="Novos" fill="#10b981" onClick={(data, index) => handleBarClick(data, index)} />
                <Bar dataKey="Cancelados" name="Cancelados" fill="#ef4444" onClick={(data, index) => handleBarClick(data, index)} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-white shadow-sm border border-slate-200">
          <Title className="text-slate-900">Motivos de Encerramento</Title>
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={motivos}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ percent }: any) => `${Math.round(percent * 100)}%`}
                  labelLine={false}
                >
                  {motivos.map((m, idx) => (
                    <Cell
                      key={String(idx)}
                      fill={["#ef4444", "#f97316", "#f59e0b", "#8b5cf6", "#10b981"][idx % 5]}
                      onClick={() => handleMotivoClick(m.name)}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: any, name: any) => [String(v), String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {motivos.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: ["#ef4444", "#f97316", "#f59e0b", "#8b5cf6", "#10b981"][i % 5] }} />
                  <span className="text-slate-600">{m.name}</span>
                </div>
                <span className="font-medium text-slate-900">{m.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <Title className="text-slate-900 mb-4">Detalhamento de Eventos</Title>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Placa</th>
                <th className="px-4 py-3 font-medium text-right">Valor</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((r, i) => (
                <tr key={`churn-${i}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-600">{r.DataEvento ? new Date(r.DataEvento).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="px-4 py-3">
                    {String(r.TipoEvento || '').toLowerCase() === 'iniciado' ?
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">Iniciado</span> :
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">Encerrado</span>
                    }
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.Cliente || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.Placa || '-'}</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-medium">{fmtBRL(Number(r.Valor) || 0)}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{r.Motivo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500">
            Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, tableFiltered.length)} de {tableFiltered.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors"
            >
              Anterior
            </button>
            <Text className="text-slate-600">Página {page} / {totalPages}</Text>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
