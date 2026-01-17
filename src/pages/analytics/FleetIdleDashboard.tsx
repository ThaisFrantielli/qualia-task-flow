import { useMemo, useState, useEffect } from 'react';
import useBIData from '@/hooks/useBIData';
import { useTimelineData } from '@/hooks/useTimelineData';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingDown, Calendar, AlertTriangle, FileSpreadsheet, HelpCircle } from 'lucide-react';
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

function parseDateSafe(v: any): Date {
  if (!v) return new Date(0);
  try {
    const s = String(v).trim();
    // Normalizar 'YYYY-MM-DD HH:mm:ss' para 'YYYY-MM-DDTHH:mm:ss' para parsing mais consistente
    const normalized = s.replace(' ', 'T');
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return new Date(0);
    return d;
  } catch (e) {
    return new Date(0);
  }
}

const getCategory = (status: string) => {
  const s = (status || '').toUpperCase().trim();
  
  // REGRA 1: Improdutiva (Específica e Restrita)
  if (['RESERVA', 'DISPONÍVEL', 'DISPONIVEL', 'BLOQUEADO'].includes(s)) {
    return 'Improdutiva';
  }
  
  // REGRA 2: Inativa (Fora de operação)
  if ([
    'VENDIDO', 'BAIXADO', 'SINISTRO PERDA TOTAL', 'ROUBO', 'FURTO', 'DEVOLVIDO'
  ].includes(s)) {
    return 'Inativa';
  }
  
  // REGRA 3: Produtiva (Todo o resto)
  return 'Produtiva';
};

