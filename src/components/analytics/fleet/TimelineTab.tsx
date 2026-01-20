import { useMemo, useState, useEffect } from 'react';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, LabelList } from 'recharts';
import {
  Clock, Car, Wrench, TrendingUp, ChevronRight, Play, History, Search,
  FileSpreadsheet, MapPin, AlertTriangle, DollarSign, ShoppingCart, FileWarning,
  RotateCcw, Archive, Store, User, UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { normalizeEventName, aggregateFleetMetrics } from '@/lib/analytics/fleetTimeline';
import { useChartFilter } from '@/hooks/useChartFilter';
import { ChartFilterBadges } from '@/components/analytics/ChartFilterBadges';

type AnyObject = { [k: string]: any };

interface TimelineTabProps {
  timeline: AnyObject[];
  filteredData: AnyObject[];
  frota: AnyObject[];
  manutencao?: AnyObject[];
  movimentacoes?: AnyObject[] | null; // Novo campo
  contratosLocacao?: AnyObject[];
  sinistros?: AnyObject[];
  multas?: AnyObject[];
}

function fmtDecimal(v: number) { return new Intl.NumberFormat('pt-BR').format(v); }

function fmtMoney(v: any) {
  // Parse do valor: aceita strings com R$, pontos e vírgulas
  let num: number;
  if (typeof v === 'string') {
    // Remove R$, espaços, e converte vírgula decimal em ponto
    const cleaned = v.replace(/R\$?\s*/g, '').replace(/\./g, '').replace(',', '.');
    num = parseFloat(cleaned);
  } else {
    num = Number(v);
  }
  
  if (!num || isNaN(num)) return 'R$ 0,00';
  
  // Formata com vírgula para decimal e ponto para milhares
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
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

// Verifica recursivamente se um objeto/valor contém o termo de busca
function objectContainsTerm(obj: any, term: string): boolean {
  if (obj == null) return false;
  const t = term.toLowerCase();
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj).toLowerCase().includes(t);
  }
  if (obj instanceof Date) {
    return fmtDateBR(obj).toLowerCase().includes(t) || obj.toLocaleString('pt-BR').toLowerCase().includes(t);
  }
  if (Array.isArray(obj)) {
    for (const item of obj) if (objectContainsTerm(item, t)) return true;
    return false;
  }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      try {
        if (objectContainsTerm(obj[k], t)) return true;
      } catch (e) {
        // ignore
      }
    }
    return false;
  }
  return false;
}

