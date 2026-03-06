import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Trophy, TrendingUp, Clock } from 'lucide-react';
import useBIData from '@/hooks/useBIData';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';
import { Skeleton } from '@/components/ui/skeleton';

type OS = Record<string, any>;

function parseDateSafe(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function diffDays(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

export default function FornecedoresTab() {
  const { data: rawData, loading } = useBIData<OS[]>('fat_manutencao_unificado');
  const { filters } = useMaintenanceFilters();
  const [selectedFornecedor, setSelectedFornecedor] = useState<string | null>(null);

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
    if (filters.status !== 'Todos') {
      items = items.filter(r => (r.SituacaoOcorrencia || '').includes(filters.status));
    }
    if (filters.tipos.length > 0) items = items.filter(r => filters.tipos.includes(r.Tipo));
    if (filters.clientes.length > 0) items = items.filter(r => filters.clientes.includes(r.NomeCliente));
    if (filters.placas.length > 0) items = items.filter(r => filters.placas.includes(r.Placa));
    return items;
  }, [rawData, filters]);

  // Aggregate by fornecedor
  const fornecedorStats = useMemo(() => {
    const map = new Map<string, { total: number; concluidas: number; canceladas: number; leadTimes: number[] }>();
    data.forEach(r => {
      const f = r.Fornecedor || 'Não informado';
      if (!map.has(f)) map.set(f, { total: 0, concluidas: 0, canceladas: 0, leadTimes: [] });
      const s = map.get(f)!;
      s.total++;
      const sit = String(r.SituacaoOcorrencia || '');
      if (sit.includes('Concluída') || sit.includes('Concluida')) s.concluidas++;
      if (sit.includes('Cancelada')) s.canceladas++;
      const dCriacao = parseDateSafe(r.DataCriacao);
      const dConclusao = parseDateSafe(r.DataConclusaoOcorrencia || r.DataConclusaoServico);
      if (dCriacao && dConclusao) s.leadTimes.push(diffDays(dCriacao, dConclusao));
    });
    return [...map.entries()]
      .map(([name, s]) => ({
        name,
        shortName: name.length > 28 ? name.slice(0, 25) + '...' : name,
        total: s.total,
        concluidas: s.concluidas,
        canceladas: s.canceladas,
        taxaConclusao: s.total > 0 ? Math.round((s.concluidas / s.total) * 100) : 0,
        leadTimeMedio: s.leadTimes.length > 0 ? Math.round(s.leadTimes.reduce((a, b) => a + b, 0) / s.leadTimes.length) : null,
      }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const top15 = fornecedorStats.slice(0, 15);

  // Lead time ranking
  const leadTimeRanking = useMemo(() => {
    return fornecedorStats
      .filter(f => f.leadTimeMedio !== null && f.total >= 5)
      .sort((a, b) => (a.leadTimeMedio ?? 999) - (b.leadTimeMedio ?? 999))
      .slice(0, 10);
  }, [fornecedorStats]);

  // Evolução mensal do fornecedor selecionado
  const fornecedorTimeline = useMemo(() => {
    if (!selectedFornecedor) return [];
    const items = data.filter(r => r.Fornecedor === selectedFornecedor);
    const map = new Map<string, number>();
    items.forEach(r => {
      const d = parseDateSafe(r.DataCriacao);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }, [data, selectedFornecedor]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top 15 Fornecedores */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Ranking de Fornecedores (Top 15)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={top15} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="shortName" width={180} tick={{ fontSize: 10 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs">
                    <p className="font-semibold text-foreground mb-1">{d.name}</p>
                    <p>Total: <strong>{d.total}</strong></p>
                    <p>Concluídas: <strong>{d.concluidas}</strong> ({d.taxaConclusao}%)</p>
                    <p>Canceladas: <strong>{d.canceladas}</strong></p>
                    {d.leadTimeMedio !== null && <p>Lead Time Médio: <strong>{d.leadTimeMedio} dias</strong></p>}
                  </div>
                );
              }}
            />
            <Bar
              dataKey="total"
              name="Total OS"
              fill="#6366f1"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(d: any) => setSelectedFornecedor(d.name === selectedFornecedor ? null : d.name)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead Time Ranking */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" /> Lead Time Médio (Top 10 com ≥5 OS)
          </h3>
          <div className="space-y-2">
            {leadTimeRanking.map((f, i) => (
              <div key={f.name} className="flex items-center gap-2 text-sm">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-foreground truncate">{f.name}</span>
                <span className="font-mono font-semibold text-foreground">{f.leadTimeMedio} dias</span>
                <span className="text-xs text-muted-foreground">({f.total} OS)</span>
              </div>
            ))}
            {leadTimeRanking.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados suficientes</p>
            )}
          </div>
        </div>

        {/* Fornecedor Timeline */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            {selectedFornecedor ? `Evolução: ${selectedFornecedor.slice(0, 30)}` : 'Clique em um fornecedor para ver a evolução'}
          </h3>
          {selectedFornecedor && fornecedorTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={fornecedorTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" name="OS" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              {selectedFornecedor ? 'Sem dados no período' : 'Selecione um fornecedor no ranking acima'}
            </div>
          )}
        </div>
      </div>

      {/* Tabela comparativa */}
      <div className="bg-card border border-border rounded-xl p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-foreground mb-3">📊 Comparativo Detalhado</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 px-2 text-muted-foreground font-medium">#</th>
              <th className="py-2 px-2 text-muted-foreground font-medium">Fornecedor</th>
              <th className="py-2 px-2 text-muted-foreground font-medium text-right">Total</th>
              <th className="py-2 px-2 text-muted-foreground font-medium text-right">Concluídas</th>
              <th className="py-2 px-2 text-muted-foreground font-medium text-right">Taxa</th>
              <th className="py-2 px-2 text-muted-foreground font-medium text-right">Lead Time</th>
            </tr>
          </thead>
          <tbody>
            {fornecedorStats.slice(0, 20).map((f, i) => (
              <tr key={f.name} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                <td className="py-2 px-2 text-foreground font-medium truncate max-w-[250px]">{f.name}</td>
                <td className="py-2 px-2 text-right font-mono text-foreground">{f.total}</td>
                <td className="py-2 px-2 text-right font-mono text-emerald-600">{f.concluidas}</td>
                <td className="py-2 px-2 text-right">
                  <span className={`font-mono ${f.taxaConclusao >= 80 ? 'text-emerald-600' : f.taxaConclusao >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                    {f.taxaConclusao}%
                  </span>
                </td>
                <td className="py-2 px-2 text-right font-mono text-foreground">
                  {f.leadTimeMedio !== null ? `${f.leadTimeMedio}d` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