export default function FleetIdleDashboard(): JSX.Element {
  const { data: frotaData, metadata: frotaMetadata } = useBIData<AnyObject[]>('dim_frota');
  // Timeline via Edge Function otimizada
  useTimelineData('recent');
  const { data: patioMovData } = useBIData<AnyObject[]>('dim_movimentacao_patios');
  const { data: veiculoMovData } = useBIData<AnyObject[]>('dim_movimentacao_veiculos');
  const { data: historicoSituacaoRaw } = useBIData<AnyObject[]>('historico_situacao_veiculos');

  const frota = useMemo(() => Array.isArray(frotaData) ? frotaData : [], [frotaData]);
  const patioMov = useMemo(() => Array.isArray(patioMovData) ? patioMovData : [], [patioMovData]);
  const veiculoMov = useMemo(() => Array.isArray(veiculoMovData) ? veiculoMovData : [], [veiculoMovData]);
  const historicoSituacao = useMemo(() => Array.isArray(historicoSituacaoRaw) ? historicoSituacaoRaw : [], [historicoSituacaoRaw]);

  // Construir mapa de histórico e mapa de veículo atual uma vez (reutilizados)
  const historicoMap = useMemo(() => {
    const map = new Map<string, any[]>();
    historicoSituacao.forEach((h: any) => {
      const placa = h.Placa;
      if (!placa) return;
      if (!map.has(placa)) map.set(placa, []);
      map.get(placa)!.push(h);
    });
    map.forEach((arr) => arr.sort((a: any, b: any) => parseDateSafe(a?.UltimaAtualizacao).getTime() - parseDateSafe(b?.UltimaAtualizacao).getTime()));
    return map;
  }, [historicoSituacao]);

  const veiculoAtualMap = useMemo(() => {
    const m = new Map<string, any>();
    frota.forEach(v => { if (v.Placa) m.set(v.Placa, v); });
    return m;
  }, [frota]);

  // Menor timestamp entre todas as fontes (usado para o modo 'all')
  

  

  // Resolve o status de uma placa em uma data (snapshot). Retorna { status, lastChangeDate, usedHistorico, usedFallback }
  const resolveStatusForDate = (placa: string, checkDate: Date) => {
    const events = (historicoMap.get(placa) || []);
    let status: string | null = null;
    let usedHistorico = false;
    let lastChangeDate: string | null = null;

    if (events.length > 0) {
      for (let j = events.length - 1; j >= 0; j--) {
        const evDate = parseDateSafe(events[j]?.UltimaAtualizacao);
        if (evDate.getTime() <= checkDate.getTime()) {
          status = events[j]?.SituacaoVeiculo || null;
          usedHistorico = true;
          lastChangeDate = evDate.toISOString();
          break;
        }
      }
    }

    if (!status) {
      const v = veiculoAtualMap.get(placa);
      if (v) {
        status = v.Status ?? null;
      }
    }

    return { status, usedHistorico, lastChangeDate };
  };

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'30d' | '90d' | '180d'>('90d');
  // Debug: log quando periodoSelecionado mudar
  useEffect(() => {
    console.log('[FleetIdle] periodoSelecionado:', periodoSelecionado);
  }, [periodoSelecionado]);
  
  const pageSize = 10;

  // Debug: verificar dados carregados
  const hasPatioData = patioMov.length > 0;

  // Gerar histórico diário de % improdutiva (90 dias ou todo histórico disponível)
  const dailyIdleHistory = useMemo(() => {
    const today = new Date();
    const data: { date: string; dateLocal: string; pct: number; improdutiva: number; total: number; displayDate: string }[] = [];

    // Debug log
    console.log('📊 [FleetIdle] Total de placas na frota:', frota.length);
    console.log('📊 [FleetIdle] Total de eventos no histórico:', historicoSituacao.length);
    console.log('📊 [FleetIdle] Placas com histórico:', historicoMap.size);

    const placas = frota.map(v => v.Placa).filter(Boolean);

    // (usar `veiculoAtualMap` memoizado acima para fallback de status)

    // Determinar quantidade de dias a gerar com base no filtro de período
    let daysToGenerate = 90;
    if (periodoSelecionado === '30d') {
      daysToGenerate = 30;
    } else if (periodoSelecionado === '90d') {
      daysToGenerate = 90;
    } else if (periodoSelecionado === '180d') {
      daysToGenerate = 180;
    }

    // Gerar últimos `daysToGenerate` dias
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      checkDate.setHours(23, 59, 59, 999); // considerar até o fim do dia

      // Gerar `dateStr` no formato YYYY-MM-DD usando a data local (evita shift UTC)
      const y = checkDate.getFullYear();
      const m = String(checkDate.getMonth() + 1).padStart(2, '0');
      const d = String(checkDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dateISO = checkDate.toISOString();
      const displayDate = checkDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      let improdutivaCount = 0;
      let activeCount = 0;
      let usandoHistoricoCount = 0;
      let usandoFallbackCount = 0;

      placas.forEach((placa: string) => {
        const { status, usedHistorico } = resolveStatusForDate(placa, checkDate);
        if (usedHistorico) usandoHistoricoCount++;
        else usandoFallbackCount++;

        if (!status) return;

        const cat = getCategory(status || '');
        if (cat === 'Produtiva' || cat === 'Improdutiva') activeCount += 1;
        if (cat === 'Improdutiva') improdutivaCount += 1;
      });

      const pct = activeCount > 0 ? (improdutivaCount / activeCount) * 100 : 0;
      data.push({ date: dateISO, dateLocal: dateStr, pct: Number(pct.toFixed(1)), improdutiva: improdutivaCount, total: activeCount, displayDate });

      // Debug para primeiros e últimos dias
      if (daysToGenerate <= 100) {
        if (i >= daysToGenerate - 3 || i <= 2) {
          console.log(`📅 [${dateStr}] Improd: ${improdutivaCount}, Total: ${activeCount}, Pct: ${pct.toFixed(1)}%, Histórico: ${usandoHistoricoCount}, Fallback: ${usandoFallbackCount}`);
        }
      } else {
        // apenas amostra
        if (i % Math.ceil(daysToGenerate / 6) === 0) {
          console.log(`📅 [${dateStr}] Improd: ${improdutivaCount}, Total: ${activeCount}, Pct: ${pct.toFixed(1)}%`);
        }
      }
    }

    console.log('📊 [FleetIdle] Histórico gerado com', data.length, 'dias');
    return data;
  }, [frota, historicoSituacao, periodoSelecionado, patioMov, veiculoMov]);

  // Veículos improdutivos na data selecionada
  const vehiclesOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    // Construir checkDate a partir da string YYYY-MM-DD como data local
    const parts = selectedDate.split('-').map((p) => parseInt(p, 10));
    const checkDate = parts.length === 3
      ? new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999)
      : new Date(selectedDate + 'T23:59:59');
    const placas = frota.map(v => v.Placa).filter(Boolean);

    // Usar historicoMap centralizado

    const improdutivos: any[] = [];

    placas.forEach((placa: string) => {
      const v = frota.find(f => f.Placa === placa) || {} as any;

      // Reconstruir status até checkDate usando a função centralizada
      const { status: currentStatus, lastChangeDate } = resolveStatusForDate(placa, checkDate);
      const cat = getCategory(currentStatus || '');
      if (cat === 'Improdutiva') {
        // Movimentações de pátio
          const movPatio = patioMov
            .filter((m: any) => m.Placa === placa)
            .sort((a: any, b: any) => parseDateSafe(b.DataMovimentacao).getTime() - parseDateSafe(a.DataMovimentacao).getTime());
        const ultimoMovPatio = movPatio[0];

        const movVeiculo = veiculoMov
          .filter((m: any) => m.Placa === placa)
          .sort((a: any, b: any) => parseDateSafe(b.DataDevolucao || b.DataRetirada).getTime() - parseDateSafe(a.DataDevolucao || a.DataRetirada).getTime());
        const ultimaLocacao = movVeiculo[0];

        // Data de início do status: preferir a última mudança detectada nos logs
        let dataInicioStatus = lastChangeDate || (ultimaLocacao?.DataDevolucao ? parseDateSafe(ultimaLocacao.DataDevolucao).toISOString() : null) || (ultimoMovPatio?.DataMovimentacao ? parseDateSafe(ultimoMovPatio.DataMovimentacao).toISOString() : null) || null;

        let diasNoStatus = 0;
        if (dataInicioStatus) {
          const dataInicio = new Date(dataInicioStatus);
          const hoje = new Date();
          diasNoStatus = Math.floor((hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
        }

        const patio = ultimoMovPatio?.Patio || v.Localizacao || '-';

        improdutivos.push({
          Placa: placa,
          Modelo: v.Modelo,
          Status: currentStatus || v.Status,
          Patio: patio,
          DiasNoStatus: Math.max(0, diasNoStatus),
          DataInicioStatus: dataInicioStatus,
          UltimaMovimentacao: ultimoMovPatio?.DataMovimentacao || ultimaLocacao?.DataDevolucao || '-',
          UsuarioMovimentacao: ultimoMovPatio?.UsuarioMovimentacao || '-'
        });
      }
    });

    return improdutivos;
  }, [frota, patioMov, veiculoMov, selectedDate, historicoSituacao]);

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

  // Análises de pátio removidas (cálculos anteriormente usados na seção eliminada)

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
          <Metric className="text-xl">{dailyIdleHistory.length} dias</Metric>
          <Text className="text-xs text-slate-500 mt-1">Histórico diário</Text>
        </Card>
      </div>

      {/* Gráfico de Tendência Histórica */}
      <Card>
        <div className="flex justify-between items-center mb-4">
            <div>
              <Title>Evolução Diária - % Frota Improdutiva</Title>
              <Text className="text-xs text-slate-500 mt-1">
                Clique em um ponto do gráfico para ver detalhamento dos veículos naquele dia
              </Text>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-md shadow-sm bg-white p-1 border">
                <button
                  onClick={() => setPeriodoSelecionado('30d')}
                  className={`text-sm px-3 py-1 rounded ${periodoSelecionado === '30d' ? 'bg-rose-100 text-rose-700 font-medium' : 'text-slate-600'}`}
                  title="Últimos 30 dias"
                >
                  Últimos 30 dias
                
                <button
                  onClick={() => setPeriodoSelecionado('90d')}
                  className={`text-sm px-3 py-1 rounded ${periodoSelecionado === '90d' ? 'bg-rose-100 text-rose-700 font-medium' : 'text-slate-600'}`}
                  title="Últimos 90 dias"
                >
                  Últimos 90 dias
                </button>
                <button
                  onClick={() => setPeriodoSelecionado('180d')}
                  className={`text-sm px-3 py-1 rounded ${periodoSelecionado === '180d' ? 'bg-rose-100 text-rose-700 font-medium' : 'text-slate-600'}`}
                  title="Últimos 6 meses"
                >
                  Últimos 6 meses
                </button>
                </button>
              </div>
              <Badge color="rose" icon={TrendingDown}>
                {(dailyIdleHistory[dailyIdleHistory.length - 1]?.pct ?? 0).toFixed(1)}% hoje
              </Badge>
            </div>
          </div>
        <div className="h-96 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={dailyIdleHistory}
              onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const payload = data.activePayload[0].payload;
                    // preferir dateLocal (YYYY-MM-DD) para evitar shift UTC
                    const local = payload.dateLocal || (payload.date ? new Date(payload.date).toISOString().split('T')[0] : null);
                    if (local) setSelectedDate(local);
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
                <p className="text-sm text-slate-600 ml-8">Identificador único do veículo no sistema.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</span>
                  Modelo
                </h3>
                <p className="text-sm text-slate-600 ml-8">Nome do modelo conforme o cadastro da frota.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">3</span>
                  Status
                </h3>
                <p className="text-sm text-slate-600 ml-8">Situação atual do veículo. Lista apenas status considerados improdutivos (ex.: <strong>Reserva</strong>, <strong>Bloqueado</strong>, <strong>Disponível</strong>). Veículos locados (produtivos) ou inativos (vendidos/baixados/sinistro total) não são exibidos.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">4</span>
                  Pátio
                </h3>
                <p className="text-sm text-slate-600 ml-8">Localização física do veículo, baseada na última movimentação de pátio registrada. Se não houver movimentação, utiliza o campo "Localização" do cadastro da frota.</p>
              </div>
              
              <div className="bg-amber-50 p-4 rounded border-l-4 border-amber-400">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs">5</span>
                  Dias Parado ⭐
                </h3>
                <p className="text-sm text-slate-700 ml-8 mb-2"><strong>Cálculo:</strong></p>
                <ul className="text-sm text-slate-600 ml-8 space-y-1 list-disc list-inside">
                  <li>Compara a data da <strong>última movimentação de pátio</strong> com a data da <strong>última devolução de locação</strong>.</li>
                  <li>Seleciona a <strong>data mais recente</strong> entre as duas como <em>Data Início</em>.</li>
                  <li>Calcula: <code className="bg-slate-100 px-1 rounded">Dias = Data Hoje - Data Início</code></li>
                  <li>Exemplo: última movimentação em 06/10/2025 → hoje (05/01/2026) = <strong>91 dias</strong></li>
                </ul>
              </div>
              
              <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">6</span>
                  Data Início Status ⭐
                </h3>
                <p className="text-sm text-slate-700 ml-8 mb-2"><strong>Lógica:</strong></p>
                <ol className="text-sm text-slate-600 ml-8 space-y-1 list-decimal list-inside">
                  <li>Obtém a última movimentação de pátio (se houver).</li>
                  <li>Obtém a última devolução de locação (se houver).</li>
                  <li>Compara as datas e utiliza a <strong>mais recente</strong> como Data Início.</li>
                  <li>Essa data representa o início do status improdutivo atual.</li>
                </ol>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">7</span>
                  Última Movimentação
                </h3>
                <p className="text-sm text-slate-600 ml-8">Data e hora da última movimentação entre pátios ou devolução de locação. Essa data é utilizada no cálculo de "Dias Parado".</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">8</span>
                  Usuário
                </h3>
                <p className="text-sm text-slate-600 ml-8">Nome do usuário que registrou a última movimentação. Importante para rastreabilidade e auditoria.</p>
              </div>
              
              <div className="bg-emerald-50 p-4 rounded border border-emerald-200 mt-6">
                <h3 className="font-semibold text-emerald-900 mb-2">📊 Cálculo do % Improdutiva (Gráfico)</h3>
                <p className="text-sm text-emerald-700">
                  <strong>Fórmula:</strong> (Veículos Improdutivos / Veículos Ativos) × 100
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

      {/* Seção 'Análises Avançadas de Pátio e Operações' removida */}
    </div>
  );
}
