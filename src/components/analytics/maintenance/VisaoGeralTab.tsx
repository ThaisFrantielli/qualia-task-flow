import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Wrench, CheckCircle, Clock, XCircle, TrendingUp, BarChart3 } from 'lucide-react';
import useBIData from '@/hooks/useBIData';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtCompactNumber } from '@/lib/analytics/formatters';

type OS = Record<string, any>;

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e0e7ff', '#818cf8', '#4f46e5', '#3730a3'];
const STATUS_COLORS: Record<string, string> = {
  'Ativa': '#f59e0b',
  'Concluída': '#10b981',
  'Cancelada': '#ef4444',
  'Aguardando Chegada': '#6366f1',
};

function parseDateSafe(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

export default function VisaoGeralTab() {
  const { data: rawData, loading } = useBIData<OS[]>('fat_manutencao_unificado');
  const { filters } = useMaintenanceFilters();

  const data = useMemo(() => {
    let items = Array.isArray(rawData) ? rawData : [];

    // Apply filters
    if (filters.dateRange?.from) {
      const from = filters.dateRange.from.getTime();
      const to = filters.dateRange.to?.getTime() || Date.now();
      items = items.filter(r => {
        const d = parseDateSafe(r.DataCriacao);
        return d && d.getTime() >= from && d.getTime() <= to;
      });
    }
    if (filters.status !== 'Todos') {
      items = items.filter(r => (r.SituacaoOcorrencia || '').includes(filters.status));
    }
    if (filters.fornecedores.length > 0) {
      items = items.filter(r => filters.fornecedores.includes(r.Fornecedor));
    }
    if (filters.tipos.length > 0) {
      items = items.filter(r => filters.tipos.includes(r.Tipo));
    }
    if (filters.clientes.length > 0) {
      items = items.filter(r => filters.clientes.includes(r.NomeCliente));
    }
    if (filters.etapas.length > 0) {
      items = items.filter(r => filters.etapas.includes(r.Etapa));
    }
    if (filters.placas.length > 0) {
      items = items.filter(r => filters.placas.includes(r.Placa));
    }

    return items;
  }, [rawData, filters]);

  // KPIs
  const totalOS = data.length;
  const ativas = data.filter(r => String(r.SituacaoOcorrencia || '').includes('Ativa')).length;
  const concluidas = data.filter(r => String(r.SituacaoOcorrencia || '').includes('Concluída') || String(r.SituacaoOcorrencia || '').includes('Concluida')).length;
  const canceladas = data.filter(r => String(r.SituacaoOcorrencia || '').includes('Cancelada')).length;
  const fornecedoresUnicos = new Set(data.map(r => r.Fornecedor).filter(Boolean)).size;
  const clientesUnicos = new Set(data.map(r => r.NomeCliente).filter(Boolean)).size;

  // Chart: By Type
  const byType = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      const tipo = r.Tipo || 'Não informado';
      map.set(tipo, (map.get(tipo) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  // Chart: By Status (Pie)
  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      const st = r.SituacaoOcorrencia || 'Não informado';
      map.set(st, (map.get(st) || 0) + 1);
    });
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [data]);

  // Chart: By Fornecedor (Top 10)
  const byFornecedor = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      const f = r.Fornecedor || 'Não informado';
      map.set(f, (map.get(f) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 22) + '...' : name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  // Chart: By Month
  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      const d = parseDateSafe(r.DataCriacao);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }, [data]);

  // Chart: By Etapa
  const byEtapa = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      const etapa = r.Etapa || 'Não informado';
      map.set(etapa, (map.get(etapa) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 17) + '...' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data]);

  // Chart: By Cidade (Top 8)
  const byCidade = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      const c = r.Cidade || 'Não informado';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-[200px] w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Total de OS', value: fmtCompactNumber(totalOS), icon: Wrench, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Ativas', value: fmtCompactNumber(ativas), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Concluídas', value: fmtCompactNumber(concluidas), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Canceladas', value: fmtCompactNumber(canceladas), icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Fornecedores', value: String(fornecedoresUnicos), icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Clientes', value: String(clientesUnicos), icon: BarChart3, color: 'text-sky-600', bg: 'bg-sky-50' },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${kpi.bg}`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Evolution + Status Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">📈 Evolução Mensal de OS</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="OS" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">📊 Por Situação</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name.slice(0, 12)} ${(percent * 100).toFixed(0)}%`}>
                {byStatus.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: By Type + By Fornecedor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">🔧 Top 10 Tipos de Ocorrência</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byType} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" name="OS" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">🏢 Top 10 Fornecedores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byFornecedor} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" name="OS" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: By Etapa + By Cidade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">📋 Por Etapa</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byEtapa}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="OS" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">📍 Top Cidades</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCidade} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" name="OS" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