function getMinutesConclusaoRetirada(row: any): number | null {
  try {
    const first = row?.osRecords?.[0] ?? {};
    if (first?.Minutos_Chegada_Retirada != null) return Number(first.Minutos_Chegada_Retirada);
    if (row?.Minutos_Chegada_Retirada != null) return Number(row.Minutos_Chegada_Retirada);
    // fallback para conclusão->retirada
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

// Formata uma duração em dias para representação mista: anos, meses, dias.
function formatDurationDays(days?: number | null): string {
  if (days == null || isNaN(days)) return '—';
  const d = Math.max(0, Math.floor(days));
  if (d === 0) return '0 d';
  const years = Math.floor(d / 365);
  const months = Math.floor((d % 365) / 30);
  const remDays = d - years * 365 - months * 30;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} a`);
  if (months > 0) parts.push(`${months} m`);
  if (remDays > 0) parts.push(`${remDays} d`);
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

  // SQL Server formatted dates from ETL often come as 'yyyy-MM-dd' or 'yyyy-MM-dd HH:mm:ss'.
  // Per ES spec, `new Date('yyyy-MM-dd')` is parsed as UTC which causes a timezone shift
  // when displayed locally (e.g. shows previous day at 21:00). To avoid that, parse these
  // patterns manually and build a local Date instance.
  const sqlDate = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (sqlDate) {
    const yyyy = Number(sqlDate[1]);
    const mm = Number(sqlDate[2]);
    const dd = Number(sqlDate[3]);
    const hh = sqlDate[4] ? Number(sqlDate[4]) : 0;
    const mi = sqlDate[5] ? Number(sqlDate[5]) : 0;
    const ss = sqlDate[6] ? Number(sqlDate[6]) : 0;
    const dt = new Date(yyyy, mm - 1, dd, hh, mi, ss, 0);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  // Fallback to engine parser; if that still fails, use normalizeDateLocal
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
      .map(r => parseDateAny(
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
      .map(r => parseDateAny(r?.DataAberturaOcorrencia ?? r?.DataOcorrencia ?? r?.DataAbertura ?? r?.DataEntrada ?? r?.Data))
      .filter((d): d is Date => !!d)[0] ?? null;

    const dataConclusaoOcorrencia = osRecords
      .map(r => parseDateAny(r?.DataConclusaoOcorrencia ?? r?.DataConclusao ?? r?.DataSaida ?? r?.Data))
      .filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime()).pop() ?? null;

    let dataChegadaVeiculo = osRecords
      .map(r => parseDateAny(r?.DataChegadaVeiculo ?? r?.DataChegada ?? r?.DataConfirmacaoChegada))
      .filter((d): d is Date => !!d)[0] ?? null;

    const dataRetiradaVeiculo = osRecords
      .map(r => parseDateAny(r?.DataRetiradaVeiculo ?? r?.DataRetirada ?? r?.DataSaida))
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

    // Preferir data de chegada indicada nas movimentações (etapa 'Aguardando Chegada')
    try {
      if (Array.isArray(movimentacoes) && movimentacoes.length > 0) {
        const busca = movimentacoes.find((m: any) => typeof m?.Etapa === 'string' && m.Etapa.toLowerCase().includes('aguardando chegada') && (m.DataConfirmacao || m.DataDeConfirmacao));
        if (busca) {
          const candidate = parseDateAny(busca.DataConfirmacao ?? busca.DataDeConfirmacao);
          if (candidate) dataChegadaVeiculo = candidate;
        }
      }
    } catch (e) {
      // ignore
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
      icon: <Store size={12} />
    };
  }

  if (tipoNorm === 'MULTA' || tipoNorm === 'MULTAS') {
    return {
      label: 'Condutor',
      value: item.NomeCondutor || genericClient || 'Condutor não inf.',
      icon: <User size={12} />
    };
  }

  if (tipoNorm === 'COMPRA' || tipoNorm === 'AQUISICAO') {
    return {
      label: 'Fornecedor',
      value: item.Fornecedor || item.Proprietario || genericClient,
      icon: <Store size={12} />
    };
  }

  if (tipoNorm === 'LOCACAO' || tipoNorm === 'DEVOLUCAO') {
    return {
      label: 'Cliente',
      value: genericClient,
      icon: <UserCheck size={12} />
    };
  }

  return {
    label: 'Responsável',
    value: genericClient,
    icon: <User size={12} />
  };
}

// DEBUG HELPER removed

export default function TimelineTab({ timeline, filteredData, frota, manutencao, movimentacoes, contratosLocacao, sinistros, multas }: TimelineTabProps) { // Adicionado movimentacoes
  const [expandedPlates, setExpandedPlates] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedSubSections, setExpandedSubSections] = useState<Set<string>>(new Set()); // Novo controle para sub-seções (ex: lista de multas)
  const [_expandedVersion, setExpandedVersion] = useState(0); // Force re-render trigger
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    // Forçar estado limpo na montagem para garantir colapso
    setExpandedSubSections(new Set());
    console.log('TimelineTab mounted, reset expandedSubSections');
  }, []);

  // Hook de filtro Power BI-style para os gráficos
  const {
    filters: chartFilters,
    handleChartClick,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
    isValueSelected
  } = useChartFilter();
  const { getFilterValues } = useChartFilter();

  // Métricas agregadas usando nova lógica
  const aggregatedMetrics = useMemo(() => {
    const safeMovimentacoes = Array.isArray(movimentacoes) ? movimentacoes : [];

    return aggregateFleetMetrics(frota, contratosLocacao || [], manutencao || [], safeMovimentacoes,
      // @ts-ignore
      undefined // now default
    );
  }, [frota, contratosLocacao, manutencao, movimentacoes]);

  // Mapa de métricas por placa para lookup rápido
  const metricsByPlaca = useMemo(() => {
    const map: Record<string, any> = {};
    for (const m of aggregatedMetrics.metricsPerVehicle || []) {
      if (m?.placa) map[normalizePlacaKey(m.placa)] = m;
    }
    return map;
  }, [aggregatedMetrics]);

  // Expor métricas para depuração no console do navegador
  useEffect(() => {
    try {
      // @ts-ignore
      if (typeof window !== 'undefined') {
        // Não poluir namespace em produção; apenas quando dev
        // (o app roda em dev durante QA)
        (window as any).__AGGREGATED_METRICS = aggregatedMetrics;
        (window as any).__METRICS_BY_PLACA = metricsByPlaca;
      }
    } catch (e) {
      // ignore
    }
  }, [aggregatedMetrics, metricsByPlaca]);

  // Auto-expandir primeiro veículo
  const [autoExpanded, setAutoExpanded] = useState(false);

  // Criar mapa de sinistros por placa para enriquecimento rápido
  const sinistrosByPlaca = useMemo(() => {
    const map: Record<string, AnyObject[]> = {};
    if (!Array.isArray(sinistros)) return map;
    for (const s of sinistros) {
      const placaKey = normalizePlacaKey(s?.Placa);
      if (!placaKey) continue;
      if (!map[placaKey]) map[placaKey] = [];
      map[placaKey].push(s);
    }
    return map;
  }, [sinistros]);

  // Criar mapa de multas por placa usando fat_multas
  const multasByPlaca = useMemo(() => {
    const map: Record<string, AnyObject[]> = {};
    if (!Array.isArray(multas)) return map;
    for (const m of multas) {
      const placa = normalizePlacaKey(m?.Placa);
      if (!placa) continue;
      if (!map[placa]) map[placa] = [];
      map[placa].push(m);
    }
    // Ordenar multas por data (mais recente primeiro)
    for (const placa of Object.keys(map)) {
      map[placa].sort((a, b) => {
        const da = parseDateAny(a?.DataInfracao);
        const db = parseDateAny(b?.DataInfracao);
        return (db?.getTime() ?? 0) - (da?.getTime() ?? 0);
      });
    }
    return map;
  }, [multas]);

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

      // Campos do ETL dim_contratos_locacao: Inicio, Fim, DataEncerramento
      const inicio = pickDate(c, ['Inicio', 'DataInicial', 'InicioContrato', 'DataInicio', 'DataInicioContrato', 'DataRetirada', 'DataInicioLocacao']);
      const fimPrevisto = pickDate(c, ['Fim', 'DataPrevistaTermino', 'DataFimPrevista', 'DataFimPrevisto', 'DataFim', 'DataTerminoPrevisto', 'DataFimLocacao']);
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

    if (arr.length === 0) return null;

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

    // Último fallback: retorna o contrato mais recente se existir algum
    return arr[0] ?? null;
  };

  const manutencaoByPlaca = useMemo(() => {
    const map: Record<string, AnyObject[]> = {};
    if (!Array.isArray(manutencao)) return map;
    for (const r of manutencao) {
      const placaKey = normalizePlacaKey(r?.Placa);
      if (!placaKey) continue;
      if (!map[placaKey]) map[placaKey] = [];
      map[placaKey].push(r);
    }
    return map;
  }, [manutencao]);

  // Agrupa eventos por placa
  const timelineGrouped = useMemo(() => {
    // Se houver filtros aplicados no dashboard, respeitar a fonte de filtros global
    // Priorizar filtro de `productivity` (Ativa = Produtiva + Improdutiva, Inativa = Inativa)
    const productivityValues = getFilterValues('productivity') || [];

    const placasFiltradasFromProp = new Set(filteredData.map(f => f.Placa).filter(Boolean));

    const normalizeStatus = (s: any) => String(s || '').toUpperCase();
    const getCategoryLocal = (statusRaw: any) => {
      const s = normalizeStatus(statusRaw);
      if (['LOCADO', 'LOCADO VEÍCULO RESERVA', 'USO INTERNO', 'EM MOBILIZAÇÃO', 'EM MOBILIZACAO'].includes(s)) return 'Produtiva';
      if ([
        'DEVOLVIDO', 'ROUBO / FURTO', 'BAIXADO', 'VENDIDO', 'SINISTRO PERDA TOTAL',
        'DISPONIVEL PRA VENDA', 'DISPONIVEL PARA VENDA', 'DISPONÍVEL PARA VENDA', 'DISPONÍVEL PRA VENDA',
        'NÃO DISPONÍVEL', 'NAO DISPONIVEL', 'NÃO DISPONIVEL', 'NAO DISPONÍVEL',
        'EM DESMOBILIZAÇÃO', 'EM DESMOBILIZACAO'
      ].includes(s)) return 'Inativa';
      return 'Improdutiva';
    };

    let placasFiltradas = placasFiltradasFromProp;

    if (productivityValues.length > 0) {
      // Construir set de placas baseado em `frota` e categoria
      const wanted = new Set<string>();
      for (const f of frota || []) {
        const status = f?.Situacao || f?.Status || f?.situacao || f?.situacaoAtual || f?.SituacaoAtual;
        const cat = getCategoryLocal(status);
        // Ativa significa Produtiva + Improdutiva
        if (productivityValues.includes('Ativa')) {
          if (cat === 'Produtiva' || cat === 'Improdutiva') wanted.add(f.Placa);
        }
        if (productivityValues.includes('Produtiva') && cat === 'Produtiva') wanted.add(f.Placa);
        if (productivityValues.includes('Improdutiva') && cat === 'Improdutiva') wanted.add(f.Placa);
        if (productivityValues.includes('Inativa') && cat === 'Inativa') wanted.add(f.Placa);
      }
      if (wanted.size > 0) placasFiltradas = wanted;
    }

    // Se houver filtros ativos e um conjunto de placas filtradas, aplicar; caso contrário, mostrar timeline completo
    const hasFiltrosAtivos = hasActiveFilters || (filteredData && filteredData.length > 0);
    const data = hasFiltrosAtivos && placasFiltradas.size > 0
      ? timeline.filter(t => placasFiltradas.has(t.Placa))
      : timeline;

    const grouped: Record<string, AnyObject[]> = {};
    data.forEach(item => {
      const placa = item.Placa;
      if (!placa) return;
      if (!grouped[placa]) grouped[placa] = [];
      grouped[placa].push(item);
    });

    // Construir mapas por placa normalizada para lookups robustos (evita diferenças de formatação)
    const frotaMap: Record<string, AnyObject> = {};
    for (const f of frota || []) {
      if (f?.Placa) frotaMap[normalizePlacaKey(f.Placa)] = f;
    }
    const filteredDataMap: Record<string, AnyObject> = {};
    for (const f of filteredData || []) {
      if (f?.Placa) filteredDataMap[normalizePlacaKey(f.Placa)] = f;
    }

    return Object.entries(grouped).map(([placa, eventos]) => {
      const placaKey = normalizePlacaKey(placa);
      const veiculoInfo = frotaMap[placaKey] || filteredDataMap[placaKey] || frota.find(f => normalizePlacaKey(f?.Placa) === placaKey) || filteredData.find(f => normalizePlacaKey(f?.Placa) === placaKey);

      const sortedEvents = [...eventos]
        .filter(e => !!(e.DataEvento || e.Data))
        .sort((a, b) => {
          const ad = parseDateAny(a.DataEvento || a.Data) ?? new Date(0);
          const bd = parseDateAny(b.DataEvento || b.Data) ?? new Date(0);
          return ad.getTime() - bd.getTime();
        });

      // Usar métricas centralizadas calculadas por `aggregateFleetMetrics`
      const metric = metricsByPlaca[placaKey] || null;
      const locacaoDaysReal = metric ? (metric.diasLocado ?? 0) : 0;
      const manutencaoDaysReal = metric ? (metric.diasManutencao ?? 0) : 0;
      // ownershipDays não é usado diretamente, mas está disponível em metric.diasVida
      const frotaParadaDays = metric ? (metric.diasParado ?? 0) : 0;
      const utilization = metric ? (metric.percentualUtilizacao ?? 0) : 0;

      const sinistrosPlaca = sinistrosByPlaca[placaKey] || [];
      const sinistroDaysReal = sinistrosPlaca.reduce((sum, s) => {
        const abertura = normalizeDateLocal(s.DataAberturaOcorrencia);
        const conclusao = normalizeDateLocal(s.DataConclusaoOcorrencia);
        if (!abertura) return sum;
        const end = conclusao || new Date();
        const days = Math.max(0, (end.getTime() - abertura.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);

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
        locacaoDays: Math.round(locacaoDaysReal),
        manutencaoDays: Math.round(manutencaoDaysReal),
        sinistroDays: Math.round(sinistroDaysReal),
        frotaParadaDays: Math.round(frotaParadaDays), // Vida do veículo - dias locado
        utilization
      };
    }).sort((a, b) => b.totalEvents - a.totalEvents);
  }, [timeline, filteredData, frota]);

  // Filtrar por busca - busca em QUALQUER campo do grupo
  const searchFiltered = useMemo(() => {
    if (!searchTerm) return timelineGrouped;
    const term = searchTerm.trim().toLowerCase();
    return timelineGrouped.filter(g => {
      // Procurar em qualquer campo do objeto do grupo (placa, modelo, eventos, contrato, status...)
      try {
        return objectContainsTerm(g, term);
      } catch (e) {
        return false;
      }
    });
  }, [timelineGrouped, searchTerm]);

  // Aplicar filtros de gráfico (Ctrl+Click)
  const filteredGrouped = useMemo(() => {
    let result = searchFiltered;

    // Filtro por faixa de dias locados
    const faixaLocacao = chartFilters['faixaLocacao'] || [];
    if (faixaLocacao.length > 0) {
      result = result.filter(v => {
        const days = v.locacaoDays;
        return faixaLocacao.some(faixa => {
          if (faixa === '0-30 dias') return days >= 0 && days <= 30;
          if (faixa === '31-90 dias') return days >= 31 && days <= 90;
          if (faixa === '91-180 dias') return days >= 91 && days <= 180;
          if (faixa === '181-365 dias') return days >= 181 && days <= 365;
          if (faixa === '> 365 dias') return days > 365;
          return false;
        });
      });
    }

    // Filtro por faixa de dias de manutenção
    const faixaManutencao = chartFilters['faixaManutencao'] || [];
    if (faixaManutencao.length > 0) {
      result = result.filter(v => {
        const days = v.manutencaoDays;
        return faixaManutencao.some(faixa => {
          if (faixa === '0 dias') return days === 0;
          if (faixa === '1-7 dias') return days >= 1 && days <= 7;
          if (faixa === '8-15 dias') return days >= 8 && days <= 15;
          if (faixa === '16-30 dias') return days >= 16 && days <= 30;
          if (faixa === '> 30 dias') return days > 30;
          return false;
        });
      });
    }

    // Filtro por faixa de utilização
    const faixaUtilizacao = chartFilters['faixaUtilizacao'] || [];
    if (faixaUtilizacao.length > 0) {
      result = result.filter(v => {
        const util = v.utilization;
        return faixaUtilizacao.some(faixa => {
          if (faixa === '< 40% (Crítico)') return util < 40;
          if (faixa === '40-59% (Regular)') return util >= 40 && util < 60;
          if (faixa === '60-79% (Bom)') return util >= 60 && util < 80;
          if (faixa === '≥ 80% (Excelente)') return util >= 80;
          return false;
        });
      });
    }

    return result;
  }, [searchFiltered, chartFilters]);

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

  // KPIs - Usar métricas agregadas (MÉDIAS)
  const kpis = useMemo(() => {
    const totalVehicles = timelineGrouped.length;
    const totalEvents = timeline.length;
    const avgEvents = totalVehicles > 0 ? totalEvents / totalVehicles : 0;

    // Usar as métricas agregadas
    const {
      mediaLocado,
      mediaManutencao,
      mediaParado,
      totalLocadoDays,
      totalManutencaoDays,
      totalParadoDays,
      utilizacaoPct
    } = aggregatedMetrics;

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

    return {
      totalVehicles,
      totalEvents,
      avgEvents,
      avgUtilization: utilizacaoPct,
      eventTypes,
      totalMultas,
      totalSinistros,
      // Médias (novos)
      mediaLocado,
      mediaManutencao,
      mediaParado,
      // Totais
      totalLocadoDays,
      totalManutencaoDays,
      totalParadoDays,
      utilizationPct: utilizacaoPct
    };
  }, [timelineGrouped, timeline, aggregatedMetrics]);

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
          const manutRecords = manutencaoByPlaca[normalizePlacaKey(placa)] ?? [];
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
    setExpandedVersion(v => v + 1);
  };

  const exportToExcel = () => {
    // Exportar apenas os veículos filtrados
    const placasFiltradas = new Set(filteredGrouped.map(g => g.placa));
    const dataToExport = timeline
      .filter(e => placasFiltradas.has(e.Placa))
      .map(e => ({
        Placa: e.Placa,
        Modelo: e.Modelo,
        TipoEvento: e.TipoEvento || e.Evento,
        DataEvento: e.DataEvento || e.Data,
        Detalhe1: e.Detalhe1 || e.Descricao,
        Detalhe2: e.Detalhe2
      }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
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

      {/* KPIs: Média Locado, Média Manutenção, Média Frota Parada, % Utilização */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Play className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs">Média Locado</Text>
              <Metric className="text-emerald-600">{formatDurationDays(Math.round(kpis.mediaLocado || 0))}</Metric>
              <Text className="text-[10px] text-slate-400">por veículo</Text>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs">Média Manutenção</Text>
              <Metric className="text-amber-600">{formatDurationDays(Math.round(kpis.mediaManutencao || 0))}</Metric>
              <Text className="text-[10px] text-slate-400">por veículo</Text>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <Archive className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs">Média Frota Parada</Text>
              <Metric className="text-slate-700">{formatDurationDays(Math.round(kpis.mediaParado || 0))}</Metric>
              <Text className="text-[10px] text-slate-400">por veículo</Text>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs">% Utilização</Text>
              <Metric className="text-blue-600">{(kpis.utilizationPct ?? 0).toFixed(1)}%</Metric>
              <Text className="text-[10px] text-slate-400">{kpis.totalVehicles} veículos</Text>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros Ativos (ChartFilterBadges) */}
      {hasActiveFilters && (
        <ChartFilterBadges
          filters={chartFilters}
          onClearFilter={clearFilter}
          onClearAll={clearAllFilters}
          labelMap={{
            faixaLocacao: 'Faixa Locação',
            faixaManutencao: 'Faixa Manutenção',
            faixaUtilizacao: 'Faixa Utilização'
          }}
        />
      )}

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
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20} style={{ cursor: 'pointer' }}>
                  {vehiclesByRentalDays.map((entry, index) => (
                    <Cell
                      key={`rental-${index}`}
                      fill={isValueSelected('faixaLocacao', entry.name) ? '#065f46' : entry.color}
                      onClick={(e) => handleChartClick('faixaLocacao', entry.name, e as unknown as React.MouseEvent)}
                    />
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
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20} style={{ cursor: 'pointer' }}>
                  {vehiclesByMaintenanceDays.map((entry, index) => (
                    <Cell
                      key={`maint-${index}`}
                      fill={isValueSelected('faixaManutencao', entry.name) ? '#78350f' : entry.color}
                      onClick={(e) => handleChartClick('faixaManutencao', entry.name, e as unknown as React.MouseEvent)}
                    />
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
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20} style={{ cursor: 'pointer' }}>
                  {vehiclesByUtilization.map((entry, index) => (
                    <Cell
                      key={`util-${index}`}
                      fill={isValueSelected('faixaUtilizacao', entry.name) ? '#1e3a8a' : entry.color}
                      onClick={(e) => handleChartClick('faixaUtilizacao', entry.name, e as unknown as React.MouseEvent)}
                    />
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
                placeholder="Buscar (placa, contrato, modelo, evento...)"
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
          {pageItems.map(({ placa, modelo, eventos, totalEvents, locacaoDays, manutencaoDays, frotaParadaDays, utilization }) => (
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
                    <div className="text-emerald-600 font-bold">{formatDurationDays(locacaoDays)}</div>
                    <div className="text-xs text-slate-400">Locado</div>
                  </div>
                  <div className="text-center">
                    <div className="text-amber-600 font-bold">{formatDurationDays(manutencaoDays)}</div>
                    <div className="text-xs text-slate-400">Manutenção</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-700 font-bold">{formatDurationDays(frotaParadaDays)}</div>
                    <div className="text-xs text-slate-400">Frota Parada</div>
                  </div>
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
                      const manutRecords = manutencaoByPlaca[normalizePlacaKey(placa)] ?? [];
                      const manutOccurrences = groupMaintenanceByOccurrence(manutRecords);

                      // 2) Eventos agrupados por dia/tipo
                      // Se houver intervalos de manutenção consolidados, não mostrar eventos individuais de manutenção
                      // Multas serão exibidas em um tópico próprio (usando fat_multas).
                      const groups = new Map<string, { tipo: string; date: Date; items: AnyObject[] }>();
                      for (const ev of [...eventos].slice().reverse()) {
                        // reverse para manter o último evento do dia no topo ao expandir o grupo
                        const tipo = normalizeEventName(ev.TipoEvento || ev.Evento || 'Evento') || 'OUTRO';
                        // Se há ocorrências consolidadas, pular eventos de manutenção individuais
                        if (tipo.includes('MANUT') && manutOccurrences.length > 0) continue;
                        if (tipo.includes('MULTA')) continue; // Multas vêm de fat_multas
                        const d = new Date(ev.DataEvento || ev.Data);
                        if (Number.isNaN(d.getTime())) continue;
                        const key = `${tipo}:${toISODateKey(d)}`;
                        const prev = groups.get(key);
                        if (!prev) groups.set(key, { tipo, date: d, items: [ev] });
                        else prev.items.push(ev);
                      }

                      // 3) Multas - agora usando fat_multas via multasByPlaca
                      const placaMultas = multasByPlaca[normalizePlacaKey(placa)] || [];

                      const eventRows: EventGroupRow[] = Array.from(groups.entries()).map(([key, g]) => ({
                        kind: 'EVENTO_DIA_TIPO',
                        key,
                        tipo: g.tipo,
                        date: g.date,
                        count: g.items.length,
                        items: g.items
                      }));

                      // Eventos prioritários que SEMPRE devem aparecer (ciclo de vida do veículo)
                      const PRIORITY_TYPES = ['COMPRA', 'AQUISICAO', 'VENDA', 'BAIXA', 'LOCACAO', 'DEVOLUCAO', 'SINISTRO'];
                      
                      // Helper para extrair data de qualquer tipo de row
                      const getRowDate = (r: TimelineRow): Date => {
                        if (r.kind === 'MANUTENCAO_OCORRENCIA') return r.ocorrenciaDate;
                        if (r.kind === 'MANUTENCAO_PERIODO') return r.start;
                        return r.date;
                      };
                      
                      const allRows: TimelineRow[] = [...manutOccurrences, ...eventRows]
                        .sort((a, b) => {
                          const ad = getRowDate(a);
                          const bd = getRowDate(b);
                          return bd.getTime() - ad.getTime();
                        });
                      
                      // Separar eventos prioritários dos demais
                      const priorityRows = allRows.filter(r => 
                        r.kind === 'EVENTO_DIA_TIPO' && PRIORITY_TYPES.some(pt => (r as EventGroupRow).tipo.includes(pt))
                      );
                      const otherRows = allRows.filter(r => 
                        r.kind === 'MANUTENCAO_OCORRENCIA' || 
                        r.kind === 'MANUTENCAO_PERIODO' ||
                        (r.kind === 'EVENTO_DIA_TIPO' && !PRIORITY_TYPES.some(pt => (r as EventGroupRow).tipo.includes(pt)))
                      );
                      
                      // Combinar: todos os prioritários + até 25 outros
                      const rows: TimelineRow[] = [
                        ...priorityRows,
                        ...otherRows.slice(0, Math.max(25, 40 - priorityRows.length))
                      ].sort((a, b) => {
                        const ad = getRowDate(a);
                        const bd = getRowDate(b);
                        return bd.getTime() - ad.getTime();
                      });

                      // Separar eventos de ciclo de vida para destaque
                      const LIFECYCLE_TYPES = ['COMPRA', 'AQUISICAO', 'VENDA', 'BAIXA'];
                      const lifecycleEvents = priorityRows.filter(r => 
                        r.kind === 'EVENTO_DIA_TIPO' && LIFECYCLE_TYPES.some(lt => (r as EventGroupRow).tipo.includes(lt))
                      ) as EventGroupRow[];

                      return (
                        <>
                          {/* Seção de Ciclo de Vida do Veículo - Destaque para COMPRA/VENDA */}
                          {lifecycleEvents.length > 0 && (
                            <div className="pl-6 mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <div className="flex items-center gap-2 text-sm mb-2">
                                <ShoppingCart className="w-4 h-4 text-purple-600" />
                                <span className="font-semibold text-purple-800">
                                  Ciclo de Vida do Veículo
                                </span>
                              </div>
                              <div className="space-y-2">
                                {lifecycleEvents.map((ev, idx) => {
                                  const item = ev.items[0];
                                  const tipoLabel = EVENT_LABELS[ev.tipo] || ev.tipo;
                                  const icon = EVENT_ICONS[ev.tipo] || <ShoppingCart size={14} className="text-purple-500" />;
                                  const valor = item?.ValorCompra ?? item?.ValorVenda ?? item?.CustoTotal ?? item?.ValorAquisicao;
                                  const fornecedor = item?.Fornecedor || item?.Proprietario || item?.Comprador || '';
                                  
                                  return (
                                    <div key={`lifecycle-${idx}`} className="flex items-center justify-between bg-white rounded p-2 border border-purple-100">
                                      <div className="flex items-center gap-2">
                                        {icon}
                                        <span className="font-medium text-sm text-slate-700">{tipoLabel}</span>
                                        <span className="text-xs text-slate-500">{fmtDateBR(ev.date)}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {fornecedor && (
                                          <span className="text-xs text-slate-500">{fornecedor}</span>
                                        )}
                                        {valor != null && Number(valor) > 0 && (
                                          <span className="font-bold text-sm text-purple-700">{fmtMoney(valor)}</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Seção de Contratos de Locação */}
                          {(() => {
                            const locacaoEvents = priorityRows.filter(r => 
                              r.kind === 'EVENTO_DIA_TIPO' && 
                              ((r as EventGroupRow).tipo.includes('LOCACAO') || (r as EventGroupRow).tipo.includes('DEVOLUCAO'))
                            ) as EventGroupRow[];
                            
                            if (locacaoEvents.length === 0) return null;
                            
                            // Agrupar por contrato para mostrar início->fim
                            const locacoes = locacaoEvents.filter(e => e.tipo.includes('LOCACAO'));
                            const devolucoes = locacaoEvents.filter(e => e.tipo.includes('DEVOLUCAO'));
                            
                            return (
                              <div className="pl-6 mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                <div className="flex items-center gap-2 text-sm mb-2">
                                  <Play className="w-4 h-4 text-emerald-600" />
                                  <span className="font-semibold text-emerald-800">
                                    Histórico de Locações ({locacoes.length} locação(ões) • {devolucoes.length} devolução(ões))
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {locacaoEvents.slice(0, 8).map((ev, idx) => {
                                    const item = ev.items[0];
                                    const isLocacao = ev.tipo.includes('LOCACAO');
                                    const cliente = item?.Cliente || item?.NomeCliente || item?.NomeFantasia || 'Cliente não informado';
                                    const contrato = item?.ContratoLocacao || item?.ContratoComercial || item?.NumeroContrato || '';
                                    const situacao = item?.Situacao || item?.StatusLocacao || item?.SituacaoContrato || '';
                                    const valorMensal = item?.ValorMensal || item?.ValorMensalAtual;
                                    
                                    // Calcular duração da locação
                                    const dataInicio = parseDateAny(item?.DataInicio || item?.DataInicioContrato);
                                    const dataFim = parseDateAny(item?.DataFimReal || item?.DataEncerramento) || new Date();
                                    let duracaoMeses = 0;
                                    if (dataInicio) {
                                      const diffMs = dataFim.getTime() - dataInicio.getTime();
                                      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                      duracaoMeses = Math.floor(diffDias / 30);
                                    }
                                    
                                    return (
                                      <div key={`loc-${idx}`} className="flex items-center justify-between bg-white rounded p-2 border border-emerald-100">
                                        <div className="flex items-center gap-2">
                                          {isLocacao ? (
                                            <Play size={14} className="text-emerald-500" />
                                          ) : (
                                            <RotateCcw size={14} className="text-blue-500" />
                                          )}
                                          <span className="font-medium text-sm text-slate-700">
                                            {isLocacao ? 'LOCAÇÃO' : 'DEVOLUÇÃO'}
                                          </span>
                                          <span className="text-xs text-slate-500">{fmtDateBR(ev.date)}</span>
                                          {duracaoMeses > 0 && (
                                            <Badge color="blue" size="xs">{duracaoMeses} meses</Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs text-slate-600 max-w-[200px] truncate" title={cliente}>
                                            {cliente}
                                          </span>
                                          {contrato && (
                                            <Badge color="emerald" size="xs">{contrato}</Badge>
                                          )}
                                          {situacao && (
                                            <Badge color={situacao.toLowerCase().includes('ativo') || situacao.toLowerCase().includes('andamento') ? 'green' : 'slate'} size="xs">
                                              {situacao}
                                            </Badge>
                                          )}
                                          {valorMensal != null && Number(valorMensal) > 0 && (
                                            <span className="font-bold text-xs text-emerald-700">{fmtMoney(valorMensal)}/mês</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {locacaoEvents.length > 8 && (
                                    <div className="text-xs text-emerald-600 text-center">
                                      +{locacaoEvents.length - 8} eventos de locação...
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

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

                          {/* Debug probe removed */}

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

                          {/* Multas Section */}
                          {(() => {
                            // UX Improvement: Toggle para sub-seções
                            const toggleSubSection = (subKey: string) => {
                              const next = new Set(expandedSubSections);
                              if (next.has(subKey)) next.delete(subKey);
                              else next.add(subKey);
                              setExpandedSubSections(next);
                            };

                            const multasKey = `multas:${placa}`;
                            const isListOpen = expandedSubSections.has(multasKey);

                            if (placaMultas.length === 0) return null;

                            return (
                              <div className="relative pl-6">
                                <div className="absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                                  {EVENT_ICONS['MULTA'] || <Clock size={14} className="text-slate-400" />}
                                </div>
                                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                  <div
                                    className="p-3 cursor-pointer hover:bg-slate-100 flex items-center justify-between transition-colors"
                                    onClick={(e) => { e.stopPropagation(); toggleSubSection(multasKey); }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-slate-700">MULTAS</span>
                                      <Badge color="red" className="shrink-0">{placaMultas.length} Multas</Badge>
                                    </div>
                                    <div className="text-xs text-blue-500 font-medium font-mono">
                                      {isListOpen ? '▼ Ocultar' : '▶ Expandir Detalhes'}
                                    </div>
                                  </div>
                                  {isListOpen && (
                                    <div className="border-t border-slate-200">
                                      <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                                        {placaMultas.map((multa: any, idx: number) => {
                                          const dataMulta = multa.DataMulta || multa.Data || multa.DataInfracao;
                                          const valor = multa.ValorMulta || multa.Valor || 0;
                                          const descricao = multa.DescricaoInfracao || multa.Descricao || multa.Infracao || 'Infração não especificada';
                                          const local = multa.LocalInfracao || multa.Local || '';
                                          const condutor = multa.NomeCondutor || multa.Condutor || '';
                                          const status = multa.StatusMulta || multa.Status || '';
                                          const emRecurso = multa.EmRecurso === 'Sim' || multa.EmRecurso === true;
                                          const motivoRecurso = multa.MotivoRecurso || '';

                                          return (
                                            <div key={idx} className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs text-slate-500 font-mono">
                                                      {fmtDateTimeBR(dataMulta)}
                                                    </span>
                                                    {status && (
                                                      <Badge color={status.toLowerCase().includes('pag') ? 'green' : 'amber'} className="text-xs">
                                                        {status}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <div className="text-sm font-medium text-slate-800 mb-1">{descricao}</div>
                                                  {local && <div className="text-xs text-slate-500">📍 {local}</div>}
                                                  {condutor && <div className="text-xs text-slate-500">👤 {condutor}</div>}
                                                </div>
                                                <div className="text-right">
                                                  <div className="text-sm font-bold text-red-600">
                                                    {fmtMoney(valor)}
                                                  </div>
                                                </div>
                                              </div>
                                              {emRecurso && (
                                                <div className="mt-2 pt-2 border-t border-slate-100">
                                                  <div className="flex gap-2">
                                                    <span className="text-slate-500 font-medium">Em Recurso:</span>
                                                    <Badge color="amber" className="text-xs">Sim</Badge>
                                                    {motivoRecurso && <span className="text-slate-600 ml-1">- {String(motivoRecurso)}</span>}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
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
                              const ocorrenciaRaw = row.ocorrencia ?? row.ocorrenciaId ?? '';
                              // Melhorar exibição: se for só número, adicionar prefixo "OCORRÊNCIA #"
                              const title = /^\d+$/.test(String(ocorrenciaRaw)) 
                                ? `OCORRÊNCIA #${ocorrenciaRaw}` 
                                : String(ocorrenciaRaw);
                              const dataOcorrencia = fmtDateTimeBR(row.ocorrenciaDate);
                              const firstRec = row.osRecords[0];
                              const motivo = firstRec?.Motivo ?? '';
                              const descricao = firstRec?.DescricaoOcorrencia ?? firstRec?.Descricao ?? '';
                              const isRowExpanded = expandedRows.has(row.key);
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
                                          {descricao && (
                                            <div className="flex items-start gap-2">
                                              <div className={`italic text-slate-500 ${isRowExpanded ? '' : 'line-clamp-2'}`}>{descricao}</div>
                                              {!isRowExpanded && descricao.length > 140 && (
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); toggleRow(row.key); }}
                                                  className="text-amber-600 text-xs hover:underline"
                                                >
                                                  Expandir
                                                </button>
                                              )}
                                            </div>
                                          )}
                                          {(fornecedor || cliente) && (
                                            <div className="text-[10px] text-slate-500">
                                              {fornecedor && <><b>Fornecedor:</b> {fornecedor} </>}
                                              {cliente && <><b>Cliente:</b> {cliente}</>}
                                            </div>
                                          )}
                                          {/* Alerta de dados faltantes */}
                                          {(!motivo || !descricao || !fornecedor) && (
                                            <div className="text-[10px] text-amber-600 italic mt-1">
                                              ⚠️ Dados incompletos: {[
                                                !motivo && 'Motivo',
                                                !descricao && 'Descrição',
                                                !fornecedor && 'Fornecedor'
                                              ].filter(Boolean).join(', ')} não informado(s)
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
                                                    <div className="text-[11px] text-slate-500">{m?.DataConfirmacao ? (function () { const dt = parseDateAny(m.DataConfirmacao); return dt ? fmtDateTimeBR(dt) : String(m.DataConfirmacao); })() : '—'}</div>
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
                                                  <span className="text-slate-700 font-mono text-sm font-bold">{osId || `OS #${i + 1}`}</span>
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
                                        const sinistrosPlaca = sinistrosByPlaca[normalizePlacaKey(placa)] ?? [];
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

                                      // Contrato Comercial e Locação (priorizando campos ETL dim_contratos_locacao)
                                      // Filtrar valores "N/A" e strings vazias
                                      const contratoComercial = String(
                                        contrato?.ContratoComercial ?? contrato?.NumeroContratoComercial ?? contrato?.ContratoCorporativo ?? contrato?.NumeroContrato ??
                                        it?.ContratoComercial ?? it?.NumeroContratoComercial ?? it?.ContratoCorporativo ??
                                        it?.Detalhe1 ?? it?.Detalhe2 ?? ''
                                      ).trim().replace(/^N\/A$/i, '');

                                      const contratoLocacao = String(
                                        contrato?.ContratoLocacao ?? contrato?.NumeroContratoLocacao ?? contrato?.NumeroContrato ?? contrato?.IdContratoLocacao ??
                                        it?.ContratoLocacao ?? it?.NumeroContratoLocacao ?? it?.NumeroContrato ?? it?.numero_contrato ??
                                        it?.Contrato ?? it?.IdContratoLocacao ?? it?.id_contrato_locacao ?? ''
                                      ).trim().replace(/^N\/A$/i, '');

                                      const contratoCliente = String(
                                        contrato?.NomeCliente ?? contrato?.Cliente ?? contrato?.NomeFantasia ??
                                        it?.NomeCliente ?? it?.Cliente ?? it?.cliente ?? it?.RazaoSocial ?? ''
                                      ).trim().replace(/^N\/A$/i, '');

                                      const situacao = String(
                                        contrato?.StatusLocacao ?? contrato?.SituacaoLocacao ?? contrato?.SituacaoContrato ?? contrato?.Status ?? contrato?.situacao ?? contrato?.Situacao ??
                                        it?.StatusLocacao ?? it?.SituacaoLocacao ?? it?.situacao_locacao ?? it?.Situacao ?? it?.Status ?? it?.status ?? ''
                                      ).trim().replace(/^N\/A$/i, '');

                                      // Campos do ETL dim_contratos_locacao: Inicio, Fim, DataEncerramento
                                      const dataInicio = parseDateAny(
                                        contrato?.Inicio ?? contrato?.__inicio ??
                                        it?.DataInicial ?? it?.InicioContrato ?? it?.DataInicio ?? it?.DataInicioContrato ?? it?.DataRetirada ?? it?.DataInicioLocacao ??
                                        contrato?.DataInicial ?? contrato?.InicioContrato
                                      );

                                      const previsto = parseDateAny(
                                        contrato?.Fim ?? contrato?.__fimPrevisto ??
                                        it?.DataPrevistaTermino ?? it?.DataFimPrevista ?? it?.DataFimPrevisto ??
                                        contrato?.DataPrevistaTermino ?? contrato?.DataFimPrevista ?? contrato?.DataFim
                                      );

                                      const encerramento = parseDateAny(
                                        contrato?.DataEncerramento ?? contrato?.__fimEncerramento ??
                                        it?.DataEncerramento ?? it?.DataFimEfetiva ?? it?.DataTermino ??
                                        contrato?.DataEncerrado
                                      );

                                      // SEMPRE mostrar detalhes para LOCACAO/DEVOLUCAO
                                      const showContrato = tipoNorm === 'LOCACAO' || tipoNorm === 'DEVOLUCAO';

                                      // Sinistro - Campos expandidos (enriquecidos com fat_sinistros)
                                      const showSinistro = tipoNorm === 'SINISTRO';
                                      const numeroOcorrencia = String(
                                        sinistroData?.NumeroOcorrencia ?? sinistroData?.Ocorrencia ?? sinistroData?.IdOcorrencia ??
                                        it?.NumeroOcorrencia ?? it?.Ocorrencia ?? it?.IdOcorrencia ?? ''
                                      ).trim();
                                      const statusSinistro = String(
                                        sinistroData?.Status ?? sinistroData?.StatusSinistro ?? sinistroData?.SituacaoOcorrencia ??
                                        it?.Status ?? it?.StatusSinistro ?? it?.SituacaoOcorrencia ?? ''
                                      ).trim();
                                      const valorSinistro = sinistroData?.ValorOrcado ?? sinistroData?.ValorSinistro ?? sinistroData?.Valor ??
                                        it?.ValorOrcado ?? it?.ValorSinistro ?? it?.Valor;
                                      // Datas do sinistro - usando campos do ETL fat_sinistros
                                      const dataSinistro = parseDateAny(
                                        sinistroData?.DataSinistro ?? sinistroData?.DataOcorrencia ??
                                        it?.DataSinistro ?? it?.DataOcorrencia ?? it?.DataEvento
                                      );
                                      const dataAberturaOcorrenciaSinistro = parseDateAny(
                                        sinistroData?.DataAberturaOcorrencia ?? sinistroData?.DataAbertura ??
                                        it?.DataAberturaOcorrencia ?? it?.DataAbertura
                                      );
                                      const dataConclusaoOcorrenciaSinistro = parseDateAny(
                                        sinistroData?.DataConclusaoOcorrencia ?? sinistroData?.DataConclusao ??
                                        it?.DataConclusaoOcorrencia ?? it?.DataConclusao
                                      );
                                      const dataAgendamentoSinistro = parseDateAny(
                                        sinistroData?.DataAgendamento ?? sinistroData?.DataAgendamentoAtendimento ??
                                        it?.DataAgendamento ?? it?.DataAgendamentoAtendimento
                                      );
                                      const dataLiberacaoSinistro = parseDateAny(
                                        sinistroData?.DataLiberacao ?? sinistroData?.DataRetirada ??
                                        it?.DataLiberacao ?? it?.DataRetirada
                                      );
                                      const descricaoSinistro = sinistroData?.Descricao ?? sinistroData?.DescricaoSinistro ?? it?.Detalhe2;

                                      // Campos adicionais de fat_sinistros
                                      const condutorSinistro = sinistroData?.Condutor ?? sinistroData?.NomeCondutor ?? it?.Condutor;
                                      const clienteSinistro = sinistroData?.Cliente ?? it?.Cliente;
                                      const boletimOcorrencia = sinistroData?.BoletimOcorrencia ?? it?.BoletimOcorrencia;
                                      const apoliceSeguro = sinistroData?.ApoliceSeguro ?? it?.ApoliceSeguro;
                                      const motoristaCulpado = sinistroData?.MotoristaCulpado ?? it?.MotoristaCulpado;
                                      const responsavelCulpado = sinistroData?.ResponsavelCulpado ?? it?.ResponsavelCulpado;
                                      const danosLataria = sinistroData?.DanosLataria ?? it?.DanosLataria;
                                      const danosMotor = sinistroData?.DanosMotor ?? it?.DanosMotor;
                                      const danosAcessorios = sinistroData?.DanosAcessorios ?? it?.DanosAcessorios;
                                      const danosOutros = sinistroData?.DanosOutros ?? it?.DanosOutros;
                                      const localSinistro = sinistroData?.Cidade ? `${sinistroData.Cidade}${sinistroData.Estado ? ` - ${sinistroData.Estado}` : ''}` : null;

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

                                          {/* Detalhes de Locação/Devolução - padrão atualizado com dim_contratos_locacao */}
                                          {showContrato && (
                                            <div className="bg-emerald-50/70 rounded-lg p-3 mt-2 border border-emerald-200">
                                              <div className="flex items-center gap-2 mb-3">
                                                <span className="text-xs font-bold text-emerald-700">
                                                  {tipoNorm === 'DEVOLUCAO' ? '📋 Devolução' : '📦 Locação'}
                                                </span>
                                                {situacao && (
                                                  <Badge
                                                    color={isLocacaoEmAndamento(situacao) ? 'emerald' : isLocacaoEncerrada(situacao) ? 'slate' : 'amber'}
                                                    className="text-[10px]"
                                                  >
                                                    {situacao}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="text-xs space-y-2">
                                                {/* Contratos */}
                                                {(contratoComercial || contratoLocacao) && (
                                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                    {contratoComercial && (
                                                      <div>
                                                        <span className="text-slate-500">Contrato Comercial:</span>
                                                        <div className="font-mono font-semibold text-emerald-700">{contratoComercial}</div>
                                                      </div>
                                                    )}
                                                    {contratoLocacao && (
                                                      <div>
                                                        <span className="text-slate-500">Contrato Locação:</span>
                                                        <div className="font-mono font-semibold text-emerald-700">{contratoLocacao}</div>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                                {contratoCliente && (
                                                  <div>
                                                    <span className="text-slate-500">Cliente:</span>
                                                    <div className="font-semibold text-slate-700">{contratoCliente}</div>
                                                  </div>
                                                )}
                                                {/* Datas e tipo de locação */}
                                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2 border-t border-emerald-100">
                                                  {contrato?.TipoLocacao && (
                                                    <div>
                                                      <span className="text-slate-500">Tipo:</span>
                                                      <div className="font-medium text-slate-700">{contrato.TipoLocacao}</div>
                                                    </div>
                                                  )}
                                                  {contrato?.NomeCondutor && (
                                                    <div>
                                                      <span className="text-slate-500">Condutor:</span>
                                                      <div className="font-medium text-slate-700">{contrato.NomeCondutor}</div>
                                                    </div>
                                                  )}
                                                  {dataInicio && (
                                                    <div>
                                                      <span className="text-slate-500">Início:</span>
                                                      <div className="font-semibold">{fmtDateBR(dataInicio)}</div>
                                                    </div>
                                                  )}
                                                  {previsto && (
                                                    <div>
                                                      <span className="text-slate-500">Término Previsto:</span>
                                                      <div>{fmtDateBR(previsto)}</div>
                                                    </div>
                                                  )}
                                                  {contrato?.PeriodoEmMeses && (
                                                    <div>
                                                      <span className="text-slate-500">Período:</span>
                                                      <div className="font-medium">{Math.round(Number(contrato.PeriodoEmMeses))} meses</div>
                                                    </div>
                                                  )}
                                                  {contrato?.ValorMensalAtual && contrato.ValorMensalAtual > 0 && (
                                                    <div>
                                                      <span className="text-slate-500">Valor Mensal:</span>
                                                      <div className="font-bold text-emerald-700">{fmtMoney(contrato.ValorMensalAtual)}</div>
                                                    </div>
                                                  )}
                                                  {tipoNorm === 'DEVOLUCAO' && (encerramento || dd) && (
                                                    <div className="col-span-2">
                                                      <span className="text-slate-500">Encerramento:</span>
                                                      <div className="font-semibold text-rose-600">{fmtDateTimeBR(encerramento) || fmtDateTimeBR(dd)}</div>
                                                    </div>
                                                  )}
                                                </div>
                                                {!contratoCliente && !contratoComercial && !contratoLocacao && (
                                                  <div className="text-[10px] text-amber-600 italic pt-2 border-t border-emerald-100">
                                                    ⚠️ Dados de contrato não disponíveis - aguardando sincronização de dim_contratos_locacao
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* Detalhes de Sinistro - layout com datas no lado direito igual manutenção */}
                                          {showSinistro && (
                                            <div className="bg-purple-50/50 rounded-lg p-3 mt-2 border border-purple-200">
                                              <div className="flex items-start justify-between gap-4">
                                                {/* Lado esquerdo - Informações principais */}
                                                <div className="flex-1 min-w-0 space-y-2">
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-bold text-purple-700">⚠️ Sinistro</span>
                                                    {statusSinistro && (
                                                      <Badge color={statusSinistro.toLowerCase().includes('conclu') || statusSinistro.toLowerCase().includes('encerr') ? 'emerald' : statusSinistro.toLowerCase().includes('cancel') ? 'slate' : 'purple'} className="text-[10px]">
                                                        {statusSinistro}
                                                      </Badge>
                                                    )}
                                                    {valorSinistro != null && valorSinistro > 0 && (
                                                      <span className="text-purple-700 font-bold text-xs ml-auto">{fmtMoney(valorSinistro)}</span>
                                                    )}
                                                  </div>

                                                  <div className="text-xs space-y-1.5">
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                      {numeroOcorrencia && (
                                                        <div className="flex gap-2">
                                                          <span className="text-slate-500 font-medium">Nº Ocorrência:</span>
                                                          <span className="font-mono font-semibold text-purple-700">{numeroOcorrencia}</span>
                                                        </div>
                                                      )}
                                                      {clienteSinistro && (
                                                        <div className="flex gap-2">
                                                          <span className="text-slate-500 font-medium">Cliente:</span>
                                                          <span className="text-slate-700">{String(clienteSinistro)}</span>
                                                        </div>
                                                      )}
                                                      {condutorSinistro && (
                                                        <div className="flex gap-2">
                                                          <span className="text-slate-500 font-medium">Condutor:</span>
                                                          <span className="text-slate-700">{String(condutorSinistro)}</span>
                                                        </div>
                                                      )}
                                                      {localSinistro && (
                                                        <div className="flex gap-2">
                                                          <span className="text-slate-500 font-medium">Local:</span>
                                                          <span className="text-slate-700">{String(localSinistro)}</span>
                                                        </div>
                                                      )}
                                                    </div>

                                                    {/* Documentação e Responsabilidade */}
                                                    {(boletimOcorrencia || apoliceSeguro || motoristaCulpado || responsavelCulpado) && (
                                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t border-purple-200">
                                                        {boletimOcorrencia && (
                                                          <div className="flex gap-2">
                                                            <span className="text-slate-500 font-medium">B.O.:</span>
                                                            <span className="font-mono text-slate-700">{String(boletimOcorrencia)}</span>
                                                          </div>
                                                        )}
                                                        {apoliceSeguro && (
                                                          <div className="flex gap-2">
                                                            <span className="text-slate-500 font-medium">Apólice:</span>
                                                            <span className="font-mono text-slate-700">{String(apoliceSeguro)}</span>
                                                          </div>
                                                        )}
                                                        {motoristaCulpado && (
                                                          <div className="flex gap-2">
                                                            <span className="text-slate-500 font-medium">Mot. Culpado:</span>
                                                            <Badge color={motoristaCulpado === true || motoristaCulpado === 'Sim' ? 'rose' : 'slate'} className="text-[10px]">
                                                              {motoristaCulpado === true || motoristaCulpado === 'Sim' ? 'Sim' : motoristaCulpado === false || motoristaCulpado === 'Não' ? 'Não' : String(motoristaCulpado)}
                                                            </Badge>
                                                          </div>
                                                        )}
                                                        {responsavelCulpado && (
                                                          <div className="flex gap-2">
                                                            <span className="text-slate-500 font-medium">Responsável:</span>
                                                            <span className="text-slate-700">{String(responsavelCulpado)}</span>
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}

                                                    {/* Danos */}
                                                    {(danosLataria || danosMotor || danosAcessorios || danosOutros) && (
                                                      <div className="pt-2 border-t border-purple-200">
                                                        <span className="text-slate-500 font-medium text-[10px]">Danos:</span>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                          {danosLataria && <Badge color="rose" className="text-[10px]">Lataria</Badge>}
                                                          {danosMotor && <Badge color="rose" className="text-[10px]">Motor</Badge>}
                                                          {danosAcessorios && <Badge color="amber" className="text-[10px]">Acessórios</Badge>}
                                                          {danosOutros && <Badge color="slate" className="text-[10px]">Outros</Badge>}
                                                        </div>
                                                      </div>
                                                    )}

                                                    {descricaoSinistro && (
                                                      <div className="pt-2 border-t border-purple-200">
                                                        <span className="text-slate-500 font-medium">Descrição:</span>
                                                        <div className="text-slate-600 mt-0.5 italic">{String(descricaoSinistro)}</div>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Lado direito - Datas (igual manutenção) */}
                                                <div className="shrink-0 text-right text-[11px] text-slate-600 border-l border-purple-200 pl-3">
                                                  {dataSinistro && (
                                                    <div><b>Sinistro:</b> {fmtDateTimeBR(dataSinistro)}</div>
                                                  )}
                                                  {dataAberturaOcorrenciaSinistro && (
                                                    <div><b>Abertura:</b> {fmtDateTimeBR(dataAberturaOcorrenciaSinistro)}</div>
                                                  )}
                                                  {dataConclusaoOcorrenciaSinistro && (
                                                    <div><b>Conclusão:</b> {fmtDateTimeBR(dataConclusaoOcorrenciaSinistro)}</div>
                                                  )}
                                                  {dataAgendamentoSinistro && (
                                                    <div><b>Agendamento:</b> {fmtDateTimeBR(dataAgendamentoSinistro)}</div>
                                                  )}
                                                  {dataLiberacaoSinistro && (
                                                    <div className="text-green-700"><b>Liberação:</b> {fmtDateTimeBR(dataLiberacaoSinistro)}</div>
                                                  )}
                                                  {/* Calcular diferença entre agendamento e liberação */}
                                                  {dataAgendamentoSinistro && dataLiberacaoSinistro && (() => {
                                                    const diffMs = dataLiberacaoSinistro.getTime() - dataAgendamentoSinistro.getTime();
                                                    const diffMins = Math.round(diffMs / (1000 * 60));
                                                    return diffMins > 0 ? (
                                                      <div className="text-purple-700 font-semibold mt-1">Δ Agend→Lib: {fmtDurationFromMinutes(diffMins)}</div>
                                                    ) : null;
                                                  })()}
                                                  {/* Fallback: diferença entre abertura e conclusão se não tiver agendamento/liberação */}
                                                  {!dataAgendamentoSinistro && !dataLiberacaoSinistro && dataAberturaOcorrenciaSinistro && dataConclusaoOcorrenciaSinistro && (() => {
                                                    const diffMs = dataConclusaoOcorrenciaSinistro.getTime() - dataAberturaOcorrenciaSinistro.getTime();
                                                    const diffMins = Math.round(diffMs / (1000 * 60));
                                                    return diffMins > 0 ? (
                                                      <div className="text-purple-700 font-semibold mt-1">Δ Abertura→Concl: {fmtDurationFromMinutes(diffMins)}</div>
                                                    ) : null;
                                                  })()}
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Detalhes de Manutenção - quando EVENTO_DIA_TIPO for MANUTENCAO */}
                                          {tipoNorm === 'MANUTENCAO' && (() => {
                                            // Buscar dados do fat_manutencao_unificado
                                            const manutRecords = manutencaoByPlaca[normalizePlacaKey(placa)] ?? [];
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

                                          {/* Detalhes de COMPRA - usando campos dim_frota */}
                                          {tipoNorm === 'COMPRA' && (() => {
                                            // Buscar dados do dim_frota pelo placa
                                            const veiculoData = (Array.isArray(frota) ? frota : []).find((f) => normalizePlacaKey(f?.Placa) === normalizePlacaKey(placa));
                                            const modelo = veiculoData?.Modelo ?? it?.Modelo;
                                            const montadora = veiculoData?.Montadora ?? it?.Montadora;
                                            const anoFab = veiculoData?.AnoFabricacao ?? it?.AnoFabricacao;
                                            const anoMod = veiculoData?.AnoModelo ?? it?.AnoModelo;
                                            const cor = veiculoData?.Cor ?? it?.Cor;
                                            const categoria = veiculoData?.Categoria ?? it?.Categoria;
                                            const situacaoFin = veiculoData?.SituacaoFinanceira ?? it?.SituacaoFinanceira;
                                            const localizacao = veiculoData?.Localizacao ?? it?.Localizacao;
                                            const valorCompra = veiculoData?.ValorCompra ?? it?.ValorCompra ?? it?.ValorAquisicao;
                                            const valorFipeAtual = veiculoData?.ValorFipeAtual ?? it?.ValorFipeAtual;
                                            const valorFipeNaCompra = veiculoData?.ValorFipeNaCompra ?? it?.ValorFipeNaCompra;
                                            const valorFipeZeroKm = veiculoData?.ValorFipeZeroKmAtual ?? it?.ValorFipeZeroKmAtual;
                                            const dataCompra = parseDateAny(veiculoData?.DataCompra ?? it?.DataCompra ?? it?.DataAquisicao);
                                            const idadeVeiculo = veiculoData?.IdadeVeiculo ?? it?.IdadeVeiculo;
                                            const proprietario = veiculoData?.Proprietario ?? it?.Proprietario;

                                            return (
                                              <div className="space-y-1.5 text-slate-600 bg-amber-50/50 rounded-lg p-3 mt-2 border border-amber-100">
                                                <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-2">
                                                  🛒 Dados do Veículo (Compra)
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                                  {/* Modelo e Montadora */}
                                                  {modelo && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Modelo:</span>
                                                      <span className="font-semibold text-slate-700">{String(modelo)}</span>
                                                    </div>
                                                  )}
                                                  {montadora && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Montadora:</span>
                                                      <span className="text-slate-700">{String(montadora)}</span>
                                                    </div>
                                                  )}
                                                  {/* Anos */}
                                                  {(anoFab || anoMod) && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Ano:</span>
                                                      <span className="text-slate-700">{anoFab}{anoMod && anoMod !== anoFab ? `/${anoMod}` : ''}</span>
                                                    </div>
                                                  )}
                                                  {cor && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Cor:</span>
                                                      <span className="text-slate-700">{String(cor)}</span>
                                                    </div>
                                                  )}
                                                  {categoria && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Categoria:</span>
                                                      <span className="text-slate-700">{String(categoria)}</span>
                                                    </div>
                                                  )}
                                                  {situacaoFin && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Sit. Financeira:</span>
                                                      <Badge color={situacaoFin.toLowerCase().includes('quit') ? 'green' : 'amber'} className="text-[10px]">{String(situacaoFin)}</Badge>
                                                    </div>
                                                  )}
                                                  {localizacao && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Localização:</span>
                                                      <span className="text-slate-700">{String(localizacao)}</span>
                                                    </div>
                                                  )}
                                                  {proprietario && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Proprietário:</span>
                                                      <span className="text-slate-700">{String(proprietario)}</span>
                                                    </div>
                                                  )}
                                                </div>
                                                {/* Valores e Datas */}
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 pt-2 border-t border-amber-200">
                                                  {valorCompra != null && valorCompra > 0 && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Valor Compra:</span>
                                                      <span className="font-bold text-amber-700">{fmtMoney(valorCompra)}</span>
                                                    </div>
                                                  )}
                                                  {dataCompra && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Data Compra:</span>
                                                      <span className="font-semibold">{fmtDateBR(dataCompra)}</span>
                                                    </div>
                                                  )}
                                                  {idadeVeiculo != null && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">Idade:</span>
                                                      <span className="text-slate-700">{idadeVeiculo} meses</span>
                                                    </div>
                                                  )}
                                                  {valorFipeNaCompra != null && valorFipeNaCompra > 0 && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">FIPE na Compra:</span>
                                                      <span className="text-slate-700">{fmtMoney(valorFipeNaCompra)}</span>
                                                    </div>
                                                  )}
                                                  {valorFipeAtual != null && valorFipeAtual > 0 && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">FIPE Atual:</span>
                                                      <span className="text-green-700 font-semibold">{fmtMoney(valorFipeAtual)}</span>
                                                    </div>
                                                  )}
                                                  {valorFipeZeroKm != null && valorFipeZeroKm > 0 && (
                                                    <div className="flex gap-2">
                                                      <span className="text-slate-500 font-medium">FIPE 0km:</span>
                                                      <span className="text-slate-700">{fmtMoney(valorFipeZeroKm)}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })()}
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
                  </div >
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Paginação */}
        < div className="p-4 border-t bg-slate-50 flex items-center justify-between" >
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
          <Text className="text-slate-500">
            Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, filteredGrouped.length)} de {fmtDecimal(filteredGrouped.length)}
          </Text>
        </div>
      </Card>
    </div>
  );
}
