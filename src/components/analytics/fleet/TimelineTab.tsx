import { useMemo, useState, useEffect } from 'react';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, LabelList } from 'recharts';
import { 
  Clock, Calendar, Car, Wrench, TrendingUp, ChevronRight, Play, History, Search, 
  FileSpreadsheet, MapPin, AlertTriangle, DollarSign, ShoppingCart, FileWarning, 
  RotateCcw, Archive, Store, User, UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { calcStateDurationsDays, normalizeEventName } from '@/lib/analytics/fleetTimeline';

type AnyObject = { [k: string]: any };

interface TimelineTabProps {
  timeline: AnyObject[];
  filteredData: AnyObject[];
  frota: AnyObject[];
  manutencao?: AnyObject[];
  contratosLocacao?: AnyObject[];
  sinistros?: AnyObject[];
}

function fmtDecimal(v: number) { return new Intl.NumberFormat('pt-BR').format(v); }

function fmtMoney(v: any) {
  const num = typeof v === 'string' ? parseFloat(v.replace('R$', '').trim()) : v;
  if (!num || isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function normalizePlacaKey(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function normalizeDateLocal(raw?: string | null): Date | null {
  if (!raw) return null;
  const dateOnly = String(raw).split('T')[0];
  const [y, m, d] = dateOnly.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toISODateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fmtDateTimeBR(d: Date | null | undefined): string {
  if (!d) return '—';
  try {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
    return new Intl.DateTimeFormat('pt-BR', options).format(d);
  } catch (err) {
    return d.toLocaleString('pt-BR');
  }
}

function fmtDateBR(d: Date | null | undefined): string {
  if (!d) return '—';
  try {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Intl.DateTimeFormat('pt-BR', options).format(d as Date);
  } catch (err) {
    return d ? (d as Date).toLocaleDateString('pt-BR') : '—';
  }
}

function getMinutesConclusaoRetirada(row: any): number | null {
  try {
    const first = row?.osRecords?.[0] ?? {};
    if (first?.Minutos_Conclusao_Retirada != null) return Number(first.Minutos_Conclusao_Retirada);
    if (first?.Minutos_Conclusao_Ret != null) return Number(first.Minutos_Conclusao_Ret);
    if (row?.osRecords?.[0]?.Horas_Conclusao_Retirada != null) return Number(row.osRecords[0].Horas_Conclusao_Retirada) * 60;
    if (row?.osRecords?.[0]?.Dias_Conclusao_Retirada != null) return Number(row.osRecords[0].Dias_Conclusao_Retirada) * 24 * 60;
    if (row?.horasConclusaoRetirada != null) return Number(row.horasConclusaoRetirada) * 60;
    if (row?.diasConclusaoRetirada != null) return Number(row.diasConclusaoRetirada) * 24 * 60;
    return null;
  } catch (e) {
    return null;
  }
}

function fmtDurationFromMinutes(mins?: number | null): string {
  if (mins == null || isNaN(mins)) return '—';
  const total = Math.max(0, Math.floor(mins));
  const days = Math.floor(total / (60 * 24));
  const hours = Math.floor((total % (60 * 24)) / 60);
  const minutes = total % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} d`);
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} m`);
  return parts.join(' ');
}

function parseDateAny(raw?: string | null): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // pt-BR: dd/MM/yyyy (opcionalmente com hora)
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (br) {
    const dd = Number(br[1]);
    const mm = Number(br[2]);
    const yyyy = Number(br[3]);
    const hh = br[4] ? Number(br[4]) : 0;
    const mi = br[5] ? Number(br[5]) : 0;
    const ss = br[6] ? Number(br[6]) : 0;
    const dt = new Date(yyyy, mm - 1, dd, hh, mi, ss, 0);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime())) return direct;
  return normalizeDateLocal(s);
}

function normalizeStatusText(raw: unknown): string {
  return String(raw ?? '').trim();
}

function isLocacaoEmAndamento(status: unknown): boolean {
  const s = normalizeStatusText(status).toUpperCase();
  return s.includes('ANDAMENTO') || s.includes('ATIVO') || s.includes('VIGENTE');
}

function isLocacaoEncerrada(status: unknown): boolean {
  const s = normalizeStatusText(status).toUpperCase();
  return s.includes('ENCERR') || s.includes('FINALIZ') || s.includes('CANCEL');
}

function diffDaysCeil(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(days));
}

type MaintenanceInterval = {
  kind: 'MANUTENCAO_PERIODO';
  key: string;
  start: Date;
  end: Date | null;
  days: number;
  records: AnyObject[];
};

type MaintenanceOccurrence = {
  kind: 'MANUTENCAO_OCORRENCIA';
  key: string;
  ocorrenciaId: string;
  ocorrencia?: string;
  ocorrenciaDate: Date;
  osRecords: AnyObject[];
  situacao?: string;
  tipoOcorrencia?: string;
  custoTotal?: number;
  dataAberturaOcorrencia?: Date | null;
  dataConclusaoOcorrencia?: Date | null;
  dataRetiradaVeiculo?: Date | null;
  dataChegadaVeiculo?: Date | null;
  movimentacoes?: Array<{ Etapa?: string; DataConfirmacao?: string; Usuario?: string; MinutosDesdeAnterior?: number | null; HorasDesdeAnterior?: number | null; DiasDesdeAnterior?: number | null }>;
  horasConclusaoRetirada?: number | null;
  diasConclusaoRetirada?: number | null;
};

type EventGroupRow = {
  kind: 'EVENTO_DIA_TIPO';
  key: string;
  tipo: string;
  date: Date;
  count: number;
  items: AnyObject[];
};

type TimelineRow = MaintenanceInterval | MaintenanceOccurrence | EventGroupRow;

function getMaintenanceId(r: AnyObject): string {
  return String(
    r?.NumeroOS ?? r?.OS ?? r?.IdOS ?? r?.IdOcorrencia ?? r?.Ocorrencia ?? r?.CodigoOS ?? r?.Codigo ?? ''
  ).trim();
}

function getOccurrenceId(r: AnyObject): string {
  return String(
    r?.IdOcorrencia ?? r?.NumeroOcorrencia ?? r?.Ocorrencia ?? r?.ocorrencia ?? ''
  ).trim();
}

