import { useMemo } from 'react';
import { Card, Title, Text, Metric, Badge, ProgressBar } from '@tremor/react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, DollarSign,
  Wrench, Calendar, Target, Info
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import useBIData from '@/hooks/useBIData';
import useMaintenanceAlerts from '@/hooks/useMaintenanceAlerts';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';

type ManutencaoUnificado = {
  Ocorrencia: number;
  Tipo: string;
  Fornecedor: string;
  Modelo: string;
  LeadTimeTotalDias: number;
  CustoTotalOS: number;
  DataEntrada: string;
};

type MovimentacaoOcorrencia = {
  Ocorrencia: number;
  // Algumas versões do dataset incluem o tipo da ocorrência; mantemos opcional
  // para evitar quebra quando o arquivo não possuir a coluna.
  Tipo?: string;
  IsAberta: boolean;
  IsConcluida: boolean;
  IsCancelada: boolean;
};

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtNum(v: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v);
}

export default function VisaoGeralTab() {
  const { data: manutencoes, loading } = useBIData<ManutencaoUnificado[]>('fat_manutencao_unificado.json');
  const { data: movimentacoesRaw } = useBIData<MovimentacaoOcorrencia[]>('fat_movimentacao_ocorrencias.json');
  const { resumo, temAlertasCriticos } = useMaintenanceAlerts();
  const { filters, updateFilters } = useMaintenanceFilters();

  // Filtrar apenas ocorrências de manutenção
  const movimentacoes = useMemo(() => {
    if (!movimentacoesRaw?.length) return [];
    return movimentacoesRaw.filter(m => 
      m.Tipo === 'Manutenção Preventiva' || m.Tipo === 'Manutenção Corretiva'
    );
  }, [movimentacoesRaw]);

  // Handler para click interativo com Ctrl (estilo Power BI)
  const handleChartElementClick = (tipo: 'modelos' | 'fornecedores', valor: string, event?: React.MouseEvent) => {
    const isCtrlPressed = event?.ctrlKey || event?.metaKey;
    
    if (tipo === 'modelos') {
      const currentModelos = filters.modelos || [];
      if (isCtrlPressed) {
        // Ctrl+Click: toggle no array
        if (currentModelos.includes(valor)) {
          updateFilters({ modelos: currentModelos.filter(m => m !== valor) });
        } else {
          updateFilters({ modelos: [...currentModelos, valor] });
        }
      } else {
        // Click simples: substitui ou limpa
        if (currentModelos.length === 1 && currentModelos[0] === valor) {
          updateFilters({ modelos: [] });
        } else {
          updateFilters({ modelos: [valor] });
        }
      }
    } else if (tipo === 'fornecedores') {
      const currentFornecedores = filters.fornecedores || [];
      if (isCtrlPressed) {
        if (currentFornecedores.includes(valor)) {
          updateFilters({ fornecedores: currentFornecedores.filter(f => f !== valor) });
        } else {
          updateFilters({ fornecedores: [...currentFornecedores, valor] });
        }
      } else {
        if (currentFornecedores.length === 1 && currentFornecedores[0] === valor) {
          updateFilters({ fornecedores: [] });
        } else {
          updateFilters({ fornecedores: [valor] });
        }
      }
    }
  };

  const isModeloSelected = (modelo: string) => filters.modelos?.includes(modelo);
  const isFornecedorSelected = (fornecedor: string) => filters.fornecedores?.includes(fornecedor);

  // ========================================================================
  // CAMADA 1: KPIs EXECUTIVOS (8 principais)
  // ========================================================================
  const kpis = useMemo(() => {
    if (!manutencoes?.length || !movimentacoes?.length) {
      return {
        totalOS: 0,
        osAbertas: 0,
        osConcluidas: 0,
        leadTimeMedia: 0,
        custoTotal: 0,
        ticketMedio: 0,
        taxaPreventiva: 0,
        alertasCriticos: 0,
        variacaoMes: { os: 0, custo: 0, leadTime: 0 },
      };
    }

    const now = new Date();
    const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const mesAtual = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total de OS únicas
    const ocorrenciasUnicas = new Set(movimentacoes.map(m => m.Ocorrencia));
    const totalOS = ocorrenciasUnicas.size;

    // Status
    const osAbertas = new Set(movimentacoes.filter(m => m.IsAberta).map(m => m.Ocorrencia)).size;
    const osConcluidas = new Set(movimentacoes.filter(m => m.IsConcluida).map(m => m.Ocorrencia)).size;

    // Lead time médio
    const comLeadTime = manutencoes.filter(m => m.LeadTimeTotalDias > 0);
    const leadTimeMedia = comLeadTime.reduce((sum, m) => sum + m.LeadTimeTotalDias, 0) / (comLeadTime.length || 1);

    // Custos
    const custoTotal = manutencoes.reduce((sum, m) => sum + (m.CustoTotalOS || 0), 0);
    const ticketMedio = custoTotal / (manutencoes.length || 1);

    // Taxa preventiva
    const preventivas = manutencoes.filter(m => m.Tipo === 'Manutenção Preventiva').length;
    const taxaPreventiva = (preventivas / (manutencoes.length || 1)) * 100;

    // Variações mês a mês
    const osMesAtual = manutencoes.filter(m => new Date(m.DataEntrada) >= mesAtual);
    const osMesAnterior = manutencoes.filter(m => {
      const data = new Date(m.DataEntrada);
      return data >= mesAnterior && data < mesAtual;
    });

    const variacaoOS = osMesAnterior.length > 0 
      ? ((osMesAtual.length - osMesAnterior.length) / osMesAnterior.length) * 100 
      : 0;

    const custoMesAtual = osMesAtual.reduce((s, m) => s + (m.CustoTotalOS || 0), 0);
    const custoMesAnterior = osMesAnterior.reduce((s, m) => s + (m.CustoTotalOS || 0), 0);
    const variacaoCusto = custoMesAnterior > 0 
      ? ((custoMesAtual - custoMesAnterior) / custoMesAnterior) * 100 
      : 0;

    const leadTimeMesAtual = osMesAtual.filter(m => m.LeadTimeTotalDias > 0)
      .reduce((s, m) => s + m.LeadTimeTotalDias, 0) / (osMesAtual.filter(m => m.LeadTimeTotalDias > 0).length || 1);
    const leadTimeMesAnterior = osMesAnterior.filter(m => m.LeadTimeTotalDias > 0)
      .reduce((s, m) => s + m.LeadTimeTotalDias, 0) / (osMesAnterior.filter(m => m.LeadTimeTotalDias > 0).length || 1);
    const variacaoLeadTime = leadTimeMesAnterior > 0 
      ? ((leadTimeMesAtual - leadTimeMesAnterior) / leadTimeMesAnterior) * 100 
      : 0;

    return {
      totalOS,
      osAbertas,
      osConcluidas,
      leadTimeMedia,
      custoTotal,
      ticketMedio,
      taxaPreventiva,
      alertasCriticos: resumo.criticos,
      variacaoMes: {
        os: variacaoOS,
        custo: variacaoCusto,
        leadTime: variacaoLeadTime,
      },
    };
  }, [manutencoes, movimentacoes, resumo]);

  // ========================================================================
  // CAMADA 2: MAPA DE CALOR - FORNECEDORES (Top 15)
  // ========================================================================
  const heatmapFornecedores = useMemo(() => {
    if (!manutencoes?.length) return [];

    const porFornecedor = manutencoes.reduce((acc, m) => {
      const fornecedor = m.Fornecedor || 'Não informado';
      if (!acc[fornecedor]) {
        acc[fornecedor] = { 
          fornecedor, 
          totalOS: 0, 
          custoTotal: 0, 
          leadTimeMedia: 0, 
          somLeadTime: 0 
        };
      }
      acc[fornecedor].totalOS++;
      acc[fornecedor].custoTotal += m.CustoTotalOS || 0;
      if (m.LeadTimeTotalDias > 0) {
        acc[fornecedor].somLeadTime += m.LeadTimeTotalDias;
      }
      return acc;
    }, {} as Record<string, { fornecedor: string; totalOS: number; custoTotal: number; leadTimeMedia: number; somLeadTime: number }>);

    return Object.values(porFornecedor)
      .filter(f => f.fornecedor) // Garantir que não há undefined
      .map(f => ({
        ...f,
        leadTimeMedia: f.somLeadTime / f.totalOS,
        ticketMedio: f.custoTotal / f.totalOS,
      }))
      .sort((a, b) => b.totalOS - a.totalOS)
      .slice(0, 15);
  }, [manutencoes]);

  // Determinar cor do heatmap (verde = bom, amarelo = médio, vermelho = ruim)
  const getHeatColor = (leadTime: number, custo: number, maxLeadTime: number, maxCusto: number) => {
    const scoreLeadTime = (leadTime / maxLeadTime) * 50; // 0-50
    const scoreCusto = (custo / maxCusto) * 50; // 0-50
    const scoreTotal = scoreLeadTime + scoreCusto; // 0-100

    if (scoreTotal < 40) return '#22c55e'; // Verde - excelente
    if (scoreTotal < 70) return '#f59e0b'; // Amarelo - atenção
    return '#ef4444'; // Vermelho - crítico
  };

  // ========================================================================
  // CAMADA 3: PARETO - MODELOS MAIS CUSTOSOS (Top 10)
  // ========================================================================
  const paretoModelos = useMemo(() => {
    if (!manutencoes?.length) return [];

    const porModelo = manutencoes.reduce((acc, m) => {
      const modelo = m.Modelo || 'Não informado';
      if (!acc[modelo]) {
        acc[modelo] = { modelo, custoTotal: 0, totalOS: 0 };
      }
      acc[modelo].custoTotal += m.CustoTotalOS || 0;
      acc[modelo].totalOS++;
      return acc;
    }, {} as Record<string, { modelo: string; custoTotal: number; totalOS: number }>);

    const sorted = Object.values(porModelo)
      .sort((a, b) => b.custoTotal - a.custoTotal)
      .slice(0, 10);

    // Calcular % acumulado
    const totalGeral = sorted.reduce((s, m) => s + m.custoTotal, 0);
    let acumulado = 0;

    return sorted.map(m => {
      acumulado += m.custoTotal;
      return {
        ...m,
        percentual: (m.custoTotal / totalGeral) * 100,
        acumulado: (acumulado / totalGeral) * 100,
      };
    });
  }, [manutencoes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <Text>Carregando visão geral...</Text>
        </div>
      </div>
    );
  }

  const maxLeadTime = Math.max(...heatmapFornecedores.map(f => f.leadTimeMedia));
  const maxCusto = Math.max(...heatmapFornecedores.map(f => f.ticketMedio));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Title>Visão Geral Executiva - Manutenções</Title>
          <Text>Dashboard consolidado com KPIs, análise de fornecedores e modelos</Text>
        </div>
        {temAlertasCriticos && (
          <Badge color="red" size="xl" className="animate-pulse">
            {resumo.criticos} Alertas Críticos
          </Badge>
        )}
      </div>

      {/* CAMADA 1: KPIs Executivos */}
      <TooltipProvider>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total OS */}
          <Card decoration="top" decorationColor="blue">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <Text>Total de OS</Text>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold">Total de Ordens de Serviço</p>
                      <p className="text-xs mt-1">Contagem total de OS abertas no período, excluindo canceladas.</p>
                      <p className="text-xs mt-1 font-mono">Fórmula: COUNT(OS) WHERE Status ≠ 'Cancelada'</p>
                      <p className="text-xs mt-1 text-amber-600">Objetivo: Monitorar volume de demanda de manutenção</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Metric className="mt-2">{kpis.totalOS.toLocaleString('pt-BR')}</Metric>
              <div className="flex items-center gap-2 mt-2">
                {kpis.variacaoMes.os >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <Text className={`text-xs ${kpis.variacaoMes.os >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmtNum(Math.abs(kpis.variacaoMes.os))}% vs mês anterior
                </Text>
              </div>
            </div>
            <Wrench className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        {/* OS Abertas */}
        <Card decoration="top" decorationColor={kpis.osAbertas > 100 ? "yellow" : "green"}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <Text>OS Abertas</Text>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">Ordens de Serviço em Andamento</p>
                    <p className="text-xs mt-1">OS que ainda não foram concluídas (sem data de conclusão).</p>
                    <p className="text-xs mt-1 font-mono">Fórmula: COUNT(OS) WHERE DataConclusao IS NULL</p>
                    <p className="text-xs mt-1 text-amber-600">Objetivo: Monitorar quantidade de OS pendentes e carga de trabalho atual</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Metric className="mt-2">{kpis.osAbertas}</Metric>
              <ProgressBar 
                percentageValue={(kpis.osConcluidas / kpis.totalOS) * 100} 
                color="green" 
                className="mt-2" 
              />
              <Text className="text-xs mt-1">{fmtNum((kpis.osConcluidas / kpis.totalOS) * 100)}% concluídas</Text>
            </div>
            <Calendar className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        {/* Lead Time Médio */}
        <Card decoration="top" decorationColor={kpis.leadTimeMedia > 5 ? "red" : "green"}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <Text>Lead Time Médio</Text>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">Tempo Médio de Reparo</p>
                    <p className="text-xs mt-1">Quantidade média de dias que os veículos ficam parados desde a abertura até a conclusão da manutenção.</p>
                    <p className="text-xs mt-1 font-mono">Cálculo: Média dos dias entre entrada e saída</p>
                    <p className="text-xs mt-1 text-amber-600">Meta: 5 dias ou menos</p>
                    <p className="text-xs mt-1 text-amber-600">Objetivo: Quanto menor, menos tempo os veículos ficam parados</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Metric className="mt-2">{fmtNum(kpis.leadTimeMedia)}d</Metric>
              <div className="flex items-center gap-2 mt-2">
                {kpis.variacaoMes.leadTime <= 0 ? (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                )}
                <Text className={`text-xs ${kpis.variacaoMes.leadTime <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmtNum(Math.abs(kpis.variacaoMes.leadTime))}% vs mês anterior
                </Text>
              </div>
            </div>
            <Clock className={`w-8 h-8 ${kpis.leadTimeMedia > 5 ? 'text-red-500' : 'text-green-500'}`} />
          </div>
        </Card>

        {/* Custo Total */}
        <Card decoration="top" decorationColor="purple">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <Text>Custo Total</Text>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">Custo Total de Manutenção</p>
                    <p className="text-xs mt-1">Soma de todos os valores gastos em manutenção no período, incluindo peças, serviços e outros custos.</p>
                    <p className="text-xs mt-1 font-mono">Cálculo: Soma de todos os valores das OS</p>
                    <p className="text-xs mt-1 text-amber-600">Objetivo: Acompanhar quanto está sendo gasto com manutenção da frota</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Metric className="mt-2 text-lg">{fmtBRL(kpis.custoTotal)}</Metric>
              <div className="flex items-center gap-2 mt-2">
                {kpis.variacaoMes.custo >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                )}
                <Text className={`text-xs ${kpis.variacaoMes.custo >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fmtNum(Math.abs(kpis.variacaoMes.custo))}% vs mês anterior
                </Text>
              </div>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        {/* Ticket Médio */}
        <Card decoration="top" decorationColor="indigo">
          <div className="flex items-center gap-1">
            <Text>Ticket Médio</Text>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-slate-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Custo Médio por Ordem de Serviço</p>
                  <p className="text-xs mt-1">Soma do valor total de todas as Ordens de Serviço dividido pela quantidade total de OS.</p>
                  <p className="text-xs mt-1 font-mono">Cálculo: Valor Total ÷ Quantidade de OS</p>
                  <p className="text-xs mt-1 text-amber-600">Objetivo: Identificar se os custos estão aumentando ou diminuindo ao longo do tempo</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Metric className="mt-2">{fmtBRL(kpis.ticketMedio)}</Metric>
          <Text className="text-xs mt-2 text-gray-500">Por ordem de serviço</Text>
        </Card>

        {/* Taxa Preventiva */}
        <Card decoration="top" decorationColor={kpis.taxaPreventiva >= 60 ? "green" : "orange"}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <Text>Taxa Preventiva</Text>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">Percentual de Manutenção Preventiva</p>
                    <p className="text-xs mt-1">Mostra quantos % das manutenções foram feitas de forma planejada (preventiva) ao invés de emergencial (corretiva).</p>
                    <p className="text-xs mt-1 font-mono">Cálculo: (Quantidade de OS Preventivas ÷ Total de OS) × 100</p>
                    <p className="text-xs mt-1 text-amber-600">Meta: 60% ou mais</p>
                    <p className="text-xs mt-1 text-amber-600">Objetivo: Quanto maior, menos quebras inesperadas acontecem</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Metric className="mt-2">{fmtNum(kpis.taxaPreventiva)}%</Metric>
              <ProgressBar 
                percentageValue={kpis.taxaPreventiva} 
                color={kpis.taxaPreventiva >= 60 ? "green" : "orange"}
                className="mt-2" 
              />
              <Text className="text-xs mt-1">Meta: 60%</Text>
            </div>
            <Target className={`w-8 h-8 ${kpis.taxaPreventiva >= 60 ? 'text-green-500' : 'text-orange-500'}`} />
          </div>
        </Card>

        {/* Alertas */}
        <Card decoration="top" decorationColor={kpis.alertasCriticos > 0 ? "red" : "green"}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <Text>Alertas Críticos</Text>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">Alertas de Alta Prioridade</p>
                    <p className="text-xs mt-1">Identifica OS com problemas graves que precisam de atenção urgente: mais de 10 dias parada, travada na mesma etapa por mais de 7 dias, custos muito acima da média.</p>
                    <p className="text-xs mt-1 text-amber-600">Objetivo: Saber quais OS precisam de ação imediata para não atrasar ainda mais</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Metric className="mt-2 text-red-600">{kpis.alertasCriticos}</Metric>
              <Text className="text-xs mt-2 text-gray-500">
                {resumo.total} total ({resumo.atencao} atenção)
              </Text>
            </div>
            {kpis.alertasCriticos > 0 ? (
              <AlertTriangle className="w-8 h-8 text-red-500" />
            ) : (
              <CheckCircle className="w-8 h-8 text-green-500" />
            )}
          </div>
        </Card>

        {/* Status Geral */}
        <Card decoration="top" decorationColor="slate">
          <div className="flex items-center gap-1">
            <Text>Status Sistema</Text>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-slate-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Saúde Geral do Sistema</p>
                <p className="text-xs mt-1">Avaliação baseada em: alertas críticos, taxa SLA, taxa preventiva.</p>
                <p className="text-xs mt-1 font-mono">Saudável: 0 críticos + SLA &gt;85% + Preventiva &gt;60%</p>
                <p className="text-xs mt-1 text-amber-600">Objetivo: Visão rápida da operação de manutenção</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Text>Concluídas</Text>
              <Badge color="green">{kpis.osConcluidas}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <Text>Em Andamento</Text>
              <Badge color="yellow">{kpis.osAbertas}</Badge>
            </div>
          </div>
        </Card>
      </div>
      </TooltipProvider>

      {/* CAMADA 2: Mapa de Calor - Fornecedores */}
      <Card>
        <Title>Mapa de Calor - Performance de Fornecedores</Title>
        <Text className="mb-4">Top 15 fornecedores por volume • Cor indica performance (verde=ótimo, amarelo=atenção, vermelho=crítico)</Text>

        <div className="overflow-x-auto">
          <div className="grid grid-cols-5 gap-2 min-w-[800px]">
            {heatmapFornecedores.map((forn) => {
              const cor = getHeatColor(forn.leadTimeMedia, forn.ticketMedio, maxLeadTime, maxCusto);
              const isSelected = isFornecedorSelected(forn.fornecedor);
              
              return (
                <Card 
                  key={forn.fornecedor} 
                  className={`p-4 cursor-pointer hover:ring-2 transition-all ${
                    isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:ring-blue-300'
                  }`}
                  style={{ backgroundColor: cor + '20', borderLeft: `4px solid ${cor}` }}
                  onClick={(e) => handleChartElementClick('fornecedores', forn.fornecedor, e)}
                  title="Clique para filtrar • Ctrl+Clique para múltipla seleção"
                >
                  <Text className="font-bold text-xs truncate" title={forn.fornecedor || ''}>
                    {(forn.fornecedor || 'N/A').substring(0, 20)}
                  </Text>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <Text className="text-xs text-gray-600">OS:</Text>
                      <Text className="text-xs font-bold">{forn.totalOS}</Text>
                    </div>
                    <div className="flex items-center justify-between">
                      <Text className="text-xs text-gray-600">Lead:</Text>
                      <Text className="text-xs font-bold">{fmtNum(forn.leadTimeMedia)}d</Text>
                    </div>
                    <div className="flex items-center justify-between">
                      <Text className="text-xs text-gray-600">Ticket:</Text>
                      <Text className="text-xs font-bold">{fmtBRL(forn.ticketMedio)}</Text>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
            <Text>Excelente (&lt;40 score)</Text>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
            <Text>Atenção (40-70 score)</Text>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <Text>Crítico (&gt;70 score)</Text>
          </div>
        </div>
      </Card>

      {/* CAMADA 3: Pareto - Modelos Mais Custosos */}
      <Card>
        <Title>Análise de Pareto - Top 10 Modelos por Custo</Title>
        <Text className="mb-4">
          Identificação dos modelos que representam 80% dos custos de manutenção
          <span className="text-xs text-gray-500 ml-2">
            💡 Clique nas barras para filtrar • Ctrl+Clique para seleção múltipla
          </span>
        </Text>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={paretoModelos}
            onClick={(data) => {
              if (data?.activePayload?.[0]?.payload) {
                const modelo = data.activePayload[0].payload.modelo;
                // Criar evento sintético para passar o Ctrl
                const syntheticEvent = {
                  ctrlKey: false,
                  metaKey: false,
                } as React.MouseEvent;
                handleChartElementClick('modelos', modelo, syntheticEvent);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="modelo" angle={-45} textAnchor="end" height={120} fontSize={11} />
            <YAxis yAxisId="left" label={{ value: 'Custo (R$)', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: '% Acumulado', angle: 90, position: 'insideRight' }} />
            <RechartsTooltip 
              formatter={(value: number, name: string) => {
                if (name === 'custoTotal') return [fmtBRL(value), 'Custo Total'];
                return [`${fmtNum(value)}%`, name === 'acumulado' ? '% Acumulado' : '% Individual'];
              }}
            />
            <Bar yAxisId="left" dataKey="custoTotal" name="Custo Total" className="cursor-pointer">
              {paretoModelos.map((entry, index) => {
                const isSelected = isModeloSelected(entry.modelo);
                let baseColor = entry.acumulado <= 80 ? '#3b82f6' : '#94a3b8';
                
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={isSelected ? '#f59e0b' : baseColor}
                    stroke={isSelected ? '#d97706' : 'none'}
                    strokeWidth={isSelected ? 3 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Rank</th>
                <th className="p-2 text-left">Modelo</th>
                <th className="p-2 text-right">Total OS</th>
                <th className="p-2 text-right">Custo Total</th>
                <th className="p-2 text-right">% Individual</th>
                <th className="p-2 text-right">% Acumulado</th>
                <th className="p-2 text-center">Pareto</th>
              </tr>
            </thead>
            <tbody>
              {paretoModelos.map((modelo, idx) => {
                const isSelected = isModeloSelected(modelo.modelo);
                return (
                  <tr 
                    key={modelo.modelo} 
                    className={`border-t cursor-pointer transition-colors ${
                      isSelected ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'
                    }`}
                    onClick={(e) => handleChartElementClick('modelos', modelo.modelo, e)}
                    title="Clique para filtrar • Ctrl+Clique para múltipla seleção"
                  >
                  <td className="p-2 font-bold text-center">{idx + 1}</td>
                  <td className="p-2 font-medium">{modelo.modelo}</td>
                  <td className="p-2 text-right">{modelo.totalOS}</td>
                  <td className="p-2 text-right font-bold text-blue-600">{fmtBRL(modelo.custoTotal)}</td>
                  <td className="p-2 text-right">{fmtNum(modelo.percentual)}%</td>
                  <td className="p-2 text-right font-bold">{fmtNum(modelo.acumulado)}%</td>
                  <td className="p-2 text-center">
                    {modelo.acumulado <= 80 ? (
                      <Badge color="blue">80%</Badge>
                    ) : (
                      <Badge color="gray">20%</Badge>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
