import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList } from '@tremor/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ShoppingBag, AlertTriangle, Filter, Download } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
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

// --- COMPONENTE PRINCIPAL ---
export default function PurchasesDashboard(): JSX.Element {
  const { data: comprasData } = useBIData<AnyObject[]>('compras.json');

  const compras = useMemo(() => {
    const raw = (comprasData as any)?.data || comprasData || [];
    return Array.isArray(raw) ? raw : [];
  }, [comprasData]);

  // State
  const [selectedMontadoras, setSelectedMontadoras] = useState<string[]>([]);
  const [selectedBancos, setSelectedBancos] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'financial' | 'volume'>('financial');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Lists
  const montadoras = useMemo(() => Array.from(new Set(compras.map(r => r.Montadora).filter(Boolean))).sort(), [compras]);
  const bancos = useMemo(() => Array.from(new Set(compras.map(r => r.Banco).filter(Boolean))).sort(), [compras]);

  // Filtered Data
  const filteredData = useMemo(() => {
    return compras.filter(r => {
      if (selectedMontadoras.length > 0 && !selectedMontadoras.includes(r.Montadora)) return false;
      if (selectedBancos.length > 0 && !selectedBancos.includes(r.Banco)) return false;
      if (selectedMonth && getMonthKey(r.DataCompra) !== selectedMonth) return false;
      return true;
    });
  }, [compras, selectedMontadoras, selectedBancos, selectedMonth]);

  // KPIs
  const kpis = useMemo(() => {
    const totalInvest = filteredData.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
    const count = filteredData.length;
    const avgTicket = count > 0 ? totalInvest / count : 0;

    // Deságio Médio (FIPE vs Compra)
    let totalDesagio = 0;
    let validDesagio = 0;
    filteredData.forEach(r => {
      const fipe = parseCurrency(r.ValorFipe);
      const compra = parseCurrency(r.ValorCompra);
      if (fipe > 0 && compra > 0) {
        totalDesagio += ((fipe - compra) / fipe);
        validDesagio++;
      }
    });
    const avgDesagio = validDesagio > 0 ? (totalDesagio / validDesagio) * 100 : 0;

    return { totalInvest, count, avgTicket, avgDesagio };
  }, [filteredData]);

  // Chart Data (Evolution)
  const monthlyData = useMemo(() => {
    const map: Record<string, { val: number; qtd: number }> = {};
    // Use base filtered data (without month filter) to show trend
    const base = compras.filter(r => {
      if (selectedMontadoras.length > 0 && !selectedMontadoras.includes(r.Montadora)) return false;
      if (selectedBancos.length > 0 && !selectedBancos.includes(r.Banco)) return false;
      return true;
    });

    base.forEach(r => {
      const k = getMonthKey(r.DataCompra);
      if (!k) return;
      if (!map[k]) map[k] = { val: 0, qtd: 0 };
      map[k].val += parseCurrency(r.ValorCompra);
      map[k].qtd += 1;
    });

    return Object.keys(map).sort().map(k => ({
      key: k,
      month: monthLabel(k),
      Valor: map[k].val,
      Qtd: map[k].qtd
    }));
  }, [compras, selectedMontadoras, selectedBancos]);

  // Top Banks
  const topBancos = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      const b = r.Banco || 'Outros';
      map[b] = (map[b] || 0) + parseCurrency(r.ValorCompra);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData]);

  // Insights
  const insights = useMemo(() => {
    const alerts = [];

    // Bank Concentration
    if (topBancos.length > 0 && kpis.totalInvest > 0) {
      const topShare = topBancos[0].value / kpis.totalInvest;
      if (topShare > 0.50) {
        alerts.push({
          type: 'warning',
          title: 'Concentração de Fornecedor',
          msg: `O banco ${topBancos[0].name} representa ${(topShare * 100).toFixed(1)}% do volume de compras.`
        });
      }
    }

    return alerts;
  }, [topBancos, kpis.totalInvest]);

  // Export CSV
  const handleExport = () => {
    const headers = ['Modelo', 'Placa', 'Banco', 'DataCompra', 'ValorCompra', 'ValorFipe'];
    const csvContent = [
      headers.join(';'),
      ...filteredData.map(r => [
        r.Modelo, r.Placa, r.Banco,
        r.DataCompra ? new Date(r.DataCompra).toLocaleDateString('pt-BR') : '',
        parseCurrency(r.ValorCompra).toFixed(2),
        parseCurrency(r.ValorFipe).toFixed(2)
      ].join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'compras_detalhado.csv';
    link.click();
  };

  // Pagination
  const pageItems = filteredData.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Gestão de Compras</Title>
          <Text className="mt-1 text-slate-500">Detalhamento de aquisições, fornecedores e deságio.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> Hub Compras
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <Text className="font-medium text-slate-700">Filtros Avançados</Text>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Text className="text-xs text-slate-500 mb-1">Montadora</Text>
            <select multiple className="w-full border border-slate-300 rounded-md p-2 text-sm h-20 outline-none focus:ring-2 focus:ring-emerald-500" value={selectedMontadoras} onChange={e => { setSelectedMontadoras(Array.from(e.target.selectedOptions).map(o => o.value)); setPage(1); }}>
              {montadoras.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Text className="text-xs text-slate-500 mb-1">Banco / Fornecedor</Text>
            <select multiple className="w-full border border-slate-300 rounded-md p-2 text-sm h-20 outline-none focus:ring-2 focus:ring-emerald-500" value={selectedBancos} onChange={e => { setSelectedBancos(Array.from(e.target.selectedOptions).map(o => o.value)); setPage(1); }}>
              {bancos.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <button
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 w-full py-2 rounded-md text-sm transition-colors"
              onClick={() => { setSelectedMontadoras([]); setSelectedBancos([]); setSelectedMonth(null); setPage(1); }}
            >
              Limpar Filtros
            </button>
            {selectedMonth && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2 rounded-md text-sm flex justify-between items-center">
                <span>Mês: <strong>{monthLabel(selectedMonth)}</strong></span>
                <button onClick={() => setSelectedMonth(null)} className="text-emerald-500 hover:text-emerald-800">✕</button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((alert, idx) => (
            <div key={idx} className={`p-4 rounded-lg border flex items-start gap-3 ${alert.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
              <AlertTriangle className="w-5 h-5 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">{alert.title}</h4>
                <p className="text-xs opacity-90">{alert.msg}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="emerald" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Investimento Total</Text>
          <Metric className="text-slate-900">{fmtBRL(kpis.totalInvest)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="emerald" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Veículos Comprados</Text>
          <Metric className="text-slate-900">{kpis.count}</Metric>
        </Card>
        <Card decoration="top" decorationColor="blue" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Ticket Médio</Text>
          <Metric className="text-slate-900">{fmtBRL(kpis.avgTicket)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Deságio Médio</Text>
          <Metric className="text-slate-900">{kpis.avgDesagio.toFixed(1)}%</Metric>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Title className="text-slate-900">Evolução de Compras</Title>
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setChartMode('financial')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartMode === 'financial' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Financeiro</button>
              <button onClick={() => setChartMode('volume')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartMode === 'volume' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Volume</button>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyData}
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    const k = data.activePayload[0].payload.key;
                    setSelectedMonth(prev => prev === k ? null : k);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <defs>
                  <linearGradient id="colorChart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={chartMode === 'financial' ? fmtCompact : undefined} stroke="#64748b" />
                <Tooltip formatter={(v: any) => chartMode === 'financial' ? fmtBRL(v) : v} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Area
                  type="monotone"
                  dataKey={chartMode === 'financial' ? 'Valor' : 'Qtd'}
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorChart)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <Title className="text-slate-900">Top Bancos</Title>
          <div className="mt-4 h-80 overflow-y-auto pr-2">
            <BarList data={topBancos} valueFormatter={(v) => fmtBRL(v)} color="emerald" />
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <Title className="text-slate-900">Detalhamento de Veículos</Title>
          <button onClick={handleExport} className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Placa</th>
                <th className="px-4 py-3 font-medium">Banco</th>
                <th className="px-4 py-3 font-medium">Data Compra</th>
                <th className="px-4 py-3 font-medium text-right">Valor Compra</th>
                <th className="px-4 py-3 font-medium text-right">Valor FIPE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((r, i) => (
                <tr key={`compra-${i}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.Modelo}</td>
                  <td className="px-4 py-3 text-slate-600">{r.Placa}</td>
                  <td className="px-4 py-3 text-slate-600">{r.Banco}</td>
                  <td className="px-4 py-3 text-slate-600">{r.DataCompra ? new Date(r.DataCompra).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">{fmtBRL(parseCurrency(r.ValorCompra))}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmtBRL(parseCurrency(r.ValorFipe))}</td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500">Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredData.length)} de {filteredData.length}</div>
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
