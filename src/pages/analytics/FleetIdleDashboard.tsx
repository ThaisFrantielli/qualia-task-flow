import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingDown, Calendar, AlertTriangle, FileSpreadsheet, Users, MapPin, Clock, DollarSign, HelpCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import DataUpdateBadge from '@/components/DataUpdateBadge';

type AnyObject = { [k: string]: any };

function parseNum(v: any): number { 
  return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; 
}

function fmtDate(d: string | Date | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('pt-BR');
}

const getCategory = (status: string) => {
  const s = (status || '').toUpperCase();
  if (['LOCADO', 'LOCADO VEÍCULO RESERVA', 'USO INTERNO', 'EM MOBILIZAÇÃO', 'EM MOBILIZACAO'].includes(s)) return 'Produtiva';
  if ([
    'DEVOLVIDO', 'ROUBO / FURTO', 'BAIXADO', 'VENDIDO', 'SINISTRO PERDA TOTAL',
    'DISPONIVEL PRA VENDA', 'DISPONIVEL PARA VENDA', 'DISPONÍVEL PARA VENDA', 'DISPONÍVEL PRA VENDA',
    'NÃO DISPONÍVEL', 'NAO DISPONIVEL', 'NÃO DISPONIVEL', 'NAO DISPONÍVEL',
    'EM DESMOBILIZAÇÃO', 'EM DESMOBILIZACAO'
  ].includes(s)) return 'Inativa';
  return 'Improdutiva';
};

