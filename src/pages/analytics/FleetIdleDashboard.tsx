import { useMemo, useState, useEffect, useRef } from 'react';
import useBIData from '@/hooks/useBIData';
import useBIDataBatch, { getBatchTable } from '@/hooks/useBIDataBatch';
import { useTimelineData } from '@/hooks/useTimelineData';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingDown, Calendar, AlertTriangle, FileSpreadsheet, HelpCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import DataUpdateBadge from '@/components/DataUpdateBadge';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';

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

const normalizeStatus = (value: string) =>
  (value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getCategory = (status: string) => {
  const s = normalizeStatus(status);
  // Produtiva: includes rented / in mobilization / internal use
  if (s.includes('LOCAD') || s.includes('USO INTERNO') || s.includes('EM MOBILIZ') || s.includes('LOCADO VEICULO RESERVA')) {
    return 'Produtiva';
  }

  // Inativa: sold, written-off, theft/loss, returned, unavailable for use or explicitly marked for sale
  if (
    s.includes('VEND') ||
    s.includes('BAIXAD') ||
    s.includes('SINISTR') ||
    s.includes('ROUB') ||
    s.includes('FURT') ||
    s.includes('DEVOLV') ||
    s.includes('NAO DISPONIV') ||
    s.includes('DESMOBILIZ') ||
    // only treat as 'Inativa' when it's explicitly 'Disponivel para venda' (contains both tokens)
    (s.includes('DISPONIVEL') && s.includes('VENDA'))
  ) {
    return 'Inativa';
  }

  return 'Improdutiva';
};

export default function FleetIdleDashboard(): JSX.Element {
  // Batch load primary tables (frota + movimentacoes) to reduce HTTP requests
  const { results: primaryResults, metadata: primaryMeta, loading: loadingPrimary } = useBIDataBatch([
    'dim_frota', 'dim_movimentacao_patios', 'dim_movimentacao_veiculos'
  ]);
  // Timeline via Edge Function otimizada
  useTimelineData('recent');
  const frotaData = getBatchTable<AnyObject>(primaryResults, 'dim_frota');
  const patioMovData = getBatchTable<AnyObject>(primaryResults, 'dim_movimentacao_patios');
  const veiculoMovData = getBatchTable<AnyObject>(primaryResults, 'dim_movimentacao_veiculos');
  const frotaMetadata = useMemo(() => (primaryResults['dim_frota'] as any)?.metadata || primaryMeta || null, [primaryResults, primaryMeta]);
  const { data: historicoSituacaoRaw } = useBIData<AnyObject[]>('historico_situacao_veiculos');

  // Normalizar dados da frota para nomes de propriedades consistentes
  const frota = useMemo(() => {
    const raw = Array.isArray(frotaData) ? frotaData : [];
    return raw.map((v: any) => ({
      ...v,
      Placa: String(v.Placa || v.placa || '').trim().toUpperCase(),
      Status: v.Status || v.status || v.SituacaoVeiculo || v.situacaoveiculo || 'N/A',
      FinalidadeUso: String(v.FinalidadeUso || v.finalidadeUso || v.finalidadeuso || v.finalidade || '').trim().toUpperCase(),
      DiasNoStatus: parseNum(v.DiasSituacao || v.diassituacao || v.diasnostatus || v.DiasNoStatus || 0)
    }));
  }, [frotaData]);
  const patioMov = useMemo(() => Array.isArray(patioMovData) ? patioMovData : [], [patioMovData]);
  const veiculoMov = useMemo(() => Array.isArray(veiculoMovData) ? veiculoMovData : [], [veiculoMovData]);
  const historicoSituacao = useMemo(() => Array.isArray(historicoSituacaoRaw) ? historicoSituacaoRaw : [], [historicoSituacaoRaw]);

  // Construir mapa de histórico e mapa de veículo atual uma vez (reutilizados)
  const historicoMap = useMemo(() => {
    const map = new Map<string, any[]>();
    historicoSituacao.forEach((h: any) => {
      const placaRaw = h.Placa || h.placa || '';
      const placa = String(placaRaw).trim().toUpperCase();
      if (!placa) return;
      if (!map.has(placa)) map.set(placa, []);
      map.get(placa)!.push(h);
    });
    map.forEach((arr) => arr.sort((a: any, b: any) => {
      const da = parseDateSafe(a?.UltimaAtualizacao || a?.ultimaatualizacao || a?.DataEvento || a?.dataevento);
      const db = parseDateSafe(b?.UltimaAtualizacao || b?.ultimaatualizacao || b?.DataEvento || b?.dataevento);
      return da.getTime() - db.getTime();
    }));
    return map;
  }, [historicoSituacao]);

  const veiculoAtualMap = useMemo(() => {
    const m = new Map<string, any>();
    frota.forEach(v => { if (v.Placa) m.set(String(v.Placa).trim().toUpperCase(), v); });
    return m;
  }, [frota]);

  // Mapa: placa → data de início da ÚLTIMA sequência Inativa contínua.
  // Apenas para veículos ATUALMENTE Inativa no dim_frota.
  // Veículos reincorporados (ex: recomprados) têm nova inativação mais recente, não a antiga.
  const inactivationDateMap = useMemo(() => {
    const map = new Map<string, Date | null>();
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);

    frota.forEach((v: any) => {
      const placa = String(v.Placa || '').trim().toUpperCase();
      if (!placa) return;
      const currentStatus = v?.Status || v?.status || v?.SituacaoVeiculo || v?.situacaoveiculo || null;

      // Só calcular data de inativação para veículos que HOJE são Inativa
      if (!currentStatus || getCategory(currentStatus) !== 'Inativa') {
        map.set(placa, null);
        return;
      }

      const events = historicoMap.get(placa) || [];
      // Percorrer do mais recente para o mais antigo para achar o início da ÚLTIMA sequência Inativa
      // (interrompida quando encontrar um evento com status não-Inativa)
      let inactiveSince: Date = todayStart;
      for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i];
        const evStatus = ev?.SituacaoVeiculo || ev?.situacaoveiculo || ev?.Situacao || ev?.situacao || null;
        if (!evStatus) continue;
        if (getCategory(evStatus) !== 'Inativa') {
          // Encontrou um evento anterior ao período Inativa atual
          // O início da inativação é o próximo evento Inativa após este
          for (let j = i + 1; j < events.length; j++) {
            const sj = events[j]?.SituacaoVeiculo || events[j]?.situacaoveiculo || events[j]?.Situacao || events[j]?.situacao || null;
            if (sj && getCategory(sj) === 'Inativa') {
              const d = parseDateSafe(events[j]?.UltimaAtualizacao || events[j]?.ultimaatualizacao || events[j]?.DataEvento || events[j]?.dataevento);
              d.setHours(0,0,0,0);
              inactiveSince = d;
              break;
            }
          }
          break; // interrompe a iteração principal
        }
        // ev é Inativa — atualiza inactiveSince com data deste evento (vai recuando)
        const d = parseDateSafe(ev?.UltimaAtualizacao || ev?.ultimaatualizacao || ev?.DataEvento || ev?.dataevento);
        if (d.getTime() > 0) {
          d.setHours(0,0,0,0);
          inactiveSince = d;
        }
      }
      map.set(placa, inactiveSince);
    });

    return map;
  }, [frota, historicoMap]);

  // Cache de status por placa+data (evita recalcular historico repetidamente)
  const statusCacheRef = useRef<Map<string, { status: string | null; usedHistorico: boolean; lastChangeDate: string | null }>>(new Map());

  // Menor timestamp entre todas as fontes (usado para o modo 'all')
  

  

  // Resolve o status de uma placa em uma data (snapshot). Retorna { status, lastChangeDate, usedHistorico, usedFallback }
  const resolveStatusForDate = (placa: string, checkDate: Date) => {
    // Comparação de dia usando data LOCAL para evitar shift UTC
    const toLocalDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const todayStr = toLocalDateStr(new Date());
    const checkDateStr = toLocalDateStr(checkDate);
    const cacheKey = `${placa}|${checkDateStr}`;
    const cached = statusCacheRef.current.get(cacheKey);
    if (cached) return { ...cached };

    // BUG FIX 1: Para o dia ATUAL, sempre usar dim_frota como fonte de verdade.
    // O histórico pode estar desatualizado (último ETL pode ter dias de atraso),
    // enquanto dim_frota.SituacaoVeiculo sempre reflete o estado atual do ERP.
    if (checkDateStr === todayStr) {
      const v = veiculoAtualMap.get(String(placa).trim().toUpperCase());
      const status = v?.Status || v?.status || v?.SituacaoVeiculo || v?.situacaoveiculo || null;
      const result = { status, usedHistorico: false, lastChangeDate: null };
      try { statusCacheRef.current.set(cacheKey, result); } catch (e) { /* ignore */ }
      return result;
    }

    const events = (historicoMap.get(String(placa).trim().toUpperCase()) || []);
    let status: string | null = null;
    let usedHistorico = false;
    let lastChangeDate: string | null = null;

    if (events.length > 0) {
      for (let j = events.length - 1; j >= 0; j--) {
        const evDate = parseDateSafe(
          events[j]?.UltimaAtualizacao || events[j]?.ultimaatualizacao || events[j]?.DataEvento || events[j]?.dataevento
        );
        if (evDate.getTime() <= checkDate.getTime()) {
          const evStatus = events[j]?.SituacaoVeiculo || events[j]?.situacaoveiculo || events[j]?.Situacao || events[j]?.situacao || null;
          // BUG FIX 2: Ignorar eventos sem SituacaoVeiculo (ex: "CONDUTOR DESVINCULADO",
          // "ODÔMETRO FORÇADO", mudanças de localização sem mudança de status, etc.).
          // Antes, o código parava no primeiro evento ≤ checkDate mesmo com status null,
          // impedindo o fallback para dim_frota e excluindo o veículo do count silenciosamente.
          if (!evStatus) continue;
          status = evStatus;
          usedHistorico = true;
          lastChangeDate = evDate.toISOString();
          break;
        }
      }
    }

    // Fallback: distinguir dois casos distintos
    if (!status) {
      // Filtrar apenas eventos que realmente têm uma situação registrada
      // (excluir eventos de localização, condutor vinculado, etc. que têm situacaoveiculo = null)
      const eventsWithStatus = events.filter((e: any) =>
        !!(e?.SituacaoVeiculo || e?.situacaoveiculo || e?.Situacao || e?.situacao)
      );

      if (eventsWithStatus.length === 0) {
        // CASO 3: veículo existe na frota mas NUNCA teve mudança de situação registrada.
        // IMPORTANTE: o fallback para dim_frota só é aplicado para o dia ATUAL.
        // Para datas passadas, usá-lo projetaria retroativamente o status ATUAL (pós-ETL)
        // para todo o histórico, fazendo o % mudar sempre que o ETL atualizar dim_frota.
        // Para dias passados sem evento, o veículo é excluído dos contadores (status desconhecido).
        if (checkDateStr === todayStr) {
          const v = veiculoAtualMap.get(String(placa).trim().toUpperCase());
          const fallbackStatus = v?.Status || v?.status || v?.SituacaoVeiculo || v?.situacaoveiculo || null;
          if (fallbackStatus) {
            status = fallbackStatus;
            usedHistorico = false;
            lastChangeDate = null;
          }
        }
        // else: status permanece null → veículo excluído dos contadores históricos
      } else {
        // Tem eventos com status, mas nenhum é ≤ checkDate.
        // CASO 4a: o evento de status mais antigo é posterior à checkDate
        //          → veículo entrou na frota depois dessa data → excluir.
        // CASO 4b: todos os eventos com status são posteriores (nunca entrou antes)
        //          → idem, excluir.
        // status permanece null → veículo não contabilizado nessa data.
      }
    }
    // status === null → veículo não estava na frota nessa data → excluído dos contadores.
    const result = { status, usedHistorico, lastChangeDate };
    try { statusCacheRef.current.set(cacheKey, result); } catch (e) { /* ignore */ }
    return result;
  };

  // Limpar cache quando dados mudarem para evitar resultados obsoletos
  useEffect(() => {
    statusCacheRef.current.clear();
  }, [historicoSituacao, frota]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'30d' | '90d' | '180d'>('90d');
  // Debug: log quando periodoSelecionado mudar
  // Removido useEffect vazio que causava re-renders potenciais
  
  const pageSize = 10;

  // Gerar histórico diário de % improdutiva (90 dias ou todo histórico disponível)
  const dailyIdleHistory = useMemo(() => {
    const today = new Date();
    const data: { date: string; dateLocal: string; pct: number; improdutiva: number; total: number; displayDate: string; statusBreakdown: Record<string, number> }[] = [];

    // OTIMIZAÇÃO: Filtrar apenas terceiros ANTES do loop pesado. A exclusão de veículos
    // Inativa é aplicada por data mais abaixo (a partir do dia em que ficaram inativos).
    const placas = frota
      .filter(v => v.Placa && v.FinalidadeUso !== 'TERCEIRO')
      .map(v => v.Placa);

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

      // Collect breakdown by normalized status (samples kept for inspection)
      const statusCounts: Record<string, { count: number; placas: string[] }> = {};

      for (let idx = 0; idx < placas.length; idx++) {
        const placa = placas[idx];
        // Excluir veículos a partir do dia em que ficaram Inativa
        const inactDate = inactivationDateMap.get(placa) || null;
        if (inactDate) {
          const inactEnd = new Date(inactDate);
          inactEnd.setHours(23,59,59,999);
          if (checkDate.getTime() >= inactEnd.getTime()) {
            // vehicle is inactive on or after inact date -> do not consider
            continue;
          }
        }
        const { status, usedHistorico } = resolveStatusForDate(placa, checkDate);
        if (usedHistorico) usandoHistoricoCount++;
        else usandoFallbackCount++;
        if (!status) continue;

        // Terceiros já foram filtrados antes do loop
        const cat = getCategory(status || '');

        // Explicitly ignore 'Inativa' statuses so they don't affect counts
        if (cat === 'Inativa') continue;

        // breakdown by normalized status
        const sNorm = normalizeStatus(status || '') || 'N/A';
        if (!statusCounts[sNorm]) statusCounts[sNorm] = { count: 0, placas: [] };
        statusCounts[sNorm].count += 1;
        if (statusCounts[sNorm].placas.length < 10) statusCounts[sNorm].placas.push(placa);

        if (cat === 'Produtiva' || cat === 'Improdutiva') activeCount += 1;
        if (cat === 'Improdutiva') improdutivaCount += 1;
      }

      // If this is the target date, emit detailed debug info to help diagnose discrepancies
      if (dateStr === '2026-02-12') {
        const improdutivaStatuses: Record<string, number> = {};
        const produtivaStatuses: Record<string, number> = {};
        Object.entries(statusCounts).forEach(([s, info]) => {
          const cat = getCategory(s);
          if (cat === 'Improdutiva') improdutivaStatuses[s] = info.count;
          if (cat === 'Produtiva') produtivaStatuses[s] = info.count;
        });

        console.debug('🔍 [FleetIdleDebug] Date:', dateStr);
        console.debug('🔍 totals -> improdutivaCount:', improdutivaCount, 'activeCount:', activeCount, 'pct:', (activeCount>0?((improdutivaCount/activeCount)*100).toFixed(2):'0'));
        console.debug('🔍 usingHistoric:', usandoHistoricoCount, 'usingFallback:', usandoFallbackCount, 'totalPlacasConsidered:', placas.length);
        console.debug('🔍 improdutiva breakdown (status -> count):', improdutivaStatuses);
        console.debug('🔍 produtiva breakdown (status -> count):', produtivaStatuses);
        // Print sample placas per status for quick inspection (max 10 per status)
        Object.entries(statusCounts).forEach(([s, info]) => {
          console.debug(`🔍 status sample: ${s} -> count=${info.count} placas=${info.placas.join(', ')}`);
        });
      }

      const pct = activeCount > 0 ? (improdutivaCount / activeCount) * 100 : 0;

      // Montar breakdown de status para os improdutivos deste dia
      const statusBreakdown: Record<string, number> = {};
      Object.entries(statusCounts).forEach(([s, info]) => {
        if (getCategory(s) === 'Improdutiva') {
          // Usar label mais legível (Title Case)
          const label = s.charAt(0) + s.slice(1).toLowerCase();
          statusBreakdown[label] = info.count;
        }
      });

      data.push({ date: dateISO, dateLocal: dateStr, pct: Number(pct.toFixed(1)), improdutiva: improdutivaCount, total: activeCount, displayDate, statusBreakdown });

    }
    return data;
  }, [frota, historicoSituacao, periodoSelecionado, patioMov, veiculoMov, inactivationDateMap]);

  // Veículos improdutivos na data selecionada
  const vehiclesOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    // Construir checkDate a partir da string YYYY-MM-DD como data local
    const parts = selectedDate.split('-').map((p) => parseInt(p, 10));
    const checkDate = parts.length === 3
      ? new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999)
      : new Date(selectedDate + 'T23:59:59');
    // OTIMIZAÇÃO: Filtrar apenas terceiros antes do processamento (mesma regra usada acima)
    const placas = frota
      .filter(v => v.Placa && v.FinalidadeUso !== 'TERCEIRO')
      .map(v => v.Placa);

    // Usar historicoMap centralizado

    const improdutivos: any[] = [];

    placas.forEach((placa: string) => {
      const v = veiculoAtualMap.get(placa) || {} as any;

      // Excluir veículos a partir do dia em que ficaram Inativa
      const inactDate = inactivationDateMap.get(placa) || null;
      if (inactDate) {
        const inactEnd = new Date(inactDate);
        inactEnd.setHours(23,59,59,999);
        if (checkDate.getTime() >= inactEnd.getTime()) return;
      }

      // Reconstruir status até checkDate usando a função centralizada
      const { status: currentStatus, lastChangeDate } = resolveStatusForDate(placa, checkDate);
      // Ignorar veículos sem status histórico encontrado — getCategory('') retornaria 'Improdutiva'
      // incorretamente, causando veículos Locado/Vendido aparecerem com status errado.
      if (!currentStatus) return;
      const cat = getCategory(currentStatus);
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

        // Terceiros já foram filtrados antes do loop
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
  }, [frota, patioMov, veiculoMov, selectedDate, historicoSituacao, inactivationDateMap]);

  // (sem paginação) manter rolagem; `pageSize` usado apenas para indicar quantos aparecem inicialmente

  const currentIdleKPIs = useMemo(() => {
    // Calcular os KPIs usando o status atual da frota (mesma origem da Taxa de Produtividade)
    const ativosList = frota.filter(v => v.Placa && v.FinalidadeUso !== 'TERCEIRO');

    const produtivaCount = ativosList.filter(v => getCategory(v.Status) === 'Produtiva').length;
    const improdutivaCount = ativosList.filter(v => getCategory(v.Status) === 'Improdutiva').length;

    const ativos = produtivaCount + improdutivaCount;
    const pct = ativos > 0 ? (improdutivaCount / ativos) * 100 : 0;

    const mediaDias = improdutivaCount > 0
      ? ativosList.reduce((sum, v) => (getCategory(v.Status) === 'Improdutiva' ? sum + parseNum(v.DiasNoStatus) : sum), 0) / improdutivaCount
      : 0;

    // Tendência (comparar últimos 7 dias vs 7 anteriores) — manter baseado no histórico
    const last7 = dailyIdleHistory.slice(-7);
    const prev7 = dailyIdleHistory.slice(-14, -7);
    const avgLast7 = last7.length > 0 ? last7.reduce((s, d) => s + d.pct, 0) / last7.length : 0;
    const avgPrev7 = prev7.length > 0 ? prev7.reduce((s, d) => s + d.pct, 0) / prev7.length : 0;
    const trend = avgLast7 - avgPrev7;

    return { qtd: improdutivaCount, pct, mediaDias, trend };
  }, [frota, dailyIdleHistory, historicoSituacao]);

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

  if (loadingPrimary && frota.length === 0) {
    return <AnalyticsLoading message="Carregando dados de frota improdutiva..." kpiCount={4} chartCount={1} />;
  }

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
                </button>
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
                    const breakdown: [string, number][] = Object.entries(
                      (data.statusBreakdown || {}) as Record<string, number>
                    ).sort((a, b) => b[1] - a[1]);
                    return (
                      <div className="bg-white p-3 border border-slate-200 rounded shadow-lg min-w-[200px]">
                        <p className="font-semibold text-slate-700 mb-1">{new Date(data.date).toLocaleDateString('pt-BR')}</p>
                        <p className="text-rose-600 font-bold">{data.pct}% Improdutiva</p>
                        <p className="text-xs text-slate-500 mb-2">{data.improdutiva} de {data.total} veículos</p>
                        {breakdown.length > 0 && (
                          <div className="border-t border-slate-100 pt-2 space-y-0.5">
                            {breakdown.map(([status, count]) => (
                              <div key={status} className="flex justify-between text-xs">
                                <span className="text-slate-600">{status}</span>
                                <span className="font-medium text-slate-800 ml-4">{count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-blue-600 mt-2">Clique para detalhes</p>
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
