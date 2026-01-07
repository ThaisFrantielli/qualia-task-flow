import { useMemo } from 'react';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { 
  ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, 
  ReferenceLine, AreaChart, Area, Cell
} from 'recharts';
import { Clock, Target, AlertCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import useBIData from '@/hooks/useBIData';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';

type ManutencaoUnificado = {
  Ocorrencia: number;
  Placa: string;
  Modelo: string;
  Fornecedor: string;
  Tipo: string;
  LeadTimeTotalDias: number;
  LeadTimeAgendamentoDias: number;
  LeadTimeOficinaDias: number;
  DataEntrada: string;
  CustoTotalOS: number;
};

// Metas padrão
const METAS = {
  leadTimeTotalDias: 5,
  leadTimeAgendamentoDias: 1,
  leadTimeOficinaDias: 3,
  slaCumpridoPct: 85,
};

function fmtNum(v: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v);
}

// Calcula percentil de um array ordenado
function percentil(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Calcula outliers (valores > Q3 + 1.5*IQR)
function isOutlier(value: number, q1: number, q3: number): boolean {
  const iqr = q3 - q1;
  return value > q3 + 1.5 * iqr;
}

export default function LeadTimeTabNew() {
  const { filters } = useMaintenanceFilters();

  // Carregar dados
  const { data: manutencoes, loading } = useBIData<ManutencaoUnificado[]>('fat_manutencao_unificado.json');

  // Filtrar dados conforme contexto
  const dadosFiltrados = useMemo(() => {
    if (!manutencoes?.length) return [];

    let filtered = manutencoes;

    if (filters.fornecedores?.length > 0) {
      filtered = filtered.filter(m => filters.fornecedores.includes(m.Fornecedor));
    }
    if (filters.tiposOcorrencia?.length > 0) {
      filtered = filtered.filter(m => filters.tiposOcorrencia.includes(m.Tipo));
    }
    if (filters.modelos?.length > 0) {
      filtered = filtered.filter(m => filters.modelos.some(modelo => 
        m.Modelo.toLowerCase().includes(modelo.toLowerCase())
      ));
    }

    return filtered;
  }, [manutencoes, filters]);

  // ========================================================================
  // KPIs COM COMPARAÇÃO ÀS METAS
  // ========================================================================
  const kpis = useMemo(() => {
    if (!dadosFiltrados.length) {
      return {
        leadTimeTotal: 0,
        leadTimeAgendamento: 0,
        leadTimeOficina: 0,
        slaCumpridoPct: 0,
        desvioMetaTotal: 0,
        desvioMetaAgendamento: 0,
        desvioMetaOficina: 0,
        desvioSLA: 0,
      };
    }

    const validosTotal = dadosFiltrados.filter(m => m.LeadTimeTotalDias > 0);
    const validosAgend = dadosFiltrados.filter(m => m.LeadTimeAgendamentoDias > 0);
    const validosOficina = dadosFiltrados.filter(m => m.LeadTimeOficinaDias > 0);

    const leadTimeTotal = validosTotal.reduce((sum, m) => sum + m.LeadTimeTotalDias, 0) / (validosTotal.length || 1);
    const leadTimeAgendamento = validosAgend.reduce((sum, m) => sum + m.LeadTimeAgendamentoDias, 0) / (validosAgend.length || 1);
    const leadTimeOficina = validosOficina.reduce((sum, m) => sum + m.LeadTimeOficinaDias, 0) / (validosOficina.length || 1);

    const dentroSLA = validosTotal.filter(m => m.LeadTimeTotalDias <= METAS.leadTimeTotalDias).length;
    const slaCumpridoPct = (dentroSLA / (validosTotal.length || 1)) * 100;

    return {
      leadTimeTotal,
      leadTimeAgendamento,
      leadTimeOficina,
      slaCumpridoPct,
      desvioMetaTotal: leadTimeTotal - METAS.leadTimeTotalDias,
      desvioMetaAgendamento: leadTimeAgendamento - METAS.leadTimeAgendamentoDias,
      desvioMetaOficina: leadTimeOficina - METAS.leadTimeOficinaDias,
      desvioSLA: slaCumpridoPct - METAS.slaCumpridoPct,
    };
  }, [dadosFiltrados]);

  // ========================================================================
  // DISTRIBUIÇÃO COM PERCENTILES P50, P75, P90, P95
  // ========================================================================
  const distribuicaoData = useMemo(() => {
    if (!dadosFiltrados.length) return { histograma: [], percentiles: {} };

    const leadTimes = dadosFiltrados
      .filter(m => m.LeadTimeTotalDias > 0 && m.LeadTimeTotalDias < 60)
      .map(m => m.LeadTimeTotalDias);

    if (!leadTimes.length) return { histograma: [], percentiles: {} };

    // Histograma (bins de 2 dias)
    const bins: Record<string, number> = {};
    const maxBin = 30; // até 30 dias
    for (let i = 0; i < maxBin; i += 2) {
      bins[`${i}-${i + 2}d`] = 0;
    }
    bins['30+ dias'] = 0;

    leadTimes.forEach(lt => {
      if (lt >= 30) {
        bins['30+ dias']++;
      } else {
        const binIndex = Math.floor(lt / 2) * 2;
        const binKey = `${binIndex}-${binIndex + 2}d`;
        if (bins[binKey] !== undefined) bins[binKey]++;
      }
    });

    const histograma = Object.entries(bins).map(([range, count]) => ({ range, count }));

    // Percentiles
    const p50 = percentil(leadTimes, 50);
    const p75 = percentil(leadTimes, 75);
    const p90 = percentil(leadTimes, 90);
    const p95 = percentil(leadTimes, 95);

    return {
      histograma,
      percentiles: { p50: p50 || 0, p75: p75 || 0, p90: p90 || 0, p95: p95 || 0 },
    };
  }, [dadosFiltrados]);

  // ========================================================================
  // BOX PLOT POR FORNECEDOR (min, Q1, median, Q3, max + outliers)
  // ========================================================================
  const boxPlotData = useMemo(() => {
    if (!dadosFiltrados.length) return [];

    const porFornecedor = dadosFiltrados.reduce((acc, m) => {
      if (m.LeadTimeTotalDias > 0 && m.LeadTimeTotalDias < 60) {
        if (!acc[m.Fornecedor]) {
          acc[m.Fornecedor] = [];
        }
        acc[m.Fornecedor].push(m.LeadTimeTotalDias);
      }
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(porFornecedor)
      .filter(([_, values]) => values.length >= 5) // Mínimo 5 OS
      .map(([fornecedor, values]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = percentil(sorted, 25);
        const median = percentil(sorted, 50);
        const q3 = percentil(sorted, 75);
        const min = Math.min(...sorted);
        const max = Math.max(...sorted);

        // Outliers
        const outliers = sorted.filter(v => isOutlier(v, q1, q3));

        return {
          fornecedor: fornecedor.substring(0, 20), // Limitar nome
          min,
          q1,
          median,
          q3,
          max,
          outliers,
          count: values.length,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 fornecedores
  }, [dadosFiltrados]);

  // ========================================================================
  // EVOLUÇÃO MENSAL - % DENTRO DO SLA
  // ========================================================================
  const evolucaoSLA = useMemo(() => {
    if (!dadosFiltrados.length) return [];

    const porMes = dadosFiltrados.reduce((acc, m) => {
      const mes = new Date(m.DataEntrada).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' });
      if (!acc[mes]) {
        acc[mes] = { total: 0, dentroSLA: 0 };
      }
      acc[mes].total++;
      if (m.LeadTimeTotalDias <= METAS.leadTimeTotalDias) {
        acc[mes].dentroSLA++;
      }
      return acc;
    }, {} as Record<string, { total: number; dentroSLA: number }>);

    return Object.entries(porMes)
      .map(([mes, { total, dentroSLA }]) => ({
        mes,
        pctSLA: (dentroSLA / total) * 100,
        total,
      }))
      .sort((a, b) => {
        const [mesA, anoA] = a.mes.split(' de ');
        const [mesB, anoB] = b.mes.split(' de ');
        return new Date(`${anoA}-${mesA}`).getTime() - new Date(`${anoB}-${mesB}`).getTime();
      });
  }, [dadosFiltrados]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <Text>Carregando análise de performance...</Text>
        </div>
      </div>
    );
  }

  if (!dadosFiltrados.length) {
    return (
      <Card className="text-center p-12">
        <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
        <Title>Sem Dados de Lead Time</Title>
        <Text className="mt-2">Ajuste os filtros ou execute o ETL</Text>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Title>Performance & SLA - Benchmarks</Title>
        <Text>Análise de cumprimento de metas, distribuição estatística e comparação entre fornecedores</Text>
      </div>

      {/* KPIs com Comparação às Metas */}
      <TooltipProvider>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Lead Time Total */}
          <Card decoration="top" decorationColor={kpis.desvioMetaTotal > 0 ? "red" : "green"}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <Text>Lead Time Total</Text>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold">Tempo Médio Total</p>
                      <p className="text-xs mt-1">Média de dias entre abertura e conclusão da OS.</p>
                      <p className="text-xs mt-1 font-mono">Fórmula: AVG(LeadTimeTotalDias)</p>
                      <p className="text-xs mt-1 text-amber-600">Meta: 5 dias</p>
                      <p className="text-xs mt-1 text-amber-600">Objetivo: Manter indisponibilidade dentro do aceitável</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              <Metric className="mt-2">{fmtNum(kpis.leadTimeTotal)}d</Metric>
              <div className="flex items-center gap-2 mt-1">
                <Text className="text-xs text-gray-500">Meta: {METAS.leadTimeTotalDias}d</Text>
                {kpis.desvioMetaTotal > 0 ? (
                  <Badge color="red" size="xs">+{fmtNum(kpis.desvioMetaTotal)}d</Badge>
                ) : (
                  <Badge color="green" size="xs">{fmtNum(kpis.desvioMetaTotal)}d</Badge>
                )}
              </div>
            </div>
            <Clock className={`w-8 h-8 ${kpis.desvioMetaTotal > 0 ? 'text-red-500' : 'text-green-500'}`} />
          </div>
        </Card>

        {/* Agendamento */}
        <Card decoration="top" decorationColor={kpis.desvioMetaAgendamento > 0 ? "yellow" : "green"}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1">
                <Text>Agendamento</Text>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">Tempo Médio de Agendamento</p>
                    <p className="text-xs mt-1">Média de dias entre abertura da OS e agendamento com fornecedor.</p>
                    <p className="text-xs mt-1 font-mono">Fórmula: AVG(LeadTimeAgendamentoDias)</p>
                    <p className="text-xs mt-1 text-amber-600">Meta: 1 dia</p>
                    <p className="text-xs mt-1 text-amber-600">Objetivo: Agilizar início do processo de reparo</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Metric className="mt-2">{fmtNum(kpis.leadTimeAgendamento)}d</Metric>
              <div className="flex items-center gap-2 mt-1">
                <Text className="text-xs text-gray-500">Meta: {METAS.leadTimeAgendamentoDias}d</Text>
                {kpis.desvioMetaAgendamento > 0 ? (
                  <Badge color="yellow" size="xs">+{fmtNum(kpis.desvioMetaAgendamento)}d</Badge>
                ) : (
                  <Badge color="green" size="xs">{fmtNum(kpis.desvioMetaAgendamento)}d</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Oficina */}
        <Card decoration="top" decorationColor={kpis.desvioMetaOficina > 0 ? "yellow" : "green"}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1">
                <Text>Oficina</Text>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">Tempo Médio na Oficina</p>
                    <p className="text-xs mt-1">Média de dias que o veículo permanece na oficina até conclusão.</p>
                    <p className="text-xs mt-1 font-mono">Fórmula: AVG(LeadTimeOficinaDias)</p>
                    <p className="text-xs mt-1 text-amber-600">Meta: 3 dias</p>
                    <p className="text-xs mt-1 text-amber-600">Objetivo: Eficiência do fornecedor no reparo</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Metric className="mt-2">{fmtNum(kpis.leadTimeOficina)}d</Metric>
              <div className="flex items-center gap-2 mt-1">
                <Text className="text-xs text-gray-500">Meta: {METAS.leadTimeOficinaDias}d</Text>
                {kpis.desvioMetaOficina > 0 ? (
                  <Badge color="yellow" size="xs">+{fmtNum(kpis.desvioMetaOficina)}d</Badge>
                ) : (
                  <Badge color="green" size="xs">{fmtNum(kpis.desvioMetaOficina)}d</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* % SLA Cumprido */}
        <Card decoration="top" decorationColor={kpis.desvioSLA < 0 ? "red" : "green"}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1">
                <Text>% SLA Cumprido</Text>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">Percentual Dentro do SLA</p>
                    <p className="text-xs mt-1">Proporção de OS concluídas dentro do prazo estabelecido (5 dias).</p>
                    <p className="text-xs mt-1 font-mono">Fórmula: (COUNT(LeadTime ≤ 5d) / COUNT(Total)) × 100</p>
                    <p className="text-xs mt-1 text-amber-600">Meta: 85%</p>
                    <p className="text-xs mt-1 text-amber-600">Objetivo: Manter qualidade e previsibilidade do serviço</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Metric className="mt-2">{fmtNum(kpis.slaCumpridoPct)}%</Metric>
              <div className="flex items-center gap-2 mt-1">
                <Text className="text-xs text-gray-500">Meta: {METAS.slaCumpridoPct}%</Text>
                {kpis.desvioSLA < 0 ? (
                  <Badge color="red" size="xs">{fmtNum(kpis.desvioSLA)}%</Badge>
                ) : (
                  <Badge color="green" size="xs">+{fmtNum(kpis.desvioSLA)}%</Badge>
                )}
              </div>
            </div>
            <Target className={`w-8 h-8 ${kpis.desvioSLA < 0 ? 'text-red-500' : 'text-green-500'}`} />
          </div>
        </Card>
      </div>
      </TooltipProvider>

      {/* Distribuição com Percentiles */}
      <Card>
        <Title>Distribuição de Lead Time - Análise Estatística</Title>
        <Text className="mb-4">Histograma com marcadores de percentiles P50, P75, P90, P95</Text>

        <div className="mb-4 grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Text className="text-xs text-gray-600">P50 (Mediana)</Text>
            <Metric className="text-blue-600">{fmtNum(distribuicaoData.percentiles.p50 ?? 0)}d</Metric>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Text className="text-xs text-gray-600">P75 (3º Quartil)</Text>
            <Metric className="text-green-600">{fmtNum(distribuicaoData.percentiles.p75 ?? 0)}d</Metric>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <Text className="text-xs text-gray-600">P90 (Excelente)</Text>
            <Metric className="text-yellow-600">{fmtNum(distribuicaoData.percentiles.p90 ?? 0)}d</Metric>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <Text className="text-xs text-gray-600">P95 (Outlier Inf)</Text>
            <Metric className="text-red-600">{fmtNum(distribuicaoData.percentiles.p95 ?? 0)}d</Metric>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={distribuicaoData.histograma}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" fontSize={11} angle={-45} textAnchor="end" height={80} />
            <YAxis yAxisId="left" label={{ value: 'Quantidade', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Bar yAxisId="left" dataKey="count" name="Quantidade de OS" fill="#3b82f6">
              {distribuicaoData.histograma.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.range === '30+ dias' ? '#ef4444' : '#3b82f6'} />
              ))}
            </Bar>
            <ReferenceLine yAxisId="left" y={0} stroke="#000" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Box Plot por Fornecedor */}
      <Card>
        <Title>Comparação de Fornecedores - Box Plot</Title>
        <Text className="mb-4">Distribuição (min, Q1, mediana, Q3, max) + outliers por fornecedor</Text>

        <div className="overflow-x-auto">
          <div className="space-y-4 min-w-[600px]">
            {boxPlotData.map((forn) => (
              <div key={forn.fornecedor} className="relative">
                <div className="flex items-center gap-4">
                  <div className="w-40 flex-shrink-0">
                    <Text className="font-medium">{forn.fornecedor}</Text>
                    <Text className="text-xs text-gray-500">{forn.count} OS</Text>
                  </div>

                  {/* Box Plot Visual */}
                  <div className="flex-1 relative h-12">
                    <svg width="100%" height="48" className="overflow-visible">
                      {/* Linha min-max */}
                      <line 
                        x1={`${(forn.min / 30) * 100}%`} 
                        y1="24" 
                        x2={`${(forn.max / 30) * 100}%`} 
                        y2="24" 
                        stroke="#94a3b8" 
                        strokeWidth="2" 
                      />

                      {/* Box Q1-Q3 */}
                      <rect 
                        x={`${(forn.q1 / 30) * 100}%`} 
                        y="12" 
                        width={`${((forn.q3 - forn.q1) / 30) * 100}%`} 
                        height="24" 
                        fill="#3b82f6" 
                        opacity="0.6" 
                        stroke="#1e40af" 
                        strokeWidth="2" 
                      />

                      {/* Mediana */}
                      <line 
                        x1={`${(forn.median / 30) * 100}%`} 
                        y1="12" 
                        x2={`${(forn.median / 30) * 100}%`} 
                        y2="36" 
                        stroke="#1e40af" 
                        strokeWidth="3" 
                      />

                      {/* Outliers */}
                      {forn.outliers.map((outlier, idx) => (
                        <circle 
                          key={idx} 
                          cx={`${(outlier / 30) * 100}%`} 
                          cy="24" 
                          r="3" 
                          fill="#ef4444" 
                        />
                      ))}
                    </svg>

                    {/* Escala */}
                    <div className="absolute -bottom-4 left-0 right-0 flex justify-between text-[10px] text-gray-400">
                      <span>0d</span>
                      <span>10d</span>
                      <span>20d</span>
                      <span>30d</span>
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="w-32 flex-shrink-0 text-right text-xs space-y-1">
                    <div><span className="text-gray-500">Min:</span> {fmtNum(forn.min)}d</div>
                    <div><span className="text-gray-500">Mediana:</span> <strong>{fmtNum(forn.median)}d</strong></div>
                    <div><span className="text-gray-500">Max:</span> {fmtNum(forn.max)}d</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Evolução % SLA */}
      <Card>
        <Title>Evolução do Cumprimento de SLA</Title>
        <Text className="mb-4">Tendência mensal de % de OS concluídas dentro do prazo (meta: {METAS.leadTimeTotalDias} dias)</Text>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={evolucaoSLA}>
            <defs>
              <linearGradient id="colorSLA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" fontSize={11} />
            <YAxis domain={[0, 100]} label={{ value: '%', position: 'insideLeft' }} />
            <RechartsTooltip formatter={(value: number) => [`${fmtNum(value)}%`, '% SLA']} />
            <ReferenceLine y={METAS.slaCumpridoPct} stroke="#ef4444" strokeDasharray="5 5" label="Meta 85%" />
            <Area 
              type="monotone" 
              dataKey="pctSLA" 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorSLA)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
