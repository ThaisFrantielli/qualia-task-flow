import { useMemo, useState } from 'react';
import { Card, Text, Metric, Title, Badge } from '@tremor/react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, Cell, PieChart, Pie, Line,
  ComposedChart, LineChart
} from 'recharts';
import { Clock, TrendingUp, AlertTriangle, CheckCircle, Users, Filter, Activity } from 'lucide-react';
import useBIData from '@/hooks/useBIData';

// Tipos baseados nas queries ETL
type MovimentacaoOcorrencia = {
  Ocorrencia: number;
  Tipo: string;
  Motivo: string;
  Placa: string;
  Situacao: string;
  Etapa: string;
  DataEtapa: string;
  HorasAteConclusaoEtapa: number;
  DiasAteConclusaoEtapa: number;
  CriadoEm: string;
  Usuario: string;
  IsConcluida: boolean;
  IsCancelada: boolean;
  IsAberta: boolean;
};

type LeadTimeEtapa = {
  Ocorrencia: number;
  Tipo: string;
  Etapa: string;
  EtapaAnterior: string | null;
  DataEtapa: string;
  DataEtapaAnterior: string | null;
  TempoEntreEtapas_Minutos: number;
  TempoEntreEtapas_Horas: number;
  TempoEntreEtapas_Dias: number;
  OrdemEtapa: number;
  IsRetrabalho: boolean;
};

type FunilConversao = {
  Etapa: string;
  Tipo: string;
  TotalOcorrencias: number;
  TotalConcluidas: number;
  TotalCanceladas: number;
  TaxaConversao: number;
  TempoMedioAteEtapa_Dias: number;
  TempoMinimoAteEtapa_Dias: number;
  TempoMaximoAteEtapa_Dias: number;
};

type PerformanceUsuario = {
  Usuario: string;
  Etapa: string;
  Tipo: string;
  TotalProcessadas: number;
  TotalConcluidas: number;
  TotalCanceladas: number;
  TaxaConclusao: number;
  TaxaCancelamento: number;
  TempoMedio_Horas: number;
};

// Cores para etapas
const ETAPA_COLORS: Record<string, string> = {
  'Pré-Agendamento': '#3b82f6',
  'Confirmação de Agenda': '#8b5cf6',
  'Aguardando Chegada': '#06b6d4',
  'Aguardando Orçamento': '#f59e0b',
  'Orçamento em Análise': '#f97316',
  'Aguardando Aprovação': '#ef4444',
  'Serviço em Execução': '#10b981',
  'Aguardando Retirada do Veículo': '#14b8a6',
  'Aguardando Nota Fiscal': '#6366f1',
  'Ocorrência Finalizada': '#22c55e',
};

const TIPO_COLORS: Record<string, string> = {
  'Manutenção Preventiva': '#10b981',
  'Manutenção Corretiva': '#ef4444',
  'Sinistro': '#f97316',
  'Recall': '#8b5cf6',
};

function fmtNum(v: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v);
}

function fmtHoras(horas: number): string {
  if (horas < 24) return `${fmtNum(horas)}h`;
  const dias = Math.floor(horas / 24);
  const h = horas % 24;
  return `${dias}d ${Math.round(h)}h`;
}

