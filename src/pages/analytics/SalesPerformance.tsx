import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, Filter, ArrowRightLeft } from 'lucide-react';

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
export default function SalesPerformance(): JSX.Element {
  const { data: vendasData } = useBIData<AnyObject[]>('vendas_*.json');

  const vendas = useMemo(() => {
    const raw = (vendasData as any)?.data || vendasData || [];
    return Array.isArray(raw) ? raw : [];
  }, [vendasData]);

  // State
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Base Filter (Global)
  const filteredData = useMemo(() => {
    return vendas.filter(r => {
      if (selectedModel && r.Modelo !== selectedModel) return false;
      if (selectedMonth && getMonthKey(r.DataVenda) !== selectedMonth) return false;
      return true;
    });
  }, [vendas, selectedModel, selectedMonth]);

  // KPIs
  const kpis = useMemo(() => {
    const totalVal = filteredData.reduce((s, r) => s + parseCurrency(r.ValorVenda), 0);
    const count = filteredData.length;
    const avgTicket = count > 0 ? totalVal / count : 0;

    // Avg Stock Time (DataVenda - DataCompra)
    let totalDays = 0;
    let validDaysCount = 0;
    filteredData.forEach(r => {
      if (r.DataVenda && r.DataCompra) {
        const d1 = new Date(r.DataVenda).getTime();
        const d2 = new Date(r.DataCompra).getTime();
        const diff = (d1 - d2) / (1000 * 60 * 60 * 24);
        if (diff >= 0) {
          totalDays += diff;
          validDaysCount++;
        }
      }
    });
    const avgStockTime = validDaysCount > 0 ? totalDays / validDaysCount : 0;

    return { totalVal, count, avgTicket, avgStockTime };
  }, [filteredData]);

  // Charts Data
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    // Use 'vendas' (unfiltered by month) to show full trend, but respect model filter
    const base = selectedModel ? vendas.filter(r => r.Modelo === selectedModel) : vendas;

    base.forEach(r => {
      const k = getMonthKey(r.DataVenda);
      if (!k) return;
      map[k] = (map[k] || 0) + parseCurrency(r.ValorVenda);
    });
    return Object.keys(map).sort().map(k => ({
      key: k,
      month: monthLabel(k),
      Valor: map[k]
    }));
  }, [vendas, selectedModel]);

  const modelData = useMemo(() => {
    const map: Record<string, number> = {};
    // Use 'vendas' (unfiltered by model) to show all models, but respect month filter
    const base = selectedMonth ? vendas.filter(r => getMonthKey(r.DataVenda) === selectedMonth) : vendas;

    base.forEach(r => {
      const m = r.Modelo || 'Outros';
      map[m] = (map[m] || 0) + parseCurrency(r.ValorVenda);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [vendas, selectedMonth]);

  // Insights
  const insights = useMemo(() => {
    const alerts = [];

    // Slow Turnover
    if (kpis.avgStockTime > 90) {
      alerts.push({
        type: 'warning',
        title: 'Giro Lento',
        msg: `O tempo médio de estoque é de ${kpis.avgStockTime.toFixed(0)} dias, acima do ideal de 90 dias.`
      });
    }

    return alerts;
  }, [kpis.avgStockTime]);

  // Handlers
  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const payload = data.activePayload[0].payload;
      if (payload && payload.key) {
        setSelectedMonth(prev => prev === payload.key ? null : payload.key);
      }
    }
  };

  const handleModelClick = (item: any) => {
    if (item && item.name) {
      setSelectedModel(prev => prev === item.name ? null : item.name);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Performance de Desmobilização</Title>
          <Text className="mt-1 text-slate-500">Análise de volume e eficiência na saída de ativos.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" /> Hub Desmobilização
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {(selectedMonth || selectedModel) && (
        <Card className="bg-white shadow-sm border border-slate-200 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filtros Ativos:</span>
            </div>
            <div className="flex gap-2">
              {selectedMonth && (
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                  Mês: {monthLabel(selectedMonth)}
                  <button onClick={() => setSelectedMonth(null)} className="hover:text-blue-900">×</button>
                </span>
              )}
              {selectedModel && (
                <span className="bg-violet-50 text-violet-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                  Modelo: {selectedModel}
                  <button onClick={() => setSelectedModel(null)} className="hover:text-violet-900">×</button>
                </span>
              )}
            </div>
            <button
              onClick={() => { setSelectedMonth(null); setSelectedModel(null); }}
              className="ml-auto text-xs text-slate-500 hover:text-slate-900 underline"
            >
              Limpar Tudo
            </button>
          </div>
        </Card>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((alert, idx) => (
            <div key={idx} className={`p-4 rounded-lg border flex items-start gap-3 ${alert.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
              {alert.type === 'warning' ? <AlertTriangle className="w-5 h-5 mt-0.5" /> : <TrendingUp className="w-5 h-5 mt-0.5" />}
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
        <Card decoration="top" decorationColor="violet" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Valor Total Desmobilizado</Text>
          <Metric className="text-slate-900">{fmtBRL(kpis.totalVal)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="violet" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Veículos</Text>
          <Metric className="text-slate-900">{kpis.count}</Metric>
        </Card>
        <Card decoration="top" decorationColor="blue" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Ticket Médio</Text>
          <Metric className="text-slate-900">{fmtBRL(kpis.avgTicket)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Tempo Médio Estoque</Text>
          <Metric className="text-slate-900">{kpis.avgStockTime.toFixed(0)} dias</Metric>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm">
          <Title className="text-slate-900">Evolução de Desmobilização</Title>
          <Text className="text-slate-500 text-sm mb-4">Clique nas barras para filtrar por mês.</Text>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${(v / 1000000).toFixed(1)}M`} stroke="#64748b" />
                <Tooltip formatter={(v: any) => fmtBRL(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="Valor" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={selectedMonth === entry.key ? '#7c3aed' : '#c4b5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <Title className="text-slate-900">Top Modelos</Title>
          <Text className="text-slate-500 text-sm mb-4">Clique para filtrar por modelo.</Text>
          <div className="mt-4 h-80 overflow-y-auto pr-2">
            <div className="space-y-2">
              {modelData.map((item) => (
                <div
                  key={item.name}
                  onClick={() => handleModelClick(item)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${selectedModel === item.name ? 'bg-violet-100' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedModel === item.name ? 'bg-violet-600' : 'bg-slate-300'}`} />
                    <span className={`text-sm ${selectedModel === item.name ? 'font-medium text-violet-900' : 'text-slate-600'}`}>{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">{fmtBRL(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
