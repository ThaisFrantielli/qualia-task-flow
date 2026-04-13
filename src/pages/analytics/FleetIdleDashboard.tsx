import { useMemo, useState, useEffect, useRef } from 'react';
import useBIData from '@/hooks/useBIData';
import useBIDataBatch, { getBatchTable } from '@/hooks/useBIDataBatch';
import { useTimelineData } from '@/hooks/useTimelineData';
import { Card, Title, Text, Badge } from '@tremor/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingDown, Calendar, AlertTriangle, FileSpreadsheet, HelpCircle, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
// DataUpdateBadge intentionally not used in this dashboard
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

const DAY_MS = 1000 * 60 * 60 * 24;

function normalizeLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function formatLocalYMDToPtBR(ymd: string | null | undefined): string {
  if (!ymd) return '-';
  const parts = String(ymd).split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '-';
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('pt-BR');
}

function getMostRecentDate(...values: any[]): Date | null {
  const valid = values
    .map((v) => parseDateSafe(v))
    .filter((d) => d.getTime() > 0)
    .sort((a, b) => b.getTime() - a.getTime());
  return valid[0] || null;
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
    s.includes('NAO DISPON') ||
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
  const { results: primaryResults, loading: loadingPrimary } = useBIDataBatch([
    'dim_frota', 'dim_movimentacao_patios', 'dim_movimentacao_veiculos'
  ], undefined, { staticFallback: true });
  // Timeline via Edge Function otimizada
  useTimelineData('recent');
  const frotaData = getBatchTable<AnyObject>(primaryResults, 'dim_frota');
  const patioMovData = getBatchTable<AnyObject>(primaryResults, 'dim_movimentacao_patios');
  const veiculoMovData = getBatchTable<AnyObject>(primaryResults, 'dim_movimentacao_veiculos');
  const { data: historicoSituacaoRaw, loading: loadingHistorico } = useBIData<AnyObject[]>('historico_situacao_veiculos');

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
        // Como não há nenhum evento histórico, usar dim_frota como melhor aproximação
        // disponível — MAS apenas a partir da DataCompra do veículo.
        // Justificativa: se o veículo nunca gerou evento, assumimos que seu status atual
        // é o mesmo desde que foi comprado. Veículos comprados APÓS a checkDate não devem
        // aparecer em datas anteriores à compra (evita inflação retroativa quando ETL
        // adiciona novos veículos à frota).
        const v = veiculoAtualMap.get(String(placa).trim().toUpperCase());
        const fallbackStatus = v?.Status || v?.status || v?.SituacaoVeiculo || v?.situacaoveiculo || null;
        if (fallbackStatus) {
          // Verificar DataCompra: se o veículo foi comprado DEPOIS da checkDate,
          // ele não existia na frota naquele momento → excluir desta data.
          const dataCompraRaw = v?.DataCompra || v?.datacompra || null;
          if (dataCompraRaw) {
            const dataCompra = parseDateSafe(dataCompraRaw);
            dataCompra.setHours(0, 0, 0, 0);
            if (dataCompra.getTime() > checkDate.getTime()) {
              // Veículo comprado após checkDate — não contabilizar nesta data histórica
              const result = { status: null, usedHistorico: false, lastChangeDate: null };
              try { statusCacheRef.current.set(cacheKey, result); } catch (e) { /* ignore */ }
              return result;
            }
          }
          status = fallbackStatus;
          usedHistorico = false;
          lastChangeDate = null;
        }
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

  // Encontra o início do status vigente na data de snapshot usando apenas histórico de situação.
  const resolveStatusStartForDate = (placa: string, checkDate: Date, statusAtDate: string | null): Date | null => {
    if (!placa || !statusAtDate) return null;
    const targetStatus = normalizeStatus(statusAtDate);
    const events = (historicoMap.get(String(placa).trim().toUpperCase()) || []);
    if (events.length === 0) return null;

    const statusEvents = events
      .map((e: any) => {
        const status = e?.SituacaoVeiculo || e?.situacaoveiculo || e?.Situacao || e?.situacao || null;
        const date = parseDateSafe(e?.UltimaAtualizacao || e?.ultimaatualizacao || e?.DataEvento || e?.dataevento);
        return { status, date };
      })
      .filter((e: any) => !!e.status && e.date.getTime() > 0 && e.date.getTime() <= checkDate.getTime());

    if (statusEvents.length === 0) return null;

    const lastIdx = statusEvents.length - 1;
    const lastStatusNorm = normalizeStatus(statusEvents[lastIdx].status);
    if (lastStatusNorm !== targetStatus) return null;

    let start = statusEvents[lastIdx].date;
    for (let i = lastIdx - 1; i >= 0; i--) {
      const sNorm = normalizeStatus(statusEvents[i].status);
      if (sNorm !== targetStatus) break;
      start = statusEvents[i].date;
    }
    return start;
  };

  // Limpar cache quando dados mudarem para evitar resultados obsoletos
  useEffect(() => {
    statusCacheRef.current.clear();
  }, [historicoSituacao, frota]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [detailSortKey, setDetailSortKey] = useState<'Placa' | 'Chassi' | 'Modelo' | 'Status' | 'Patio' | 'DiasNoStatus' | 'DataInicioStatus' | 'UltimaMovimentacao' | 'UsuarioMovimentacao'>('DiasNoStatus');
  const [detailSortDir, setDetailSortDir] = useState<'asc' | 'desc'>('desc');
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'30d' | '90d' | '180d' | 'custom'>('30d');
  // Estados para período personalizado
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const defaultFrom = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const [customFrom, setCustomFrom] = useState<string>(defaultFrom);
  const [customTo, setCustomTo] = useState<string>(todayStr);
  const [showHistoricoInfo, setShowHistoricoInfo] = useState<boolean>(false);
  const [payloadModalOpen, setPayloadModalOpen] = useState<boolean>(false);
  const [payloadModalContent] = useState<any>(null);

  const pageSize = 10;

  // Gerar histórico diário de % improdutiva (90 dias ou todo histórico disponível)
  const dailyIdleHistory = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const data: { date: string; dateLocal: string; pct: number; improdutiva: number; produtiva: number; totalAtiva: number; displayDate: string; statusBreakdown: Record<string, number> }[] = [];

    // OTIMIZAÇÃO: Filtrar apenas terceiros ANTES do loop pesado. A exclusão de veículos
    // Inativa é aplicada por data mais abaixo (a partir do dia em que ficaram inativos).
    const ativosBase = frota
      .filter(v => v.FinalidadeUso !== 'TERCEIRO');

    // (usar `veiculoAtualMap` memoizado acima para fallback de status)

    // Determinar o intervalo de datas a gerar
    let startDate: Date;
    let endDate: Date = new Date(todayEnd);

    if (periodoSelecionado === 'custom') {
      const [fy, fm, fd] = customFrom.split('-').map(Number);
      const [ty, tm, td] = customTo.split('-').map(Number);
      startDate = new Date(fy, fm - 1, fd);
      endDate = new Date(ty, tm - 1, td, 23, 59, 59, 999);
    } else {
      let daysToGenerate = 90;
      if (periodoSelecionado === '30d') daysToGenerate = 30;
      else if (periodoSelecionado === '90d') daysToGenerate = 90;
      else if (periodoSelecionado === '180d') daysToGenerate = 180;
      startDate = new Date(todayStart);
      startDate.setDate(todayStart.getDate() - (daysToGenerate - 1));
    }

    // Gerar cada dia no intervalo
    const msPerDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
    for (let i = 0; i < totalDays; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(startDate.getDate() + i);
      checkDate.setHours(23, 59, 59, 999); // considerar até o fim do dia

      // Segurança adicional: nunca incluir ponto de data futura no histórico diário.
      if (checkDate.getTime() > todayEnd.getTime()) break;

      // Gerar `dateStr` no formato YYYY-MM-DD usando a data local (evita shift UTC)
      const y = checkDate.getFullYear();
      const m = String(checkDate.getMonth() + 1).padStart(2, '0');
      const d = String(checkDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      // Evitar UTC shift: persistir a data do ponto em formato local (YYYY-MM-DD)
      // para exibição/seleção consistente no histórico.
      const chartDate = `${dateStr}T12:00:00`;
      const displayDate = checkDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      let improdutivaCount = 0;
      let produtivaCount = 0;
      let activeCount = 0;
      let usandoHistoricoCount = 0;
      let usandoFallbackCount = 0;

      // Collect breakdown by normalized status (samples kept for inspection)
      const statusCounts: Record<string, { count: number; placas: string[] }> = {};

      for (let idx = 0; idx < ativosBase.length; idx++) {
        const veiculo = ativosBase[idx];
        const placa = String(veiculo?.Placa || '').trim().toUpperCase();
        const placaLabel = placa || '(SEM PLACA)';
        // NOTA: não pré-excluímos via inactivationDateMap aqui.
        // resolveStatusForDate retorna o status correto para o dia D via historico_situacao_veiculos,
        // e getCategory filtra Inativos com 'continue' abaixo.
        // O pré-filtro por inactivationDateMap causava mutação retroativa: quando ETL adicionava
        // um evento Inativa com data no passado, a data calculada mudava e excluía o veículo
        // retroativamente de todos os dias anteriores, alterando o gráfico histórico.
        const { status, usedHistorico } = placa
          ? resolveStatusForDate(placa, checkDate)
          : { status: veiculo?.Status || null, usedHistorico: false };
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
        if (statusCounts[sNorm].placas.length < 10) statusCounts[sNorm].placas.push(placaLabel);

        if (cat === 'Produtiva' || cat === 'Improdutiva') activeCount += 1;
        if (cat === 'Produtiva') produtivaCount += 1;
        if (cat === 'Improdutiva') improdutivaCount += 1;
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

      data.push({
        date: chartDate,
        dateLocal: dateStr,
        pct: Number(pct.toFixed(1)),
        improdutiva: improdutivaCount,
        produtiva: produtivaCount,
        totalAtiva: activeCount,
        displayDate,
        statusBreakdown
      });

    }
    return data;
  }, [frota, historicoSituacao, periodoSelecionado, customFrom, customTo]);

  // Veículos improdutivos na data selecionada
  const vehiclesOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    // Construir checkDate a partir da string YYYY-MM-DD como data local
    const parts = selectedDate.split('-').map((p) => parseInt(p, 10));
    const checkDate = parts.length === 3
      ? new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999)
      : new Date(selectedDate + 'T23:59:59');
    // OTIMIZAÇÃO: Filtrar apenas terceiros antes do processamento (mesma regra usada acima)
    const ativosBase = frota
      .filter(v => v.FinalidadeUso !== 'TERCEIRO');

    // Usar historicoMap centralizado

    const improdutivos: any[] = [];

    ativosBase.forEach((v: any, index: number) => {
      const placaRaw = String(v?.Placa || '').trim().toUpperCase();
      const placa = placaRaw || `SEM-PLACA-${index + 1}`;
      const placaLookup = placaRaw;

      // Reconstruir status até checkDate usando a função centralizada
      // (inactivationDateMap não é usado aqui — resolveStatusForDate já retorna o status
      // correto baseado nos eventos históricos; getCategory filtra Inativos abaixo)
      const { status: currentStatus } = placaLookup
        ? resolveStatusForDate(placaLookup, checkDate)
        : { status: v?.Status || null };
      // Ignorar veículos sem status histórico encontrado — getCategory('') retornaria 'Improdutiva'
      // incorretamente, causando veículos Locado/Vendido aparecerem com status errado.
      if (!currentStatus) return;
      const cat = getCategory(currentStatus);
      if (cat === 'Improdutiva') {
        // Movimentações de pátio
        const movPatio = patioMov
          .filter((m: any) => placaLookup && m.Placa === placaLookup && parseDateSafe(m.DataMovimentacao).getTime() <= checkDate.getTime())
          .sort((a: any, b: any) => parseDateSafe(b.DataMovimentacao).getTime() - parseDateSafe(a.DataMovimentacao).getTime());
        const ultimoMovPatio = movPatio[0];

        const movVeiculo = veiculoMov
          .filter((m: any) => placaLookup && m.Placa === placaLookup && parseDateSafe(m.DataDevolucao || m.DataRetirada).getTime() <= checkDate.getTime())
          .sort((a: any, b: any) => parseDateSafe(b.DataDevolucao || b.DataRetirada).getTime() - parseDateSafe(a.DataDevolucao || a.DataRetirada).getTime());
        const ultimaLocacao = movVeiculo[0];

        const ultimaDataPatio = ultimoMovPatio?.DataMovimentacao || null;
        const ultimaDataDevolucao = ultimaLocacao?.DataDevolucao || null;
        const dataMaisRecente = getMostRecentDate(ultimaDataPatio, ultimaDataDevolucao);
        const dataInicioStatusHistorico = resolveStatusStartForDate(placaLookup, checkDate, currentStatus);

        // Data Início Status: início do status atual conforme histórico de situação.
        // Fallback para referência operacional quando o histórico não tiver dados suficientes.
        let dataInicioStatus = dataInicioStatusHistorico
          ? dataInicioStatusHistorico.toISOString()
          : (dataMaisRecente ? dataMaisRecente.toISOString() : null);

        let diasNoStatus = 0;
        if (dataInicioStatus) {
          const dataInicio = normalizeLocalDay(new Date(dataInicioStatus));
          const dataReferencia = normalizeLocalDay(checkDate);
          // Dias parado deve refletir a data selecionada no gráfico (snapshot), não a data atual.
          diasNoStatus = Math.floor((dataReferencia.getTime() - dataInicio.getTime()) / DAY_MS);
        }

        const patio = (ultimoMovPatio && ultimoMovPatio.Patio && String(ultimoMovPatio.Patio).trim() !== '')
          ? ultimoMovPatio.Patio
          : (v.Localizacao || '-');

        // Terceiros já foram filtrados antes do loop
        improdutivos.push({
          Placa: placa,
          Chassi: String(v.Chassi || v.chassi || '-'),
          Modelo: v.Modelo,
          Status: currentStatus || v.Status,
          Patio: patio,
          DiasNoStatus: Math.max(0, diasNoStatus),
          DataInicioStatus: dataInicioStatus,
          UltimaMovimentacao: dataMaisRecente ? dataMaisRecente.toISOString() : '-',
          UsuarioMovimentacao: ultimoMovPatio?.UsuarioMovimentacao || '-'
        });
      }
    });

    return improdutivos;
  }, [frota, patioMov, veiculoMov, selectedDate, historicoSituacao]);

  const currentIdleVehicles = useMemo(() => {
    const improdutivosHoje = frota
      .filter(v => v.FinalidadeUso !== 'TERCEIRO')
      .filter(v => getCategory(v.Status) === 'Improdutiva')
      .map((v: any) => ({
        Placa: String(v.Placa || '').trim().toUpperCase() || '-',
        Chassi: String(v.Chassi || '-'),
        Modelo: String(v.Modelo || '-'),
        Status: String(v.Status || '-'),
        Patio: String(v.Patio || v.PatioAtual || '-'),
        DiasNoStatus: Math.max(0, parseNum(v.DiasNoStatus)),
        DataInicioStatus: String(v.DataInicioStatus || '-'),
        UltimaMovimentacao: String(v.UltimaMovimentacao || '-'),
        UsuarioMovimentacao: String(v.UsuarioMovimentacao || '-'),
      }))
      .sort((a, b) => b.DiasNoStatus - a.DiasNoStatus);

    return improdutivosHoje;
  }, [frota]);

  const sortedCurrentIdleVehicles = useMemo(() => {
    const rows = [...currentIdleVehicles];
    rows.sort((a, b) => {
      const aValue = a[detailSortKey];
      const bValue = b[detailSortKey];

      let cmp = 0;
      if (detailSortKey === 'DiasNoStatus') {
        cmp = Number(aValue || 0) - Number(bValue || 0);
      } else if (detailSortKey === 'DataInicioStatus' || detailSortKey === 'UltimaMovimentacao') {
        const aDate = parseDateSafe(aValue);
        const bDate = parseDateSafe(bValue);
        cmp = aDate.getTime() - bDate.getTime();
      } else {
        cmp = String(aValue || '').localeCompare(String(bValue || ''), 'pt-BR', { sensitivity: 'base' });
      }

      return detailSortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [currentIdleVehicles, detailSortKey, detailSortDir]);

  const toggleDetailSort = (key: typeof detailSortKey) => {
    if (detailSortKey === key) {
      setDetailSortDir((dir) => dir === 'asc' ? 'desc' : 'asc');
      return;
    }
    setDetailSortKey(key);
    setDetailSortDir(key === 'DiasNoStatus' ? 'desc' : 'asc');
  };

  const detailSortIcon = (key: typeof detailSortKey) => {
    if (detailSortKey !== key) return '↕';
    return detailSortDir === 'asc' ? '↑' : '↓';
  };

  // (sem paginação) manter rolagem; `pageSize` usado apenas para indicar quantos aparecem inicialmente

  const currentIdleKPIs = useMemo(() => {
    // Calcular os KPIs usando o status atual da frota (mesma origem da Taxa de Produtividade)
    const ativosList = frota.filter(v => v.FinalidadeUso !== 'TERCEIRO');

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

  // Plate-search helpers removed — feature deprecated in this view.

  // Análises de pátio removidas (cálculos anteriormente usados na seção eliminada)

  // Aguarda o carregamento primário (frota + movimentações) — exibe skeleton completo
  if (loadingPrimary && frota.length === 0) {
    return <AnalyticsLoading message="Carregando dados de frota improdutiva..." kpiCount={4} chartCount={1} />;
  }

  // Aguarda o histórico de situações quando o dashboard ainda não tem nenhum dado histórico
  // (primeiros segundos da primeira visita antes do cache ser populado)
  if (loadingHistorico && historicoSituacao.length === 0) {
    return <AnalyticsLoading message="Carregando histórico de situações (300 mil registros, pode levar alguns segundos)..." kpiCount={4} chartCount={1} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-start mb-4 gap-4 flex-wrap">
          {/* Título + ícone de informação */}
          <div className="flex items-start gap-2">
            <div>
              <Title>Evolução Diária - % Frota Improdutiva</Title>
              <Text className="text-xs text-slate-500 mt-1">
                Clique em um ponto do gráfico para ver detalhamento dos veículos naquele dia
              </Text>
            </div>
            {/* Ícone discreto de metodologia */}
            <div className="relative mt-0.5">
              <button
                onClick={() => setShowHistoricoInfo(v => !v)}
                className="text-slate-300 hover:text-slate-500 transition-colors"
                title="Como os dados históricos são calculados"
              >
                <Info size={15} />
              </button>
              {showHistoricoInfo && (
                <div className="absolute left-0 top-6 z-50 w-80 bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-xs text-slate-600 space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-700">Como o histórico é calculado</span>
                    <button onClick={() => setShowHistoricoInfo(false)} className="text-slate-400 hover:text-slate-600 ml-2 text-base leading-none">×</button>
                  </div>
                  <p>Para cada dia D, o status de cada veículo é determinado assim:</p>
                  <ul className="space-y-1.5 list-none">
                    <li className="flex gap-2"><span className="text-rose-500 font-bold shrink-0">1.</span><span><strong>D = hoje:</strong> usa <code className="bg-slate-100 px-1 rounded">dim_frota.Status</code> diretamente.</span></li>
                    <li className="flex gap-2"><span className="text-rose-500 font-bold shrink-0">2.</span><span><strong>D = dia passado com eventos:</strong> usa o evento mais recente em <code className="bg-slate-100 px-1 rounded">historico_situacao_veiculos</code> com data ≤ D.</span></li>
                    <li className="flex gap-2"><span className="text-rose-500 font-bold shrink-0">3.</span><span><strong>Sem nenhum evento registrado:</strong> usa <code className="bg-slate-100 px-1 rounded">dim_frota.Status</code> para todas as datas (veículo nunca mudou de situação).</span></li>
                    <li className="flex gap-2"><span className="text-rose-500 font-bold shrink-0">4.</span><span><strong>Eventos apenas posteriores a D:</strong> veículo excluído (ainda não estava na frota).</span></li>
                  </ul>
                  <p className="border-t border-slate-100 pt-2">Classificação usada: <strong>Produtiva</strong> (Locado, Locado veículo reserva, Uso Interno e Em Mobilização), <strong>Improdutiva</strong> (ex.: Disponível, Reserva e Bloqueado) e <strong>Inativa</strong> (Vendido, Baixado, Roubo / Furto, Devolvido, Não disponível, Disponível para venda e Em Desmobilização). <strong>Terceiros</strong> não são contabilizados.</p>
                  <p className="text-slate-500">% = Improdutivos ÷ (Produtivos + Improdutivos) * 100</p>
                </div>
              )}
            </div>
          </div>
          {/* Seletor de período + badge */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="inline-flex rounded-md shadow-sm bg-white p-1 border">
                {(['30d', '90d', '180d', 'custom'] as const).map((op) => {
                  const labels: Record<string, string> = { '30d': 'Últimos 30 dias', '90d': 'Últimos 90 dias', '180d': 'Últimos 6 meses', 'custom': 'Personalizado' };
                  return (
                    <button
                      key={op}
                      onClick={() => setPeriodoSelecionado(op)}
                      className={`text-sm px-3 py-1 rounded ${periodoSelecionado === op ? 'bg-rose-100 text-rose-700 font-medium' : 'text-slate-600'}`}
                    >
                      {labels[op]}
                    </button>
                  );
                })}
              </div>
              <Badge color="rose" icon={TrendingDown}>
                {(dailyIdleHistory[dailyIdleHistory.length - 1]?.pct ?? 0).toFixed(1)}% hoje
              </Badge>
            </div>
            {/* Date pickers para período personalizado */}
            {periodoSelecionado === 'custom' && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="text-xs text-slate-400">De</span>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-300"
                />
                <span className="text-xs text-slate-400">até</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={todayStr}
                  onChange={e => setCustomTo(e.target.value)}
                  className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-300"
                />
                <span className="text-xs text-slate-400">({dailyIdleHistory.length} dias)</span>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto pb-4 mt-4">
          <div style={{ minWidth: dailyIdleHistory.length * 40 }}>
            <div className="h-96">
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
                    interval={Math.floor(dailyIdleHistory.length / 20)}
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
                            <p className="font-semibold text-slate-700 mb-1">{formatLocalYMDToPtBR(data.dateLocal || data.date?.split?.('T')?.[0])}</p>
                            <p className="text-rose-600 font-bold">{data.pct}% Improdutiva</p>
                            <p className="text-xs text-slate-500 mb-2">{data.improdutiva} improdutivos | {data.produtiva} produtivos</p>
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
          </div>
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
                <HelpCircle size={18} />
              </button>
              <button
                onClick={() => exportToExcel(vehiclesOnSelectedDate, `improdutivos_${selectedDate}`)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 transition-colors border px-3 py-1 rounded bg-white"
              >
                <FileSpreadsheet size={16} /> Exportar
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
                <thead className="sticky top-0 z-20 bg-slate-50 text-slate-600 uppercase text-xs">
                  <tr>
                    {[
                      { key: 'Placa', label: 'Placa', align: 'left' },
                      { key: 'Chassi', label: 'Chassi', align: 'left' },
                      { key: 'Modelo', label: 'Modelo', align: 'left' },
                      { key: 'Status', label: 'Status', align: 'left' },
                      { key: 'Patio', label: 'Pátio', align: 'left' },
                      { key: 'DiasNoStatus', label: 'Dias Parado', align: 'right' },
                      { key: 'DataInicioStatus', label: 'Data Início Status', align: 'left' },
                      { key: 'UltimaMovimentacao', label: 'Última Movimentação', align: 'left' },
                      { key: 'UsuarioMovimentacao', label: 'Usuário', align: 'left' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className={`px-6 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'} cursor-pointer select-none hover:bg-slate-100 whitespace-nowrap`}
                        onClick={() => toggleDetailSort(col.key as typeof detailSortKey)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          <span className="text-[10px] leading-none text-slate-400">{detailSortIcon(col.key as typeof detailSortKey)}</span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedCurrentIdleVehicles.map((v, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium font-mono">{v.Placa}</td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-500">{v.Chassi || '-'}</td>
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
                <p className="text-sm text-slate-600 ml-8">Situação atual do veículo. Lista apenas status considerados improdutivos (ex.: <strong>Reserva</strong>, <strong>Bloqueado</strong>, <strong>Disponível</strong>). Veículos produtivos (<strong>Locado</strong>, <strong>Locado veículo reserva</strong>, <strong>Uso Interno</strong> e <strong>Em Mobilização</strong>) ou inativos (<strong>Vendido</strong>, <strong>Baixado</strong>, <strong>Roubo / Furto</strong>, <strong>Devolvido</strong>, <strong>Não disponível</strong>, <strong>Disponível para venda</strong>, <strong>Em Desmobilização</strong>) não são exibidos.</p>
              </div>

              <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">6</span>
                  Data Início Status ⭐
                </h3>
                <p className="text-sm text-slate-700 ml-8 mb-2"><strong>Lógica:</strong></p>
                <ol className="text-sm text-slate-600 ml-8 space-y-1 list-decimal list-inside">
                  <li>Reconstrói o status do veículo na data selecionada usando <strong>historico_situacao_veiculos</strong>.</li>
                  <li>Identifica o último evento de troca para o status atual (ex.: Reserva).</li>
                  <li>Usa esse timestamp como <strong>Data Início Status</strong>.</li>
                  <li>Essa data representa o início do status improdutivo atual.</li>
                </ol>
              </div>

              <div className="bg-violet-50 p-4 rounded border-l-4 border-violet-400">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs">6A</span>
                  Big Number: Tendência (7 dias) ⭐
                </h3>
                <p className="text-sm text-slate-700 ml-8 mb-2"><strong>Cálculo:</strong></p>
                <ol className="text-sm text-slate-600 ml-8 space-y-1 list-decimal list-inside">
                  <li>Calcula a média do <strong>% improdutiva</strong> dos últimos 7 dias.</li>
                  <li>Calcula a média do <strong>% improdutiva</strong> dos 7 dias anteriores.</li>
                  <li>Aplica: <code className="bg-slate-100 px-1 rounded">Tendência = Média(Últimos 7) - Média(7 Anteriores)</code></li>
                </ol>
              </div>

              <div className="bg-violet-50 p-4 rounded border-l-4 border-violet-400">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs">6B</span>
                  Big Number: Tempo Médio Parado ⭐
                </h3>
                <p className="text-sm text-slate-700 ml-8 mb-2"><strong>Cálculo:</strong></p>
                <ol className="text-sm text-slate-600 ml-8 space-y-1 list-decimal list-inside">
                  <li>Seleciona somente veículos com categoria <strong>Improdutiva</strong>.</li>
                  <li>Soma o campo <strong>Dias em Situação</strong> desses veículos.</li>
                  <li>Divide pela quantidade de veículos improdutivos.</li>
                  <li>Aplica: <code className="bg-slate-100 px-1 rounded">Tempo Médio = Soma(Dias em Situação dos improdutivos) / Qtd improdutivos</code></li>
                </ol>
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
                  <li>Usa a <strong>Data Início Status</strong> reconstruída no histórico de situação.</li>
                  <li>Calcula: <code className="bg-slate-100 px-1 rounded">Dias = Data de Referência (dia selecionado) - Data Início</code></li>
                  <li>A referência é sempre o dia selecionado no gráfico (snapshot histórico).</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">6</span>
                  Data Início Status ⭐
                </h3>
                <p className="text-sm text-slate-700 ml-8 mb-2"><strong>Lógica:</strong></p>
                <ol className="text-sm text-slate-600 ml-8 space-y-1 list-decimal list-inside">
                  <li>Reconstrói o status do veículo na data selecionada usando <strong>historico_situacao_veiculos</strong>.</li>
                  <li>Identifica o último evento de troca para o status atual (ex.: Reserva).</li>
                  <li>Usa esse timestamp como <strong>Data Início Status</strong>.</li>
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
                  <strong>Fórmula:</strong> (Veículos Improdutivos / Veículos Ativos) * 100
                </p>
                <p className="text-xs text-emerald-600 mt-2">
                  <strong>Veículos Ativos</strong> = Veículos produtivos (Locado, Locado veículo reserva, Uso Interno e Em Mobilização) + Improdutivos (parados). Não inclui inativos (Vendido, Baixado, Roubo / Furto, Devolvido, Disponível para venda e Em Desmobilização).
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

      {/* Modal de Payload (JSON) */}
      {payloadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPayloadModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl max-h-[80vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <Title className="text-sm">Detalhe do Evento (JSON)</Title>
              <div className="flex items-center gap-2">
                <button onClick={() => setPayloadModalOpen(false)} className="px-3 py-1 bg-white border rounded text-sm">Fechar</button>
              </div>
            </div>
            <pre className="text-xs whitespace-pre-wrap break-words bg-slate-50 p-3 rounded border text-slate-700">{JSON.stringify(payloadModalContent, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <Title>Alertas Automáticos</Title>
          <div className="mt-4 space-y-3">
            {currentIdleVehicles.filter(v => v.DiasNoStatus >= 30).length > 0 && (
              <div className="flex gap-3 p-3 bg-amber-50 rounded border-l-4 border-amber-500">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">Veículos com parada prolongada</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {currentIdleVehicles.filter(v => v.DiasNoStatus >= 30).length} veículo(s) improdutivo(s) com 30+ dias em situação. Lista completa:
                  </p>
                  <div className="text-xs text-slate-700 mt-2 flex flex-wrap gap-2">
                    {currentIdleVehicles
                      .filter(v => v.DiasNoStatus >= 30)
                      .map((v) => (
                        <span key={v.Placa} className="px-2 py-1 rounded bg-white border border-amber-200">
                          {v.Placa} ({v.DiasNoStatus}d)
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            )}
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