export default function WorkflowTab() {
  const [tipoFiltro, setTipoFiltro] = useState<string>('Todos');

  // Carregar dados das 4 tabelas
  const { data: movimentacoesRaw, loading: loadingMov } = useBIData<MovimentacaoOcorrencia[]>('fat_movimentacao_ocorrencias.json');
  const { data: leadTimes, loading: loadingLead } = useBIData<LeadTimeEtapa[]>('agg_lead_time_etapas.json');
  const { data: funil, loading: loadingFunil } = useBIData<FunilConversao[]>('agg_funil_conversao.json');
  const { data: usuarios, loading: loadingUsers } = useBIData<PerformanceUsuario[]>('agg_performance_usuarios.json');

  // Filtrar apenas ocorrências de manutenção
  const movimentacoes = useMemo(() => {
    if (!movimentacoesRaw?.length) return [];
    return movimentacoesRaw.filter(m => 
      m.Tipo === 'Manutenção Preventiva' || m.Tipo === 'Manutenção Corretiva'
    );
  }, [movimentacoesRaw]);

  const loading = loadingMov || loadingLead || loadingFunil || loadingUsers;

  // KPIs principais
  const kpis = useMemo(() => {
    if (!movimentacoes?.length || !leadTimes?.length) {
      return {
        leadTimeTotal: 0,
        taxaConclusao: 0,
        taxaRetrabalho: 0,
        etapaGargalo: 'N/D',
        tempoGargalo: 0,
      };
    }

    // Lead time médio total (última etapa - primeira etapa)
    const ocorrencoesConcluidas = movimentacoes.filter(m => m.IsConcluida);
    const leadTimeTotal = ocorrencoesConcluidas.reduce((sum, m) => sum + (m.DiasAteConclusaoEtapa || 0), 0) / 
      (ocorrencoesConcluidas.length || 1);

    // Taxa de conclusão
    const totalOcorrencias = new Set(movimentacoes.map(m => m.Ocorrencia)).size;
    const totalConcluidas = new Set(movimentacoes.filter(m => m.IsConcluida).map(m => m.Ocorrencia)).size;
    const taxaConclusao = (totalConcluidas / (totalOcorrencias || 1)) * 100;

    // Taxa de retrabalho
    const totalRetrabalhos = leadTimes.filter(l => l.IsRetrabalho).length;
    const taxaRetrabalho = (totalRetrabalhos / (leadTimes.length || 1)) * 100;

    // Etapa gargalo (maior tempo médio)
    const temposPorEtapa = leadTimes.reduce((acc, l) => {
      if (!acc[l.Etapa]) acc[l.Etapa] = { total: 0, count: 0 };
      acc[l.Etapa].total += l.TempoEntreEtapas_Horas;
      acc[l.Etapa].count++;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    let etapaGargalo = 'N/D';
    let tempoGargalo = 0;
    Object.entries(temposPorEtapa).forEach(([etapa, { total, count }]) => {
      const media = total / count;
      if (media > tempoGargalo) {
        tempoGargalo = media;
        etapaGargalo = etapa;
      }
    });

    return { leadTimeTotal, taxaConclusao, taxaRetrabalho, etapaGargalo, tempoGargalo };
  }, [movimentacoes, leadTimes]);

  // Dados do funil com filtro de tipo
  const funilData = useMemo(() => {
    if (!funil?.length) return [];
    
    const filtered = tipoFiltro === 'Todos' ? funil : funil.filter(f => f.Tipo === tipoFiltro);
    
    // Agrupar por etapa (somar tipos)
    const grouped = filtered.reduce((acc, item) => {
      const existing = acc.find(a => a.Etapa === item.Etapa);
      if (existing) {
        existing.TotalOcorrencias += item.TotalOcorrencias;
        existing.TotalConcluidas += item.TotalConcluidas;
        existing.TotalCanceladas += item.TotalCanceladas;
        existing.TempoMedio = (existing.TempoMedio * existing.count + item.TempoMedioAteEtapa_Dias) / (existing.count + 1);
        existing.count++;
      } else {
        acc.push({
          Etapa: item.Etapa,
          TotalOcorrencias: item.TotalOcorrencias,
          TotalConcluidas: item.TotalConcluidas,
          TotalCanceladas: item.TotalCanceladas,
          TempoMedio: item.TempoMedioAteEtapa_Dias,
          count: 1,
        });
      }
      return acc;
    }, [] as Array<{ Etapa: string; TotalOcorrencias: number; TotalConcluidas: number; TotalCanceladas: number; TempoMedio: number; count: number }>);

    // Recalcular taxas de conversão
    return grouped.map(g => ({
      ...g,
      TaxaConversao: (g.TotalConcluidas / (g.TotalOcorrencias || 1)) * 100,
    })).sort((a, b) => b.TotalOcorrencias - a.TotalOcorrencias);
  }, [funil, tipoFiltro]);

  // Lead time por etapa (tempo médio entre etapas consecutivas)
  const leadTimeEtapaData = useMemo(() => {
    if (!leadTimes?.length) return [];

    const filtered = tipoFiltro === 'Todos' ? leadTimes : leadTimes.filter(l => l.Tipo === tipoFiltro);

    const grouped = filtered.reduce((acc, item) => {
      if (!item.EtapaAnterior) return acc; // Pular primeira etapa
      
      const key = `${item.EtapaAnterior} → ${item.Etapa}`;
      if (!acc[key]) {
        acc[key] = { total: 0, count: 0, etapaOrigem: item.EtapaAnterior, etapaDestino: item.Etapa };
      }
      acc[key].total += item.TempoEntreEtapas_Horas;
      acc[key].count++;
      return acc;
    }, {} as Record<string, { total: number; count: number; etapaOrigem: string; etapaDestino: string }>);

    return Object.entries(grouped)
      .map(([transicao, { total, count }]) => ({
        transicao,
        tempoMedio: total / count,
      }))
      .sort((a, b) => b.tempoMedio - a.tempoMedio)
      .slice(0, 10); // Top 10 transições mais lentas
  }, [leadTimes, tipoFiltro]);

  // Distribuição por tipo de manutenção
  const distribuicaoTipo = useMemo(() => {
    if (!movimentacoes?.length) return [];

    const ocorrenciasPorTipo = movimentacoes.reduce((acc, m) => {
      if (!acc[m.Tipo]) {
        acc[m.Tipo] = new Set<number>();
      }
      acc[m.Tipo].add(m.Ocorrencia);
      return acc;
    }, {} as Record<string, Set<number>>);

    return Object.entries(ocorrenciasPorTipo).map(([tipo, ocorrencias]) => ({
      name: tipo,
      value: ocorrencias.size,
    }));
  }, [movimentacoes]);

  // Top 10 usuários por velocidade (menor tempo médio)
  const topUsuarios = useMemo(() => {
    if (!usuarios?.length) return [];

    const filtered = tipoFiltro === 'Todos' ? usuarios : usuarios.filter(u => u.Tipo === tipoFiltro);

    // Agrupar por usuário (somar todas etapas)
    const grouped = filtered.reduce((acc, u) => {
      if (!acc[u.Usuario]) {
        acc[u.Usuario] = { 
          total: 0, 
          count: 0, 
          totalProcessadas: 0, 
          totalConcluidas: 0,
          taxaConclusao: 0,
        };
      }
      acc[u.Usuario].total += u.TempoMedio_Horas * u.TotalProcessadas;
      acc[u.Usuario].count += u.TotalProcessadas;
      acc[u.Usuario].totalProcessadas += u.TotalProcessadas;
      acc[u.Usuario].totalConcluidas += u.TotalConcluidas;
      return acc;
    }, {} as Record<string, { total: number; count: number; totalProcessadas: number; totalConcluidas: number; taxaConclusao: number }>);

    return Object.entries(grouped)
      .map(([usuario, { total, count, totalProcessadas, totalConcluidas }]) => ({
        usuario,
        tempoMedio: total / count,
        totalProcessadas,
        taxaConclusao: (totalConcluidas / (totalProcessadas || 1)) * 100,
      }))
      .filter(u => u.totalProcessadas >= 5) // Mínimo 5 ocorrências
      .sort((a, b) => a.tempoMedio - b.tempoMedio)
      .slice(0, 10);
  }, [usuarios, tipoFiltro]);

  // Filtros de tipo disponíveis
  const tiposDisponiveis = useMemo(() => {
    if (!movimentacoes?.length) return ['Todos'];
    const tipos = Array.from(new Set(movimentacoes.map(m => m.Tipo)));
    return ['Todos', ...tipos];
  }, [movimentacoes]);

  // ========================================================================
  // NOVO: Heatmap de Transições entre Etapas
  // ========================================================================
  const ETAPAS_ORDEM = [
    'Pré-Agendamento',
    'Confirmação de Agenda',
    'Aguardando Chegada',
    'Aguardando Orçamento',
    'Orçamento em Análise',
    'Aguardando Aprovação',
    'Serviço em Execução',
    'Aguardando Retirada do Veículo',
    'Aguardando Nota Fiscal',
    'Ocorrência Finalizada',
  ];

  const heatmapData = useMemo(() => {
    if (!leadTimes?.length) return [];

    const filtered = tipoFiltro === 'Todos' ? leadTimes : leadTimes.filter(l => l.Tipo === tipoFiltro);

    // Matriz de transições: origem → destino
    const matriz = ETAPAS_ORDEM.reduce((acc, origem) => {
      acc[origem] = ETAPAS_ORDEM.reduce((acc2, destino) => {
        acc2[destino] = { count: 0, tempoTotal: 0 };
        return acc2;
      }, {} as Record<string, { count: number; tempoTotal: number }>);
      return acc;
    }, {} as Record<string, Record<string, { count: number; tempoTotal: number }>>);

    // Preencher matriz
    filtered.forEach(lt => {
      if (lt.EtapaAnterior && matriz[lt.EtapaAnterior] && matriz[lt.EtapaAnterior][lt.Etapa]) {
        matriz[lt.EtapaAnterior][lt.Etapa].count++;
        matriz[lt.EtapaAnterior][lt.Etapa].tempoTotal += lt.TempoEntreEtapas_Horas;
      }
    });

    // Converter para array flat para renderização
    const result: Array<{
      origem: string;
      destino: string;
      count: number;
      tempoMedio: number;
      color: string;
    }> = [];

    ETAPAS_ORDEM.forEach(origem => {
      ETAPAS_ORDEM.forEach(destino => {
        const { count, tempoTotal } = matriz[origem][destino];
        if (count > 0) {
          const tempoMedio = tempoTotal / count;
          let color = '#22c55e'; // verde <24h
          if (tempoMedio > 72) color = '#ef4444'; // vermelho >72h
          else if (tempoMedio > 24) color = '#f59e0b'; // amarelo 24-72h

          result.push({ origem, destino, count, tempoMedio, color });
        }
      });
    });

    return result;
  }, [leadTimes, tipoFiltro]);

  // ========================================================================
  // NOVO: Análise de Cancelamentos
  // ========================================================================
  const cancelamentosData = useMemo(() => {
    if (!movimentacoes?.length) return {
      porMotivo: [],
      etapaComMaisCancelamentos: { etapa: 'N/D', taxa: 0 },
      evolucaoMensal: [],
    };

    const filtered = tipoFiltro === 'Todos' ? movimentacoes : movimentacoes.filter(m => m.Tipo === tipoFiltro);
    const canceladas = filtered.filter(m => m.IsCancelada);

    // 1. Por motivo
    const porMotivo = canceladas.reduce((acc, m) => {
      const motivo = m.Motivo || 'Não Informado';
      if (!acc[motivo]) acc[motivo] = 0;
      acc[motivo]++;
      return acc;
    }, {} as Record<string, number>);

    const porMotivoArray = Object.entries(porMotivo).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 2. Etapa com maior taxa de cancelamento
    const porEtapa = filtered.reduce((acc, m) => {
      if (!acc[m.Etapa]) acc[m.Etapa] = { total: 0, canceladas: 0 };
      acc[m.Etapa].total++;
      if (m.IsCancelada) acc[m.Etapa].canceladas++;
      return acc;
    }, {} as Record<string, { total: number; canceladas: number }>);

    let etapaComMaisCancelamentos = { etapa: 'N/D', taxa: 0 };
    Object.entries(porEtapa).forEach(([etapa, { total, canceladas }]) => {
      const taxa = (canceladas / total) * 100;
      if (taxa > etapaComMaisCancelamentos.taxa) {
        etapaComMaisCancelamentos = { etapa, taxa };
      }
    });

    // 3. Evolução mensal
    const porMes = canceladas.reduce((acc, m) => {
      const mes = new Date(m.CriadoEm).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' });
      if (!acc[mes]) acc[mes] = 0;
      acc[mes]++;
      return acc;
    }, {} as Record<string, number>);

    const evolucaoMensal = Object.entries(porMes).map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => {
        const [mesA, anoA] = a.mes.split('/');
        const [mesB, anoB] = b.mes.split('/');
        return new Date(`${anoA}-${mesA}`).getTime() - new Date(`${anoB}-${mesB}`).getTime();
      });

    return { porMotivo: porMotivoArray, etapaComMaisCancelamentos, evolucaoMensal };
  }, [movimentacoes, tipoFiltro]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <Text>Carregando análises de workflow...</Text>
        </div>
      </div>
    );
  }

  if (!movimentacoes?.length) {
    return (
      <Card className="text-center p-12">
        <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
        <Title>Dados de Workflow Não Disponíveis</Title>
        <Text className="mt-2">Execute o ETL para gerar os dados de MovimentacaoOcorrencias</Text>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Tipo */}
      <Card>
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <Text>Filtrar por Tipo:</Text>
          <div className="flex gap-2 flex-wrap">
            {tiposDisponiveis.map(tipo => (
              <button
                key={tipo}
                onClick={() => setTipoFiltro(tipo)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tipoFiltro === tipo
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="blue">
          <div className="flex items-start justify-between">
            <div>
              <Text>Lead Time Total Médio</Text>
              <Metric className="mt-2">{fmtNum(kpis.leadTimeTotal)} dias</Metric>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card decoration="top" decorationColor="green">
          <div className="flex items-start justify-between">
            <div>
              <Text>Taxa de Conclusão</Text>
              <Metric className="mt-2">{fmtNum(kpis.taxaConclusao)}%</Metric>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card decoration="top" decorationColor="red">
          <div className="flex items-start justify-between">
            <div>
              <Text>Taxa de Retrabalho</Text>
              <Metric className="mt-2">{fmtNum(kpis.taxaRetrabalho)}%</Metric>
            </div>
            <TrendingUp className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card decoration="top" decorationColor="orange">
          <div className="flex items-start justify-between">
            <div>
              <Text>Etapa Gargalo</Text>
              <Metric className="mt-2 text-sm">{kpis.etapaGargalo}</Metric>
              <Text className="mt-1">{fmtHoras(kpis.tempoGargalo)}</Text>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Row 1: Funil de Conversão + Distribuição por Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funil de Conversão */}
        <Card className="lg:col-span-2">
          <Title>Funil de Conversão por Etapa</Title>
          <Text className="mb-4">Volume de ocorrências e taxa de conclusão em cada etapa</Text>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={funilData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="Etapa" type="category" width={180} fontSize={12} />
              <RechartsTooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'TaxaConversao') return [`${fmtNum(value)}%`, 'Taxa de Conversão'];
                  return [fmtNum(value), name];
                }}
              />
              <Legend />
              <Bar dataKey="TotalOcorrencias" fill="#3b82f6" name="Total de Ocorrências" />
              <Bar dataKey="TotalConcluidas" fill="#10b981" name="Concluídas" />
              <Bar dataKey="TotalCanceladas" fill="#ef4444" name="Canceladas" />
              <Line dataKey="TaxaConversao" stroke="#f59e0b" strokeWidth={2} name="Taxa de Conversão (%)" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribuição por Tipo */}
        <Card>
          <Title>Distribuição por Tipo</Title>
          <Text className="mb-4">Volume de ocorrências por tipo de manutenção</Text>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={distribuicaoTipo}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {distribuicaoTipo.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={TIPO_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value: number) => fmtNum(value)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 2: Lead Time por Transição + Top Usuários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Time por Transição de Etapa */}
        <Card>
          <Title>Top 10 Transições Mais Lentas</Title>
          <Text className="mb-4">Tempo médio entre etapas consecutivas</Text>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={leadTimeEtapaData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Horas', position: 'insideBottom', offset: -5 }} />
              <YAxis dataKey="transicao" type="category" width={200} fontSize={11} />
              <RechartsTooltip formatter={(value: number) => fmtHoras(value)} />
              <Bar dataKey="tempoMedio" fill="#f59e0b" name="Tempo Médio">
                {leadTimeEtapaData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.tempoMedio > 48 ? '#ef4444' : entry.tempoMedio > 24 ? '#f59e0b' : '#10b981'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top 10 Usuários Mais Rápidos */}
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <Title>Top 10 Usuários Mais Rápidos</Title>
              <Text>Menor tempo médio de processamento (mín. 5 ocorrências)</Text>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {topUsuarios.map((u, idx) => (
              <div key={u.usuario} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div 
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm"
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <Text className="font-medium">{u.usuario}</Text>
                    <Text className="text-xs text-gray-500">
                      {u.totalProcessadas} ocorrências • {fmtNum(u.taxaConclusao)}% conclusão
                    </Text>
                  </div>
                </div>
                <div className="text-right">
                  <Text className="font-bold text-green-600">{fmtHoras(u.tempoMedio)}</Text>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tempo Médio por Etapa (barras horizontais) */}
      <Card>
        <Title>Tempo Médio de Permanência por Etapa</Title>
        <Text className="mb-4">Quanto tempo as ocorrências ficam em cada etapa até avançar</Text>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={funilData.map(f => ({ 
              Etapa: f.Etapa, 
              TempoMedio: f.TempoMedio 
            }))} 
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" label={{ value: 'Dias', position: 'insideBottom', offset: -5 }} />
            <YAxis dataKey="Etapa" type="category" width={180} fontSize={12} />
            <RechartsTooltip formatter={(value: number) => `${fmtNum(value)} dias`} />
            <Bar dataKey="TempoMedio" name="Tempo Médio (dias)">
              {funilData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={ETAPA_COLORS[entry.Etapa] || '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* NOVO: Heatmap de Transições entre Etapas */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-6 h-6 text-purple-500" />
          <div>
            <Title>Heatmap de Transições - Tempo Médio entre Etapas</Title>
            <Text>Análise visual do fluxo e gargalos entre etapas consecutivas</Text>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white z-10 p-2 border text-left font-bold">Origem →</th>
                  {ETAPAS_ORDEM.map(etapa => (
                    <th key={etapa} className="p-1 border text-center font-normal min-w-[60px]">
                      <div className="transform -rotate-45 origin-center whitespace-nowrap text-[10px]">
                        {etapa.substring(0, 12)}...
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ETAPAS_ORDEM.map(origem => {
                  const transicoesOrigem = heatmapData.filter(h => h.origem === origem);
                  
                  return (
                    <tr key={origem}>
                      <td className="sticky left-0 bg-white z-10 p-2 border font-medium text-left">
                        {origem}
                      </td>
                      {ETAPAS_ORDEM.map(destino => {
                        const transicao = transicoesOrigem.find(t => t.destino === destino);
                        
                        if (!transicao || transicao.count === 0) {
                          return <td key={destino} className="p-2 border bg-gray-50"></td>;
                        }

                        return (
                          <td 
                            key={destino} 
                            className="p-2 border text-center cursor-help"
                            style={{ backgroundColor: transicao.color + '30' }}
                            title={`${transicao.count} transições\nTempo médio: ${fmtHoras(transicao.tempoMedio)}`}
                          >
                            <div className="font-bold" style={{ color: transicao.color }}>
                              {transicao.count}
                            </div>
                            <div className="text-[10px] text-gray-600">
                              {fmtHoras(transicao.tempoMedio)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
            <Text>&lt;24h (Rápido)</Text>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
            <Text>24-72h (Atenção)</Text>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <Text>&gt;72h (Crítico)</Text>
          </div>
        </div>
      </Card>

      {/* NOVO: Análise de Cancelamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pizza - Motivos de Cancelamento */}
        <Card>
          <Title>Motivos de Cancelamento</Title>
          <Text className="mb-4">Distribuição por motivo informado</Text>
          
          {cancelamentosData.porMotivo.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={cancelamentosData.porMotivo}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {cancelamentosData.porMotivo.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(TIPO_COLORS)[index % 4]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <Text className="font-bold">Etapa com Maior Taxa de Cancelamento:</Text>
                <div className="flex items-center gap-2 mt-2">
                  <Badge color="red">{cancelamentosData.etapaComMaisCancelamentos.etapa}</Badge>
                  <Text className="text-red-600 font-bold">
                    {fmtNum(cancelamentosData.etapaComMaisCancelamentos.taxa)}% canceladas
                  </Text>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <Text className="text-green-600 italic">Nenhum cancelamento registrado</Text>
            </div>
          )}
        </Card>

        {/* Evolução Temporal */}
        <Card>
          <Title>Evolução de Cancelamentos</Title>
          <Text className="mb-4">Tendência mensal de OS canceladas</Text>

          {cancelamentosData.evolucaoMensal.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cancelamentosData.evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis />
                <RechartsTooltip formatter={(value: number) => [`${value} OS`, 'Canceladas']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  name="OS Canceladas" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <Text className="text-gray-500 italic">Sem dados de evolução</Text>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
