import { useMemo, useState } from 'react';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Wrench, Target, AlertTriangle, Gauge, Zap } from 'lucide-react';
import { calcStateDurationsDays } from '@/lib/analytics/fleetTimeline';

type AnyObject = { [k: string]: any };

interface EfficiencyTabProps {
  timeline: AnyObject[];
  filteredData: AnyObject[];
  frota: AnyObject[];
}

function fmtDecimal(v: number) { return new Intl.NumberFormat('pt-BR').format(v); }

const COLORS = {
  excellent: '#10b981',
  good: '#3b82f6',
  warning: '#f59e0b',
  critical: '#ef4444',
  neutral: '#94a3b8'
};

export default function EfficiencyTab({ timeline, filteredData, frota }: EfficiencyTabProps) {
  const [selectedRange, setSelectedRange] = useState<string | null>(null);

  // Agrupa eventos por placa
  const timelineGrouped = useMemo(() => {
    const placasFiltradas = new Set(filteredData.map(f => f.Placa).filter(Boolean));
    // Se filteredData estiver vazio, usar todas as placas da timeline
    const data = placasFiltradas.size > 0
      ? timeline.filter(t => placasFiltradas.has(t.Placa))
      : timeline;

    const grouped: Record<string, AnyObject[]> = {};
    data.forEach(item => {
      const placa = item.Placa;
      if (!placa) return;
      if (!grouped[placa]) grouped[placa] = [];
      grouped[placa].push(item);
    });

    return Object.entries(grouped).map(([placa, eventos]) => {
      const veiculoInfo = frota.find(f => f.Placa === placa) || filteredData.find(f => f.Placa === placa);
      return { placa, modelo: veiculoInfo?.Modelo || 'N/A', eventos };
    });
  }, [timeline, filteredData, frota]);

  // Calcula métricas de eficiência por veículo
  const vehicleMetrics = useMemo(() => {
    return timelineGrouped.map(({ placa, modelo, eventos }) => {
      const sortedEvents = [...eventos]
        .filter(e => !!(e.DataEvento || e.Data))
        .sort((a, b) => new Date(a.DataEvento || a.Data).getTime() - new Date(b.DataEvento || b.Data).getTime());

      const { totalDays, locacaoDays, manutencaoDays } = calcStateDurationsDays(sortedEvents);
      const disponibilidadeDays = Math.max(0, totalDays - locacaoDays - manutencaoDays);

      const utilization = totalDays > 0 ? Math.min(100, Math.max(0, (locacaoDays / totalDays) * 100)) : 0;
      const manutPct = totalDays > 0 ? Math.min(100, Math.max(0, (manutencaoDays / totalDays) * 100)) : 0;

      return {
        placa,
        modelo,
        totalDays: Math.round(totalDays),
        locacaoDays: Math.round(locacaoDays),
        manutencaoDays: Math.round(manutencaoDays),
        disponibilidadeDays: Math.round(disponibilidadeDays),
        utilization,
        manutPct,
        score: utilization - (manutPct * 0.5) // Score combinado
      };
    }).filter(m => m.totalDays > 0);
  }, [timelineGrouped]);

  // KPIs globais
  const kpis = useMemo(() => {
    if (vehicleMetrics.length === 0) {
      return { avgUtilization: 0, avgManutenction: 0, totalVehicles: 0, excellent: 0, good: 0, warning: 0, critical: 0 };
    }

    const avgUtilization = vehicleMetrics.reduce((sum, m) => sum + m.utilization, 0) / vehicleMetrics.length;
    const avgManutenction = vehicleMetrics.reduce((sum, m) => sum + m.manutencaoDays, 0) / vehicleMetrics.length;

    const ranges = {
      excellent: vehicleMetrics.filter(m => m.utilization >= 80).length,
      good: vehicleMetrics.filter(m => m.utilization >= 60 && m.utilization < 80).length,
      warning: vehicleMetrics.filter(m => m.utilization >= 40 && m.utilization < 60).length,
      critical: vehicleMetrics.filter(m => m.utilization < 40).length
    };

    return { 
      avgUtilization, 
      avgManutenction, 
      totalVehicles: vehicleMetrics.length,
      ...ranges
    };
  }, [vehicleMetrics]);

  // Distribuição de utilização
  const utilizationDistribution = useMemo(() => [
    { name: 'Excelente (80-100%)', value: kpis.excellent, color: COLORS.excellent },
    { name: 'Bom (60-79%)', value: kpis.good, color: COLORS.good },
    { name: 'Regular (40-59%)', value: kpis.warning, color: COLORS.warning },
    { name: 'Crítico (<40%)', value: kpis.critical, color: COLORS.critical }
  ].filter(d => d.value > 0), [kpis]);

  // Top/Bottom performers
  const topPerformers = useMemo(() => 
    [...vehicleMetrics].sort((a, b) => b.utilization - a.utilization).slice(0, 8)
  , [vehicleMetrics]);

  const bottomPerformers = useMemo(() => 
    [...vehicleMetrics].sort((a, b) => a.utilization - b.utilization).slice(0, 8)
  , [vehicleMetrics]);

  // Veículos mais tempo em manutenção
  const topMaintenance = useMemo(() => 
    [...vehicleMetrics].sort((a, b) => b.manutencaoDays - a.manutencaoDays).slice(0, 10)
  , [vehicleMetrics]);

  // Filtrar por range selecionado
  const filteredVehicles = useMemo(() => {
    if (!selectedRange) return vehicleMetrics;
    switch(selectedRange) {
      case 'excellent': return vehicleMetrics.filter(m => m.utilization >= 80);
      case 'good': return vehicleMetrics.filter(m => m.utilization >= 60 && m.utilization < 80);
      case 'warning': return vehicleMetrics.filter(m => m.utilization >= 40 && m.utilization < 60);
      case 'critical': return vehicleMetrics.filter(m => m.utilization < 40);
      default: return vehicleMetrics;
    }
  }, [vehicleMetrics, selectedRange]);

  if (timeline.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-200 flex items-center justify-center">
            <Activity className="w-10 h-10 text-slate-400" />
          </div>
          <Title className="text-slate-600">Sem Dados de Eficiência</Title>
          <Text className="mt-3 text-slate-500 max-w-md mx-auto">
            Nenhum evento de histórico foi encontrado. Verifique se o arquivo <code className="bg-slate-200 px-2 py-1 rounded text-xs">hist_vida_veiculo_timeline.json</code> está disponível no storage.
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* KPIs em cards modernos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg border-2 ${selectedRange === 'excellent' ? 'border-emerald-500 bg-emerald-50' : 'border-transparent'}`}
          onClick={() => setSelectedRange(selectedRange === 'excellent' ? null : 'excellent')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs uppercase tracking-wide">Excelente</Text>
              <Metric className="text-emerald-600">{kpis.excellent}</Metric>
              <Text className="text-xs text-slate-400">≥80% utilização</Text>
            </div>
          </div>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg border-2 ${selectedRange === 'good' ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`}
          onClick={() => setSelectedRange(selectedRange === 'good' ? null : 'good')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs uppercase tracking-wide">Bom</Text>
              <Metric className="text-blue-600">{kpis.good}</Metric>
              <Text className="text-xs text-slate-400">60-79% utilização</Text>
            </div>
          </div>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg border-2 ${selectedRange === 'warning' ? 'border-amber-500 bg-amber-50' : 'border-transparent'}`}
          onClick={() => setSelectedRange(selectedRange === 'warning' ? null : 'warning')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs uppercase tracking-wide">Regular</Text>
              <Metric className="text-amber-600">{kpis.warning}</Metric>
              <Text className="text-xs text-slate-400">40-59% utilização</Text>
            </div>
          </div>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg border-2 ${selectedRange === 'critical' ? 'border-rose-500 bg-rose-50' : 'border-transparent'}`}
          onClick={() => setSelectedRange(selectedRange === 'critical' ? null : 'critical')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs uppercase tracking-wide">Crítico</Text>
              <Metric className="text-rose-600">{kpis.critical}</Metric>
              <Text className="text-xs text-slate-400">&lt;40% utilização</Text>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Utilização */}
        <Card className="shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Title className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Distribuição de Utilização
            </Title>
            <Badge color="indigo">{kpis.totalVehicles} veículos</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={utilizationDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(data) => {
                    const range = data.name.includes('Excelente') ? 'excellent' 
                      : data.name.includes('Bom') ? 'good'
                      : data.name.includes('Regular') ? 'warning' : 'critical';
                    setSelectedRange(selectedRange === range ? null : range);
                  }}
                  cursor="pointer"
                >
                  {utilizationDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Veículos']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Manutenção */}
        <Card className="shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Title className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-600" />
              Mais Tempo em Manutenção
            </Title>
            <Text className="text-xs text-slate-500">Média: {kpis.avgManutenction.toFixed(0)} dias</Text>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMaintenance} layout="vertical" margin={{ left: 10, right: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="placa" type="category" width={85} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value} dias`, 'Em Manutenção']}
                  labelFormatter={(label) => `Placa: ${label}`}
                />
                <Bar dataKey="manutencaoDays" radius={[0, 6, 6, 0]} barSize={16}>
                  {topMaintenance.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.manutencaoDays > kpis.avgManutenction * 2 ? COLORS.critical : COLORS.warning} 
                    />
                  ))}
                  <LabelList dataKey="manutencaoDays" position="right" formatter={(v: number) => `${v}d`} fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top e Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <Title className="flex items-center gap-2 text-emerald-700">
              <Zap className="w-5 h-5" />
              Melhores Desempenhos
            </Title>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformers} layout="vertical" margin={{ left: 10, right: 60 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d1fae5" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="placa" type="category" width={85} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Utilização']}
                  labelFormatter={(label) => `Placa: ${label}`}
                />
                <Bar dataKey="utilization" radius={[0, 6, 6, 0]} barSize={18} fill={COLORS.excellent}>
                  <LabelList dataKey="utilization" position="right" formatter={(v: number) => `${v.toFixed(0)}%`} fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="shadow-lg bg-gradient-to-br from-rose-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <Title className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
              Veículos que Precisam de Atenção
            </Title>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bottomPerformers} layout="vertical" margin={{ left: 10, right: 60 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#fee2e2" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="placa" type="category" width={85} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Utilização']}
                  labelFormatter={(label) => `Placa: ${label}`}
                />
                <Bar dataKey="utilization" radius={[0, 6, 6, 0]} barSize={18}>
                  {bottomPerformers.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.utilization < 40 ? COLORS.critical : COLORS.warning} 
                    />
                  ))}
                  <LabelList dataKey="utilization" position="right" formatter={(v: number) => `${v.toFixed(0)}%`} fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tabela detalhada */}
      {selectedRange && (
        <Card className="shadow-lg overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Title>Veículos Filtrados</Title>
              <Badge color={selectedRange === 'excellent' ? 'emerald' : selectedRange === 'good' ? 'blue' : selectedRange === 'warning' ? 'amber' : 'rose'}>
                {filteredVehicles.length} veículos
              </Badge>
            </div>
            <button 
              onClick={() => setSelectedRange(null)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Limpar filtro ×
            </button>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Placa</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Modelo</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Utilização</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Dias Locado</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Dias Manutenção</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Dias Disponível</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVehicles.slice(0, 50).map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{v.placa}</td>
                    <td className="px-4 py-3 text-slate-700">{v.modelo}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        v.utilization >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        v.utilization >= 60 ? 'bg-blue-100 text-blue-700' :
                        v.utilization >= 40 ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {v.utilization.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{fmtDecimal(v.locacaoDays)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{fmtDecimal(v.manutencaoDays)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmtDecimal(v.disponibilidadeDays)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