export default function FleetIdleDashboard(): JSX.Element {
  const { data: frotaData, metadata: frotaMetadata } = useBIData<AnyObject[]>('dim_frota');
  // Desabilitado temporariamente - tabela muito grande (106k registros) causa CPU timeout
  // const { data: timelineData } = useBIData<AnyObject[]>('hist_vida_veiculo_timeline');
  const timelineData: AnyObject[] = []; // Placeholder até implementar paginação
  const { data: patioMovData } = useBIData<AnyObject[]>('dim_movimentacao_patios');
  const { data: veiculoMovData } = useBIData<AnyObject[]>('dim_movimentacao_veiculos');
  const { data: historicoSituacaoRaw } = useBIData<AnyObject[]>('historico_situacao_veiculos');

  const frota = useMemo(() => Array.isArray(frotaData) ? frotaData : [], [frotaData]);
  const timeline = useMemo(() => Array.isArray(timelineData) ? timelineData : [], [timelineData]);
  const patioMov = useMemo(() => Array.isArray(patioMovData) ? patioMovData : [], [patioMovData]);
  const veiculoMov = useMemo(() => Array.isArray(veiculoMovData) ? veiculoMovData : [], [veiculoMovData]);
  const historicoSituacao = useMemo(() => Array.isArray(historicoSituacaoRaw) ? historicoSituacaoRaw : [], [historicoSituacaoRaw]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const pageSize = 10;

  // Debug: verificar dados carregados
  const hasPatioData = patioMov.length > 0;

  // Gerar histórico diário de % improdutiva (últimos 90 dias)
  const dailyIdleHistory = useMemo(() => {
    const today = new Date();
    const data: { date: string; pct: number; improdutiva: number; total: number; displayDate: string }[] = [];

    // Preprocessar historico: mapa placa -> eventos ordenados por DataAtualizacaoDados asc
    const histMap = new Map<string, any[]>();
    historicoSituacao.forEach((h: any) => {
      const placa = h.Placa;
      if (!placa) return;
      if (!histMap.has(placa)) histMap.set(placa, []);
      const arr = histMap.get(placa)!;
      arr.push(h);
    });
    histMap.forEach((arr) => arr.sort((a: any, b: any) => new Date(a?.DataAtualizacaoDados || 0).getTime() - new Date(b?.DataAtualizacaoDados || 0).getTime()));

    const placas = frota.map(v => v.Placa).filter(Boolean);

    // Gerar últimos 90 dias
    for (let i = 89; i >= 0; i--) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      checkDate.setHours(23, 59, 59, 999); // considerar até o fim do dia

      const dateStr = checkDate.toISOString().split('T')[0];
      const displayDate = new Date(checkDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      let improdutivaCount = 0;
      let activeCount = 0;

      placas.forEach((placa: string) => {
        const events = histMap.get(placa) || [];
        // buscar último evento com DataAtualizacaoDados <= checkDate
        let status = null;
        for (let j = events.length - 1; j >= 0; j--) {
          const evDate = new Date(events[j]?.DataAtualizacaoDados || 0);
          if (evDate.getTime() <= checkDate.getTime()) {
            status = events[j]?.SituacaoVeiculo || events[j]?.Situacao || null;
            break;
          }
        }
        // se não houver evento, fallback para status atual em frota
        if (!status) {
          const v = frota.find(f => f.Placa === placa);
          status = v ? v.Status : null;
        }

        const cat = getCategory(status || '');
        if (cat === 'Produtiva' || cat === 'Improdutiva') activeCount += 1;
        if (cat === 'Improdutiva') improdutivaCount += 1;
      });

      const pct = activeCount > 0 ? (improdutivaCount / activeCount) * 100 : 0;
      data.push({ date: dateStr, pct: Number(pct.toFixed(1)), improdutiva: improdutivaCount, total: activeCount, displayDate });
    }

    return data;
  }, [frota, timeline, historicoSituacao]);

  // Veículos improdutivos na data selecionada
  const vehiclesOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const checkDate = new Date(selectedDate + 'T23:59:59');
    const placas = frota.map(v => v.Placa).filter(Boolean);

    // Para a lista de veículos improdutivos naquela data, usamos historicoSituacao
    const improdutivos = placas.filter(placa => {
      const events = (historicoSituacao || []).filter((h: any) => h.Placa === placa).sort((a: any,b:any)=>new Date(a?.DataAtualizacaoDados || 0).getTime()-new Date(b?.DataAtualizacaoDados || 0).getTime());
      let status = null;
      for (let j = events.length -1; j>=0; j--) {
        if (new Date(events[j]?.DataAtualizacaoDados || 0).getTime() <= checkDate.getTime()) { status = events[j]?.SituacaoVeiculo || events[j]?.Situacao; break; }
      }
      if (!status) {
        const v = frota.find(f=>f.Placa===placa); status = v ? v.Status : null;
      }
      return getCategory(status||'') === 'Improdutiva';
    });

    return improdutivos.map((placa: string) => {
      const v = frota.find(f => f.Placa === placa) || {} as any;
      // Movimentações de pátio
      const movPatio = patioMov
        .filter((m: any) => m.Placa === placa)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.DataMovimentacao || 0).getTime();
          const dateB = new Date(b.DataMovimentacao || 0).getTime();
          return dateB - dateA;
        });
      const ultimoMovPatio = movPatio[0];

      const movVeiculo = veiculoMov
        .filter((m: any) => m.Placa === placa)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.DataDevolucao || a.DataRetirada || 0).getTime();
          const dateB = new Date(b.DataDevolucao || b.DataRetirada || 0).getTime();
          return dateB - dateA;
        });
      const ultimaLocacao = movVeiculo[0];

      // Calcular dias no status usando historicoSituacao se disponível
      let dataInicioStatus = null;
      const events = (historicoSituacao || []).filter((h:any)=>h.Placa===placa).sort((a:any,b:any)=>new Date(a?.DataAtualizacaoDados || 0).getTime()-new Date(b?.DataAtualizacaoDados || 0).getTime());
      for (let j = events.length-1; j>=0; j--) {
        const ev = events[j];
        if (new Date(ev?.DataAtualizacaoDados || 0).getTime() <= checkDate.getTime()) { dataInicioStatus = ev?.DataAtualizacaoDados ?? null; break; }
      }
      if (!dataInicioStatus) {
        const dataDevolucao = ultimaLocacao?.DataDevolucao ? new Date(ultimaLocacao.DataDevolucao).toISOString() : null;
        dataInicioStatus = dataDevolucao || ultimoMovPatio?.DataMovimentacao || null;
      }

      let diasNoStatus = 0;
      if (dataInicioStatus) {
        const dataInicio = new Date(dataInicioStatus);
        const hoje = new Date();
        diasNoStatus = Math.floor((hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
      }

      const patio = ultimoMovPatio?.Patio || v.Localizacao || '-';

      return {
        Placa: placa,
        Modelo: v.Modelo,
        Status: v.Status,
        Patio: patio,
        DiasNoStatus: Math.max(0, diasNoStatus),
        DataInicioStatus: dataInicioStatus,
        UltimaMovimentacao: ultimoMovPatio?.DataMovimentacao || ultimaLocacao?.DataDevolucao || '-',
        UsuarioMovimentacao: ultimoMovPatio?.UsuarioMovimentacao || '-'
      };
    });
  }, [frota, patioMov, veiculoMov, selectedDate]);

  // (sem paginação) manter rolagem; `pageSize` usado apenas para indicar quantos aparecem inicialmente

  const currentIdleKPIs = useMemo(() => {
    const improdutivos = frota.filter(v => getCategory(v.Status) === 'Improdutiva');
    const ativos = frota.filter(v => {
      const cat = getCategory(v.Status);
      return cat === 'Produtiva' || cat === 'Improdutiva';
    });
    
    const pct = ativos.length > 0 ? (improdutivos.length / ativos.length) * 100 : 0;
    const mediaDias = improdutivos.length > 0
      ? improdutivos.reduce((sum, v) => sum + parseNum(v.DiasNoStatus), 0) / improdutivos.length
      : 0;
    
    // Tendência (comparar últimos 7 dias vs 7 anteriores)
    const last7 = dailyIdleHistory.slice(-7);
    const prev7 = dailyIdleHistory.slice(-14, -7);
    const avgLast7 = last7.reduce((s, d) => s + d.pct, 0) / 7;
    const avgPrev7 = prev7.reduce((s, d) => s + d.pct, 0) / 7;
    const trend = avgLast7 - avgPrev7;
    
    return { qtd: improdutivos.length, pct, mediaDias, trend };
  }, [frota, dailyIdleHistory]);

  const exportToExcel = (data: any[], filename: string) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dados');
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Erro exportando para Excel:', err);
    }
  };

  // ANÁLISE 1: Tempo médio de permanência por pátio
  const patioAnalysis = useMemo(() => {
    const patioMap = new Map<string, { soma: number; count: number; veiculos: number }>();
    
    patioMov.forEach((mov: any) => {
      const patio = mov.Patio || 'Sem Pátio';
      if (!patioMap.has(patio)) {
        patioMap.set(patio, { soma: 0, count: 0, veiculos: 0 });
      }
    });
    
    // Calcular tempo entre movimentações
    const placas = new Set(patioMov.map((m: any) => m.Placa));
    placas.forEach(placa => {
      const movs = patioMov
        .filter((m: any) => m.Placa === placa)
        .sort((a: any, b: any) => new Date(a.DataMovimentacao || 0).getTime() - new Date(b.DataMovimentacao || 0).getTime());
      
      for (let i = 0; i < movs.length - 1; i++) {
        const patio = movs[i].Patio || 'Sem Pátio';
        const dataAtual = new Date(movs[i].DataMovimentacao);
        const dataProxima = new Date(movs[i + 1].DataMovimentacao);
        const dias = Math.max(0, (dataProxima.getTime() - dataAtual.getTime()) / (1000 * 60 * 60 * 24));
        
        const stats = patioMap.get(patio)!;
        stats.soma += dias;
        stats.count += 1;
      }
    });
    
    // Contar veículos atuais por pátio
    const improdutivos = frota.filter(v => getCategory(v.Status) === 'Improdutiva');
    improdutivos.forEach(v => {
      const patio = v.Localizacao || 'Sem Pátio';
      if (patioMap.has(patio)) {
        patioMap.get(patio)!.veiculos += 1;
      } else {
        patioMap.set(patio, { soma: 0, count: 0, veiculos: 1 });
      }
    });
    
    const result = Array.from(patioMap.entries())
      .map(([patio, stats]) => ({
        patio,
        mediaDias: stats.count > 0 ? stats.soma / stats.count : 0,
        veiculosImprodutivos: stats.veiculos,
        movimentacoes: stats.count
      }))
      .filter(p => p.veiculosImprodutivos > 0 || p.movimentacoes > 0)
      .sort((a, b) => b.veiculosImprodutivos - a.veiculosImprodutivos)
      .slice(0, 10);
    
    return result;
  }, [patioMov, frota]);

  // ANÁLISE 2: Taxa de giro de pátio (movimentações por veículo)
  const giroPatioAnalysis = useMemo(() => {
    const placaMovCount = new Map<string, number>();
    
    patioMov.forEach((mov: any) => {
      const placa = mov.Placa;
      placaMovCount.set(placa, (placaMovCount.get(placa) || 0) + 1);
    });
    
    const totalVeiculos = placaMovCount.size;
    const totalMovimentacoes = patioMov.length;
    const taxaGiroMes = totalVeiculos > 0 ? (totalMovimentacoes / totalVeiculos) / 3 : 0; // últimos 3 meses
    
    return {
      taxaGiroMes: taxaGiroMes.toFixed(2),
      totalVeiculos,
      totalMovimentacoes,
      veiculosMaisMudancas: Array.from(placaMovCount.entries())
        .map(([placa, count]) => ({ placa, mudancas: count }))
        .sort((a, b) => b.mudancas - a.mudancas)
        .slice(0, 5)
    };
  }, [patioMov]);

  // ANÁLISE 3: Análise de usuários
  const userAnalysis = useMemo(() => {
    const userMap = new Map<string, { movimentacoes: number; veiculosUnicos: Set<string> }>();
    
    patioMov.forEach((mov: any) => {
      const user = mov.UsuarioMovimentacao || 'Não identificado';
      if (!userMap.has(user)) {
        userMap.set(user, { movimentacoes: 0, veiculosUnicos: new Set() });
      }
      const stats = userMap.get(user)!;
      stats.movimentacoes += 1;
      stats.veiculosUnicos.add(mov.Placa);
    });
    
    return Array.from(userMap.entries())
      .map(([user, stats]) => ({
        user,
        movimentacoes: stats.movimentacoes,
        veiculosUnicos: stats.veiculosUnicos.size,
        mediaPorVeiculo: stats.veiculosUnicos.size > 0 ? stats.movimentacoes / stats.veiculosUnicos.size : 0
      }))
      .sort((a, b) => b.movimentacoes - a.movimentacoes)
      .slice(0, 8);
  }, [patioMov]);

  // ANÁLISE 4: Custo de pátio (estimativa)
  const custoPatioAnalysis = useMemo(() => {
    const custoDiario = 15; // R$ 15/dia por veículo (ajustar conforme realidade)
    const improdutivos = frota.filter(v => getCategory(v.Status) === 'Improdutiva');
    
    const custoMensal = improdutivos.reduce((sum, v) => {
      return sum + (parseNum(v.DiasNoStatus) * custoDiario);
    }, 0);
    
    const veiculosTop = improdutivos
      .map(v => ({
        placa: v.Placa,
        modelo: v.Modelo,
        dias: parseNum(v.DiasNoStatus),
        custoEstimado: parseNum(v.DiasNoStatus) * custoDiario
      }))
      .sort((a, b) => b.custoEstimado - a.custoEstimado)
      .slice(0, 10);
    
    return {
      custoTotal: custoMensal,
      custoDiario,
      veiculosTop
    };
  }, [frota]);

  // ANÁLISE 5: Heat map temporal (dia da semana)
  const temporalHeatmap = useMemo(() => {
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const heatmapData = diasSemana.map((dia, idx) => ({ dia, movimentacoes: 0, dayIndex: idx }));
    
    patioMov.forEach((mov: any) => {
      const date = new Date(mov.DataMovimentacao);
      const dayOfWeek = date.getDay();
      heatmapData[dayOfWeek].movimentacoes += 1;
    });
    
    return heatmapData;
  }, [patioMov]);

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-slate-900">Monitoramento de Frota Improdutiva</Title>
          <Text className="text-slate-500">Análise temporal e drill-down de veículos parados</Text>
        </div>
        <div className="flex items-center gap-3">
          <DataUpdateBadge metadata={frotaMetadata} compact />
          <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full flex gap-2 font-medium">
            <AlertTriangle className="w-4 h-4"/> Controle de Ociosidade
          </div>
        </div>
      </div>

      {/* Aviso sobre dados faltantes */}
      {!hasPatioData && (
        <Card className="bg-amber-50 border border-amber-200">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <Title className="text-amber-800">Dados de Movimentação de Pátio Indisponíveis</Title>
              <Text className="text-amber-700 mt-2">
                As análises avançadas (tempo médio por pátio, taxa de giro, análise de usuários, heat map) 
                requerem dados de movimentação que ainda não foram gerados pelo ETL.
              </Text>
              <Text className="text-amber-700 mt-2 font-medium">
                Execute: <code className="bg-amber-100 px-2 py-1 rounded">cd scripts/local-etl && node run-sync-v2.js</code>
              </Text>
            </div>
          </div>
        </Card>
      )}

      {/* KPIs Atuais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="rose">
          <Text>Veículos Improdutivos Agora</Text>
          <Metric>{currentIdleKPIs.qtd}</Metric>
          <Text className="text-xs text-slate-500 mt-1">{currentIdleKPIs.pct.toFixed(1)}% da frota ativa</Text>
        </Card>
        <Card decoration="top" decorationColor={currentIdleKPIs.trend > 0 ? 'rose' : 'emerald'}>
          <Text>Tendência (7 dias)</Text>
          <Metric className={currentIdleKPIs.trend > 0 ? 'text-rose-600' : 'text-emerald-600'}>
            {currentIdleKPIs.trend > 0 ? '+' : ''}{currentIdleKPIs.trend.toFixed(1)}%
          </Metric>
          <Text className="text-xs text-slate-500 mt-1">
            {currentIdleKPIs.trend > 0 ? 'Aumentando' : 'Diminuindo'}
          </Text>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <Text>Tempo Médio Parado</Text>
          <Metric>{currentIdleKPIs.mediaDias.toFixed(0)} dias</Metric>
          <Text className="text-xs text-slate-500 mt-1">Média da frota improdutiva</Text>
        </Card>
        <Card decoration="top" decorationColor="blue">
          <Text>Período Analisado</Text>
          <Metric className="text-xl">90 dias</Metric>
          <Text className="text-xs text-slate-500 mt-1">Histórico diário</Text>
        </Card>
      </div>

      {/* Gráfico de Tendência Histórica */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div>
            <Title>Evolução Diária - % Frota Improdutiva (Últimos 90 dias)</Title>
            <Text className="text-xs text-slate-500 mt-1">
              Clique em um ponto do gráfico para ver detalhamento dos veículos naquele dia
            </Text>
          </div>
          <Badge color="rose" icon={TrendingDown}>
            {dailyIdleHistory[dailyIdleHistory.length - 1]?.pct.toFixed(1)}% hoje
          </Badge>
        </div>
        <div className="h-96 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={dailyIdleHistory}
              onClick={(data) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  setSelectedDate(data.activePayload[0].payload.date);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 10 }} 
                interval={Math.floor(dailyIdleHistory.length / 15)}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                domain={[0, 'auto']}
                label={{ value: '% Improdutiva', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload[0]) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border border-slate-200 rounded shadow-lg">
                        <p className="font-semibold text-slate-700">{new Date(data.date).toLocaleDateString('pt-BR')}</p>
                        <p className="text-rose-600 font-bold">{data.pct}% Improdutiva</p>
                        <p className="text-xs text-slate-500">{data.improdutiva} de {data.total} veículos</p>
                        <p className="text-xs text-blue-600 mt-1">Clique para detalhes</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="pct" 
                name="% Improdutiva" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ fill: '#ef4444', r: 3 }}
                activeDot={{ r: 6, cursor: 'pointer' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detalhamento do Dia Selecionado (com rolagem e paginação) */}
      {selectedDate && (
        <Card className="p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-rose-50">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-rose-600" />
              <div>
                <Title>Detalhamento - {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric' 
                })}</Title>
                <Text className="text-sm">
                  {vehiclesOnSelectedDate.length} veículos improdutivos neste dia
                </Text>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors border px-2 py-1 rounded bg-white"
                title="Como os dados são calculados?"
              >
                <HelpCircle size={18}/>
              </button>
              <button
                onClick={() => exportToExcel(vehiclesOnSelectedDate, `improdutivos_${selectedDate}`)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 transition-colors border px-3 py-1 rounded bg-white"
              >
                <FileSpreadsheet size={16}/> Exportar
              </button>
              <button
                onClick={() => setSelectedDate(null)}
                className="px-3 py-1 text-sm bg-white border rounded hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Placa</th>
                    <th className="px-6 py-3">Modelo</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Pátio</th>
                    <th className="px-6 py-3 text-right">Dias Parado</th>
                    <th className="px-6 py-3">Data Início Status</th>
                    <th className="px-6 py-3">Última Movimentação</th>
                    <th className="px-6 py-3">Usuário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehiclesOnSelectedDate.map((v, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium font-mono">{v.Placa}</td>
                      <td className="px-6 py-3">{v.Modelo}</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                          {v.Status}
                        </span>
                      </td>
                      <td className="px-6 py-3">{v.Patio}</td>
                      <td className="px-6 py-3 text-right font-bold text-rose-600">{v.DiasNoStatus} dias</td>
                      <td className="px-6 py-3 text-slate-500">
                        {fmtDate(v.DataInicioStatus)}
                      </td>
                      <td className="px-6 py-3 text-slate-500">
                        {v.UltimaMovimentacao !== '-' ? fmtDate(v.UltimaMovimentacao) : '-'}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-600">{v.UsuarioMovimentacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
            <div className="text-sm text-slate-600">Mostrando {Math.min(pageSize, vehiclesOnSelectedDate.length)} de {vehiclesOnSelectedDate.length}</div>
            <div className="text-sm text-slate-600">Role para ver todos</div>
          </div>
        </Card>
      )}

      {/* Modal de Ajuda */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-blue-50 p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <Title className="text-blue-900">💡 Como os Dados São Calculados</Title>
                  <Text className="text-blue-700 mt-1">Entenda a lógica por trás de cada coluna do detalhamento</Text>
                </div>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                  Placa
                </h3>
                <p className="text-sm text-slate-600 ml-8">Identificação única do veículo no sistema.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</span>
                  Modelo
                </h3>
                <p className="text-sm text-slate-600 ml-8">Descrição completa do modelo do veículo cadastrado na frota.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">3</span>
                  Status
                </h3>
                <p className="text-sm text-slate-600 ml-8">Situação atual do veículo. Exibe apenas status improdutivos como: <strong>Reserva</strong>, <strong>Bloqueado</strong>, <strong>Disponível</strong>, etc. Não exibe veículos locados (produtivos) ou inativos (vendidos/baixados).</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">4</span>
                  Pátio
                </h3>
                <p className="text-sm text-slate-600 ml-8">Localização física do veículo. Vem da última movimentação de pátio registrada. Se não houver movimentação registrada, busca o campo "Localização" do cadastro da frota.</p>
              </div>
              
              <div className="bg-amber-50 p-4 rounded border-l-4 border-amber-400">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs">5</span>
                  Dias Parado ⭐
                </h3>
                <p className="text-sm text-slate-700 ml-8 mb-2"><strong>Cálculo:</strong></p>
                <ul className="text-sm text-slate-600 ml-8 space-y-1 list-disc list-inside">
                  <li>Compara a data da <strong>última movimentação de pátio</strong> vs <strong>última devolução de locação</strong></li>
                  <li>Usa a <strong>data mais recente</strong> entre as duas</li>
                  <li>Calcula: <code className="bg-slate-100 px-1 rounded">Dias = Data Hoje - Data Início</code></li>
                  <li>Exemplo: Se última movimentação foi 06/10/2025 e hoje é 05/01/2026 → <strong>91 dias</strong></li>
                </ul>
              </div>
              
              <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">6</span>
                  Data Início Status ⭐
                </h3>
                <p className="text-sm text-slate-700 ml-8 mb-2"><strong>Lógica de determinação:</strong></p>
                <ol className="text-sm text-slate-600 ml-8 space-y-1 list-decimal list-inside">
                  <li>Busca última movimentação de pátio da placa</li>
                  <li>Busca última devolução de locação da placa</li>
                  <li>Compara as duas datas e <strong>usa a mais recente</strong></li>
                  <li>Esta é considerada a data que o veículo entrou no status improdutivo atual</li>
                </ol>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">7</span>
                  Última Movimentação
                </h3>
                <p className="text-sm text-slate-600 ml-8">Data e hora da última vez que o veículo foi movimentado entre pátios ou devolvido de uma locação. Mesma data usada para calcular "Dias Parado".</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">8</span>
                  Usuário
                </h3>
                <p className="text-sm text-slate-600 ml-8">Nome do usuário que registrou a última movimentação de pátio do veículo. Útil para rastreabilidade e auditoria.</p>
              </div>
              
              <div className="bg-emerald-50 p-4 rounded border border-emerald-200 mt-6">
                <h3 className="font-semibold text-emerald-900 mb-2">📊 Cálculo do % Improdutiva (Gráfico)</h3>
                <p className="text-sm text-emerald-700">
                  <strong>Fórmula:</strong> (Veículos Improdutivos / Total Veículos Ativos) × 100
                </p>
                <p className="text-xs text-emerald-600 mt-2">
                  <strong>Veículos Ativos</strong> = Produtivos (locados) + Improdutivos (parados). Não inclui inativos (vendidos, baixados, sinistro total).
                </p>
              </div>
            </div>
            <div className="sticky bottom-0 bg-slate-50 p-4 border-t">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <Title>Alertas Automáticos</Title>
          <div className="mt-4 space-y-3">
            {currentIdleKPIs.pct > 15 && (
              <div className="flex gap-3 p-3 bg-rose-50 rounded border-l-4 border-rose-500">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-700">Taxa de ociosidade alta</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {currentIdleKPIs.pct.toFixed(1)}% da frota está improdutiva. Revisar status e acelerar vendas/mobilização.
                  </p>
                </div>
              </div>
            )}
            {currentIdleKPIs.mediaDias > 30 && (
              <div className="flex gap-3 p-3 bg-amber-50 rounded border-l-4 border-amber-500">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">Tempo médio elevado</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Veículos parados há {currentIdleKPIs.mediaDias.toFixed(0)} dias em média. Priorizar liquidação rápida.
                  </p>
                </div>
              </div>
            )}
            {currentIdleKPIs.trend > 2 && (
              <div className="flex gap-3 p-3 bg-rose-50 rounded border-l-4 border-rose-500">
                <TrendingDown className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-700">Tendência de piora</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Aumento de {currentIdleKPIs.trend.toFixed(1)}% nos últimos 7 dias. Ações urgentes necessárias.
                  </p>
                </div>
              </div>
            )}
            {!currentIdleKPIs.pct && !currentIdleKPIs.mediaDias && !currentIdleKPIs.trend && (
              <div className="text-center py-4 text-slate-500">
                <p className="text-sm">✅ Nenhum alerta crítico no momento</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ANÁLISES AVANÇADAS */}
      {hasPatioData ? (
        <div className="mt-8">
          <Title className="text-2xl mb-6">Análises Avançadas de Pátio e Operações</Title>
        
          {/* Análise 1: Tempo Médio por Pátio */}
          {patioAnalysis.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <Title>Tempo Médio de Permanência por Pátio</Title>
            </div>
            <Text className="text-xs text-slate-500 mb-4">
              Média de dias até próxima movimentação + veículos improdutivos atuais
            </Text>
            {patioAnalysis.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patioAnalysis} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={10} />
                  <YAxis dataKey="patio" type="category" width={120} fontSize={10} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-semibold">{data.patio}</p>
                            <p className="text-blue-600">Média: {data.mediaDias.toFixed(1)} dias</p>
                            <p className="text-rose-600">{data.veiculosImprodutivos} improdutivos</p>
                            <p className="text-xs text-slate-500">{data.movimentacoes} movimentações</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="mediaDias" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="veiculosImprodutivos" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">Aguardando dados de movimentação...</p>
              </div>
            )}
          </Card>

          {/* Análise 2: Taxa de Giro */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <Title>Taxa de Giro de Pátio</Title>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded">
                <Text className="text-xs text-slate-600">Taxa de Giro/Mês</Text>
                <Metric className="text-blue-600">{giroPatioAnalysis.taxaGiroMes}</Metric>
                <Text className="text-xs text-slate-500">movimentações por veículo</Text>
              </div>
              <div className="bg-emerald-50 p-4 rounded">
                <Text className="text-xs text-slate-600">Total Movimentações</Text>
                <Metric className="text-emerald-600">{giroPatioAnalysis.totalMovimentacoes}</Metric>
                <Text className="text-xs text-slate-500">{giroPatioAnalysis.totalVeiculos} veículos</Text>
              </div>
            </div>
            <div className="border-t pt-4">
              <Text className="text-xs font-semibold text-slate-600 mb-2">Top 5 Veículos - Mais Mudanças</Text>
              <div className="space-y-2">
                {giroPatioAnalysis.veiculosMaisMudancas.map((v, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="font-mono font-medium">{v.placa}</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
                      {v.mudancas} mudanças
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
        ) : null}

        {/* Análise 3: Usuários + Análise 4: Custo */}
        {(userAnalysis.length > 0 || custoPatioAnalysis.veiculosTop.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {userAnalysis.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-600" />
              <Title>Análise de Usuários - Movimentações</Title>
            </div>
            <Text className="text-xs text-slate-500 mb-4">
              Quem mais movimenta veículos entre pátios
            </Text>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="user" angle={-45} textAnchor="end" height={100} fontSize={9} />
                  <YAxis fontSize={10} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-semibold text-sm">{data.user}</p>
                            <p className="text-purple-600">{data.movimentacoes} movimentações</p>
                            <p className="text-blue-600">{data.veiculosUnicos} veículos</p>
                            <p className="text-xs text-slate-500">
                              Média: {data.mediaPorVeiculo.toFixed(1)} mov/veículo
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="movimentacoes" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          )}

          {custoPatioAnalysis.veiculosTop.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-rose-600" />
              <Title>Custo Estimado de Ociosidade</Title>
            </div>
            <div className="bg-rose-50 p-4 rounded mb-4">
              <Text className="text-xs text-slate-600">Custo Total Acumulado</Text>
              <Metric className="text-rose-600">
                R$ {custoPatioAnalysis.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Metric>
              <Text className="text-xs text-slate-500 mt-1">
                Baseado em R$ {custoPatioAnalysis.custoDiario}/dia por veículo
              </Text>
            </div>
            <div className="border-t pt-4">
              <Text className="text-xs font-semibold text-slate-600 mb-3">Top 10 Veículos - Maior Custo</Text>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {custoPatioAnalysis.veiculosTop.map((v, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs border-b pb-2">
                    <div>
                      <p className="font-mono font-semibold">{v.placa}</p>
                      <p className="text-slate-500 text-[10px]">{v.modelo}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-600">
                        R$ {v.custoEstimado.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-slate-500">{v.dias} dias</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          )}
        </div>
        )}

        {/* Análise 5: Heat Map Temporal */}
        {temporalHeatmap.some(d => d.movimentacoes > 0) && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-amber-600" />
            <Title>Heat Map Temporal - Movimentações por Dia da Semana</Title>
          </div>
          <Text className="text-xs text-slate-500 mb-4">
            Identificar padrões: quando ocorrem mais movimentações de veículos?
          </Text>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={temporalHeatmap}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" fontSize={11} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="movimentacoes" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                    {temporalHeatmap.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={temporalHeatmap}
                    dataKey="movimentacoes"
                    nameKey="dia"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.dia}: ${entry.movimentacoes}`}
                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                  >
                    {temporalHeatmap.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 p-4 bg-amber-50 rounded">
            <p className="text-xs text-slate-700">
              <strong>Insight:</strong> {(() => {
                const maxDay = temporalHeatmap.reduce((max, day) => 
                  day.movimentacoes > max.movimentacoes ? day : max
                );
                const minDay = temporalHeatmap.reduce((min, day) => 
                  day.movimentacoes < min.movimentacoes ? day : min
                );
                return `${maxDay.dia} é o dia com mais movimentações (${maxDay.movimentacoes}), 
                enquanto ${minDay.dia} tem menos (${minDay.movimentacoes}). 
                Considere ajustar equipe e recursos conforme demanda.`;
              })()}
            </p>
          </div>
        </Card>
        )}

        
      </div>
      ) : (
        <Card className="mt-8">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <Title className="text-slate-600">Análises Avançadas Indisponíveis</Title>
            <Text className="text-slate-500 mt-2">
              Execute o ETL para gerar os dados de movimentação de pátio necessários para as análises avançadas.
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
}
