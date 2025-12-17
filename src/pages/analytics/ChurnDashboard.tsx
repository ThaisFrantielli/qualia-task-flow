import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, ComposedChart, Line } from 'recharts';
import { TrendingDown, UserMinus, DollarSign, Filter, X, Clock, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function parseNum(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number): string { if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`; return `R$ ${(v / 1000).toFixed(0)}k`; }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

const COLORS = ['#ef4444', '#f59e0b', '#64748b', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function ChurnDashboard(): JSX.Element {
  // Nova fonte de dados do ETL v33
  const { data: rawChurn } = useBIData<AnyObject[]>('fat_churn.json');
  const { data: rawContratos } = useBIData<AnyObject[]>('dim_contratos.json');

  const churn = useMemo(() => {
    const raw = (rawChurn as any)?.data || rawChurn || [];
    return Array.isArray(raw) ? raw : [];
  }, [rawChurn]);

  const contratos = useMemo(() => {
    const raw = (rawContratos as any)?.data || rawContratos || [];
    return Array.isArray(raw) ? raw : [];
  }, [rawContratos]);

  const [selectedMotivo, setSelectedMotivo] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const hasActiveFilters = !!selectedMotivo;
  const clearFilters = () => setSelectedMotivo(null);

  // Filtrar churn
  const filteredChurn = useMemo(() => {
    return churn.filter(r => {
      if (selectedMotivo && r.MotivoEncerramento !== selectedMotivo) return false;
      return true;
    });
  }, [churn, selectedMotivo]);

  // KPIs
  const kpis = useMemo(() => {
    const totalEncerrados = filteredChurn.length;
    const valorMensalPerdido = filteredChurn.reduce((s, c) => s + parseCurrency(c.ValorMensal), 0);
    const duracaoMedia = filteredChurn.length > 0
      ? filteredChurn.reduce((s, c) => s + parseNum(c.DuracaoMeses), 0) / filteredChurn.length
      : 0;

    // Contratos ativos para calcular churn rate
    const contratosAtivos = contratos.filter(c => c.Status === 'Ativo').length;
    const churnRate = contratosAtivos > 0 ? (totalEncerrados / contratosAtivos) * 100 : 0;

    return { totalEncerrados, valorMensalPerdido, duracaoMedia, churnRate, contratosAtivos };
  }, [filteredChurn, contratos]);

  // Evolução mensal de cancelamentos
  const evolutionData = useMemo(() => {
    const map: Record<string, { cancelados: number; valor: number }> = {};
    filteredChurn.forEach(r => {
      const k = getMonthKey(r.DataEncerramento);
      if (!k) return;
      if (!map[k]) map[k] = { cancelados: 0, valor: 0 };
      map[k].cancelados += 1;
      map[k].valor += parseCurrency(r.ValorMensal);
    });
    return Object.keys(map).sort().slice(-12).map(k => ({
      date: k,
      label: monthLabel(k),
      Cancelados: map[k].cancelados,
      ValorPerdido: map[k].valor
    }));
  }, [filteredChurn]);

  // Motivos de cancelamento
  const motivosData = useMemo(() => {
    const map: Record<string, { count: number; valor: number }> = {};
    filteredChurn.forEach(r => {
      const m = r.MotivoEncerramento || 'Não Informado';
      if (!map[m]) map[m] = { count: 0, valor: 0 };
      map[m].count += 1;
      map[m].valor += parseCurrency(r.ValorMensal);
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, value: data.count, valor: data.valor }))
      .sort((a, b) => b.value - a.value);
  }, [filteredChurn]);

  // Distribuição por duração de contrato
  const duracaoData = useMemo(() => {
    const ranges = { '0-6 meses': 0, '6-12 meses': 0, '12-24 meses': 0, '24-36 meses': 0, '+36 meses': 0 };
    filteredChurn.forEach(c => {
      const d = parseNum(c.DuracaoMeses);
      if (d <= 6) ranges['0-6 meses']++;
      else if (d <= 12) ranges['6-12 meses']++;
      else if (d <= 24) ranges['12-24 meses']++;
      else if (d <= 36) ranges['24-36 meses']++;
      else ranges['+36 meses']++;
    });
    return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  }, [filteredChurn]);

  // Ranking de clientes com mais cancelamentos
  const topClientesChurn = useMemo(() => {
    const map: Record<string, { count: number; valor: number }> = {};
    filteredChurn.forEach(c => {
      const cliente = c.Cliente || 'N/A';
      if (!map[cliente]) map[cliente] = { count: 0, valor: 0 };
      map[cliente].count += 1;
      map[cliente].valor += parseCurrency(c.ValorMensal);
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, count: data.count, valor: data.valor }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredChurn]);

  // Tabela paginada
  const tableData = useMemo(() => {
    return [...filteredChurn].sort((a, b) => (b.DataEncerramento || '').localeCompare(a.DataEncerramento || ''));
  }, [filteredChurn]);

  const pageItems = tableData.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-slate-900">Análise de Churn</Title>
          <Text className="text-slate-500">Cancelamentos, Motivos e Impacto Financeiro</Text>
        </div>
        <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full flex gap-2 font-medium">
          <TrendingDown className="w-4 h-4" /> {kpis.totalEncerrados} Cancelados
        </div>
      </div>

      {/* Floating Clear Button */}
      {hasActiveFilters && (
        <div className="fixed bottom-8 right-8 z-50">
          <button onClick={clearFilters} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105">
            <X className="w-5 h-5" /> Limpar Filtros
          </button>
        </div>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <Card className="bg-rose-50 border-rose-200 py-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-rose-600" />
            <Text className="font-medium text-rose-700">Filtro Ativo:</Text>
            <span className="bg-rose-100 px-2 py-1 rounded text-xs text-rose-800">Motivo: {selectedMotivo}</span>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="rose">
          <div className="flex items-center gap-2 mb-2">
            <UserMinus className="w-4 h-4 text-rose-600" />
            <Text>Contratos Cancelados</Text>
          </div>
          <Metric>{kpis.totalEncerrados}</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <Text>Churn Rate</Text>
          </div>
          <Metric>{kpis.churnRate.toFixed(1)}%</Metric>
          <Text className="text-xs text-slate-400">de {kpis.contratosAtivos} ativos</Text>
        </Card>
        <Card decoration="top" decorationColor="indigo">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-indigo-600" />
            <Text>Receita Mensal Perdida</Text>
          </div>
          <Metric>{fmtCompact(kpis.valorMensalPerdido)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="cyan">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-cyan-600" />
            <Text>Duração Média</Text>
          </div>
          <Metric>{kpis.duracaoMedia.toFixed(1)} meses</Metric>
        </Card>
      </div>

      <Tabs defaultValue="evolucao" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          <TabsTrigger value="motivos">Motivos</TabsTrigger>
          <TabsTrigger value="duracao">Tempo de Casa</TabsTrigger>
          <TabsTrigger value="detalhamento">Detalhamento</TabsTrigger>
        </TabsList>

        <TabsContent value="evolucao" className="space-y-6">
          <Card>
            <Title>Evolução de Cancelamentos (12 meses)</Title>
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis yAxisId="left" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={fmtCompact} />
                  <Tooltip formatter={(v: any, name: string) => [name === 'ValorPerdido' ? fmtBRL(v) : v, name === 'ValorPerdido' ? 'Valor Perdido' : 'Cancelados']} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="Cancelados" fill="#ef4444" radius={[4, 4, 0, 0]} name="Cancelados" />
                  <Line yAxisId="right" type="monotone" dataKey="ValorPerdido" stroke="#8b5cf6" strokeWidth={2} name="Valor Perdido" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="motivos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Motivos de Cancelamento (Clique para filtrar)</Title>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={motivosData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      onClick={(d) => setSelectedMotivo(selectedMotivo === d.name ? null : d.name)}
                      cursor="pointer"
                    >
                      {motivosData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <Title>Impacto por Motivo</Title>
              <div className="mt-4 space-y-3 h-80 overflow-y-auto">
                {motivosData.map((item, idx) => {
                  const isSelected = selectedMotivo === item.name;
                  const maxVal = motivosData[0]?.value || 1;
                  const width = `${(item.value / maxVal) * 100}%`;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedMotivo(isSelected ? null : item.name)}
                      className={`p-3 rounded cursor-pointer transition-colors ${isSelected ? 'bg-rose-50 ring-1 ring-rose-200' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`font-medium ${isSelected ? 'text-rose-700' : 'text-slate-700'}`}>{item.name}</span>
                        <div className="flex gap-4">
                          <span className="text-slate-500">{item.value} contratos</span>
                          <span className="font-bold text-rose-600">{fmtCompact(item.valor)}/mês</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${isSelected ? 'bg-rose-500' : 'bg-rose-400'}`} style={{ width }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="duracao" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Distribuição por Tempo de Contrato</Title>
              <Text className="text-slate-500 mb-4">Quanto tempo os contratos cancelados duraram</Text>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={duracaoData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <Title>Top 10 Clientes com Mais Cancelamentos</Title>
              <div className="mt-4 space-y-2 h-72 overflow-y-auto">
                {topClientesChurn.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-2 rounded hover:bg-slate-50 border-b last:border-0">
                    <div>
                      <span className="font-medium text-slate-700">{idx + 1}. {item.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{item.count} cancelamentos</span>
                    </div>
                    <span className="font-bold text-rose-600">{fmtCompact(item.valor)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detalhamento">
          <Card>
            <Title className="mb-4">Histórico de Cancelamentos</Title>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Placa</th>
                    <th className="p-3 text-center">Duração</th>
                    <th className="p-3 text-right">Valor Mensal</th>
                    <th className="p-3">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pageItems.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3">{r.DataEncerramento ? new Date(r.DataEncerramento).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="p-3 font-medium truncate max-w-[200px]">{r.Cliente}</td>
                      <td className="p-3 font-mono">{r.Placa}</td>
                      <td className="p-3 text-center">{r.DuracaoMeses || 0} meses</td>
                      <td className="p-3 text-right font-bold text-rose-600">{fmtBRL(parseCurrency(r.ValorMensal))}</td>
                      <td className="p-3 text-slate-500 truncate max-w-[150px]">{r.MotivoEncerramento || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between mt-4 border-t pt-4">
              <Text className="text-sm">Página {page + 1} de {Math.ceil(tableData.length / pageSize)}</Text>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">←</button>
                <button onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= tableData.length} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">→</button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
