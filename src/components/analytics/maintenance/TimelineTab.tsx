import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { CalendarDays, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import useBIData from '@/hooks/useBIData';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';
import { Skeleton } from '@/components/ui/skeleton';

type OS = Record<string, any>;

function parseDateSafe(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

export default function TimelineTab() {
  const { data: rawData, loading } = useBIData<OS[]>('fat_manutencao_unificado');
  const { filters } = useMaintenanceFilters();
  const [granularity, setGranularity] = useState<'month' | 'week'>('month');

  const data = useMemo(() => {
    let items = Array.isArray(rawData) ? rawData : [];
    if (filters.dateRange?.from) {
      const from = filters.dateRange.from.getTime();
      const to = filters.dateRange.to?.getTime() || Date.now();
      items = items.filter(r => {
        const d = parseDateSafe(r.DataCriacao);
        return d && d.getTime() >= from && d.getTime() <= to;
      });
    }
    if (filters.status !== 'Todos') items = items.filter(r => (r.SituacaoOcorrencia || '').includes(filters.status));
    if (filters.fornecedores.length > 0) items = items.filter(r => filters.fornecedores.includes(r.Fornecedor));
    if (filters.tipos.length > 0) items = items.filter(r => filters.tipos.includes(r.Tipo));
    if (filters.clientes.length > 0) items = items.filter(r => filters.clientes.includes(r.NomeCliente));
    if (filters.placas.length > 0) items = items.filter(r => filters.placas.includes(r.Placa));
    return items;
  }, [rawData, filters]);

  // Timeline by month or week
  const timelineData = useMemo(() => {
    const map = new Map<string, { abertas: number; concluidas: number; canceladas: number }>();
    data.forEach(r => {
      const d = parseDateSafe(r.DataCriacao);
      if (!d) return;
      let key: string;
      if (granularity === 'month') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      }
      if (!map.has(key)) map.set(key, { abertas: 0, concluidas: 0, canceladas: 0 });
      const s = map.get(key)!;
      s.abertas++;
      const sit = String(r.SituacaoOcorrencia || '');
      if (sit.includes('Concluída') || sit.includes('Concluida')) s.concluidas++;
      if (sit.includes('Cancelada')) s.canceladas++;
    });
    return [...map.entries()]
      .map(([period, s]) => ({ period, ...s }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-24);
  }, [data, granularity]);

  // Trend comparison (current vs previous period)
  const trend = useMemo(() => {
    if (timelineData.length < 2) return null;
    const current = timelineData[timelineData.length - 1];
    const previous = timelineData[timelineData.length - 2];
    const diff = current.abertas - previous.abertas;
    const pct = previous.abertas > 0 ? Math.round((diff / previous.abertas) * 100) : 0;
    return { current: current.abertas, previous: previous.abertas, diff, pct };
  }, [timelineData]);

  // Types timeline
  const typeTimeline = useMemo(() => {
    const types = new Map<string, Map<string, number>>();
    data.forEach(r => {
      const d = parseDateSafe(r.DataCriacao);
      if (!d) return;
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const tipo = r.Tipo || 'Outros';
      if (!types.has(tipo)) types.set(tipo, new Map());
      const m = types.get(tipo)!;
      m.set(month, (m.get(month) || 0) + 1);
    });

    // Get top 5 types
    const typeTotals = [...types.entries()]
      .map(([name, months]) => ({ name, total: [...months.values()].reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Build chart data
    const months = [...new Set(data.map(r => {
      const d = parseDateSafe(r.DataCriacao);
      if (!d) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }).filter(Boolean))].sort().slice(-12);

    return {
      types: typeTotals.map(t => t.name),
      data: months.map(m => {
        const point: Record<string, any> = { month: m };
        typeTotals.forEach(t => {
          point[t.name] = types.get(t.name)?.get(m) || 0;
        });
        return point;
      }),
    };
  }, [data]);

  const TIPO_COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[350px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Main Timeline */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-500" /> Evolução Temporal
          </h3>
          <div className="flex items-center gap-2">
            {trend && (
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${trend.diff >= 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {trend.diff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(trend.pct)}% vs anterior
              </div>
            )}
            <div className="flex bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setGranularity('month')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${granularity === 'month' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setGranularity('week')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${granularity === 'week' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                Semanal
              </button>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={timelineData}>
            <defs>
              <linearGradient id="gradAbertas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradConcluidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="abertas" name="Abertas" stroke="#6366f1" fill="url(#gradAbertas)" strokeWidth={2} />
            <Area type="monotone" dataKey="concluidas" name="Concluídas" stroke="#10b981" fill="url(#gradConcluidas)" strokeWidth={2} />
            <Line type="monotone" dataKey="canceladas" name="Canceladas" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Type Evolution */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-500" /> Evolução por Tipo (Top 5)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={typeTimeline.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {typeTimeline.types.map((tipo, i) => (
              <Line key={tipo} type="monotone" dataKey={tipo} stroke={TIPO_COLORS[i]} strokeWidth={2} dot={{ r: 2 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {typeTimeline.types.map((tipo, i) => (
            <div key={tipo} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-1 rounded-full" style={{ backgroundColor: TIPO_COLORS[i] }} />
              {tipo}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
