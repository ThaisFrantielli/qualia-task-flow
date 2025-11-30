import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import {
  Card,
  Title,
  Text,
  Metric,
} from '@tremor/react';
import { AreaChart as ReAreaChart, Area, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart as ReBarChart, Bar, CartesianGrid, LabelList, Cell } from 'recharts';
import { ShoppingCart, TrendingUp, DollarSign, Calendar } from 'lucide-react';

type AnyObject = { [k: string]: any };

function formatCurrency(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '-';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PurchasesDashboard(): JSX.Element {
  const { data } = useBIData<any[]>('compras_full.json');

  const [chartMode, setChartMode] = useState<'financial' | 'volume'>('financial');

  // normalize data
  const records: AnyObject[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data as AnyObject[];
    if ((data as any).data && Array.isArray((data as any).data)) return (data as any).data;
    // fallback: find first array prop
    const keys = Object.keys(data as any);
    for (const k of keys) {
      if (Array.isArray((data as any)[k])) return (data as any)[k];
    }
    return [];
  }, [data]);

  // Filters
  const currentYear = new Date().getFullYear();
  const defaultDateFrom = `${currentYear}-01-01`;
  const defaultDateTo = `${currentYear}-12-31`;
  const [dateFrom, setDateFrom] = useState<string | null>(defaultDateFrom); // 'yyyy-mm-dd'
  const [dateTo, setDateTo] = useState<string | null>(defaultDateTo);
  const montadoras = useMemo(() => Array.from(new Set(records.map((r) => r.Montadora).filter(Boolean))), [records]);
  const statusOptions = useMemo(() => Array.from(new Set(records.map((r) => r.SituacaoVeiculo).filter(Boolean))), [records]);
  const [selectedMontadoras, setSelectedMontadoras] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  // Filtering logic
  const filtered = useMemo(() => {
    if (!records || records.length === 0) return [] as AnyObject[];
    const q = String(search || '').trim().toLowerCase();
    return records.filter((r) => {
      // date filter
      if (dateFrom) {
        if (!r.DataCompra) return false;
        if (new Date(r.DataCompra) < new Date(dateFrom + 'T00:00:00')) return false;
      }
      if (dateTo) {
        if (!r.DataCompra) return false;
        if (new Date(r.DataCompra) > new Date(dateTo + 'T23:59:59')) return false;
      }

      if (selectedMontadoras.length > 0) {
        if (!selectedMontadoras.includes(String(r.Montadora))) return false;
      }
      if (selectedStatus.length > 0) {
        if (!selectedStatus.includes(String(r.SituacaoVeiculo))) return false;
      }

      if (q) {
        const hay = [r.Placa, r.Montadora, r.Modelo, r.SituacaoVeiculo, r.Banco].map((v) => String(v || '').toLowerCase()).join(' ');
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [records, dateFrom, dateTo, selectedMontadoras, selectedStatus, search]);

  // Table pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  // seleção por modelo/banco (clicando nos gráficos) — agora multi-select
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);

  // aplicar seleções vindas dos gráficos (modelos, bancos)
  const filteredBySelections = useMemo(() => {
    let base = filtered;
    if (selectedModels.length > 0) base = base.filter((r) => selectedModels.includes(String(r.Modelo || '')));
    if (selectedBanks.length > 0) base = base.filter((r) => selectedBanks.includes(String(r.Banco || 'Recurso Próprio')));
    return base;
  }, [filtered, selectedModels, selectedBanks]);

  const pageData = filteredBySelections.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredBySelections.length / pageSize);

  // KPIs
  const totalInvestido = useMemo(() => filteredBySelections.reduce((acc, r) => acc + (Number(r.ValorCompra) || 0), 0), [filteredBySelections]);
  const totalFipe = useMemo(() => filteredBySelections.reduce((acc, r) => acc + (Number(r.ValorFipe) || 0), 0), [filteredBySelections]);
  const desagioTotal = totalFipe > 0 ? (1 - totalInvestido / totalFipe) * 100 : 0;
  const qtdVeiculos = filteredBySelections.length;
  const qtdAlienados = useMemo(() => filteredBySelections.filter((r) => r.Alienado === 'SIM').length, [filteredBySelections]);
  const pctAlienados = qtdVeiculos > 0 ? (qtdAlienados / qtdVeiculos) * 100 : 0;

  // Charts Data
  const monthlyData = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filteredBySelections.forEach((r) => {
      if (!r.DataCompra) return;
      const d = new Date(r.DataCompra);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[k]) map[k] = { total: 0, count: 0 };
      map[k].total += Number(r.ValorCompra) || 0;
      map[k].count += 1;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => {
        const [y, m] = k.split('-');
        return {
          month: `${m}/${y.slice(2)}`,
          fullDate: k,
          Valor: v.total,
          Qtd: v.count,
        };
      });
  }, [filteredBySelections]);

  const topBanks = useMemo(() => {
    const map: Record<string, number> = {};
    filteredBySelections.forEach((r) => {
      const b = r.Banco || 'Recurso Próprio';
      map[b] = (map[b] || 0) + 1; // count volume
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredBySelections]);

  const topModels = useMemo(() => {
    const map: Record<string, number> = {};
    filteredBySelections.forEach((r) => {
      const m = r.Modelo || 'Unknown';
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredBySelections]);

  // Handlers
  const handleBankClick = (data: any) => {
    if (!data || !data.name) return;
    const name = data.name;
    setSelectedBanks((prev) => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  };

  const handleModelClick = (data: any) => {
    if (!data || !data.name) return;
    const name = data.name;
    setSelectedModels((prev) => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  };

  const exportCSV = () => {
    const headers = ['Placa', 'Modelo', 'Montadora', 'AnoModelo', 'Cor', 'Combustivel', 'Chassi', 'Renavam', 'DataCompra', 'ValorCompra', 'ValorFipe', 'Fornecedor', 'Banco', 'Alienado', 'SituacaoVeiculo'];
    const csvRows = [headers.join(';')];
    filteredBySelections.forEach((r) => {
      const row = headers.map((h) => {
        let val = r[h];
        if (h === 'ValorCompra' || h === 'ValorFipe') val = String(val).replace('.', ',');
        return `"${val || ''}"`;
      });
      csvRows.push(row.join(';'));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'compras_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title className="text-slate-900">Compras & Desmobilização</Title>
          <Text className="mt-1 text-slate-500">Pipeline de aquisição, valores investidos e perfil da frota.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Hub Operacional
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <Text className="text-slate-700 font-medium mb-2">Filtros</Text>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Text className="text-slate-500 text-xs mb-1">Período (De - Até)</Text>
            <div className="flex gap-2">
              <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={dateFrom || ''} onChange={(e) => setDateFrom(e.target.value || null)} />
              <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={dateTo || ''} onChange={(e) => setDateTo(e.target.value || null)} />
            </div>
          </div>
          <div>
            <Text className="text-slate-500 text-xs mb-1">Montadora</Text>
            <select multiple size={3} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={selectedMontadoras} onChange={(e) => setSelectedMontadoras(Array.from(e.target.selectedOptions).map(o => o.value))}>
              {montadoras.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Text className="text-slate-500 text-xs mb-1">Status</Text>
            <select multiple size={3} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={selectedStatus} onChange={(e) => setSelectedStatus(Array.from(e.target.selectedOptions).map(o => o.value))}>
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Text className="text-slate-500 text-xs mb-1">Busca Rápida</Text>
            <input type="text" placeholder="Placa, Modelo, Banco..." className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setDateFrom(defaultDateFrom); setDateTo(defaultDateTo); setSelectedMontadoras([]); setSelectedStatus([]); setSearch(''); setSelectedModels([]); setSelectedBanks([]); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-sm transition-colors w-full"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
          <Text className="text-slate-500">Total Investido</Text>
          <Metric className="text-slate-900">{formatCurrency(totalInvestido)}</Metric>
        </Card>
        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
          <Text className="text-slate-500">Total FIPE</Text>
          <Metric className="text-slate-900">{formatCurrency(totalFipe)}</Metric>
        </Card>
        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
          <Text className="text-slate-500">Deságio Médio</Text>
          <Metric className="text-slate-900">{desagioTotal.toFixed(2)}%</Metric>
        </Card>
        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
          <Text className="text-slate-500">Veículos Alienados</Text>
          <Metric className="text-slate-900">{pctAlienados.toFixed(1)}%</Metric>
          <Text className="text-xs text-slate-400 mt-1">{qtdAlienados} de {qtdVeiculos}</Text>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <Title className="text-slate-900">Evolução de Compras</Title>
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setChartMode('financial')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartMode === 'financial' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Financeiro</button>
              <button onClick={() => setChartMode('volume')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartMode === 'volume' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Volume</button>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ReAreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => chartMode === 'financial' ? `R$${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area
                  type="monotone"
                  dataKey={chartMode === 'financial' ? 'Valor' : 'Qtd'}
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorVal)"
                  strokeWidth={2}
                />
              </ReAreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="bg-white shadow-sm border border-slate-200 h-48">
            <Title className="text-slate-900 text-sm">Top Bancos (Volume)</Title>
            <div className="mt-2 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={topBanks} layout="vertical" onClick={handleBankClick}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {topBanks.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={selectedBanks.includes(entry.name) ? '#2563eb' : '#93c5fd'} />
                    ))}
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="bg-white shadow-sm border border-slate-200 h-48">
            <Title className="text-slate-900 text-sm">Top Modelos (Volume)</Title>
            <div className="mt-2 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={topModels} layout="vertical" onClick={handleModelClick}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]}>
                    {topModels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={selectedModels.includes(entry.name) ? '#059669' : '#6ee7b7'} />
                    ))}
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <Title className="text-slate-900">Detalhamento de Compras</Title>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-sm hover:bg-emerald-100 transition-colors">
              Exportar CSV
            </button>
            <div className="flex items-center gap-1 ml-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-600">Página {page} de {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Placa</th>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Montadora</th>
                <th className="px-4 py-3 font-medium">Data Compra</th>
                <th className="px-4 py-3 font-medium">Banco</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Valor Compra</th>
                <th className="px-4 py-3 font-medium text-right">FIPE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageData.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.Placa}</td>
                  <td className="px-4 py-3 text-slate-600">{r.Modelo}</td>
                  <td className="px-4 py-3 text-slate-600">{r.Montadora}</td>
                  <td className="px-4 py-3 text-slate-600">{r.DataCompra ? new Date(r.DataCompra).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.Banco || 'Próprio'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${r.SituacaoVeiculo === 'Disponível' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {r.SituacaoVeiculo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900 font-medium">{formatCurrency(r.ValorCompra)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(r.ValorFipe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
