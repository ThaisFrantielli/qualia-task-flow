import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList, Callout } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { TrendingUp, DollarSign, Package } from 'lucide-react';

type AnyObject = { [k: string]: any };

function fmtBRL(v: number) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  } catch (e) {
    return String(v);
  }
}

export default function SalesPerformance(): JSX.Element {
  const { data } = useBIData<AnyObject[]>('vendas_indicados.json');

  // normalize data
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

  // Filters
  const currentYear = new Date().getFullYear();
  const defaultDateFrom = `${currentYear}-01-01`;
  const defaultDateTo = `${currentYear}-12-31`;
  const [dateFrom, setDateFrom] = useState<string | null>(defaultDateFrom);
  const [dateTo, setDateTo] = useState<string | null>(defaultDateTo);
  const modelos = useMemo(() => Array.from(new Set(records.map((r) => String(r.Modelo || '')).filter(Boolean))), [records]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [chartMode, setChartMode] = useState<'financeiro' | 'volume'>('financeiro');

  // Filtering by DataVenda and Modelo
  const filtered = useMemo(() => {
    if (!records || records.length === 0) return [] as AnyObject[];
    return records.filter((r) => {
      // date filter on DataVenda
      if (dateFrom) {
        if (!r.DataVenda) return false;
        if (new Date(r.DataVenda) < new Date(dateFrom + 'T00:00:00')) return false;
      }
      if (dateTo) {
        if (!r.DataVenda) return false;
        if (new Date(r.DataVenda) > new Date(dateTo + 'T23:59:59')) return false;
      }

      if (selectedModels.length > 0) {
        if (!selectedModels.includes(String(r.Modelo || ''))) return false;
      }

      return true;
    });
  }, [records, dateFrom, dateTo, selectedModels]);

  // KPIs
  const kpis = useMemo(() => {
    const totalCompra = filtered.reduce((s, r) => s + (Number(r.ValorCompra) || 0), 0);
    const totalFipe = filtered.reduce((s, r) => s + (Number(r.ValorFipe) || 0), 0);
    const totalVenda = filtered.reduce((s, r) => s + (Number(r.ValorVenda) || 0), 0);
    const qtd = filtered.length;
    const roi = totalCompra ? ((totalVenda - totalCompra) / totalCompra) * 100 : 0;
    return { totalCompra, totalFipe, totalVenda, qtd, roi };
  }, [filtered]);

  // Histogram KM ranges
  const kmHistogram = useMemo(() => {
    const ranges = [
      { key: '0-20k', min: 0, max: 20000 },
      { key: '20k-40k', min: 20000, max: 40000 },
      { key: '40k-60k', min: 40000, max: 60000 },
      { key: '60k-80k', min: 60000, max: 80000 },
      { key: '+80k', min: 80000, max: Infinity },
    ];
    const map = ranges.map((r) => ({ faixa: r.key, count: 0 }));
    filtered.forEach((rec) => {
      const km = Number(rec.KM) || 0;
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        if (km >= r.min && km < r.max) {
          map[i].count += 1;
          break;
        }
      }
    });
    return map;
  }, [filtered]);

  // Age at sale (months between DataCompra and DataVenda)
  const ageHistogram = useMemo(() => {
    const ranges = [
      { key: '0-12m', min: 0, max: 12 },
      { key: '12-24m', min: 12, max: 24 },
      { key: '24-36m', min: 24, max: 36 },
      { key: '36-48m', min: 36, max: 48 },
      { key: '+48m', min: 48, max: Infinity },
    ];
    const map = ranges.map((r) => ({ faixa: r.key, count: 0 }));
    filtered.forEach((rec) => {
      const dc = rec.DataCompra ? new Date(rec.DataCompra) : null;
      const dv = rec.DataVenda ? new Date(rec.DataVenda) : null;
      if (!dc || !dv) return;
      const months = Math.round((dv.getTime() - dc.getTime()) / (1000 * 60 * 60 * 24 * 30));
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        if (months >= r.min && months < r.max) {
          map[i].count += 1;
          break;
        }
      }
    });
    return map;
  }, [filtered]);

  // Monthly aggregation
  const monthlyData = useMemo(() => {
    const map: Record<string, { totalVenda: number; count: number }> = {};
    filtered.forEach((r) => {
      if (!r.DataVenda) return;
      const d = new Date(r.DataVenda);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[k]) map[k] = { totalVenda: 0, count: 0 };
      map[k].totalVenda += Number(r.ValorVenda) || 0;
      map[k].count += 1;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => {
        const [y, m] = k.split('-');
        return {
          month: `${m}/${y.slice(2)}`,
          totalVenda: v.totalVenda,
          count: v.count,
        };
      });
  }, [filtered]);

  // Top models by volume
  const topModels = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      const m = r.Modelo || 'Unknown';
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  // ROI distribution
  const roiDistribution = useMemo(() => {
    const ranges = [
      { key: 'Prejuízo', min: -Infinity, max: 0 },
      { key: '0-10%', min: 0, max: 10 },
      { key: '10-20%', min: 10, max: 20 },
      { key: '20-30%', min: 20, max: 30 },
      { key: '+30%', min: 30, max: Infinity },
    ];
    const map = ranges.map((r) => ({ faixa: r.key, count: 0 }));
    filtered.forEach((rec) => {
      const vc = Number(rec.ValorCompra) || 0;
      const vv = Number(rec.ValorVenda) || 0;
      if (vc === 0) return;
      const roi = ((vv - vc) / vc) * 100;
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        if (roi >= r.min && roi < r.max) {
          map[i].count += 1;
          break;
        }
      }
    });
    return map;
  }, [filtered]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title className="text-slate-900">Vendas & Performance</Title>
          <Text className="mt-1 text-slate-500">Análise de vendas, ROI e perfil de desmobilização.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
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
              <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none" value={dateFrom || ''} onChange={(e) => setDateFrom(e.target.value || null)} />
              <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none" value={dateTo || ''} onChange={(e) => setDateTo(e.target.value || null)} />
            </div>
          </div>
          <div>
            <Text className="text-slate-500 text-xs mb-1">Modelo</Text>
            <select multiple size={3} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none" value={selectedModels} onChange={(e) => setSelectedModels(Array.from(e.target.selectedOptions).map(o => o.value))}>
              {modelos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setDateFrom(defaultDateFrom); setDateTo(defaultDateTo); setSelectedModels([]); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-sm transition-colors w-full"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-violet-500">
          <Text className="text-slate-500">Total Vendido</Text>
          <Metric className="text-slate-900">{fmtBRL(kpis.totalVenda)}</Metric>
        </Card>
        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-violet-500">
          <Text className="text-slate-500">Custo de Aquisição</Text>
          <Metric className="text-slate-900">{fmtBRL(kpis.totalCompra)}</Metric>
        </Card>
        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-violet-500">
          <Text className="text-slate-500">ROI Médio</Text>
          <Metric className={`${kpis.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{kpis.roi.toFixed(2)}%</Metric>
        </Card>
        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-violet-500">
          <Text className="text-slate-500">Veículos Vendidos</Text>
          <Metric className="text-slate-900">{kpis.qtd}</Metric>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <Title className="text-slate-900">Evolução de Vendas</Title>
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setChartMode('financeiro')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartMode === 'financeiro' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>Financeiro</button>
              <button onClick={() => setChartMode('volume')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartMode === 'volume' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>Volume</button>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorVenda" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => chartMode === 'financeiro' ? `R$${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area
                  type="monotone"
                  dataKey={chartMode === 'financeiro' ? 'totalVenda' : 'count'}
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorVenda)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-white shadow-sm border border-slate-200">
          <Title className="text-slate-900">Top 10 Modelos</Title>
          <div className="mt-4 h-80 overflow-y-auto pr-2">
            <BarList
              data={topModels}
              valueFormatter={(v) => `${v} vendas`}
              color="violet"
              className="mt-2"
            />
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white shadow-sm border border-slate-200">
          <Title className="text-slate-900">Distribuição por Quilometragem</Title>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kmHistogram} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="faixa" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" fill="#64748b" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-white shadow-sm border border-slate-200">
          <Title className="text-slate-900">Tempo de Estoque (Meses)</Title>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageHistogram} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="faixa" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#a78bfa" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" fill="#64748b" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ROI Distribution */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <Title className="text-slate-900">Distribuição de ROI</Title>
        <div className="h-72 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roiDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="faixa" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {roiDistribution.map((entry, index) => {
                  let color = '#8b5cf6'; // violet-500
                  if (entry.faixa === 'Prejuízo') color = '#ef4444'; // red-500
                  if (entry.faixa === '+30%') color = '#10b981'; // emerald-500
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
                <LabelList dataKey="count" position="top" fill="#64748b" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