// Nova função: agrupa manutenções por Ocorrência
function groupMaintenanceByOccurrence(records: AnyObject[]): MaintenanceOccurrence[] {
  // Agrupar por IdOcorrencia/Ocorrencia
  const occurrenceMap = new Map<string, AnyObject[]>();
  
  for (const r of records) {
    const occId = getOccurrenceId(r);
    if (!occId || occId === '' || occId === 'undefined' || occId === 'null') {
      // Se não tem ID de ocorrência, criar uma ocorrência única para esta OS
      const osId = getMaintenanceId(r);
      const uniqueKey = `solo-${osId || Math.random()}`;
      occurrenceMap.set(uniqueKey, [r]);
    } else {
      const existing = occurrenceMap.get(occId);
      if (existing) {
        existing.push(r);
      } else {
        occurrenceMap.set(occId, [r]);
      }
    }
  }

  // Converter para array de MaintenanceOccurrence
  const occurrences: MaintenanceOccurrence[] = [];
  
  for (const [occId, osRecords] of occurrenceMap.entries()) {
    // Pegar a data mais antiga como data da ocorrência
    const dates = osRecords
      .map(r => normalizeDateLocal(
        r?.DataAberturaOcorrencia ?? r?.DataOcorrencia ?? r?.DataAbertura ?? r?.DataAgendamento ?? 
        r?.DataEntrada ?? r?.DataEntradaOficina ?? r?.DataCriacao ?? r?.Data
      ))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (dates.length === 0) continue;

    const firstRecord = osRecords[0];
    
    // Calcular custo total da ocorrência
    const custoTotal = osRecords.reduce((sum, r) => {
      const val = Number(r?.CustoTotalOS ?? r?.ValorTotal ?? 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    
    // padronizar datas: pegar primeiro valor disponível por campo
    const dataAberturaOcorrencia = osRecords
      .map(r => normalizeDateLocal(r?.DataAberturaOcorrencia ?? r?.DataOcorrencia ?? r?.DataAbertura ?? r?.DataEntrada ?? r?.Data))
      .filter((d): d is Date => !!d)[0] ?? null;

    const dataConclusaoOcorrencia = osRecords
      .map(r => normalizeDateLocal(r?.DataConclusaoOcorrencia ?? r?.DataConclusao ?? r?.DataSaida ?? r?.Data))
      .filter((d): d is Date => !!d).sort((a,b)=>a.getTime()-b.getTime()).pop() ?? null;

    const dataChegadaVeiculo = osRecords
      .map(r => normalizeDateLocal(r?.DataChegadaVeiculo ?? r?.DataChegada ?? r?.DataConfirmacaoChegada))
      .filter((d): d is Date => !!d)[0] ?? null;

    const dataRetiradaVeiculo = osRecords
      .map(r => normalizeDateLocal(r?.DataRetiradaVeiculo ?? r?.DataRetirada ?? r?.DataSaida))
      .filter((d): d is Date => !!d)[0] ?? null;

    // movimentacoes: pode vir como JSON string ou como array já desserializado
    let movimentacoes: any[] = [];
    try {
      const sample = osRecords.find(r => r?.MovimentacoesJson || r?.Movimentacoes);
      const raw = sample?.MovimentacoesJson ?? sample?.Movimentacoes ?? null;
      if (raw) {
        if (typeof raw === 'string') movimentacoes = JSON.parse(raw);
        else if (Array.isArray(raw)) movimentacoes = raw;
      }
    } catch (err) {
      movimentacoes = [];
    }

    const horasConclusaoRetirada = (osRecords[0]?.Horas_Conclusao_Retirada != null) ? Number(osRecords[0].Horas_Conclusao_Retirada) : null;
    const diasConclusaoRetirada = (osRecords[0]?.Dias_Conclusao_Retirada != null) ? Number(osRecords[0].Dias_Conclusao_Retirada) : null;

    occurrences.push({
      kind: 'MANUTENCAO_OCORRENCIA',
      key: `occ:${occId}`,
      ocorrenciaId: occId,
      ocorrencia: (osRecords[0]?.Ocorrencia ?? osRecords[0]?.NumeroOcorrencia ?? occId) as string,
      ocorrenciaDate: dates[0],
      osRecords: osRecords.sort((a, b) => {
        const aDate = normalizeDateLocal(a?.DataEntrada ?? a?.DataCriacaoOS ?? a?.DataAgendamento ?? a?.Data);
        const bDate = normalizeDateLocal(b?.DataEntrada ?? b?.DataCriacaoOS ?? b?.DataAgendamento ?? b?.Data);
        if (!aDate || !bDate) return 0;
        return aDate.getTime() - bDate.getTime();
      }),
      situacao: firstRecord?.SituacaoOcorrencia ?? firstRecord?.StatusOcorrencia ?? firstRecord?.Situacao,
      tipoOcorrencia: firstRecord?.TipoOcorrencia ?? firstRecord?.TipoManutencao ?? firstRecord?.Tipo,
      custoTotal
      ,
      dataAberturaOcorrencia,
      dataConclusaoOcorrencia,
      dataRetiradaVeiculo
      ,
      dataChegadaVeiculo,
      movimentacoes,
      horasConclusaoRetirada,
      diasConclusaoRetirada
    });
  }

  // Ordenar por data da ocorrência (mais recente primeiro)
  return occurrences.sort((a, b) => b.ocorrenciaDate.getTime() - a.ocorrenciaDate.getTime());
}

function buildMaintenanceIntervals(records: AnyObject[], now = new Date()): MaintenanceInterval[] {
  const sorted = records
    .map((r) => {
      const start = normalizeDateLocal(r?.DataEntrada ?? r?.DataEntradaOficina ?? r?.Entrada ?? r?.Data);
      const end = normalizeDateLocal(r?.DataSaida ?? r?.DataSaidaOficina ?? r?.Saida);
      return { r, start, end };
    })
    .filter((x): x is { r: AnyObject; start: Date; end: Date | null } => !!x.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const intervals: MaintenanceInterval[] = [];
  for (const item of sorted) {
    const itemStart = item.start;
    const itemEnd = item.end;

    const last = intervals[intervals.length - 1];
    const lastEnd = last?.end ?? null;
    const effectiveLastEnd = lastEnd ?? now;
    const effectiveItemEnd = itemEnd ?? now;

    // Junta intervalos muito próximos (mesmo dia ou dia seguinte)
    const canMerge =
      last &&
      itemStart.getTime() <= effectiveLastEnd.getTime() + 24 * 60 * 60 * 1000;

    if (!canMerge) {
      intervals.push({
        kind: 'MANUTENCAO_PERIODO',
        key: `manut:${toISODateKey(itemStart)}:${getMaintenanceId(item.r) || intervals.length}`,
        start: itemStart,
        end: itemEnd,
        days: diffDaysCeil(itemStart, effectiveItemEnd),
        records: [item.r]
      });
      continue;
    }

    // merge
    last.records.push(item.r);
    // atualiza end (prioriza o maior end conhecido; se algum for aberto, mantém aberto)
    if (!last.end || !itemEnd) {
      last.end = null;
    } else if (itemEnd.getTime() > last.end.getTime()) {
      last.end = itemEnd;
    }
    const newEffectiveEnd = last.end ?? now;
    last.days = diffDaysCeil(last.start, newEffectiveEnd);
    last.key = `manut:${toISODateKey(last.start)}:${intervals.length - 1}`;
  }

  return intervals;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  // Tipos vêm normalizados (sem acento) via normalizeEventName()
  'LOCACAO': <Play size={14} className="text-emerald-500" />,
  'DEVOLUCAO': <RotateCcw size={14} className="text-blue-500" />,
  'MANUTENCAO': <Wrench size={14} className="text-amber-500" />,
  'SINISTRO': <AlertTriangle size={14} className="text-red-500" />,
  'MOVIMENTACAO': <MapPin size={14} className="text-slate-500" />,
  'MULTA': <FileWarning size={14} className="text-yellow-600" />,
  'MULTAS': <FileWarning size={14} className="text-yellow-600" />,
  'COMPRA': <ShoppingCart size={14} className="text-purple-500" />,
  'AQUISICAO': <ShoppingCart size={14} className="text-purple-500" />,
  'VENDA': <DollarSign size={14} className="text-emerald-600" />,
  'BAIXA': <Archive size={14} className="text-slate-500" />,
};

const EVENT_LABELS: Record<string, string> = {
  LOCACAO: 'LOCAÇÃO',
  DEVOLUCAO: 'DEVOLUÇÃO',
  MANUTENCAO: 'MANUTENÇÃO',
  MOVIMENTACAO: 'MOVIMENTAÇÃO',
  SINISTRO: 'SINISTRO',
  MULTA: 'MULTA',
  MULTAS: 'MULTAS',
  COMPRA: 'COMPRA',
  AQUISICAO: 'AQUISIÇÃO',
  VENDA: 'VENDA',
  BAIXA: 'BAIXA',
};

// Identifica o Ator para evitar confusão na coluna Cliente
function getEventActor(tipoNorm: string, item: AnyObject) {
  const genericClient = item.Cliente || item.NomeCliente || '';
  
  if (tipoNorm === 'MANUTENCAO') {
    return { 
      label: 'Oficina', 
      value: item.Fornecedor || genericClient || 'Oficina não inf.', 
      icon: <Store size={12}/> 
    };
  }
  
  if (tipoNorm === 'MULTA' || tipoNorm === 'MULTAS') {
    return { 
      label: 'Condutor', 
      value: item.NomeCondutor || genericClient || 'Condutor não inf.', 
      icon: <User size={12}/> 
    };
  }
  
  if (tipoNorm === 'COMPRA' || tipoNorm === 'AQUISICAO') {
    return { 
      label: 'Fornecedor', 
      value: item.Fornecedor || item.Proprietario || genericClient, 
      icon: <Store size={12}/> 
    };
  }
  
  if (tipoNorm === 'LOCACAO' || tipoNorm === 'DEVOLUCAO') {
    return { 
      label: 'Cliente', 
      value: genericClient, 
      icon: <UserCheck size={12}/> 
    };
  }
  
  return { 
    label: 'Responsável', 
    value: genericClient, 
    icon: <User size={12}/> 
  };
}

export default function TimelineTab({ timeline, filteredData, frota, manutencao, contratosLocacao, sinistros }: TimelineTabProps) {
  const [expandedPlates, setExpandedPlates] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Auto-expandir primeiro veículo
  const [autoExpanded, setAutoExpanded] = useState(false);

  // Criar mapa de sinistros por placa para enriquecimento rápido
  const sinistrosByPlaca = useMemo(() => {
    const map: Record<string, AnyObject[]> = {};
    if (!Array.isArray(sinistros)) return map;
    for (const s of sinistros) {
      const placa = s?.Placa;
      if (!placa) continue;
      if (!map[placa]) map[placa] = [];
      map[placa].push(s);
    }
    return map;
  }, [sinistros]);

  const contratosByPlaca = useMemo(() => {
    const map: Record<string, AnyObject[]> = {};
    const list = Array.isArray(contratosLocacao) ? contratosLocacao : [];

    const pickDate = (c: AnyObject, keys: string[]): Date | null => {
      for (const k of keys) {
        const d = parseDateAny((c as any)[k]);
        if (d) return d;
      }
      return null;
    };

    for (const c of list) {
      const placaKey = normalizePlacaKey(c?.PlacaPrincipal ?? c?.Placa);
      if (!placaKey) continue;
      if (!map[placaKey]) map[placaKey] = [];

      const inicio = pickDate(c, ['DataInicial', 'InicioContrato', 'DataInicio', 'DataInicioContrato', 'DataRetirada', 'DataInicioLocacao']);
      const fimPrevisto = pickDate(c, ['DataPrevistaTermino', 'DataFimPrevista', 'DataFimPrevisto', 'DataFim', 'DataTerminoPrevisto', 'DataFimLocacao']);
      const fimEncerramento = pickDate(c, ['DataEncerramento', 'DataEncerrado', 'DataFimEfetiva', 'DataTermino', 'DataFimLocacao', 'DataFim']);

      map[placaKey].push({
        ...c,
        __inicio: inicio,
        __fimPrevisto: fimPrevisto,
        __fimEncerramento: fimEncerramento,
      });
    }

    for (const placaKey of Object.keys(map)) {
      map[placaKey].sort((a, b) => {
        const at = (a.__inicio as Date | null)?.getTime() || 0;
        const bt = (b.__inicio as Date | null)?.getTime() || 0;
        return bt - at;
      });
    }

    return map;
  }, [contratosLocacao]);

  const resolveContratoFor = (placa: string, d: Date | null) => {
    const placaKey = normalizePlacaKey(placa);
    const arr = contratosByPlaca[placaKey] ?? [];
    const t = d?.getTime() ?? 0;
    if (arr.length === 0) {
      const frotaRow = (Array.isArray(frota) ? frota : []).find((f) => normalizePlacaKey(f?.Placa) === placaKey);
      if (!frotaRow) return null;
      const numero = String(frotaRow?.NumeroContratoLocacao ?? frotaRow?.ContratoLocacao ?? '').trim();
      const cliente = String(frotaRow?.NomeCliente ?? frotaRow?.Cliente ?? '').trim();
      const situacao = String(frotaRow?.SituacaoLocacao ?? frotaRow?.StatusLocacao ?? '').trim();
      const previsto = parseDateAny(frotaRow?.DataPrevistaTerminoLocacao ?? frotaRow?.DataPrevistaTermino);
      const encerramento = parseDateAny(frotaRow?.DataEncerramentoLocacao ?? frotaRow?.DataEncerramento);
      if (!numero && !cliente && !situacao && !previsto && !encerramento) return null;
      return {
        NumeroContrato: numero,
        NomeCliente: cliente,
        SituacaoLocacao: situacao,
        __fimPrevisto: previsto,
        __fimEncerramento: encerramento,
      };
    }

    if (!t) return arr[0] ?? null;

    for (const c of arr) {
      const inicio = c.__inicio as Date | null;
      const fim = (c.__fimEncerramento as Date | null) ?? (c.__fimPrevisto as Date | null) ?? null;
      const ti = inicio?.getTime() ?? 0;
      const tf = fim?.getTime() ?? null;
      if (ti && t >= ti && (tf === null || t <= tf)) return c;
    }

    // fallback: pega o contrato mais recente com início anterior à data
    for (const c of arr) {
      const inicio = c.__inicio as Date | null;
      const ti = inicio?.getTime() ?? 0;
      if (ti && t >= ti) return c;
    }

    return null;
  };

  const manutencaoByPlaca = useMemo(() => {
    const map: Record<string, AnyObject[]> = {};
    console.log('📊 Manutenção total recebida:', Array.isArray(manutencao) ? manutencao.length : 'não é array', manutencao);
    if (!Array.isArray(manutencao)) return map;
    for (const r of manutencao) {
      const placa = r?.Placa;
      if (!placa) continue;
      if (!map[placa]) map[placa] = [];
      map[placa].push(r);
    }
    console.log('📊 Manutenção agrupada por placa:', Object.keys(map).length, 'veículos', map);
    return map;
  }, [manutencao]);

  // Agrupa eventos por placa
  const timelineGrouped = useMemo(() => {
    const placasFiltradas = new Set(filteredData.map(f => f.Placa).filter(Boolean));
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

      const sortedEvents = [...eventos]
        .filter(e => !!(e.DataEvento || e.Data))
        .sort((a, b) => {
          const ad = parseDateAny(a.DataEvento || a.Data) ?? new Date(0);
          const bd = parseDateAny(b.DataEvento || b.Data) ?? new Date(0);
          return ad.getTime() - bd.getTime();
        });

      const { totalDays, locacaoDays, manutencaoDays, sinistroDays } = calcStateDurationsDays(sortedEvents);
      // Utilização = dias locado / (total - dias inativos por sinistro/manutenção longa)
      // Considera produtivo quando em locação; improdutivo quando em manutenção/sinistro
      const utilization = totalDays > 0 ? Math.min(100, Math.max(0, (locacaoDays / totalDays) * 100)) : 0;

      const numeroContratoLocacao = veiculoInfo?.NumeroContratoLocacao || veiculoInfo?.ContratoAtual || veiculoInfo?.NumeroContrato;
      const situacaoLocacao = veiculoInfo?.SituacaoLocacao || veiculoInfo?.StatusLocacao || veiculoInfo?.StatusContrato || veiculoInfo?.Situacao;
      const dataPrevistaTerminoLocacao = veiculoInfo?.DataPrevistaTerminoLocacao || veiculoInfo?.DataFimLocacao;
      const dataEncerramentoLocacao = veiculoInfo?.DataEncerramentoLocacao || veiculoInfo?.DataFimLocacao;

      return {
        placa,
        modelo: veiculoInfo?.Modelo || 'N/A',
        status: veiculoInfo?.Status || 'N/A',
        numeroContratoLocacao: numeroContratoLocacao || null,
        situacaoLocacao: situacaoLocacao || null,
        dataPrevistaTerminoLocacao: dataPrevistaTerminoLocacao || null,
        dataEncerramentoLocacao: dataEncerramentoLocacao || null,
        eventos: sortedEvents,
        totalEvents: sortedEvents.length,
        locacaoDays: Math.round(locacaoDays),
        manutencaoDays: Math.round(manutencaoDays),
        sinistroDays: Math.round(sinistroDays),
        utilization
      };
    }).sort((a, b) => b.totalEvents - a.totalEvents);
  }, [timeline, filteredData, frota]);

  // Filtrar por busca
  const filteredGrouped = useMemo(() => {
    if (!searchTerm) return timelineGrouped;
    const term = searchTerm.toLowerCase();
    return timelineGrouped.filter(g => 
      g.placa.toLowerCase().includes(term) || 
      g.modelo.toLowerCase().includes(term)
    );
  }, [timelineGrouped, searchTerm]);

  // Paginação
  const pageItems = filteredGrouped.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredGrouped.length / pageSize);

  // Auto-expandir primeiro veículo ao carregar
  useEffect(() => {
    if (!autoExpanded && pageItems.length > 0) {
      const firstPlate = pageItems[0]?.placa;
      if (firstPlate) {
        setExpandedPlates(new Set([firstPlate]));
        setAutoExpanded(true);
        // Expandir eventos após um delay
        setTimeout(() => {
          togglePlate(firstPlate);
        }, 300);
      }
    }
  }, [pageItems, autoExpanded]);

  // KPIs
  const kpis = useMemo(() => {
    const totalVehicles = timelineGrouped.length;
    const totalEvents = timeline.length;
    const avgEvents = totalVehicles > 0 ? totalEvents / totalVehicles : 0;
    const avgUtilization = totalVehicles > 0 
      ? timelineGrouped.reduce((sum, g) => sum + g.utilization, 0) / totalVehicles 
      : 0;

    // Distribuição por tipo de evento
    const eventTypes: Record<string, number> = {};
    let totalMultas = 0;
    let totalSinistros = 0;
    
    timeline.forEach(e => {
      const tipo = normalizeEventName(e.TipoEvento || e.Evento || 'Outro') || 'Outro';
      eventTypes[tipo] = (eventTypes[tipo] || 0) + 1;
      
      if (tipo.includes('MULTA')) totalMultas++;
      if (tipo.includes('SINISTRO')) totalSinistros++;
    });

    // Somar dias totais de manutenção e sinistro
    const totalManutencaoDays = timelineGrouped.reduce((sum, g) => sum + g.manutencaoDays, 0);
    const totalSinistroDays = timelineGrouped.reduce((sum, g) => sum + g.sinistroDays, 0);

    return { 
      totalVehicles, 
      totalEvents, 
      avgEvents, 
      avgUtilization, 
      eventTypes, 
      totalMultas, 
      totalSinistros,
      totalManutencaoDays,
      totalSinistroDays
    };
  }, [timelineGrouped, timeline]);

  // Gráfico 1: Veículos por faixa de dias locados
  const vehiclesByRentalDays = useMemo(() => {
    const ranges = [
      { name: '0-30 dias', min: 0, max: 30, count: 0, color: '#ef4444' },
      { name: '31-90 dias', min: 31, max: 90, count: 0, color: '#f59e0b' },
      { name: '91-180 dias', min: 91, max: 180, count: 0, color: '#eab308' },
      { name: '181-365 dias', min: 181, max: 365, count: 0, color: '#3b82f6' },
      { name: '> 365 dias', min: 366, max: Infinity, count: 0, color: '#10b981' }
    ];

    timelineGrouped.forEach(v => {
      const days = v.locacaoDays;
      const range = ranges.find(r => days >= r.min && days <= r.max);
      if (range) range.count++;
    });

    return ranges.filter(r => r.count > 0);
  }, [timelineGrouped]);

  // Gráfico 2: Veículos por faixa de dias de manutenção
  const vehiclesByMaintenanceDays = useMemo(() => {
    const ranges = [
      { name: '0 dias', min: 0, max: 0, count: 0, color: '#10b981' },
      { name: '1-7 dias', min: 1, max: 7, count: 0, color: '#3b82f6' },
      { name: '8-15 dias', min: 8, max: 15, count: 0, color: '#eab308' },
      { name: '16-30 dias', min: 16, max: 30, count: 0, color: '#f59e0b' },
      { name: '> 30 dias', min: 31, max: Infinity, count: 0, color: '#ef4444' }
    ];

    timelineGrouped.forEach(v => {
      const days = v.manutencaoDays;
      const range = ranges.find(r => days >= r.min && days <= r.max);
      if (range) range.count++;
    });

    return ranges.filter(r => r.count > 0);
  }, [timelineGrouped]);

  // Gráfico 3: Veículos por faixa de utilização
  const vehiclesByUtilization = useMemo(() => {
    const ranges = [
      { name: '< 40% (Crítico)', min: 0, max: 39.99, count: 0, color: '#ef4444' },
      { name: '40-59% (Regular)', min: 40, max: 59.99, count: 0, color: '#f59e0b' },
      { name: '60-79% (Bom)', min: 60, max: 79.99, count: 0, color: '#3b82f6' },
      { name: '≥ 80% (Excelente)', min: 80, max: 100, count: 0, color: '#10b981' }
    ];

    timelineGrouped.forEach(v => {
      const util = v.utilization;
      const range = ranges.find(r => util >= r.min && util <= r.max);
      if (range) range.count++;
    });

    return ranges.filter(r => r.count > 0);
  }, [timelineGrouped]);

  const togglePlate = (placa: string) => {
    const isCurrentlyExpanded = expandedPlates.has(placa);
    
    setExpandedPlates(prev => {
      const next = new Set(prev);
      if (next.has(placa)) {
        next.delete(placa);
      } else {
        next.add(placa);
      }
      return next;
    });

    if (isCurrentlyExpanded) {
      // Ao fechar veículo, limpar os eventos expandidos desse veículo
      setExpandedRows(prevRows => {
        const nextRows = new Set(prevRows);
        Array.from(nextRows).forEach(key => {
          if (key.toLowerCase().includes(placa.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
            nextRows.delete(key);
          }
        });
        return nextRows;
      });
    } else {
      // Ao abrir veículo, expandir automaticamente TODOS os eventos após um pequeno delay
      setTimeout(() => {
        setExpandedRows(prevRows => {
          const nextRows = new Set(prevRows);
          
          // Expandir manutenções
          const manutRecords = manutencaoByPlaca[placa] ?? [];
          if (manutRecords.length > 0) {
            const intervals = buildMaintenanceIntervals(manutRecords);
            intervals.forEach(interval => {
              nextRows.add(interval.key);
            });
          }
          
          // Expandir eventos normais - buscar no timelineGrouped
          const veiculoData = timelineGrouped.find(g => g.placa === placa);
          if (veiculoData) {
            // Processar eventos para criar as mesmas keys que são usadas na renderização
            const groups = new Map<string, Date>();
            veiculoData.eventos.forEach(ev => {
              const tipo = normalizeEventName(ev.TipoEvento || ev.Evento || 'Evento') || 'OUTRO';
              if (tipo.includes('MANUT') || tipo.includes('MULTA')) return;
              const d = new Date(ev.DataEvento || ev.Data);
              if (!Number.isNaN(d.getTime())) {
                const key = `${tipo}:${toISODateKey(d)}`;
                groups.set(key, d);
              }
            });
            
            groups.forEach((_date, key) => {
              nextRows.add(key);
            });
          }
          
          // Expandir multas
          nextRows.add(`multas:${placa}`);
          
          return nextRows;
        });
      }, 150);
    }
  };

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const exportToExcel = () => {
    const data = timeline.map(e => ({
      Placa: e.Placa,
      Modelo: e.Modelo,
      TipoEvento: e.TipoEvento || e.Evento,
      DataEvento: e.DataEvento || e.Data,
      Detalhe1: e.Detalhe1 || e.Descricao,
      Detalhe2: e.Detalhe2
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Timeline');
    XLSX.writeFile(wb, `timeline_veiculos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (timeline.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-200 flex items-center justify-center">
            <History className="w-10 h-10 text-slate-400" />
          </div>
          <Title className="text-slate-600">Sem Dados de Timeline</Title>
          <Text className="mt-3 text-slate-500 max-w-md mx-auto">
            Nenhum evento de histórico foi encontrado. Verifique se o arquivo <code className="bg-slate-200 px-2 py-1 rounded text-xs">hist_vida_veiculo_timeline.json</code> está disponível.
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <History className="w-8 h-8" />
              Linha do Tempo da Frota
            </h2>
            <p className="text-slate-300 mt-1">Histórico completo de eventos, locações e manutenções</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{fmtDecimal(kpis.totalEvents)}</div>
              <div className="text-slate-400 text-sm">Eventos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{fmtDecimal(kpis.totalVehicles)}</div>
              <div className="text-slate-400 text-sm">Veículos</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs">Total Eventos</Text>
              <Metric className="text-blue-600">{fmtDecimal(kpis.totalEvents)}</Metric>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Car className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs">Veículos</Text>
              <Metric className="text-emerald-600">{fmtDecimal(kpis.totalVehicles)}</Metric>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs">Dias Manutenção</Text>
              <Metric className="text-amber-600">{fmtDecimal(kpis.totalManutencaoDays)}</Metric>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs">Sinistros / Dias</Text>
              <Metric className="text-red-600">{kpis.totalSinistros} / {fmtDecimal(kpis.totalSinistroDays)}d</Metric>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <FileWarning className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs">Total Multas</Text>
              <Metric className="text-yellow-600">{fmtDecimal(kpis.totalMultas)}</Metric>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos - Novos gráficos de faixas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Veículos por faixa de dias locados */}
        <Card className="shadow-lg">
          <Title className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-emerald-600" />
            Veículos por Dias Locados
          </Title>
          <Text className="text-xs text-slate-500 mb-2">Distribuição por faixa de dias em locação</Text>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehiclesByRentalDays} layout="vertical" margin={{ left: 10, right: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => [fmtDecimal(value), 'Veículos']} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                  {vehiclesByRentalDays.map((entry, index) => (
                    <Cell key={`rental-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="count" position="right" formatter={(v: number) => fmtDecimal(v)} fontSize={11} fill="#1e293b" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Veículos por faixa de dias de manutenção */}
        <Card className="shadow-lg">
          <Title className="flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5 text-amber-600" />
            Veículos por Dias de Manutenção
          </Title>
          <Text className="text-xs text-slate-500 mb-2">Distribuição por faixa de dias em oficina</Text>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehiclesByMaintenanceDays} layout="vertical" margin={{ left: 10, right: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => [fmtDecimal(value), 'Veículos']} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                  {vehiclesByMaintenanceDays.map((entry, index) => (
                    <Cell key={`maint-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="count" position="right" formatter={(v: number) => fmtDecimal(v)} fontSize={11} fill="#1e293b" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Veículos por faixa de utilização */}
        <Card className="shadow-lg">
          <Title className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Veículos por Faixa de Utilização
          </Title>
          <Text className="text-xs text-slate-500 mb-2">Distribuição por % de utilização</Text>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehiclesByUtilization} layout="vertical" margin={{ left: 10, right: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => [fmtDecimal(value), 'Veículos']} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                  {vehiclesByUtilization.map((entry, index) => (
                    <Cell key={`util-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="count" position="right" formatter={(v: number) => fmtDecimal(v)} fontSize={11} fill="#1e293b" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Timeline por veículo */}
      <Card className="shadow-lg overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Title className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              Timeline por Veículo
            </Title>
            <Badge color="slate">{fmtDecimal(filteredGrouped.length)} veículos</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar placa..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-9 pr-4 py-2 text-sm border rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border rounded-lg hover:bg-slate-50"
            >
              <FileSpreadsheet size={16} />
              Exportar
            </button>
          </div>
        </div>

        <div className="divide-y">
          {pageItems.map(({ placa, modelo, eventos, totalEvents, locacaoDays, manutencaoDays, sinistroDays, utilization }) => (
            <div key={placa} className="hover:bg-slate-50 transition-colors">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => togglePlate(placa)}
              >
                <div className="flex items-center gap-4">
                  <div className={`transition-transform ${expandedPlates.has(placa) ? 'rotate-90' : ''}`}>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="font-mono font-bold text-blue-600">{placa}</div>
                    <div className="text-sm text-slate-500">{modelo}</div>
                  </div>
                  <Badge color="slate" className="ml-2">{totalEvents} eventos</Badge>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-emerald-600 font-bold">{locacaoDays}d</div>
                    <div className="text-xs text-slate-400">Locado</div>
                  </div>
                  <div className="text-center">
                    <div className="text-amber-600 font-bold">{manutencaoDays}d</div>
                    <div className="text-xs text-slate-400">Manutenção</div>
                  </div>
                  {sinistroDays > 0 && (
                    <div className="text-center">
                      <div className="text-red-600 font-bold">{sinistroDays}d</div>
                      <div className="text-xs text-slate-400">Sinistro</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className={`font-bold ${utilization >= 70 ? 'text-emerald-600' : utilization >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {utilization.toFixed(0)}%
                    </div>
                    <div className="text-xs text-slate-400">Utilização</div>
                  </div>
                </div>
              </div>

              {/* Eventos expandidos */}
              {expandedPlates.has(placa) && (
                <div className="px-4 pb-4 pl-14">
                  <div className="relative border-l-2 border-slate-200 ml-2 space-y-3">
                    {(() => {
                      // Deriva linhas “colapsadas” para validação: manutenção por período + agrupamento de eventos por dia/tipo
                      // 1) Manutenção (via dataset fat_manutencao_unificado)
                      const manutRecords = manutencaoByPlaca[placa] ?? [];
                      const manutOccurrences = groupMaintenanceByOccurrence(manutRecords);

                      // 2) Eventos agrupados por dia/tipo
                      // Se houver intervalos de manutenção consolidados, não mostrar eventos individuais de manutenção
                      // Multas serão exibidas em um tópico próprio.
                      const groups = new Map<string, { tipo: string; date: Date; items: AnyObject[] }>();
                      for (const ev of [...eventos].slice().reverse()) {
                        // reverse para manter o último evento do dia no topo ao expandir o grupo
                        const tipo = normalizeEventName(ev.TipoEvento || ev.Evento || 'Evento') || 'OUTRO';
                        // Se há ocorrências consolidadas, pular eventos de manutenção individuais
                        if (tipo.includes('MANUT') && manutOccurrences.length > 0) continue;
                        if (tipo.includes('MULTA')) continue;
                        const d = new Date(ev.DataEvento || ev.Data);
                        if (Number.isNaN(d.getTime())) continue;
                        const key = `${tipo}:${toISODateKey(d)}`;
                        const prev = groups.get(key);
                        if (!prev) groups.set(key, { tipo, date: d, items: [ev] });
                        else prev.items.push(ev);
                      }

                      // 3) Multas (tópico dedicado)
                      const multas = [...eventos]
                        .filter((ev) => (normalizeEventName(ev.TipoEvento || ev.Evento || ''))?.includes('MULTA'))
                        .map((ev) => {
                          const d = new Date(ev.DataEvento || ev.Data);
                          return { ev, d: Number.isNaN(d.getTime()) ? null : d };
                        })
                        .sort((a, b) => (b.d?.getTime() || 0) - (a.d?.getTime() || 0));

                      const eventRows: EventGroupRow[] = Array.from(groups.entries()).map(([key, g]) => ({
                        kind: 'EVENTO_DIA_TIPO',
                        key,
                        tipo: g.tipo,
                        date: g.date,
                        count: g.items.length,
                        items: g.items
                      }));

                      const rows: TimelineRow[] = [...manutOccurrences, ...eventRows]
                        .sort((a, b) => {
                          const ad = a.kind === 'MANUTENCAO_OCORRENCIA' ? a.ocorrenciaDate : a.date;
                          const bd = b.kind === 'MANUTENCAO_OCORRENCIA' ? b.ocorrenciaDate : b.date;
                          return bd.getTime() - ad.getTime();
                        })
                        .slice(0, 30);

                      return (
                        <>
                          {manutOccurrences.length > 0 && (
                            <div className="pl-6 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="flex items-center gap-2 text-sm">
                                <Wrench className="w-4 h-4 text-amber-600" />
                                <span className="font-semibold text-amber-800">
                                  {manutOccurrences.length} ocorrência(s) de manutenção • {manutRecords.length} OS total
                                </span>
                              </div>
                              <div className="text-xs text-amber-600 mt-1">
                                Clique nas ocorrências abaixo para ver as ordens de serviço detalhadas
                              </div>
                            </div>
                          )}
                          
                          {manutOccurrences.length === 0 && manutencaoDays > 0 && (
                            <div className="pl-6 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="flex items-center gap-2 text-sm">
                                <Wrench className="w-4 h-4 text-amber-600" />
                                <span className="font-semibold text-amber-800">
                                  Manutenção: {manutencaoDays} dias calculados
                                </span>
                              </div>
                              <div className="text-xs text-amber-600 mt-1">
                                Os registros detalhados de OS não estão disponíveis para este veículo
                              </div>
                            </div>
                          )}

                          {multas.length > 0 && (() => {
                            const multasKey = `multas:${placa}`;
                            const opened = expandedRows.has(multasKey);
                            return (
                              <div className="relative pl-6">
                                <div className="absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                                  {EVENT_ICONS['MULTA'] || <Clock size={14} className="text-slate-400" />}
                                </div>
                                <div
                                  className="bg-slate-50 rounded-lg p-3 cursor-pointer border border-slate-100"
                                  onClick={() => toggleRow(multasKey)}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm text-slate-700 truncate">MULTAS</span>
                                        <Badge color="slate" className="shrink-0">{multas.length}</Badge>
                                      </div>
                                      <div className="text-xs text-slate-500 mt-1">
                                        Clique para {opened ? 'ocultar' : 'ver'} todas as multas por data
                                      </div>
                                    </div>
                                    <div className="text-xs text-slate-400 shrink-0">{opened ? 'Ocultar' : 'Abrir'}</div>
                                  </div>

                                  {opened && (
                                    <div className="mt-2 space-y-2">
                                      {multas.map(({ ev, d }, i) => {
                                        const k = `multa:${placa}:${String(ev?.IdOcorrencia || ev?.Ocorrencia || ev?.AutoInfracao || i)}`;
                                        const itemOpen = expandedRows.has(k);
                                        const detail = ev?.Detalhe1 || ev?.Descricao || ev?.DescricaoInfracao || ev?.Detalhe2;
                                        const codigoInfracao = ev?.CodigoInfracao ?? ev?.codigo_infracao;
                                        const orgaoAutuador = ev?.OrgaoAutuador ?? ev?.orgao_autuador;
                                        const valorMulta = ev?.ValorEvento ?? ev?.ValorMulta ?? ev?.valor_multa;
                                        const status = ev?.Status ?? ev?.status ?? ev?.Situacao;
                                        const dataInfracao = parseDateAny(ev?.DataInfracao ?? ev?.data_infracao);
                                        const localInfracao = ev?.LocalInfracao ?? ev?.local_infracao ?? ev?.Local;
                                        const pontos = ev?.PontosCarteira ?? ev?.pontos_carteira ?? ev?.Pontos;
                                        const condutor = ev?.Condutor ?? ev?.condutor ?? ev?.NomeCondutor;
                                        const numeroAuto = ev?.NumeroAuto ?? ev?.numero_auto ?? ev?.AutoInfracao;

                                        return (
                                          <div key={k} className="bg-white rounded border border-slate-200">
                                            <div
                                              className="px-3 py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-sky-50"
                                              onClick={() => toggleRow(k)}
                                            >
                                              <div className="min-w-0">
                                                <div className="text-sm text-slate-700 font-medium">
                                                  {d ? d.toLocaleDateString('pt-BR') : '—'}
                                                  {numeroAuto ? <span className="ml-2 text-slate-400 font-mono">• {String(numeroAuto)}</span> : null}
                                                </div>
                                                {detail ? <div className="text-xs text-slate-500 truncate mt-0.5">{String(detail)}</div> : null}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {valorMulta && (
                                                  <span className="text-sm font-semibold text-sky-700">
                                                    {typeof valorMulta === 'number' 
                                                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorMulta)
                                                      : String(valorMulta)
                                                    }
                                                  </span>
                                                )}
                                                <div className="text-xs text-slate-400 shrink-0">{itemOpen ? '▼' : '▶'}</div>
                                              </div>
                                            </div>

                                            {itemOpen && (
                                              <div className="px-3 pb-3 text-xs space-y-1 border-t bg-sky-50/30">
                                                {codigoInfracao && (
                                                  <div className="flex gap-2 pt-2">
                                                    <span className="text-slate-500 font-medium">Código Infração:</span>
                                                    <span className="font-mono font-semibold text-sky-700">{String(codigoInfracao)}</span>
                                                  </div>
                                                )}
                                                {orgaoAutuador && (
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Órgão Autuador:</span>
                                                    <span className="text-slate-700">{String(orgaoAutuador)}</span>
                                                  </div>
                                                )}
                                                {dataInfracao && (
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Data Infração:</span>
                                                    <span>{fmtDateBR(dataInfracao)}</span>
                                                  </div>
                                                )}
                                                {localInfracao && (
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Local:</span>
                                                    <span className="text-slate-700">{String(localInfracao)}</span>
                                                  </div>
                                                )}
                                                {condutor && (
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Condutor:</span>
                                                    <span className="text-slate-700">{String(condutor)}</span>
                                                  </div>
                                                )}
                                                {pontos && (
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Pontos CNH:</span>
                                                    <span className="font-semibold text-orange-600">{String(pontos)}</span>
                                                  </div>
                                                )}
                                                {status && (
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Status:</span>
                                                    <Badge color="sky" className="text-xs">{String(status)}</Badge>
                                                  </div>
                                                )}
                                                {ev?.Detalhe2 && ev?.Detalhe2 !== detail && (
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Observação:</span>
                                                    <span className="text-slate-600">{String(ev.Detalhe2)}</span>
                                                  </div>
                                                )}
                                                {ev?.Usuario && (
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Registrado por:</span>
                                                    <span className="text-slate-600">{String(ev.Usuario)}</span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {rows.map((row) => {
                            // MANUTENCAO_OCORRENCIA - novo agrupamento por ocorrência
                            if (row.kind === 'MANUTENCAO_OCORRENCIA') {
                              const icon = EVENT_ICONS['MANUTENÇÃO'] || <Wrench size={14} className="text-amber-500" />;
                              const title = `${row.ocorrencia ?? row.ocorrenciaId}`;
                              const dataOcorrencia = fmtDateTimeBR(row.ocorrenciaDate);
                              const firstRec = row.osRecords[0];
                              const motivo = firstRec?.Motivo ?? '';
                              const descricao = firstRec?.DescricaoOcorrencia ?? firstRec?.Descricao ?? '';
                              const fornecedor = firstRec?.FornecedorOcorrencia ?? firstRec?.FornecedorOS ?? firstRec?.Fornecedor ?? '';
                              const cliente = firstRec?.Cliente ?? firstRec?.NomeCliente ?? '';

                              return (
                                <div key={row.key} className="relative pl-6">
                                  <div className="absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-amber-300 flex items-center justify-center">
                                    {icon}
                                  </div>
                                  <div
                                    className="bg-amber-50/70 rounded-lg p-3 border-2 border-amber-200 cursor-pointer hover:bg-amber-100/50 transition-all"
                                    onClick={() => toggleRow(row.key)}
                                  >
                                      <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-sm text-amber-800">{title}</span>
                                          <Badge color="amber" className="shrink-0">{row.osRecords.length} OS</Badge>
                                          {row.tipoOcorrencia && (
                                            <Badge color="slate" className="shrink-0 text-[10px]">{row.tipoOcorrencia}</Badge>
                                          )}
                                          {row.situacao && (
                                            <Badge 
                                              color={row.situacao.toLowerCase().includes('conclu') ? 'emerald' : 
                                                     row.situacao.toLowerCase().includes('cancel') ? 'rose' : 'blue'} 
                                              className="shrink-0 text-[10px]"
                                            >
                                              {row.situacao}
                                            </Badge>
                                          )}
                                          {row.custoTotal != null && row.custoTotal > 0 && (
                                            <span className="text-amber-700 font-bold text-xs ml-auto">{fmtMoney(row.custoTotal)}</span>
                                          )}
                                        </div>
                                        <div className="text-xs text-slate-600 mt-1.5 space-y-0.5">
                                          <div><b>Data:</b> {dataOcorrencia} {motivo && <>• <b>Motivo:</b> {motivo}</>}</div>
                                          {descricao && <div className="italic text-slate-500 line-clamp-1">{descricao}</div>}
                                          {(fornecedor || cliente) && (
                                            <div className="text-[10px] text-slate-500">
                                              {fornecedor && <><b>Fornecedor:</b> {fornecedor} </>}
                                              {cliente && <><b>Cliente:</b> {cliente}</>}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-2 shrink-0">
                                        <div className="text-right text-[11px] text-slate-600">
                                          <div><b>Abertura:</b> {fmtDateTimeBR(row.dataAberturaOcorrencia ?? row.ocorrenciaDate)}</div>
                                          <div><b>Conclusão:</b> {fmtDateTimeBR(row.dataConclusaoOcorrencia)}</div>
                                          {row.dataChegadaVeiculo && <div><b>Chegada:</b> {fmtDateTimeBR(row.dataChegadaVeiculo)}</div>}
                                          <div><b>Retirada:</b> {fmtDateTimeBR(row.dataRetiradaVeiculo)}</div>
                                          {(() => {
                                            const minsConclRet = getMinutesConclusaoRetirada(row);
                                            return minsConclRet != null ? (
                                              <div className="text-amber-700 font-semibold mt-1">Δ Concl→Ret: {fmtDurationFromMinutes(minsConclRet)}</div>
                                            ) : null;
                                          })()}
                                        </div>
                                        <div className="text-xs text-amber-600 font-medium">
                                          {expandedRows.has(row.key) ? '▼ Ocultar' : '▶ Expandir'}
                                        </div>
                                      </div>
                                    </div>

                                    {expandedRows.has(row.key) && (
                                      <div className="mt-3 space-y-2">
                                        {/* Movimentações: mostrar etapas com data e tempo desde anterior */}
                                        {Array.isArray(row.movimentacoes) && row.movimentacoes.length > 0 && (
                                          <div className="bg-slate-50 p-2 rounded text-xs text-slate-700">
                                            <div className="font-medium text-[12px] mb-1">Etapas</div>
                                            <div className="flex flex-col gap-1">
                                              {row.movimentacoes.map((m, idx) => (
                                                <div key={`mov:${idx}`} className="flex items-center justify-between gap-3">
                                                  <div className="min-w-0">
                                                    <div className="flex items-baseline gap-2">
                                                      <div className="font-medium text-[12px]">{m?.Etapa ?? '—'}</div>
                                                      {m?.Usuario ? <div className="text-[11px] text-slate-400">• {String(m.Usuario)}</div> : null}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">{m?.DataConfirmacao ? (function(){ try { return fmtDateTimeBR(new Date(m.DataConfirmacao)); } catch(e){ return m.DataConfirmacao; } })() : '—'}</div>
                                                  </div>
                                                  <div className="text-[11px] text-slate-600">{fmtDurationFromMinutes(m?.MinutosDesdeAnterior ?? (m?.HorasDesdeAnterior != null ? Number(m.HorasDesdeAnterior) * 60 : null))}</div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* detalhamento das OS */}
                                        {row.osRecords.map((r, i) => {
                                          const osId = r?.OrdemServico ?? getMaintenanceId(r);
                                          const entrada = normalizeDateLocal(r?.DataEntrada ?? r?.DataCriacaoOS ?? r?.DataAgendamento);
                                          const saida = normalizeDateLocal(r?.DataSaida ?? r?.DataConclusaoOcorrencia);
                                          const statusOS = r?.StatusOS ?? r?.SituacaoOrdemServico;
                                          const categoria = r?.Categoria ?? '';
                                          const despesa = r?.Despesa ?? '';
                                          const custo = r?.CustoTotalOS ?? r?.ValorTotal;
                                          const valorReembolsavel = r?.ValorReembolsavel;
                                          const valorNaoReembolsavel = r?.ValorNaoReembolsavel;
                                          const odometro = r?.OdometroOS ?? r?.Odometro;
                                          const fornecedorOS = r?.FornecedorOS ?? r?.Fornecedor;
                                          const ordemCompra = r?.OrdemCompra;
                                          
                                          return (
                                            <div key={`${row.key}:os:${i}`} className="text-xs bg-white p-3 border-l-4 border-amber-400 rounded shadow-sm space-y-2">
                                              {/* Linha 1: ID da OS e Valor */}
                                              <div className="flex justify-between items-start font-medium">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-slate-700 font-mono text-sm font-bold">{osId || `OS #${i+1}`}</span>
                                                  {statusOS && (
                                                    <Badge 
                                                      color={statusOS.toLowerCase().includes('conclu') ? 'emerald' : 
                                                             statusOS.toLowerCase().includes('cancel') ? 'rose' : 'blue'}
                                                      size="xs"
                                                    >
                                                      {statusOS}
                                                    </Badge>
                                                  )}
                                                </div>
                                                {custo != null && Number(custo) > 0 && (
                                                  <span className="text-amber-700 font-bold">{fmtMoney(custo)}</span>
                                                )}
                                              </div>

                                              {/* Linha 2: Datas e Odômetro */}
                                              <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600 bg-amber-50/50 p-2 rounded">
                                                {entrada && (
                                                  <div>
                                                    <span className="text-slate-500 font-medium">Entrada:</span>
                                                    <div className="font-semibold">{fmtDateBR(entrada)}</div>
                                                  </div>
                                                )}
                                                {saida && (
                                                  <div>
                                                    <span className="text-slate-500 font-medium">Saída:</span>
                                                    <div className="font-semibold">{fmtDateBR(saida)}</div>
                                                  </div>
                                                )}
                                                {odometro != null && Number(odometro) > 0 && (
                                                  <div>
                                                    <span className="text-slate-500 font-medium">Odômetro:</span>
                                                    <div className="font-semibold">{fmtDecimal(Number(odometro))} km</div>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Linha 3: Categoria, Despesa, Ordem de Compra */}
                                              {(categoria || despesa || ordemCompra) && (
                                                <div className="flex flex-wrap gap-2 items-center">
                                                  {categoria && (
                                                    <div className="flex items-center gap-1">
                                                      <span className="text-slate-500 text-[10px]">Categoria:</span>
                                                      <Badge color="amber" size="xs">{categoria}</Badge>
                                                    </div>
                                                  )}
                                                  {despesa && (
                                                    <div className="flex items-center gap-1">
                                                      <span className="text-slate-500 text-[10px]">Despesa:</span>
                                                      <Badge color="purple" size="xs">{despesa}</Badge>
                                                    </div>
                                                  )}
                                                  {ordemCompra && (
                                                    <div className="flex items-center gap-1">
                                                      <span className="text-slate-500 text-[10px]">OC:</span>
                                                      <span className="text-slate-700 font-mono text-[10px]">{ordemCompra}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              {/* Linha 4: Valores Reembolsáveis */}
                                              {(valorReembolsavel != null && Number(valorReembolsavel) > 0) || 
                                               (valorNaoReembolsavel != null && Number(valorNaoReembolsavel) > 0) ? (
                                                <div className="grid grid-cols-2 gap-2 text-[10px] bg-green-50/50 p-2 rounded border border-green-100">
                                                  {valorReembolsavel != null && Number(valorReembolsavel) > 0 && (
                                                    <div>
                                                      <span className="text-slate-500 font-medium">Reembolsável:</span>
                                                      <div className="font-bold text-green-700">{fmtMoney(valorReembolsavel)}</div>
                                                    </div>
                                                  )}
                                                  {valorNaoReembolsavel != null && Number(valorNaoReembolsavel) > 0 && (
                                                    <div>
                                                      <span className="text-slate-500 font-medium">Não Reembolsável:</span>
                                                      <div className="font-bold text-red-700">{fmtMoney(valorNaoReembolsavel)}</div>
                                                    </div>
                                                  )}
                                                </div>
                                              ) : null}

                                              {/* Linha 5: Fornecedor da OS */}
                                              {fornecedorOS && (
                                                <div className="flex items-center gap-1.5 text-slate-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 w-fit">
                                                  <Store size={12} className="text-amber-600" />
                                                  <span className="text-[10px]">Fornecedor: <b>{fornecedorOS}</b></span>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            if (row.kind === 'MANUTENCAO_PERIODO') {
                              const endLabel = row.end ? fmtDateBR(row.end) : 'Em aberto';
                              const icon = EVENT_ICONS['MANUTENÇÃO'] || <Wrench size={14} className="text-amber-500" />;
                              const title = `MANUTENÇÃO ${fmtDateBR(row.start)} → ${endLabel}`;
                              const subtitle = `${row.days} dia(s) • ${row.records.length} ocorrência(s)`;

                              const top = row.records[0];
                              const fornecedor = top?.Fornecedor || top?.Oficina;
                              const tipoOcorrencia = top?.TipoOcorrencia || top?.TipoManutencao;

                              return (
                                <div key={row.key} className="relative pl-6">
                                  <div className="absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                                    {icon}
                                  </div>
                                  <div
                                    className="bg-amber-50/50 rounded-lg p-3 border border-amber-100 cursor-pointer"
                                    onClick={() => toggleRow(row.key)}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm text-slate-700 truncate">{title}</span>
                                          <Badge color="amber" className="shrink-0">{row.days}d</Badge>
                                          <Badge color="slate" className="shrink-0">{row.records.length} OS</Badge>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 truncate">
                                          {subtitle}
                                          {(fornecedor || tipoOcorrencia) && (
                                            <>
                                              {' • '}
                                              {fornecedor ? `Oficina: ${fornecedor}` : ''}
                                              {fornecedor && tipoOcorrencia ? ' • ' : ''}
                                              {tipoOcorrencia ? `Tipo: ${tipoOcorrencia}` : ''}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-xs text-slate-400 shrink-0">
                                        {expandedRows.has(row.key) ? 'Ocultar' : 'Detalhar'}
                                      </div>
                                    </div>

                                    {expandedRows.has(row.key) && (
                                      <div className="mt-2 space-y-2">
                                        {row.records.slice(0, 8).map((r, i) => {
                                          const id = getMaintenanceId(r);
                                          const ocorrencia = r?.IdOcorrencia ?? r?.Ocorrencia ?? r?.NumeroOcorrencia ?? id;
                                          const entrada = normalizeDateLocal(r?.DataEntrada ?? r?.DataEntradaOficina ?? r?.DataAgendamento);
                                          const saida = normalizeDateLocal(r?.DataSaida ?? r?.DataSaidaOficina ?? r?.DataConclusao);
                                          const conclusao = normalizeDateLocal(r?.DataConclusao);
                                          const tipoR = r?.TipoOcorrencia ?? r?.TipoManutencao ?? r?.Tipo;
                                          const situacao = r?.Situacao ?? r?.SituacaoOcorrencia ?? r?.Status;
                                          const despesa = r?.Despesa ?? r?.TipoDespesa ?? r?.CategoriaServico;
                                          const custo = r?.CustoTotalOS ?? r?.ValorTotal ?? r?.ValorServico;
                                          const valorReembolsavel = r?.ValorReembolsavel ?? r?.ValorReembolso;
                                          const valorNaoReembolsavel = r?.ValorNaoReembolsavel ?? r?.ValorNaoReembolso;
                                          const kmEntrada = r?.KmEntrada ?? r?.KM_Entrada ?? r?.Odometro;
                                          const kmSaida = r?.KmSaida ?? r?.KM_Saida;
                                          const descricao = r?.DescricaoOS ?? r?.Descricao ?? r?.DescricaoServico ?? r?.Observacao;
                                          const status = r?.StatusOS ?? r?.Status ?? r?.StatusOcorrencia;
                                          const actor = getEventActor('MANUTENCAO', r);
                                          
                                          return (
                                            <div key={`${row.key}:os:${i}`} className="text-xs bg-white p-3 border-l-2 border-amber-400 rounded shadow-sm space-y-2">
                                              {/* Linha 1: ID e Valor */}
                                              <div className="flex justify-between items-start font-medium">
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-slate-700 font-mono">OS: {id || ocorrencia || '—'}</span>
                                                  {ocorrencia && ocorrencia !== id && (
                                                    <span className="text-[10px] text-slate-500">Ocorrência: {ocorrencia}</span>
                                                  )}
                                                </div>
                                                {custo && <span className="text-amber-700 font-bold">{fmtMoney(custo)}</span>}
                                              </div>

                                              {/* Linha 2: Datas */}
                                              <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600 bg-amber-50/50 p-2 rounded">
                                                <div>
                                                  <span className="text-slate-500 font-medium">Entrada:</span>
                                                  <div className="font-semibold">{fmtDateBR(entrada)}</div>
                                                </div>
                                                <div>
                                                  <span className="text-slate-500 font-medium">Saída:</span>
                                                  <div className="font-semibold">{fmtDateBR(saida)}</div>
                                                </div>
                                                {conclusao && (
                                                  <div>
                                                    <span className="text-slate-500 font-medium">Conclusão:</span>
                                                    <div className="font-semibold">{fmtDateBR(conclusao)}</div>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Linha 3: Tipo, Situação, Status */}
                                              <div className="flex flex-wrap gap-2 items-center">
                                                {tipoR && (
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-slate-500 text-[10px]">Tipo:</span>
                                                    <Badge color="amber" size="xs">{tipoR}</Badge>
                                                  </div>
                                                )}
                                                {situacao && (
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-slate-500 text-[10px]">Situação:</span>
                                                    <Badge color="blue" size="xs">{situacao}</Badge>
                                                  </div>
                                                )}
                                                {status && (
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-slate-500 text-[10px]">Status:</span>
                                                    <Badge color="slate" size="xs">{status}</Badge>
                                                  </div>
                                                )}
                                                {despesa && (
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-slate-500 text-[10px]">Despesa:</span>
                                                    <Badge color="purple" size="xs">{despesa}</Badge>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Linha 4: Valores Reembolsáveis */}
                                              {(valorReembolsavel != null || valorNaoReembolsavel != null) && (
                                                <div className="grid grid-cols-2 gap-2 text-[10px] bg-green-50/50 p-2 rounded border border-green-100">
                                                  {valorReembolsavel != null && (
                                                    <div>
                                                      <span className="text-slate-500 font-medium">Reembolsável:</span>
                                                      <div className="font-bold text-green-700">{fmtMoney(valorReembolsavel)}</div>
                                                    </div>
                                                  )}
                                                  {valorNaoReembolsavel != null && (
                                                    <div>
                                                      <span className="text-slate-500 font-medium">Não Reembolsável:</span>
                                                      <div className="font-bold text-red-700">{fmtMoney(valorNaoReembolsavel)}</div>
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              {/* Linha 5: Descrição */}
                                              {descricao && (
                                                <div className="text-slate-600 italic text-[11px] bg-slate-50 p-2 rounded">
                                                  {descricao}
                                                </div>
                                              )}

                                              {/* Linha 6: Oficina */}
                                              {actor.value && actor.value !== 'Oficina não inf.' && (
                                                <div className="flex items-center gap-1.5 text-slate-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 w-fit">
                                                  {actor.icon} <span className="text-[10px]">Oficina: <b>{actor.value}</b></span>
                                                </div>
                                              )}

                                              {/* Linha 7: KM */}
                                              {(kmEntrada || kmSaida) && (
                                                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                                  <span className="font-medium">Odômetro:</span>
                                                  <span>{kmEntrada ? fmtDecimal(Number(kmEntrada)) : '—'} km</span>
                                                  <span>→</span>
                                                  <span>{kmSaida ? fmtDecimal(Number(kmSaida)) : '—'} km</span>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                        {row.records.length > 8 && (
                                          <div className="text-xs text-slate-400">+{row.records.length - 8} ocorrências…</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            // EVENTO_DIA_TIPO
                            const tipo = row.tipo;
                            const tipoNorm = normalizeEventName(tipo);
                            const icon = EVENT_ICONS[tipoNorm] || EVENT_ICONS[tipo] || <Clock size={14} className="text-slate-400" />;
                            const formattedDate = fmtDateBR(row.date);
                            const labelBase = EVENT_LABELS[tipoNorm] ?? tipo;
                            const label = row.count > 1 ? `${labelBase} (${row.count})` : labelBase;
                            const topItem = row.items[0];
                            
                            // Melhorar busca de descrição - garantir fallback
                            const topDetail = topItem?.Detalhe1 || topItem?.Descricao || topItem?.DescricaoEvento || 
                                            topItem?.Observacao || topItem?.TipoEvento || topItem?.Evento || 
                                            `${labelBase} registrado em ${formattedDate}`;

                            const isExpandable = true; // Sempre permitir expandir para ver detalhes

                            return (
                              <div key={row.key} className="relative pl-6">
                                <div className="absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                                  {icon}
                                </div>
                                <div
                                  className="bg-slate-50 rounded-lg p-3 cursor-pointer hover:bg-slate-100 border border-slate-200 hover:border-blue-300 transition-all"
                                  onClick={() => isExpandable ? toggleRow(row.key) : undefined}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm text-slate-700">{label}</span>
                                      {row.count > 1 && <Badge color="slate" className="text-xs">{row.count}</Badge>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-slate-400">{formattedDate}</span>
                                      <span className="text-xs text-blue-500 font-medium">{expandedRows.has(row.key) ? '▼' : '▶'}</span>
                                    </div>
                                  </div>
                                  {topDetail && !expandedRows.has(row.key) && (
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{topDetail}</p>
                                  )}
                                </div>

                                {/* Detalhes expandidos - FORA do card clicável */}
                                {isExpandable && expandedRows.has(row.key) && (
                                  <div className="mt-2 ml-3 space-y-2 border-l-2 border-blue-200 pl-3">
                                    {row.items.slice(0, 10).map((it, i) => {
                                        const dd = parseDateAny(it.DataEvento || it.Data);
                                        // Melhorar busca de descrição com fallback garantido
                                        const detail = it.Detalhe1 || it.Descricao || it.DescricaoInfracao || 
                                                      it.Detalhe2 || it.DescricaoEvento || it.Observacao || 
                                                      it.TipoEvento || tipo || `Evento ${i + 1}`;

                                        const contrato = (tipoNorm === 'LOCACAO' || tipoNorm === 'DEVOLUCAO' || tipoNorm === 'SINISTRO')
                                          ? resolveContratoFor(placa, dd)
                                          : null;
                                        
                                        // Para SINISTRO, buscar dados adicionais no fat_sinistros
                                        const sinistroData = tipoNorm === 'SINISTRO' ? (() => {
                                          const sinistrosPlaca = sinistrosByPlaca[placa] ?? [];
                                          if (sinistrosPlaca.length === 0) return null;
                                          // Tentar encontrar sinistro pela data ou ID de ocorrência
                                          const idOcorrencia = it?.IdOcorrencia ?? it?.NumeroOcorrencia ?? it?.Ocorrencia;
                                          if (idOcorrencia) {
                                            const found = sinistrosPlaca.find(s => 
                                              String(s?.IdOcorrencia ?? s?.NumeroOcorrencia ?? s?.Ocorrencia ?? '') === String(idOcorrencia)
                                            );
                                            if (found) return found;
                                          }
                                          // Fallback: buscar por proximidade de data
                                          if (dd) {
                                            const ddTime = dd.getTime();
                                            const closest = sinistrosPlaca
                                              .map(s => ({
                                                s,
                                                dt: parseDateAny(s?.DataOcorrencia ?? s?.DataSinistro ?? s?.Data),
                                              }))
                                              .filter(x => x.dt != null)
                                              .map(x => ({
                                                s: x.s,
                                                diff: Math.abs((x.dt as Date).getTime() - ddTime),
                                              }))
                                              .sort((a, b) => a.diff - b.diff)[0];
                                            if (closest && closest.diff < 7 * 24 * 60 * 60 * 1000) { // 7 dias de tolerância
                                              return closest.s;
                                            }
                                          }
                                          return sinistrosPlaca[0]; // Fallback para o primeiro
                                        })() : null;

                                        // Contrato Comercial e Locação (priorizando dim_contratos_locacao)
                                        const contratoComercial = String(
                                          contrato?.NumeroContratoComercial ?? contrato?.ContratoComercial ?? contrato?.ContratoCorporativo ?? contrato?.NumeroContrato ??
                                          it?.NumeroContratoComercial ?? it?.ContratoComercial ?? it?.ContratoCorporativo ?? 
                                          it?.Detalhe1 ?? it?.Detalhe2 ?? ''
                                        ).trim();
                                        
                                        const contratoLocacao = String(
                                          contrato?.NumeroContratoLocacao ?? contrato?.ContratoLocacao ?? contrato?.NumeroContrato ?? contrato?.IdContratoLocacao ??
                                          it?.NumeroContratoLocacao ?? it?.ContratoLocacao ?? it?.NumeroContrato ?? it?.numero_contrato ?? 
                                          it?.Contrato ?? it?.IdContratoLocacao ?? it?.id_contrato_locacao ?? ''
                                        ).trim();
                                        
                                        const contratoCliente = String(
                                          contrato?.NomeCliente ?? contrato?.Cliente ?? contrato?.NomeFantasia ??
                                          it?.NomeCliente ?? it?.Cliente ?? it?.cliente ?? it?.RazaoSocial ?? ''
                                        ).trim();

                                        const situacao = String(
                                          contrato?.StatusLocacao ?? contrato?.SituacaoLocacao ?? contrato?.Status ?? contrato?.situacao ?? contrato?.Situacao ??
                                          it?.StatusLocacao ?? it?.SituacaoLocacao ?? it?.situacao_locacao ?? it?.Situacao ?? it?.Status ?? it?.status ?? ''
                                        ).trim();
                                        
                                        const dataInicio = parseDateAny(
                                          it?.DataInicial ?? it?.InicioContrato ?? it?.DataInicio ?? it?.DataInicioContrato ?? it?.DataRetirada ?? it?.DataInicioLocacao ??
                                          contrato?.DataInicial ?? contrato?.__inicio ?? contrato?.InicioContrato
                                        );
                                        
                                        const previsto = parseDateAny(
                                          it?.DataPrevistaTermino ?? it?.DataFimPrevista ?? it?.DataFimPrevisto ?? 
                                          contrato?.DataPrevistaTermino ?? contrato?.DataFimPrevista ?? contrato?.DataFim ?? contrato?.__fimPrevisto
                                        );
                                        
                                        const encerramento = parseDateAny(
                                          it?.DataEncerramento ?? it?.DataFimEfetiva ?? it?.DataTermino ??
                                          contrato?.DataEncerramento ?? contrato?.DataEncerrado ?? contrato?.__fimEncerramento
                                        );

                                        // SEMPRE mostrar detalhes para LOCACAO/DEVOLUCAO
                                        const showContrato = tipoNorm === 'LOCACAO' || tipoNorm === 'DEVOLUCAO';
                                        
                                        // Sinistro - Campos expandidos (enriquecidos com fat_sinistros)
                                        const showSinistro = tipoNorm === 'SINISTRO';
                                        const numeroOcorrencia = String(
                                          sinistroData?.NumeroOcorrencia ?? sinistroData?.numero_ocorrencia ?? sinistroData?.Ocorrencia ?? sinistroData?.IdOcorrencia ??
                                          it?.NumeroOcorrencia ?? it?.numero_ocorrencia ?? it?.Ocorrencia ?? it?.ocorrencia ??
                                          it?.IdOcorrencia ?? it?.id_ocorrencia ?? it?.IdSinistro ?? it?.id_sinistro ?? ''
                                        ).trim();
                                        const tipoSinistro = String(
                                          sinistroData?.TipoSinistro ?? sinistroData?.tipo_sinistro ?? sinistroData?.Tipo ??
                                          it?.TipoSinistro ?? it?.tipo_sinistro ?? it?.Tipo ?? it?.tipo ?? 'Sinistro'
                                        ).trim();
                                        const statusSinistro = String(
                                          sinistroData?.StatusSinistro ?? sinistroData?.status_sinistro ?? sinistroData?.Status ?? sinistroData?.Situacao ?? sinistroData?.SituacaoOcorrencia ??
                                          it?.StatusSinistro ?? it?.status_sinistro ?? it?.Status ?? it?.status ?? it?.SituacaoOcorrencia ?? ''
                                        ).trim();
                                        const valorSinistro = sinistroData?.ValorSinistro ?? sinistroData?.valor_sinistro ?? sinistroData?.ValorEvento ?? sinistroData?.Valor ?? sinistroData?.ValorOrcado ?? sinistroData?.ValorOrcamento ??
                                                             it?.ValorSinistro ?? it?.valor_sinistro ?? it?.ValorEvento ?? it?.Valor ?? it?.ValorOrcado ?? it?.ValorOrcamento;
                                        const dataOcorrencia = parseDateAny(
                                          sinistroData?.DataOcorrencia ?? sinistroData?.data_ocorrencia ?? sinistroData?.DataSinistro ?? sinistroData?.Data ??
                                          it?.DataOcorrencia ?? it?.data_ocorrencia ?? it?.DataSinistro ?? it?.DataEvento
                                        );
                                        const dataAbertura = parseDateAny(
                                          sinistroData?.DataAbertura ?? sinistroData?.data_abertura ?? sinistroData?.DataAberturaOcorrencia ?? sinistroData?.DataInicio ??
                                          it?.DataAbertura ?? it?.data_abertura ?? it?.DataAberturaOcorrencia ?? it?.DataInicio
                                        );
                                        const dataEncerramento = parseDateAny(
                                          sinistroData?.DataEncerramento ?? sinistroData?.data_encerramento ?? sinistroData?.DataEncerramentoOcorrencia ?? sinistroData?.DataFim ??
                                          it?.DataEncerramento ?? it?.data_encerramento ?? it?.DataEncerramentoOcorrencia ?? it?.DataFim
                                        );
                                        const descricaoSinistro = sinistroData?.Descricao ?? sinistroData?.DescricaoSinistro ?? sinistroData?.Observacao ?? it?.Detalhe2;

                                        // Movimentação
                                        const showMovimentacao = tipoNorm === 'MOVIMENTACAO';
                                        const origem = String(it?.Origem ?? it?.origem ?? it?.LocalOrigem ?? '').trim();
                                        const destino = String(it?.Destino ?? it?.destino ?? it?.LocalDestino ?? '').trim();

                                        return (
                                          <div key={`${row.key}:it:${i}`} className="text-xs border-l-2 border-slate-200 pl-3 py-2 hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                                            <div className="flex items-start justify-between gap-3 mb-1">
                                              <div className="font-medium text-slate-700 min-w-0 flex-1">{detail}</div>
                                              <div className="text-slate-400 shrink-0">{fmtDateBR(dd)}</div>
                                            </div>

                                            {/* Detalhes de Locação/Devolução - SEMPRE mostrar */}
                                            {showContrato && (
                                              <div className="space-y-1.5 text-slate-600 bg-emerald-50/50 rounded-lg p-3 mt-2 border border-emerald-100">
                                                <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                                                  {tipoNorm === 'DEVOLUCAO' ? '📋 Detalhes da Devolução' : '📋 Detalhes da Locação'}
                                                </div>
                                                <div className="grid grid-cols-1 gap-y-1.5">
                                                  {(contratoComercial || contratoLocacao) && (
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                                      {contratoComercial && (
                                                        <div className="flex gap-2">
                                                          <span className="text-slate-500 font-medium">Contrato Comercial:</span>
                                                          <span className="font-mono font-semibold text-emerald-700">{contratoComercial}</span>
                                                        </div>
                                                      )}
                                                      {contratoLocacao && (
                                                        <div className="flex gap-2">
                                                          <span className="text-slate-500 font-medium">Contrato Locação:</span>
                                                          <span className="font-mono font-semibold text-emerald-700">{contratoLocacao}</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}
                                                  {contratoCliente && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Cliente:</span>
                                                      <span className="text-slate-700 font-semibold">{contratoCliente}</span>
                                                    </div>
                                                  )}
                                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                                    {situacao && (
                                                      <div className="flex gap-2 items-center">
                                                        <span className="text-slate-500 font-medium">Situação:</span>
                                                        <Badge 
                                                          color={isLocacaoEmAndamento(situacao) ? 'emerald' : isLocacaoEncerrada(situacao) ? 'slate' : 'amber'}
                                                          className="text-xs"
                                                        >
                                                          {situacao}
                                                        </Badge>
                                                      </div>
                                                    )}
                                                    {dataInicio && (
                                                      <div className="flex gap-2">
                                                        <span className="text-slate-500 font-medium">Início:</span>
                                                        <span className="font-semibold">{fmtDateBR(dataInicio)}</span>
                                                      </div>
                                                    )}
                                                    {previsto && (
                                                      <div className="flex gap-2">
                                                        <span className="text-slate-500 font-medium">Término Previsto:</span>
                                                        <span>{fmtDateBR(previsto)}</span>
                                                      </div>
                                                    )}
                                                    {tipoNorm === 'DEVOLUCAO' && (encerramento || dd) && (
                                                      <div className="flex gap-2">
                                                        <span className="text-slate-500 font-medium">Encerramento:</span>
                                                        <span className="font-semibold text-rose-600">{fmtDateBR(encerramento) || fmtDateBR(dd)}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                  {!contratoCliente && !contratoComercial && !contratoLocacao && (
                                                    <div className="text-xs text-amber-600 italic">
                                                      ⚠️ Dados de contrato não disponíveis - verifique dim_contratos_locacao
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                            {/* Detalhes de Sinistro - SEMPRE mostrar */}
                                            {showSinistro && (
                                              <div className="space-y-1.5 text-slate-600 bg-purple-50/50 rounded-lg p-3 mt-2 border border-purple-100">
                                                <div className="text-[10px] font-semibold text-purple-700 uppercase tracking-wide mb-2">
                                                  ⚠️ Detalhes do Sinistro
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Nº Ocorrência:</span>
                                                    <span className="font-mono font-semibold text-purple-700">{numeroOcorrencia || '—'}</span>
                                                  </div>
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Tipo:</span>
                                                    <span className="text-slate-700">{tipoSinistro || '—'}</span>
                                                  </div>
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Valor:</span>
                                                    <span className="font-semibold text-purple-700">
                                                      {valorSinistro != null 
                                                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valorSinistro))
                                                        : '—'
                                                      }
                                                    </span>
                                                  </div>
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Status:</span>
                                                    {statusSinistro ? (
                                                      <Badge color="purple" className="text-xs">{statusSinistro}</Badge>
                                                    ) : (
                                                      <span className="text-slate-400">—</span>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Datas da Ocorrência */}
                                                <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600 bg-purple-100/50 p-2 rounded mt-2">
                                                  {dataAbertura && (
                                                    <div>
                                                      <span className="text-slate-500 font-medium">Abertura:</span>
                                                      <div className="font-semibold">{fmtDateBR(dataAbertura)}</div>
                                                    </div>
                                                  )}
                                                  {dataOcorrencia && (
                                                    <div>
                                                      <span className="text-slate-500 font-medium">Ocorrência:</span>
                                                      <div className="font-semibold">{fmtDateBR(dataOcorrencia)}</div>
                                                    </div>
                                                  )}
                                                  {dataEncerramento && (
                                                    <div>
                                                      <span className="text-slate-500 font-medium">Encerramento:</span>
                                                      <div className="font-semibold text-green-700">{fmtDateBR(dataEncerramento)}</div>
                                                    </div>
                                                  )}
                                                </div>

                                                {descricaoSinistro && (
                                                  <div className="flex gap-2 mt-1 col-span-2">
                                                    <span className="text-slate-500 font-medium">Descrição:</span>
                                                    <span className="text-slate-600">{String(descricaoSinistro)}</span>
                                                  </div>
                                                )}
                                                {it?.Detalhe2 && it?.Detalhe2 !== detail && it?.Detalhe2 !== descricaoSinistro && (
                                                  <div className="flex gap-2 mt-1">
                                                    <span className="text-slate-500 font-medium">Obs:</span>
                                                    <span className="text-slate-600">{String(it.Detalhe2)}</span>
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            {/* Detalhes de Manutenção - quando EVENTO_DIA_TIPO for MANUTENCAO */}
                                            {tipoNorm === 'MANUTENCAO' && (() => {
                                              // Buscar dados do fat_manutencao_unificado
                                              const manutRecords = manutencaoByPlaca[placa] ?? [];
                                              const manutData = (() => {
                                                if (manutRecords.length === 0) return null;
                                                // Tentar encontrar por ID de ocorrência
                                                const idOcorrencia = it?.IdOcorrencia ?? it?.NumeroOcorrencia ?? it?.Ocorrencia ?? it?.IdOS;
                                                if (idOcorrencia) {
                                                  const found = manutRecords.find(m => 
                                                    String(m?.IdOcorrencia ?? m?.NumeroOcorrencia ?? m?.Ocorrencia ?? m?.IdOS ?? '') === String(idOcorrencia)
                                                  );
                                                  if (found) return found;
                                                }
                                                // Fallback: buscar por proximidade de data
                                                if (dd) {
                                                  const ddTime = dd.getTime();
                                                  const closest = manutRecords
                                                    .map(m => ({
                                                      m,
                                                      dt: parseDateAny(m?.DataEntrada ?? m?.DataEntradaOficina ?? m?.DataAgendamento ?? m?.Data),
                                                    }))
                                                    .filter(x => x.dt != null)
                                                    .map(x => ({
                                                      m: x.m,
                                                      diff: Math.abs((x.dt as Date).getTime() - ddTime),
                                                    }))
                                                    .sort((a, b) => a.diff - b.diff)[0];
                                                  if (closest && closest.diff < 7 * 24 * 60 * 60 * 1000) { // 7 dias de tolerância
                                                    return closest.m;
                                                  }
                                                }
                                                return null;
                                              })();

                                              // Usar dados enriquecidos se disponível, senão usar dados do evento
                                              const sourceData = manutData ?? it;
                                              const id = manutData ? getMaintenanceId(manutData) : (it?.IdOS ?? it?.IdOcorrencia ?? it?.NumeroOS ?? '—');
                                              const ocorrencia = sourceData?.IdOcorrencia ?? sourceData?.Ocorrencia ?? sourceData?.NumeroOcorrencia ?? id;
                                              const entrada = normalizeDateLocal(sourceData?.DataEntrada ?? sourceData?.DataEntradaOficina ?? sourceData?.DataAgendamento ?? it?.DataEvento ?? it?.Data);
                                              const saida = normalizeDateLocal(sourceData?.DataSaida ?? sourceData?.DataSaidaOficina ?? sourceData?.DataConclusao);
                                              const conclusao = normalizeDateLocal(sourceData?.DataConclusao);
                                              const tipoR = sourceData?.TipoOcorrencia ?? sourceData?.TipoManutencao ?? sourceData?.Tipo ?? it?.TipoEvento;
                                              const situacao = sourceData?.Situacao ?? sourceData?.SituacaoOcorrencia ?? sourceData?.Status ?? it?.Situacao;
                                              const despesa = sourceData?.Despesa ?? sourceData?.TipoDespesa ?? sourceData?.CategoriaServico;
                                              const custo = sourceData?.CustoTotalOS ?? sourceData?.ValorTotal ?? sourceData?.ValorServico ?? it?.Valor;
                                              const valorReembolsavel = sourceData?.ValorReembolsavel ?? sourceData?.ValorReembolso;
                                              const valorNaoReembolsavel = sourceData?.ValorNaoReembolsavel ?? sourceData?.ValorNaoReembolso;
                                              const kmEntrada = sourceData?.KmEntrada ?? sourceData?.KM_Entrada ?? sourceData?.Odometro ?? it?.KM ?? it?.Odometro;
                                              const kmSaida = sourceData?.KmSaida ?? sourceData?.KM_Saida;
                                              const descricaoManut = sourceData?.DescricaoOS ?? sourceData?.Descricao ?? sourceData?.DescricaoServico ?? sourceData?.Observacao ?? it?.Descricao ?? it?.Detalhe1;
                                              const statusManut = sourceData?.StatusOS ?? sourceData?.Status ?? sourceData?.StatusOcorrencia ?? it?.Status;
                                              const oficina = sourceData?.Oficina ?? sourceData?.Fornecedor ?? sourceData?.NomeFornecedor ?? it?.Oficina ?? it?.Fornecedor;

                                              return (
                                                <div className="space-y-2 text-slate-600 bg-amber-50/50 rounded-lg p-3 mt-2 border border-amber-100">
                                                  <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-2">
                                                    🔧 Detalhes da Manutenção
                                                  </div>

                                                  {/* Linha 1: ID e Valor */}
                                                  <div className="flex justify-between items-start font-medium">
                                                    <div className="flex flex-col gap-0.5">
                                                      <span className="text-slate-700 font-mono text-xs">OS: {id || '—'}</span>
                                                      {ocorrencia && ocorrencia !== id && (
                                                        <span className="text-[10px] text-slate-500">Ocorrência: {ocorrencia}</span>
                                                      )}
                                                    </div>
                                                    {custo && <span className="text-amber-700 font-bold text-xs">{fmtMoney(custo)}</span>}
                                                  </div>

                                                  {/* Linha 2: Datas */}
                                                  {(entrada || saida || conclusao) && (
                                                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600 bg-amber-100/50 p-2 rounded">
                                                      {entrada && (
                                                        <div>
                                                          <span className="text-slate-500 font-medium">Entrada:</span>
                                                          <div className="font-semibold">{fmtDateBR(entrada)}</div>
                                                        </div>
                                                      )}
                                                      {saida && (
                                                        <div>
                                                          <span className="text-slate-500 font-medium">Saída:</span>
                                                          <div className="font-semibold">{fmtDateBR(saida)}</div>
                                                        </div>
                                                      )}
                                                      {conclusao && (
                                                        <div>
                                                          <span className="text-slate-500 font-medium">Conclusão:</span>
                                                          <div className="font-semibold">{fmtDateBR(conclusao)}</div>
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}

                                                  {/* Linha 3: Tipo, Situação, Status */}
                                                  {(tipoR || situacao || statusManut || despesa) && (
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                      {tipoR && (
                                                        <div className="flex items-center gap-1">
                                                          <span className="text-slate-500 text-[10px]">Tipo:</span>
                                                          <Badge color="amber" size="xs">{tipoR}</Badge>
                                                        </div>
                                                      )}
                                                      {situacao && (
                                                        <div className="flex items-center gap-1">
                                                          <span className="text-slate-500 text-[10px]">Situação:</span>
                                                          <Badge color="blue" size="xs">{situacao}</Badge>
                                                        </div>
                                                      )}
                                                      {statusManut && (
                                                        <div className="flex items-center gap-1">
                                                          <span className="text-slate-500 text-[10px]">Status:</span>
                                                          <Badge color="slate" size="xs">{statusManut}</Badge>
                                                        </div>
                                                      )}
                                                      {despesa && (
                                                        <div className="flex items-center gap-1">
                                                          <span className="text-slate-500 text-[10px]">Despesa:</span>
                                                          <Badge color="purple" size="xs">{despesa}</Badge>
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}

                                                  {/* Linha 4: Valores Reembolsáveis */}
                                                  {(valorReembolsavel != null || valorNaoReembolsavel != null) && (
                                                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-green-50/50 p-2 rounded border border-green-100">
                                                      {valorReembolsavel != null && (
                                                        <div>
                                                          <span className="text-slate-500 font-medium">Reembolsável:</span>
                                                          <div className="font-bold text-green-700">{fmtMoney(valorReembolsavel)}</div>
                                                        </div>
                                                      )}
                                                      {valorNaoReembolsavel != null && (
                                                        <div>
                                                          <span className="text-slate-500 font-medium">Não Reembolsável:</span>
                                                          <div className="font-bold text-red-700">{fmtMoney(valorNaoReembolsavel)}</div>
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}

                                                  {/* Linha 5: Descrição */}
                                                  {descricaoManut && (
                                                    <div className="text-slate-600 italic text-[11px] bg-slate-50 p-2 rounded">
                                                      {descricaoManut}
                                                    </div>
                                                  )}

                                                  {/* Linha 6: Oficina */}
                                                  {oficina && (
                                                    <div className="flex items-center gap-1.5 text-slate-600 bg-amber-100/50 px-2 py-1 rounded border border-amber-200 w-fit">
                                                      <Store size={12} className="text-amber-600" />
                                                      <span className="text-[10px]">Oficina: <b>{oficina}</b></span>
                                                    </div>
                                                  )}

                                                  {/* Linha 7: KM */}
                                                  {(kmEntrada || kmSaida) && (
                                                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                                      <span className="font-medium">Odômetro:</span>
                                                      <span>{kmEntrada ? fmtDecimal(Number(kmEntrada)) : '—'} km</span>
                                                      {kmSaida && (
                                                        <>
                                                          <span>→</span>
                                                          <span>{fmtDecimal(Number(kmSaida))} km</span>
                                                        </>
                                                      )}
                                                    </div>
                                                  )}

                                                  {!manutData && (
                                                    <div className="text-xs text-amber-600 italic mt-2 bg-amber-100/30 p-2 rounded">
                                                      ℹ️ Detalhes básicos - dados completos não encontrados em fat_manutencao_unificado
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}

                                            {/* Detalhes de Movimentação - SEMPRE mostrar */}
                                            {showMovimentacao && (
                                              <div className="space-y-1.5 text-slate-600 bg-blue-50/50 rounded-lg p-3 mt-2 border border-blue-100">
                                                <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-2">
                                                  📍 Detalhes da Movimentação
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Origem:</span>
                                                    <span className="text-slate-700">{origem || '—'}</span>
                                                  </div>
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Destino:</span>
                                                    <span className="text-slate-700">{destino || '—'}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            {/* Detalhes de COMPRA - SEMPRE mostrar */}
                                            {tipoNorm === 'COMPRA' && (
                                              <div className="space-y-1.5 text-slate-600 bg-amber-50/50 rounded-lg p-3 mt-2 border border-amber-100">
                                                <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-2">
                                                  🛒 Detalhes da Compra
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Valor:</span>
                                                    <span className="font-semibold text-amber-700">
                                                      {it?.ValorCompra ?? it?.ValorAquisicao ?? it?.Valor
                                                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(it?.ValorCompra ?? it?.ValorAquisicao ?? it?.Valor ?? 0))
                                                        : '—'
                                                      }
                                                    </span>
                                                  </div>
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Fornecedor:</span>
                                                    <span className="text-slate-700">{it?.Fornecedor ?? it?.VendedorNome ?? it?.Concessionaria ?? '—'}</span>
                                                  </div>
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Nota Fiscal:</span>
                                                    <span className="font-mono text-slate-700">{it?.NotaFiscal ?? it?.NF ?? it?.NumeroNF ?? '—'}</span>
                                                  </div>
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Data:</span>
                                                    <span>{fmtDateBR(parseDateAny(it?.DataCompra ?? it?.DataAquisicao ?? it?.DataNF ?? it?.Data))}</span>
                                                  </div>
                                                  {it?.Chassi && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Chassi:</span>
                                                      <span className="font-mono text-slate-700">{it.Chassi}</span>
                                                    </div>
                                                  )}
                                                  {it?.Renavam && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Renavam:</span>
                                                      <span className="font-mono text-slate-700">{it.Renavam}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {row.items.length > 10 && (
                                        <div className="text-xs text-slate-400">+{row.items.length - 10} ocorrências…</div>
                                      )}
                                    </div>
                                  )}
                              </div>
                            );
                          })}
                          {eventos.length > 0 && rows.length === 0 && (
                            <div className="pl-6 text-sm text-slate-500">Sem eventos válidos para exibição.</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Paginação */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
          <Text className="text-slate-500">
            Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, filteredGrouped.length)} de {fmtDecimal(filteredGrouped.length)}
          </Text>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-white"
            >
              ← Anterior
            </button>
            <span className="px-3 py-1 text-sm text-slate-600">
              Página {page + 1} de {totalPages}
            </span>
            <button 
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-white"
            >
              Próxima →
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
