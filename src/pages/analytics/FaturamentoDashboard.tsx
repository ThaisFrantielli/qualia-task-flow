import { useEffect, useMemo, useState, useRef, Fragment } from 'react';
import useBIDataBatch, { getBatchTable } from '@/hooks/useBIDataBatch';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LabelList,
  Cell,
} from 'recharts';

type Row = Record<string, any>;
type SegmentKey = 'PF' | 'PJ' | 'PUBLICO';
type SegmentFilter = 'TODOS' | SegmentKey;
type ChartTab = 'MENSAL' | 'SEGMENTO_FAT' | 'SEGMENTO_TICKET';

type VehicleRef = {
  key: string;
  valorCompra: number;
  segment?: SegmentKey;
  start?: Date | null;
  end?: Date | null;
};

type NoteDetailRow = {
  IdNota: string;
  Nota: string;
  Emissao: string;
  Competencia: string;
  Cliente: string;
  ValorTotal: number;
};

type SegmentMonthlyRow = {
  mes: string;
  PF: number;
  PJ: number;
  PUBLICO: number;
};

type ItemMetric = {
  monthIdx: number;
  segment: SegmentKey;
  vehicleId: string;
  hasVehicle: boolean;
};

type EnrichedRow = Row & {
  __segment: SegmentKey;
  __vehicleRefs: VehicleRef[];
  __monthIdx: number;
};

type EvolutionMetricKind = 'number' | 'currency' | 'compactCurrency';

type EvolutionMetricRow = {
  indicador: string;
  valuesPeriodo: number[];
  variacaoPct: number | null;
  variationsMoM: (number | null)[];
  kind: EvolutionMetricKind;
};

type SegmentEvolutionRow = {
  segment: SegmentKey;
  segmentLabel: string;
  label: string;
  color: string;
  valuesPeriodo: number[];
  variationsMoM: (number | null)[];
  variacaoPct: number | null;
  kind: EvolutionMetricKind;
};

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const SEGMENTS = [
  { key: 'PF' as SegmentKey, label: 'PF', color: '#0f766e', muted: '#94a3b8' },
  { key: 'PJ' as SegmentKey, label: 'PJ', color: '#fb923c', muted: '#fcd9b6' },
  { key: 'PUBLICO' as SegmentKey, label: 'Público', color: '#2563eb', muted: '#bfdbfe' },
];

const CONTRACT_TYPE_LABEL: Record<SegmentKey, string> = {
  PF: 'Assinatura',
  PJ: 'PJ',
  PUBLICO: 'Público',
};

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function fmtNumber(v: number) {
  return new Intl.NumberFormat('pt-BR').format(v || 0);
}

function fmtCompactBRL(v: number) {
  if (!Number.isFinite(v) || v === 0) return 'R$ 0';
  const compact = new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(v);
  return `R$ ${compact}`;
}

function fmtReadableFaturamento(v: number) {
  if (!Number.isFinite(v) || v === 0) return 'R$ 0';
  if (Math.abs(v) >= 1_000_000) {
    const millions = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(v / 1_000_000);
    return `R$ ${millions} M`;
  }
  return fmtBRL(v);
}

function fmtPercent(v: number) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(v)}%`;
}

function SearchableSelect(props: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  allLabel?: string;
  multiple?: boolean;
}) {
  const { options, value, onChange, placeholder, allLabel = 'Todas', multiple = true } = props;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = q ? options.filter((o) => String(o || '').toLowerCase().includes(q.toLowerCase())) : options;

  const toggle = (opt: string) => {
    if (!multiple) {
      onChange([opt]);
      setOpen(false);
      return;
    }
    const exists = value.includes(opt);
    const next = exists ? value.filter((v) => v !== opt) : [...value, opt];
    onChange(next);
  };

  const summary = value.length === 0
    ? (placeholder || allLabel)
    : value.length === 1
      ? value[0]
      : `${value.length} selecionados`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((s) => !s);
          setQ('');
        }}
        className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white cursor-pointer flex items-center justify-between gap-2 hover:border-blue-300 transition-colors"
      >
        <div className="min-w-0 flex items-center gap-2">
          {value.length > 0 && <span className="inline-flex items-center justify-center rounded-md bg-blue-100 text-blue-700 text-[11px] font-semibold px-1.5 py-0.5">{value.length}</span>}
          <span className={`truncate text-sm ${value.length ? 'text-slate-900' : 'text-slate-500'}`}>{summary}</span>
        </div>
        <span className="text-slate-400 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="max-h-64 overflow-auto">
            <button
              type="button"
              className="w-full px-2.5 py-2 hover:bg-slate-50 text-sm text-left flex items-center justify-between"
              onClick={() => {
                onChange([]);
                setOpen(false);
              }}
            >
              <span>{allLabel}</span>
              {value.length === 0 && <span className="text-blue-600 text-xs">ativo</span>}
            </button>
            {filtered.map((o, idx) => {
              const selected = value.includes(String(o || ''));
              return (
                <button
                  type="button"
                  key={idx}
                  className={`w-full px-2.5 py-2 text-sm text-left flex items-center gap-2 hover:bg-slate-50 ${selected ? 'bg-blue-50/60' : ''}`}
                  onClick={() => toggle(String(o || ''))}
                >
                  <span className={`inline-flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>✓</span>
                  <span className="truncate">{o}</span>
                </button>
              );
            })}
            {filtered.length === 0 && <div className="px-2.5 py-3 text-xs text-slate-400">Nenhuma opção</div>}
          </div>
          <div className="px-2.5 py-2 border-t border-slate-100 flex justify-between items-center bg-slate-50/70">
            <button type="button" onClick={() => onChange([])} className="text-xs text-slate-500 hover:text-slate-700">Limpar</button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-medium text-blue-600 hover:text-blue-700">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function parseNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const raw = String(v ?? '').trim();
  if (!raw) return 0;

  const s = raw.replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
  if (!s) return 0;

  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    const n = Number(s.replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  if (/^-?\d+,\d+$/.test(s)) {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  const n = Number(s);
  if (Number.isFinite(n)) return n;

  const fallback = parseFloat(s.replace(',', '.'));
  return Number.isFinite(fallback) ? fallback : 0;
}

function normalizeText(v: unknown): string {
  return String(v ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function parseDateAny(v: unknown): Date | null {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v;
  }

  const s = String(v ?? '').trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) {
    const d = new Date(`${br[3]}-${br[2]}-${br[1]}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDateBR(v: unknown): string {
  const d = parseDateAny(v);
  if (!d) return String(v ?? '');
  return new Intl.DateTimeFormat('pt-BR').format(d);
}

function normalizePlate(v: unknown): string {
  return String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
}

function monthTokenFromDate(d: Date | null): string {
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isWithinDateRange(date: Date | null, start: Date | null, end: Date | null): boolean {
  if (!date) return true;
  if (start && date.getTime() < start.getTime()) return false;
  if (end && date.getTime() > end.getTime()) return false;
  return true;
}

function dedupeVehicleRefs(refs: VehicleRef[]): VehicleRef[] {
  const map = new Map<string, VehicleRef>();

  for (const ref of refs) {
    const key = String(ref.key ?? '').trim();
    if (!key) continue;

    const current = map.get(key);
    if (!current) {
      map.set(key, { ...ref, key, valorCompra: parseNumber(ref.valorCompra) });
      continue;
    }

    const value = parseNumber(ref.valorCompra);
    if (value > current.valorCompra) current.valorCompra = value;
    if (!current.segment && ref.segment) current.segment = ref.segment;
    if (!current.start && ref.start) current.start = ref.start;
    if (!current.end && ref.end) current.end = ref.end;
  }

  return Array.from(map.values());
}

function getClientName(row: Row): string {
  return String(row.NomeCliente ?? row.Cliente ?? row.nomecliente ?? row.cliente ?? '');
}

function getEmissao(row: Row): string {
  return String(
    row.Emissao
      ?? row.DataEmissao
      ?? row.dataEmissao
      ?? row.Data_emissao
      ?? row.data_emissao
      ?? ''
  );
}

function getCompetencia(row: Row): string {
  return String(
    row.Competencia
      ?? row.DataCompetencia
      ?? row.dataCompetencia
      ?? row.Data_competencia
      ?? row.data_competencia
      ?? ''
  );
}

function getNotaDisplay(row: Row): string {
  return String(row.NumeroNota ?? row.Nota ?? row.numero_nota ?? '');
}

function getNotaKey(row: Row): string {
  const id = String(row.IdNota ?? '').trim();
  if (id) return id;
  const numero = getNotaDisplay(row).trim();
  if (numero) return numero;
  return '';
}

function getMonthIndex(v: unknown): number {
  const d = parseDateAny(v);
  if (!d) return -1;
  const month = d.getMonth() + 1;
  if (month < 1 || month > 12) return -1;
  return month - 1;
}

function getYear(v: unknown): number | null {
  const d = parseDateAny(v);
  return d ? d.getFullYear() : null;
}

function isCanceled(row: Row): boolean {
  const situacao = normalizeText(row.SituacaoNota ?? row.situacaoNota ?? row.Situacao ?? row.Status);
  return situacao.includes('CANCEL');
}

function isFatura(row: Row): boolean {
  const numero = normalizeText(getNotaDisplay(row));
  const tipo = normalizeText(row.TipoNota ?? row.TipoDocumento);
  return numero.startsWith('FA-') || tipo === 'FATURA';
}

function segmentFromTipoLocacao(tipoLocacao: unknown): SegmentKey {
  const t = normalizeText(tipoLocacao);
  if (t.includes('PUBLICO')) return 'PUBLICO';
  if (t.includes('ASSINATURA') || t === 'PF') return 'PF';
  if (t.includes('TERCEIR') || t === 'PJ') return 'PJ';
  return 'PJ';
}

function extractPlate(detail: unknown): string | null {
  const raw = String(detail ?? '').toUpperCase();
  const m = raw.match(/[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}/);
  if (!m) return null;
  return normalizePlate(m[0]);
}

function sumDistinctNotaTotal(rows: Array<Row>): number {
  const byNota = new Map<string, number>();
  let noKeyIndex = 0;

  for (const row of rows) {
    const key = getNotaKey(row);
    const value = parseNumber(row.VlrTotal ?? row.ValorTotal ?? row.valor_total ?? 0);

    if (!key) {
      byNota.set(`__no_key__${noKeyIndex++}`, value);
      continue;
    }

    const current = byNota.get(key) ?? 0;
    if (value > current) byNota.set(key, value);
    if (!byNota.has(key)) byNota.set(key, value);
  }

  let total = 0;
  for (const v of byNota.values()) total += v;
  return total;
}

export default function FaturamentoDashboard() {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedMonthsMulti, setSelectedMonthsMulti] = useState<number[]>([]);
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('TODOS');
  const [selectedSegmentsMulti, setSelectedSegmentsMulti] = useState<SegmentKey[]>([]);
  const [chartTab, setChartTab] = useState<ChartTab>('MENSAL');

  const { results, loading, error } = useBIDataBatch(
    ['fat_faturamentos', 'dim_contratos_locacao', 'dim_frota'],
    undefined,
    { params: { limit: 100000 } }
  );

  const {
    results: itemResults,
    loading: loadingItems,
    error: errorItems,
  } = useBIDataBatch(
    ['fat_faturamento_itens'],
    undefined,
    {
      enabled: selectedYear !== null,
      params: { limit: 100000 },
    }
  );

  const faturamentos = useMemo(() => getBatchTable<Row>(results, 'fat_faturamentos'), [results]);
  const contratos = useMemo(() => getBatchTable<Row>(results, 'dim_contratos_locacao'), [results]);
  const frota = useMemo(() => getBatchTable<Row>(results, 'dim_frota'), [results]);
  const faturamentoItens = useMemo(() => getBatchTable<Row>(itemResults, 'fat_faturamento_itens'), [itemResults]);

  const years = useMemo(() => {
    const yearSet = new Set<number>();
    for (const row of faturamentos) {
      const y = getYear(getCompetencia(row));
      if (y) yearSet.add(y);
    }
    const list = Array.from(yearSet).sort((a, b) => b - a);
    return list.length ? list : [new Date().getFullYear()];
  }, [faturamentos]);

  useEffect(() => {
    if (!years.length) return;
    if (selectedYear === null || !years.includes(selectedYear)) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  const contractsByClient = useMemo(() => {
    const map = new Map<string, SegmentKey>();
    for (const c of contratos) {
      const nome = normalizeText(getClientName(c));
      if (!nome) continue;
      map.set(nome, segmentFromTipoLocacao(c.TipoLocacao ?? c.TipoDeContrato));
    }
    return map;
  }, [contratos]);

  const contractsByPlate = useMemo(() => {
    const map = new Map<string, SegmentKey>();
    for (const c of contratos) {
      const tipo = segmentFromTipoLocacao(c.TipoLocacao ?? c.TipoDeContrato);
      const platePrincipal = normalizePlate(c.PlacaPrincipal);
      const plateReserva = normalizePlate(c.PlacaReserva);
      if (platePrincipal) map.set(platePrincipal, tipo);
      if (plateReserva) map.set(plateReserva, tipo);
    }
    return map;
  }, [contratos]);

  const vehicleValueById = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of frota) {
      const id = String(v.IdVeiculo ?? '').trim();
      if (!id) continue;
      map.set(id, parseNumber(v.ValorCompra));
    }
    return map;
  }, [frota]);

  const vehicleByPlate = useMemo(() => {
    const map = new Map<string, { id: string; valorCompra: number }>();
    for (const v of frota) {
      const plate = normalizePlate(v.Placa);
      if (!plate) continue;
      const id = String(v.IdVeiculo ?? '').trim();
      const valorCompra = parseNumber(v.ValorCompra);
      const current = map.get(plate);
      map.set(plate, {
        id: id || current?.id || '',
        valorCompra: valorCompra || current?.valorCompra || 0,
      });
    }
    return map;
  }, [frota]);

  const contractVehiclesByClient = useMemo(() => {
    const map = new Map<string, VehicleRef[]>();

    for (const c of contratos) {
      const clientKey = normalizeText(getClientName(c));
      if (!clientKey) continue;

      const segment = segmentFromTipoLocacao(c.TipoLocacao ?? c.TipoDeContrato);
      const start = parseDateAny(c.DataInicial ?? c.dataInicial ?? c.DataInicio ?? c.Inicio);
      const end = parseDateAny(c.DataFinal ?? c.dataFinal ?? c.DataEncerramento ?? c.Fim ?? c.DataTermino);

      const idVeiculo = String(c.IdVeiculoPrincipal ?? c.IdVeiculo ?? '').trim();
      const platePrincipal = normalizePlate(c.PlacaPrincipal);
      const plateReserva = normalizePlate(c.PlacaReserva);
      const plateRef = platePrincipal || plateReserva;
      const fromPlate = plateRef ? vehicleByPlate.get(plateRef) : undefined;

      const fallbackKey = String(c.IdContratoLocacao ?? c.NumeroContratoLocacao ?? c.ContratoLocacao ?? '').trim();
      const vehicleKey = idVeiculo || fromPlate?.id || plateRef || fallbackKey;
      if (!vehicleKey) continue;

      const valorCompra = (
        (idVeiculo ? vehicleValueById.get(idVeiculo) : undefined)
        ?? fromPlate?.valorCompra
        ?? 0
      );

      const list = map.get(clientKey) ?? [];
      list.push({
        key: vehicleKey,
        valorCompra,
        segment,
        start,
        end,
      });
      map.set(clientKey, list);
    }

    return map;
  }, [contratos, vehicleByPlate, vehicleValueById]);

  const dataPrepared = useMemo(() => {
    const emptySegmentMonthly: SegmentMonthlyRow[] = MONTHS.map((mes) => ({ mes, PF: 0, PJ: 0, PUBLICO: 0 }));

    if (selectedYear === null) {
      return {
        faturamentoLocacao: 0,
        qtdVeiculos: 0,
        ticketMedio: 0,
        monthly: MONTHS.map((mes) => ({ mes, faturamentoEmitido: 0, qtVeiculos: 0, frotaAtiva: 0, valorCompra: 0 })),
        monthlySegmentFaturamento: emptySegmentMonthly,
        monthlySegmentFrota: emptySegmentMonthly,
        monthlySegmentTicket: emptySegmentMonthly,
        noteDetails: [] as NoteDetailRow[],
      };
    }

    const rowsBase = faturamentos.filter((r) => {
      if (isCanceled(r)) return false;
      if (!isFatura(r)) return false;
      const y = getYear(getCompetencia(r));
      if (!y || y !== selectedYear) return false;
      return true;
    });

    const activeVehicleCache = new Map<string, VehicleRef[]>();

    const rowsEnriched: EnrichedRow[] = rowsBase.map((r) => {
      const clientKey = normalizeText(getClientName(r));
      const byClient = contractsByClient.get(clientKey);

      const competencia = parseDateAny(getCompetencia(r));
      const monthToken = monthTokenFromDate(competencia);

      const plate = extractPlate(r.DetalheItem ?? r.detalheItem ?? r.Placa ?? r.placa);
      const byPlate = plate ? contractsByPlate.get(plate) : undefined;

      const idVeiculo = String(r.IdVeiculo ?? r.idVeiculo ?? '').trim();
      const byVehiclePlate = plate ? vehicleByPlate.get(plate) : undefined;

      const directRefs = dedupeVehicleRefs([
        ...(idVeiculo ? [{ key: idVeiculo, valorCompra: (vehicleValueById.get(idVeiculo) ?? 0) }] : []),
        ...(byVehiclePlate
          ? [{ key: byVehiclePlate.id || plate || '', valorCompra: byVehiclePlate.valorCompra }]
          : []),
      ]);

      const clientMonthKey = `${clientKey}|${monthToken}`;
      let activeRefs = activeVehicleCache.get(clientMonthKey);

      if (!activeRefs) {
        const clientRefs = contractVehiclesByClient.get(clientKey) ?? [];
        let refsInRange = clientRefs.filter((ref) => isWithinDateRange(competencia, ref.start ?? null, ref.end ?? null));
        if (!refsInRange.length) refsInRange = clientRefs;

        activeRefs = dedupeVehicleRefs(
          refsInRange.map((ref) => ({
            key: ref.key,
            valorCompra: ref.valorCompra,
            segment: ref.segment,
          }))
        );

        activeVehicleCache.set(clientMonthKey, activeRefs);
      }

      const vehicleRefs = directRefs.length ? directRefs : activeRefs;
      const segment = (byClient || byPlate || activeRefs[0]?.segment || 'PJ') as SegmentKey;

      return {
        ...r,
        __segment: segment,
        __vehicleRefs: vehicleRefs,
        __monthIdx: getMonthIndex(getCompetencia(r)),
      };
    });

    const noteMetaById = new Map<string, { monthIdx: number; segment: SegmentKey }>();
    for (const row of rowsEnriched) {
      const noteId = String(row.IdNota ?? '').trim();
      if (!noteId || noteMetaById.has(noteId)) continue;

      const monthIdx = Number(row.__monthIdx);
      if (monthIdx < 0 || monthIdx > 11) continue;

      noteMetaById.set(noteId, {
        monthIdx,
        segment: row.__segment as SegmentKey,
      });
    }

    const itemMetricsAll: ItemMetric[] = [];
    for (const item of faturamentoItens) {
      const noteId = String(item.IdNota ?? '').trim();
      if (!noteId) continue;

      const meta = noteMetaById.get(noteId);
      if (!meta) continue;

      const vehicleId = String(item.IdVeiculo ?? item.idveiculo ?? '').trim().toUpperCase();
      itemMetricsAll.push({
        monthIdx: meta.monthIdx,
        segment: meta.segment,
        vehicleId,
        hasVehicle: Boolean(vehicleId),
      });
    }

    const itemMetricsWithVehicle = itemMetricsAll.filter((i) => i.hasVehicle);

    const rowsSegmentFiltered = rowsEnriched.filter((r) => {
      const monthIdx = getMonthIndex(getCompetencia(r));
      const monthAllowed = selectedMonthsMulti.length === 0 || selectedMonthsMulti.includes(monthIdx + 1);
      const segmentAllowedMulti = selectedSegmentsMulti.length === 0 || selectedSegmentsMulti.includes(r.__segment);
      const segmentAllowedVisual = segmentFilter === 'TODOS' || r.__segment === segmentFilter;
      return monthAllowed && segmentAllowedMulti && segmentAllowedVisual;
    });

    const itemsSegmentFiltered = itemMetricsWithVehicle.filter((i) => {
      const monthAllowed = selectedMonthsMulti.length === 0 || selectedMonthsMulti.includes(i.monthIdx + 1);
      const segmentAllowedMulti = selectedSegmentsMulti.length === 0 || selectedSegmentsMulti.includes(i.segment);
      const segmentAllowedVisual = segmentFilter === 'TODOS' || i.segment === segmentFilter;
      return monthAllowed && segmentAllowedMulti && segmentAllowedVisual;
    });

    const rowsKpi = rowsSegmentFiltered.filter((r) => {
      if (selectedMonth === 0) return true;
      const idx = getMonthIndex(getCompetencia(r));
      return idx === selectedMonth - 1;
    });

    const itemsKpi = itemsSegmentFiltered.filter((i) => {
      if (selectedMonth === 0) return true;
      return i.monthIdx === selectedMonth - 1;
    });

    const faturamentoLocacao = sumDistinctNotaTotal(rowsKpi);
    const qtdVeiculos = itemsKpi.length;
    const ticketMedio = qtdVeiculos > 0 ? faturamentoLocacao / qtdVeiculos : 0;

    const monthly = MONTHS.map((label, idx) => {
      const rowsMonth = rowsSegmentFiltered.filter((r) => getMonthIndex(getCompetencia(r)) === idx);
      const faturamentoEmitido = sumDistinctNotaTotal(rowsMonth);

      const itemsMonth = itemsSegmentFiltered.filter((i) => i.monthIdx === idx);
      const vehiclesInMonth = new Set(itemsMonth.map((i) => i.vehicleId).filter(Boolean));
      let valorCompra = 0;
      for (const vehicleId of vehiclesInMonth.values()) {
        valorCompra += parseNumber(vehicleValueById.get(vehicleId) ?? 0);
      }

      return {
        mes: label,
        faturamentoEmitido,
        qtVeiculos: itemsMonth.length,
        frotaAtiva: vehiclesInMonth.size,
        valorCompra,
      };
    });

    const monthlySegmentFaturamento: SegmentMonthlyRow[] = MONTHS.map((label, idx) => {
      const rowsMonth = rowsEnriched.filter((r) => getMonthIndex(getCompetencia(r)) === idx);
      const rowsPf = rowsMonth.filter((r) => r.__segment === 'PF');
      const rowsPj = rowsMonth.filter((r) => r.__segment === 'PJ');
      const rowsPublico = rowsMonth.filter((r) => r.__segment === 'PUBLICO');

      return {
        mes: label,
        PF: sumDistinctNotaTotal(rowsPf),
        PJ: sumDistinctNotaTotal(rowsPj),
        PUBLICO: sumDistinctNotaTotal(rowsPublico),
      };
    });

    const monthlySegmentTicket: SegmentMonthlyRow[] = MONTHS.map((label, idx) => {
      const rowsMonth = rowsEnriched.filter((r) => getMonthIndex(getCompetencia(r)) === idx);
      const rowsPf = rowsMonth.filter((r) => r.__segment === 'PF');
      const rowsPj = rowsMonth.filter((r) => r.__segment === 'PJ');
      const rowsPublico = rowsMonth.filter((r) => r.__segment === 'PUBLICO');

      const fatPf = sumDistinctNotaTotal(rowsPf);
      const fatPj = sumDistinctNotaTotal(rowsPj);
      const fatPublico = sumDistinctNotaTotal(rowsPublico);

      const qtdPf = itemMetricsWithVehicle.filter((i) => i.monthIdx === idx && i.segment === 'PF').length;
      const qtdPj = itemMetricsWithVehicle.filter((i) => i.monthIdx === idx && i.segment === 'PJ').length;
      const qtdPublico = itemMetricsWithVehicle.filter((i) => i.monthIdx === idx && i.segment === 'PUBLICO').length;

      return {
        mes: label,
        PF: qtdPf > 0 ? fatPf / qtdPf : 0,
        PJ: qtdPj > 0 ? fatPj / qtdPj : 0,
        PUBLICO: qtdPublico > 0 ? fatPublico / qtdPublico : 0,
      };
    });

    const monthlySegmentFrota: SegmentMonthlyRow[] = MONTHS.map((label, idx) => {
      const pfVehicles = new Set(itemsSegmentFiltered.filter((i) => i.monthIdx === idx && i.segment === 'PF').map((i) => i.vehicleId));
      const pjVehicles = new Set(itemsSegmentFiltered.filter((i) => i.monthIdx === idx && i.segment === 'PJ').map((i) => i.vehicleId));
      const publicoVehicles = new Set(itemsSegmentFiltered.filter((i) => i.monthIdx === idx && i.segment === 'PUBLICO').map((i) => i.vehicleId));

      return {
        mes: label,
        PF: pfVehicles.size,
        PJ: pjVehicles.size,
        PUBLICO: publicoVehicles.size,
      };
    });

    const notesMap = new Map<string, NoteDetailRow>();
    for (const r of rowsKpi) {
      const key = getNotaKey(r) || `${getNotaDisplay(r)}__${getCompetencia(r)}__${getClientName(r)}`;
      const valorTotal = parseNumber(r.VlrTotal ?? r.ValorTotal ?? r.valor_total ?? 0);

      const current = notesMap.get(key);
      if (!current) {
        notesMap.set(key, {
          IdNota: String(r.IdNota ?? ''),
          Nota: getNotaDisplay(r),
          Emissao: getEmissao(r),
          Competencia: getCompetencia(r),
          Cliente: getClientName(r),
          ValorTotal: valorTotal,
        });
        continue;
      }

      if (valorTotal > current.ValorTotal) {
        current.ValorTotal = valorTotal;
      }

      if (!current.Emissao && getEmissao(r)) current.Emissao = getEmissao(r);
      if (!current.Competencia && getCompetencia(r)) current.Competencia = getCompetencia(r);
      if (!current.Cliente && getClientName(r)) current.Cliente = getClientName(r);
      if (!current.Nota && getNotaDisplay(r)) current.Nota = getNotaDisplay(r);
      if (!current.IdNota && r.IdNota) current.IdNota = String(r.IdNota);
    }

    const noteDetails = Array.from(notesMap.values()).sort((a, b) => {
      const bDate = parseDateAny(b.Competencia)?.getTime() ?? 0;
      const aDate = parseDateAny(a.Competencia)?.getTime() ?? 0;
      if (bDate !== aDate) return bDate - aDate;
      return b.ValorTotal - a.ValorTotal;
    });

    return {
      faturamentoLocacao,
      qtdVeiculos,
      ticketMedio,
      monthly,
      monthlySegmentFaturamento,
      monthlySegmentFrota,
      monthlySegmentTicket,
      noteDetails,
    };
  }, [
    faturamentos,
    faturamentoItens,
    selectedYear,
    selectedMonth,
    selectedMonthsMulti,
    segmentFilter,
    selectedSegmentsMulti,
    contractsByClient,
    contractsByPlate,
    vehicleByPlate,
    vehicleValueById,
    contractVehiclesByClient,
  ]);

  const calcMoMVariation = (mesAtual: number, mesAnterior: number): number | null => {
    if (!Number.isFinite(mesAnterior) || mesAnterior === 0) return null;
    return ((mesAtual - mesAnterior) / mesAnterior) * 100;
  };

  const getPeriodVariation = (values: number[]): number | null => {
    if (values.length < 2) return null;
    const primeiro = values[0] ?? 0;
    const ultimo = values[values.length - 1] ?? 0;
    return calcMoMVariation(ultimo, primeiro);
  };

  const getMoMVariations = (values: number[], firstPreviousValue?: number | null): (number | null)[] => {
    const variations: (number | null)[] = [];
    for (let i = 0; i < values.length; i++) {
      const cur = values[i] ?? 0;
      if (i === 0) {
        if (firstPreviousValue === null || firstPreviousValue === undefined) {
          variations.push(null);
        } else {
          variations.push(calcMoMVariation(cur, firstPreviousValue));
        }
        continue;
      }
      const prev = values[i - 1] ?? 0;
      variations.push(calcMoMVariation(cur, prev));
    }
    return variations;
  };

  const previousDecember = useMemo(() => {
    if (selectedYear === null) return null;

    const prevYear = selectedYear - 1;
    const rowsPrevDec = faturamentos.filter((r) => {
      if (isCanceled(r)) return false;
      if (!isFatura(r)) return false;
      const y = getYear(getCompetencia(r));
      if (!y || y !== prevYear) return false;
      const m = getMonthIndex(getCompetencia(r));
      return m === 11;
    });

    if (rowsPrevDec.length === 0) return null;

    const faturamento = sumDistinctNotaTotal(rowsPrevDec);
    const allVehicles = new Set<string>();

    const noteSegmentById = new Map<string, SegmentKey>();
    const noteIds = new Set<string>();
    const noteValueByKey = new Map<string, number>();
    const registerNoteKey = (raw: string, segment: SegmentKey) => {
      const key = String(raw ?? '').trim();
      if (!key) return;
      noteIds.add(key);
      noteSegmentById.set(key, segment);
      const normalized = key.replace(/^0+/, '');
      if (normalized) {
        noteIds.add(normalized);
        noteSegmentById.set(normalized, segment);
      }
    };

    for (const r of rowsPrevDec) {
      const clientKey = normalizeText(getClientName(r));
      const plate = extractPlate(r.DetalheItem ?? r.detalheItem ?? r.Placa ?? r.placa);
      const byClient = contractsByClient.get(clientKey);
      const byPlate = plate ? contractsByPlate.get(plate) : undefined;
      const resolvedSegment = (byClient || byPlate || segmentFromTipoLocacao(r.TipoLocacao ?? r.TipoDeContrato)) as SegmentKey;

      registerNoteKey(String(r.IdNota ?? ''), resolvedSegment);
      registerNoteKey(getNotaDisplay(r), resolvedSegment);

      const key = getNotaKey(r);
      const value = parseNumber(r.VlrTotal ?? r.ValorTotal ?? r.valor_total ?? 0);
      if (!key) continue;
      const cur = noteValueByKey.get(key) ?? 0;
      if (value > cur) {
        noteValueByKey.set(key, value);
      }
      if (!noteSegmentById.has(key)) {
        noteSegmentById.set(key, resolvedSegment);
      }
    }

    const segmentFat: Record<SegmentKey, number> = { PF: 0, PJ: 0, PUBLICO: 0 };
    for (const [key, value] of noteValueByKey.entries()) {
      const seg = noteSegmentById.get(key) ?? 'PJ';
      segmentFat[seg] += value;
    }
    const segmentVehicles: Record<SegmentKey, Set<string>> = {
      PF: new Set<string>(),
      PJ: new Set<string>(),
      PUBLICO: new Set<string>(),
    };

    for (const item of faturamentoItens) {
      const rawNoteId = String(item.IdNota ?? '').trim();
      const noteId = rawNoteId.replace(/^0+/, '') || rawNoteId;
      const key = noteIds.has(rawNoteId) ? rawNoteId : noteId;
      if (!key || !noteIds.has(key)) continue;

      const seg = noteSegmentById.get(key) ?? 'PJ';
      const idv = String(item.IdVeiculo ?? item.idveiculo ?? '').trim().toUpperCase();
      if (!idv) continue;

      allVehicles.add(idv);
      segmentVehicles[seg].add(idv);
    }

    for (const r of rowsPrevDec) {
      const fallbackSegment = segmentFromTipoLocacao(r.TipoLocacao ?? r.TipoDeContrato);
      const competencia = parseDateAny(getCompetencia(r));
      const clientKey = normalizeText(getClientName(r));

      const idv = String(r.IdVeiculo ?? '').trim();
      const plate = extractPlate(r.DetalheItem ?? r.detalheItem ?? r.Placa ?? r.placa);
      const fromPlate = plate ? vehicleByPlate.get(plate) : undefined;

      const directRefs = dedupeVehicleRefs([
        ...(idv ? [{ key: idv, valorCompra: 0 }] : []),
        ...(fromPlate ? [{ key: fromPlate.id || plate || '', valorCompra: 0 }] : []),
      ]);

      let refs = directRefs;
      if (!refs.length) {
        const clientRefs = contractVehiclesByClient.get(clientKey) ?? [];
        let refsInRange = clientRefs.filter((ref) => isWithinDateRange(competencia, ref.start ?? null, ref.end ?? null));
        if (!refsInRange.length) refsInRange = clientRefs;

        refs = dedupeVehicleRefs(
          refsInRange.map((ref) => ({
            key: ref.key,
            valorCompra: 0,
            segment: ref.segment,
          }))
        );
      }

      for (const ref of refs) {
        const vehicleKey = String(ref.key ?? '').trim();
        if (!vehicleKey) continue;
        const seg = (ref.segment || fallbackSegment) as SegmentKey;
        allVehicles.add(vehicleKey);
        segmentVehicles[seg].add(vehicleKey);
      }
    }

    const frotaAtiva = allVehicles.size;
    const ticket = frotaAtiva > 0 ? faturamento / frotaAtiva : 0;
    const segmentTicket: Record<SegmentKey, number> = {
      PF: segmentVehicles.PF.size > 0 ? segmentFat.PF / segmentVehicles.PF.size : 0,
      PJ: segmentVehicles.PJ.size > 0 ? segmentFat.PJ / segmentVehicles.PJ.size : 0,
      PUBLICO: segmentVehicles.PUBLICO.size > 0 ? segmentFat.PUBLICO / segmentVehicles.PUBLICO.size : 0,
    };
    const segmentFrota: Record<SegmentKey, number> = {
      PF: segmentVehicles.PF.size,
      PJ: segmentVehicles.PJ.size,
      PUBLICO: segmentVehicles.PUBLICO.size,
    };

    return {
      faturamento,
      frotaAtiva,
      ticket,
      segmentFat,
      segmentFrota,
      segmentTicket,
    };
  }, [contractVehiclesByClient, contractsByClient, contractsByPlate, faturamentos, faturamentoItens, selectedYear, vehicleByPlate]);

  const comparisonWindow = useMemo(() => {
    const monthHasData = (idx: number): boolean => {
      const row = dataPrepared.monthly[idx];
      if (!row) return false;
      return (row.faturamentoEmitido ?? 0) > 0 || (row.qtVeiculos ?? 0) > 0 || (row.frotaAtiva ?? 0) > 0;
    };

    const periodMonthIndexes = (() => {
      if (selectedMonthsMulti.length > 0) {
        const indexes = Array.from(new Set(
          selectedMonthsMulti
            .filter((m) => Number.isFinite(m) && m >= 1 && m <= 12)
            .map((m) => m - 1)
        )).sort((a, b) => a - b);
        return indexes.length ? indexes : [0];
      }

      if (selectedMonth > 0) {
        return Array.from({ length: selectedMonth }, (_, i) => i);
      }

      let firstDataIdx = -1;
      let lastDataIdx = -1;
      for (let idx = 0; idx < dataPrepared.monthly.length; idx++) {
        if (!monthHasData(idx)) continue;
        if (firstDataIdx === -1) firstDataIdx = idx;
        lastDataIdx = idx;
      }

      if (firstDataIdx === -1 || lastDataIdx === -1) return [0];
      return Array.from({ length: lastDataIdx - firstDataIdx + 1 }, (_, i) => firstDataIdx + i);
    })();

    const currentMonthIdx = periodMonthIndexes[periodMonthIndexes.length - 1] ?? 0;
    const previousMonthIdx = currentMonthIdx - 1;
    const baseYear = selectedYear ?? new Date().getFullYear();
    const periodMonthLabels = periodMonthIndexes.map((idx) => `${MONTHS[idx]}/${baseYear}`);

    return {
      currentMonthIdx,
      previousMonthIdx,
      periodMonthIndexes,
      periodMonthLabels,
      mesAtualLabel: `${MONTHS[currentMonthIdx]}/${baseYear}`,
      mesAnteriorLabel: previousMonthIdx >= 0
        ? `${MONTHS[previousMonthIdx]}/${baseYear}`
        : `${MONTHS[11]}/${baseYear - 1}`,
    };
  }, [dataPrepared.monthly, selectedMonth, selectedMonthsMulti, selectedYear]);

  const evolucaoMensal = useMemo(() => {
    const monthsInPeriod = comparisonWindow.periodMonthIndexes.map((idx) => {
      const monthRow = dataPrepared.monthly[idx];
      return {
        faturamento: Number(monthRow?.faturamentoEmitido ?? 0),
        frotaAtiva: Number(monthRow?.frotaAtiva ?? 0),
      };
    });

    const frotaAtivaPeriodo = monthsInPeriod.map((m) => m.frotaAtiva);
    const faturamentoPeriodo = monthsInPeriod.map((m) => m.faturamento);
    const ticketPeriodo = monthsInPeriod.map((m) => (m.frotaAtiva > 0 ? m.faturamento / m.frotaAtiva : 0));

    const firstMonthIsJan = comparisonWindow.periodMonthIndexes[0] === 0;
    const firstPrevFrota = firstMonthIsJan ? previousDecember?.frotaAtiva : null;
    const firstPrevFaturamento = firstMonthIsJan ? previousDecember?.faturamento : null;
    const firstPrevTicket = firstMonthIsJan ? previousDecember?.ticket : null;

    const rows: EvolutionMetricRow[] = [
      {
        indicador: 'Frota faturada',
        valuesPeriodo: frotaAtivaPeriodo,
        variacaoPct: getPeriodVariation(frotaAtivaPeriodo),
        variationsMoM: getMoMVariations(frotaAtivaPeriodo, firstPrevFrota),
        kind: 'number',
      },
      {
        indicador: 'Fat. Mensal',
        valuesPeriodo: faturamentoPeriodo,
        variacaoPct: getPeriodVariation(faturamentoPeriodo),
        variationsMoM: getMoMVariations(faturamentoPeriodo, firstPrevFaturamento),
        kind: 'compactCurrency',
      },
      {
        indicador: 'Ticket Médio',
        valuesPeriodo: ticketPeriodo,
        variacaoPct: getPeriodVariation(ticketPeriodo),
        variationsMoM: getMoMVariations(ticketPeriodo, firstPrevTicket),
        kind: 'currency',
      },
    ];

    return {
      periodLabels: comparisonWindow.periodMonthLabels,
      rows,
    };
  }, [comparisonWindow, dataPrepared.monthly, previousDecember]);

  const evolucaoSegmento = useMemo(() => {
    const periodIndexes = comparisonWindow.periodMonthIndexes;
    const firstMonthIsJan = periodIndexes[0] === 0;

    const frotaRows: SegmentEvolutionRow[] = SEGMENTS.map((segment) => {
      const values = periodIndexes.map((idx) => Number(dataPrepared.monthlySegmentFrota[idx]?.[segment.key] ?? 0));
      const firstPrev = firstMonthIsJan ? previousDecember?.segmentFrota[segment.key] : null;
      return {
        segment: segment.key,
        segmentLabel: segment.label,
        label: segment.label,
        color: segment.color,
        valuesPeriodo: values,
        variationsMoM: getMoMVariations(values, firstPrev),
        variacaoPct: getPeriodVariation(values),
        kind: 'number',
      };
    });

    const faturamentoRows: SegmentEvolutionRow[] = SEGMENTS.map((segment) => {
      const values = periodIndexes.map((idx) => Number(dataPrepared.monthlySegmentFaturamento[idx]?.[segment.key] ?? 0));
      const firstPrev = firstMonthIsJan ? previousDecember?.segmentFat[segment.key] : null;
      return {
        segment: segment.key,
        segmentLabel: segment.label,
        label: segment.label,
        color: segment.color,
        valuesPeriodo: values,
        variationsMoM: getMoMVariations(values, firstPrev),
        variacaoPct: getPeriodVariation(values),
        kind: 'compactCurrency',
      };
    });

    const ticketRows: SegmentEvolutionRow[] = SEGMENTS.map((segment) => {
      const values = periodIndexes.map((idx) => Number(dataPrepared.monthlySegmentTicket[idx]?.[segment.key] ?? 0));
      const firstPrev = firstMonthIsJan ? previousDecember?.segmentTicket[segment.key] : null;
      return {
        segment: segment.key,
        segmentLabel: segment.label,
        label: segment.label,
        color: segment.color,
        valuesPeriodo: values,
        variationsMoM: getMoMVariations(values, firstPrev),
        variacaoPct: getPeriodVariation(values),
        kind: 'currency',
      };
    });

    const rows = SEGMENTS.flatMap((segment) => {
      const frota = frotaRows.find((r) => r.segment === segment.key)!;
      const fat = faturamentoRows.find((r) => r.segment === segment.key)!;
      const ticket = ticketRows.find((r) => r.segment === segment.key)!;
      return [
        { ...frota, label: 'Frota faturada' },
        { ...fat, label: 'Fat. Mensal' },
        { ...ticket, label: 'Ticket Médio' },
      ];
    });

    return {
      periodLabels: comparisonWindow.periodMonthLabels,
      rows,
    };
  }, [comparisonWindow.periodMonthIndexes, comparisonWindow.periodMonthLabels, dataPrepared.monthlySegmentFaturamento, dataPrepared.monthlySegmentFrota, dataPrepared.monthlySegmentTicket, previousDecember]);

  const giroContratos = useMemo(() => {
    const monthSet = new Set(comparisonWindow.periodMonthIndexes);

    const inSelectedPeriod = (date: Date | null): boolean => {
      if (!date || selectedYear === null) return false;
      if (date.getFullYear() !== selectedYear) return false;
      if (monthSet.size === 0) return true;
      return monthSet.has(date.getMonth());
    };

    const getStartDate = (row: Row): Date | null => parseDateAny(
      row.DataInicial
      ?? row.dataInicial
      ?? row.DataInicio
      ?? row.Inicio
      ?? row.DataInicioContrato
      ?? null
    );

    const getEndDate = (row: Row): Date | null => parseDateAny(
      row.DataEncerramento
      ?? row.DataFinal
      ?? row.dataFinal
      ?? row.DataTermino
      ?? row.Fim
      ?? row.DataEncerramentoContrato
      ?? null
    );

    const getContractValue = (row: Row): number => parseNumber(
      row.ValorLocacao
      ?? row.VlrLocacao
      ?? row.ValorTotalContrato
      ?? row.ValorContrato
      ?? row.ValorMensal
      ?? row.ValorTotal
      ?? row.valor_total
      ?? 0
    );

    const resolveSegment = (row: Row): SegmentKey => {
      const clientKey = normalizeText(getClientName(row));
      const byClient = contractsByClient.get(clientKey);

      const platePrincipal = normalizePlate(row.PlacaPrincipal ?? row.placaPrincipal ?? row.Placa ?? row.placa);
      const plateReserva = normalizePlate(row.PlacaReserva ?? row.placaReserva);
      const byPlate = contractsByPlate.get(platePrincipal || plateReserva);

      return (byClient || byPlate || segmentFromTipoLocacao(row.TipoLocacao ?? row.TipoDeContrato ?? row.TipoContrato)) as SegmentKey;
    };

    const buildGroup = (rows: Row[]) => {
      const byClient = new Map<string, number>();
      const byType: Record<SegmentKey, { count: number; value: number }> = {
        PF: { count: 0, value: 0 },
        PJ: { count: 0, value: 0 },
        PUBLICO: { count: 0, value: 0 },
      };

      let totalValor = 0;
      for (const row of rows) {
        const seg = resolveSegment(row);
        const value = getContractValue(row);
        const client = getClientName(row).trim() || 'Sem cliente';

        byType[seg].count += 1;
        byType[seg].value += value;
        totalValor += value;
        byClient.set(client, (byClient.get(client) ?? 0) + 1);
      }

      const maxCount = Math.max(...SEGMENTS.map((s) => byType[s.key].count), 0);

      const breakdown = SEGMENTS.map((s) => {
        const count = byType[s.key].count;
        const barPct = maxCount > 0 ? Math.max((count / maxCount) * 100, 8) : 0;
        return {
          segment: s.key,
          label: CONTRACT_TYPE_LABEL[s.key],
          color: s.color,
          count,
          value: byType[s.key].value,
          barPct,
        };
      });

      const topClientes = Array.from(byClient.entries())
        .sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          return a[0].localeCompare(b[0], 'pt-BR');
        })
        .slice(0, 10)
        .map(([cliente, count]) => ({ cliente, count }));

      return {
        totalContratos: rows.length,
        totalValor,
        breakdown,
        topClientes,
      };
    };

    const iniciadosRows = contratos.filter((row) => inSelectedPeriod(getStartDate(row)));
    const encerradosRows = contratos.filter((row) => inSelectedPeriod(getEndDate(row)));

    return {
      periodLabel: comparisonWindow.periodMonthLabels.join(' • '),
      iniciados: buildGroup(iniciadosRows),
      encerrados: buildGroup(encerradosRows),
    };
  }, [comparisonWindow.periodMonthIndexes, comparisonWindow.periodMonthLabels, contractsByClient, contractsByPlate, contratos, selectedYear]);

  const formatEvolutionValue = (value: number, kind: EvolutionMetricKind): string => {
    if (kind === 'number') return fmtNumber(value);
    if (kind === 'compactCurrency') return fmtReadableFaturamento(value);
    return fmtBRL(value);
  };

  const getVariationClass = (value: number | null): string => {
    if (value === null || !Number.isFinite(value)) return 'text-slate-500';
    if (value > 0) return 'text-emerald-600';
    if (value < 0) return 'text-rose-600';
    return 'text-slate-500';
  };

  const getVariationLabel = (value: number | null): string => {
    if (value === null || !Number.isFinite(value)) return '-';
    if (value > 0) return `▲ ${fmtPercent(value)}`;
    if (value < 0) return `▼ ${fmtPercent(Math.abs(value))}`;
    return '0,0%';
  };

  const chartTitle =
    chartTab === 'MENSAL'
      ? 'Evolução Mensal de Faturamento'
      : chartTab === 'SEGMENTO_FAT'
        ? 'Faturamento de Locação por Segmento (Mês a Mês)'
        : 'Ticket Médio por Segmento (Mês a Mês)';

  const chartSubtitle =
    chartTab === 'MENSAL'
      ? 'Três colunas: valor de locação, quantidade de veículos faturados e valor de compra da base de veículos faturados.'
      : chartTab === 'SEGMENTO_FAT'
        ? 'Mesmo padrão mensal, separando PF, PJ e Público para faturamento (clique na barra para filtrar mês+segmento).'
        : 'Mesmo padrão mensal, separando PF, PJ e Público para ticket médio (clique na barra para filtrar mês+segmento).';

  const monthsPerViewport = 6;
  const chartPointCount =
    chartTab === 'MENSAL'
      ? dataPrepared.monthly.length
      : chartTab === 'SEGMENTO_FAT'
        ? dataPrepared.monthlySegmentFaturamento.length
        : dataPrepared.monthlySegmentTicket.length;
  // ajustar espaço por ponto para evitar meses escondidos
  const chartContentWidth = `${Math.max(monthsPerViewport, chartPointCount) * 320}px`;

  const onMonthlyClick = (entry: any) => {
    const payload = entry?.payload ?? entry;
    const monthLabel = String(payload?.mes ?? '');
    const monthIndex = MONTHS.indexOf(monthLabel);
    if (monthIndex < 0) return;
    const monthValue = monthIndex + 1;
    setSelectedMonth((prev) => (prev === monthValue ? 0 : monthValue));
  };

  const onSegmentMonthClick = (entry: any, segment: SegmentKey) => {
    const payload = entry?.payload ?? entry;
    const monthLabel = String(payload?.mes ?? '');
    const monthIndex = MONTHS.indexOf(monthLabel);
    if (monthIndex < 0) return;

    const monthValue = monthIndex + 1;
    const sameSelection = selectedMonth === monthValue && segmentFilter === segment;

    if (sameSelection) {
      setSelectedMonth(0);
      setSegmentFilter('TODOS');
      return;
    }

    setSelectedMonth(monthValue);
    setSegmentFilter(segment);
  };

  const resetVisualFilters = () => {
    setSelectedMonth(0);
    setSegmentFilter('TODOS');
    setSelectedMonthsMulti([]);
    setSelectedSegmentsMulti([]);
  };

  const getSegmentFill = (segment: SegmentKey, idx: number): string => {
    const def = SEGMENTS.find((s) => s.key === segment);
    if (!def) return '#94a3b8';

    const dimBySegment = segmentFilter !== 'TODOS' && segmentFilter !== segment;
    const dimByMonth = selectedMonth !== 0 && selectedMonth !== idx + 1;
    return dimBySegment || dimByMonth ? def.muted : def.color;
  };

  const noteDetailsCount = dataPrepared.noteDetails.length;
  const noteDetailsTotal = dataPrepared.noteDetails.reduce((s, r) => s + Number(r.ValorTotal ?? 0), 0);
  const isUpdatingData = loading || loadingItems || selectedYear === null;
  const hasAnyVisibleData = dataPrepared.monthly.some(
    (row) => Number(row.faturamentoEmitido ?? 0) > 0 || Number(row.qtVeiculos ?? 0) > 0 || Number(row.frotaAtiva ?? 0) > 0
  );
  const hasActiveTopFilters = selectedMonthsMulti.length > 0 || selectedSegmentsMulti.length > 0;

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Dashboard de Faturamento</h2>
          <p className="text-sm text-slate-500">Análise de receita por segmento e performance de ticket médio</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Ano</label>
            <SearchableSelect
              options={years.map(String)}
              value={selectedYear ? [String(selectedYear)] : []}
              onChange={(v) => {
                const next = v[0] ? Number(v[0]) : years[0];
                setSelectedYear(next);
              }}
              placeholder="Todos"
              allLabel="Todos"
              multiple={false}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Mês</label>
            <SearchableSelect
              options={MONTHS}
              value={selectedMonthsMulti.map((m) => MONTHS[m - 1]).filter(Boolean)}
              onChange={(v) => {
                const months = v
                  .map((label) => MONTHS.indexOf(label))
                  .filter((idx) => idx >= 0)
                  .map((idx) => idx + 1);
                setSelectedMonth(0);
                setSelectedMonthsMulti(months);
              }}
              placeholder="Todos"
              allLabel="Todos"
              multiple={true}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Segmento</label>
            <SearchableSelect
              options={['PF', 'PJ', 'Público']}
              value={selectedSegmentsMulti.map((s) => (s === 'PUBLICO' ? 'Público' : s))}
              onChange={(v) => {
                const segments = v.map((label) => (label === 'Público' ? 'PUBLICO' : label as SegmentKey));
                setSelectedSegmentsMulti(segments);
              }}
              placeholder="Todos"
              allLabel="Todos"
              multiple={true}
            />
          </div>

          <div className="flex items-end">
            <button
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={resetVisualFilters}
              type="button"
            >
              Limpar filtros
            </button>
          </div>
        </div>
        {hasActiveTopFilters && (
          <button
            type="button"
            onClick={resetVisualFilters}
            className="mt-3 inline-block text-xs text-indigo-600 hover:underline"
          >
            ✕ Limpar filtros
          </button>
        )}
      </div>

      {isUpdatingData && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Atualizando e calculando os dados do dashboard... Isso pode levar alguns segundos.
        </div>
      )}

      {!isUpdatingData && !hasAnyVisibleData && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Nenhum dado encontrado para os filtros atuais.
        </div>
      )}

      <div className="text-xs text-slate-500">
        Filtros ativos: {selectedMonthsMulti.length === 0 ? 'Todos os meses' : selectedMonthsMulti.map((m) => MONTHS[m - 1]).join(', ')} | {selectedSegmentsMulti.length === 0 ? 'Todos os segmentos' : selectedSegmentsMulti.join(', ')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Faturamento Locação</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{fmtBRL(dataPrepared.faturamentoLocacao)}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Ticket Médio</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{fmtBRL(dataPrepared.ticketMedio)}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Qt Veículos Faturados</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{fmtNumber(dataPrepared.qtdVeiculos)}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{chartTitle}</h3>
              <p className="text-sm text-slate-500">{chartSubtitle}</p>
            </div>

            <div className="inline-flex p-1 rounded-lg bg-slate-100 border">
              <button
                type="button"
                className={`px-3 py-1.5 text-xs rounded-md transition ${chartTab === 'MENSAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setChartTab('MENSAL')}
              >
                Mensal
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs rounded-md transition ${chartTab === 'SEGMENTO_FAT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setChartTab('SEGMENTO_FAT')}
              >
                Faturamento por Segmento
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs rounded-md transition ${chartTab === 'SEGMENTO_TICKET' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setChartTab('SEGMENTO_TICKET')}
              >
                Ticket por Segmento
              </button>
            </div>
          </div>
        </div>

        <div className="h-[360px] overflow-x-auto">
          <div className="h-full min-w-[1080px]" style={{ width: chartContentWidth }}>
            {chartTab === 'MENSAL' && (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dataPrepared.monthly} margin={{ top: 72, right: 16, left: 12, bottom: 0 }} barCategoryGap="1%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" />
                <YAxis yAxisId="brl" tickFormatter={(v) => fmtCompactBRL(Number(v))} />
                <YAxis yAxisId="qtd" orientation="right" tickFormatter={(v) => fmtNumber(Number(v))} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'Quantidade de Veículos') return [fmtNumber(Number(value)), name];
                    return [fmtBRL(Number(value)), name];
                  }}
                />
                <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ top: -8, left: 16 }} />

                <Bar yAxisId="brl" dataKey="faturamentoEmitido" name="Valor de Locação" radius={[6, 6, 0, 0]} onClick={onMonthlyClick} cursor="pointer" minPointSize={2} barSize={110}>
                  {dataPrepared.monthly.map((row, idx) => (
                    <Cell key={`fat-${row.mes}`} fill={selectedMonth !== 0 && selectedMonth !== idx + 1 ? '#94a3b8' : '#0f766e'} />
                  ))}
                  <LabelList dataKey="faturamentoEmitido" position="top" formatter={(v: number) => fmtCompactBRL(Number(v))} fontSize={12} />
                </Bar>

                <Bar yAxisId="qtd" dataKey="qtVeiculos" name="Quantidade de Veículos" radius={[6, 6, 0, 0]} onClick={onMonthlyClick} cursor="pointer" minPointSize={2} barSize={110}>
                  {dataPrepared.monthly.map((row, idx) => (
                    <Cell key={`qtd-${row.mes}`} fill={selectedMonth !== 0 && selectedMonth !== idx + 1 ? '#fcd9b6' : '#fb923c'} />
                  ))}
                  <LabelList dataKey="qtVeiculos" position="top" formatter={(v: number) => fmtNumber(Number(v))} fontSize={12} />
                </Bar>

                <Bar yAxisId="brl" dataKey="valorCompra" name="Valor de Compra" radius={[6, 6, 0, 0]} onClick={onMonthlyClick} cursor="pointer" minPointSize={2} barSize={110}>
                  {dataPrepared.monthly.map((row, idx) => (
                    <Cell key={`compra-${row.mes}`} fill={selectedMonth !== 0 && selectedMonth !== idx + 1 ? '#bfdbfe' : '#2563eb'} />
                  ))}
                  <LabelList dataKey="valorCompra" position="top" formatter={(v: number) => fmtCompactBRL(Number(v))} fontSize={12} />
                </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            )}

            {chartTab === 'SEGMENTO_FAT' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataPrepared.monthlySegmentFaturamento} margin={{ top: 72, right: 16, left: 12, bottom: 0 }} barCategoryGap="1%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(v) => fmtCompactBRL(Number(v))} />
                <Tooltip formatter={(value: number) => fmtBRL(Number(value))} />
                <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ top: -8, left: 16 }} />

                <Bar dataKey="PF" name="PF" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(entry) => onSegmentMonthClick(entry, 'PF')} barSize={48}>
                  {dataPrepared.monthlySegmentFaturamento.map((row, idx) => (
                    <Cell key={`fat-pf-${row.mes}`} fill={getSegmentFill('PF', idx)} />
                  ))}
                  <LabelList dataKey="PF" position="top" formatter={(v: number) => fmtCompactBRL(Number(v))} fontSize={12} />
                </Bar>

                <Bar dataKey="PJ" name="PJ" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(entry) => onSegmentMonthClick(entry, 'PJ')} barSize={48}>
                  {dataPrepared.monthlySegmentFaturamento.map((row, idx) => (
                    <Cell key={`fat-pj-${row.mes}`} fill={getSegmentFill('PJ', idx)} />
                  ))}
                  <LabelList dataKey="PJ" position="top" formatter={(v: number) => fmtCompactBRL(Number(v))} fontSize={12} />
                </Bar>

                <Bar dataKey="PUBLICO" name="Público" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(entry) => onSegmentMonthClick(entry, 'PUBLICO')} barSize={48}>
                  {dataPrepared.monthlySegmentFaturamento.map((row, idx) => (
                    <Cell key={`fat-pub-${row.mes}`} fill={getSegmentFill('PUBLICO', idx)} />
                  ))}
                  <LabelList dataKey="PUBLICO" position="top" formatter={(v: number) => fmtCompactBRL(Number(v))} fontSize={12} />
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartTab === 'SEGMENTO_TICKET' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataPrepared.monthlySegmentTicket} margin={{ top: 72, right: 16, left: 12, bottom: 0 }} barCategoryGap="1%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(v) => fmtCompactBRL(Number(v))} />
                <Tooltip formatter={(value: number) => fmtBRL(Number(value))} />
                <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ top: -8, left: 16 }} />

                <Bar dataKey="PF" name="PF" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(entry) => onSegmentMonthClick(entry, 'PF')} barSize={48}>
                  {dataPrepared.monthlySegmentTicket.map((row, idx) => (
                    <Cell key={`tick-pf-${row.mes}`} fill={getSegmentFill('PF', idx)} />
                  ))}
                  <LabelList dataKey="PF" position="top" formatter={(v: number) => fmtCompactBRL(Number(v))} fontSize={12} />
                </Bar>

                <Bar dataKey="PJ" name="PJ" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(entry) => onSegmentMonthClick(entry, 'PJ')} barSize={48}>
                  {dataPrepared.monthlySegmentTicket.map((row, idx) => (
                    <Cell key={`tick-pj-${row.mes}`} fill={getSegmentFill('PJ', idx)} />
                  ))}
                  <LabelList dataKey="PJ" position="top" formatter={(v: number) => fmtCompactBRL(Number(v))} fontSize={12} />
                </Bar>

                <Bar dataKey="PUBLICO" name="Público" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(entry) => onSegmentMonthClick(entry, 'PUBLICO')} barSize={48}>
                  {dataPrepared.monthlySegmentTicket.map((row, idx) => (
                    <Cell key={`tick-pub-${row.mes}`} fill={getSegmentFill('PUBLICO', idx)} />
                  ))}
                  <LabelList dataKey="PUBLICO" position="top" formatter={(v: number) => fmtCompactBRL(Number(v))} fontSize={12} />
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <div className="overflow-auto border rounded-lg">
            {chartTab === 'MENSAL' && (
              <table className="min-w-full table-auto text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Mês</th>
                    <th className="px-3 py-2 text-right">Valor de Locação</th>
                    <th className="px-3 py-2 text-right">Qtde Veículos</th>
                    <th className="px-3 py-2 text-right">Valor de Compra</th>
                  </tr>
                </thead>
                <tbody>
                  {dataPrepared.monthly.map((row, idx) => (
                    <tr
                      key={row.mes}
                      className={`odd:bg-white even:bg-slate-50/60 cursor-pointer ${selectedMonth === idx + 1 ? 'bg-emerald-50' : ''}`}
                      onClick={() => setSelectedMonth((prev) => (prev === idx + 1 ? 0 : idx + 1))}
                    >
                      <td className="px-3 py-2">{row.mes}</td>
                      <td className="px-3 py-2 text-right">{fmtBRL(row.faturamentoEmitido)}</td>
                      <td className="px-3 py-2 text-right">{fmtNumber(row.qtVeiculos)}</td>
                      <td className="px-3 py-2 text-right">{fmtBRL(row.valorCompra)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {chartTab === 'SEGMENTO_FAT' && (
              <table className="min-w-full table-auto text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Mês</th>
                    <th className="px-3 py-2 text-right text-teal-700">PF</th>
                    <th className="px-3 py-2 text-right text-orange-600">PJ</th>
                    <th className="px-3 py-2 text-right text-blue-700">Público</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dataPrepared.monthlySegmentFaturamento.map((row, idx) => {
                    const total = Number(row.PF ?? 0) + Number(row.PJ ?? 0) + Number(row.PUBLICO ?? 0);
                    return (
                      <tr
                        key={`seg-fat-${row.mes}`}
                        className={`odd:bg-white even:bg-slate-50/60 cursor-pointer ${selectedMonth === idx + 1 ? 'bg-emerald-50' : ''}`}
                        onClick={() => setSelectedMonth((prev) => (prev === idx + 1 ? 0 : idx + 1))}
                      >
                        <td className="px-3 py-2">{row.mes}</td>
                        <td className="px-3 py-2 text-right">{fmtBRL(Number(row.PF ?? 0))}</td>
                        <td className="px-3 py-2 text-right">{fmtBRL(Number(row.PJ ?? 0))}</td>
                        <td className="px-3 py-2 text-right">{fmtBRL(Number(row.PUBLICO ?? 0))}</td>
                        <td className="px-3 py-2 text-right font-semibold">{fmtBRL(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {chartTab === 'SEGMENTO_TICKET' && (
              <table className="min-w-full table-auto text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Mês</th>
                    <th className="px-3 py-2 text-right text-teal-700">PF</th>
                    <th className="px-3 py-2 text-right text-orange-600">PJ</th>
                    <th className="px-3 py-2 text-right text-blue-700">Público</th>
                    <th className="px-3 py-2 text-right">Ticket Geral</th>
                  </tr>
                </thead>
                <tbody>
                  {dataPrepared.monthlySegmentTicket.map((row, idx) => {
                    const monthBase = dataPrepared.monthly[idx];
                    const ticketGeral = Number(monthBase?.qtVeiculos ?? 0) > 0
                      ? Number(monthBase?.faturamentoEmitido ?? 0) / Number(monthBase?.qtVeiculos ?? 0)
                      : 0;
                    return (
                      <tr
                        key={`seg-ticket-${row.mes}`}
                        className={`odd:bg-white even:bg-slate-50/60 cursor-pointer ${selectedMonth === idx + 1 ? 'bg-emerald-50' : ''}`}
                        onClick={() => setSelectedMonth((prev) => (prev === idx + 1 ? 0 : idx + 1))}
                      >
                        <td className="px-3 py-2">{row.mes}</td>
                        <td className="px-3 py-2 text-right">{fmtBRL(Number(row.PF ?? 0))}</td>
                        <td className="px-3 py-2 text-right">{fmtBRL(Number(row.PJ ?? 0))}</td>
                        <td className="px-3 py-2 text-right">{fmtBRL(Number(row.PUBLICO ?? 0))}</td>
                        <td className="px-3 py-2 text-right font-semibold">{fmtBRL(ticketGeral)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="border rounded-lg p-3 bg-slate-50/70">
            <div className="mb-2">
              <h4 className="text-sm font-semibold text-slate-900">Tabela de Evolução</h4>
              <p className="text-xs text-slate-500">Exibe os meses do período selecionado e a variação do período.</p>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full table-auto text-sm">
                <thead className="bg-white">
                  <tr>
                    <th className="px-3 py-2 text-left">Indicador</th>
                    {evolucaoMensal.periodLabels.map((label, idx) => (
                      <Fragment key={`headers-${label}-${idx}`}>
                        <th className="px-3 py-2 text-right">{label}</th>
                        <th className="px-3 py-2 text-right text-xs font-normal text-slate-400">Var %</th>
                      </Fragment>
                    ))}
                    <th className="px-3 py-2 text-right">Var % Período</th>
                  </tr>
                </thead>
                <tbody>
                  {evolucaoMensal.rows.map((row) => (
                    <tr key={row.indicador} className="odd:bg-white even:bg-slate-50/70">
                      <td className="px-3 py-2 font-medium text-slate-700">{row.indicador}</td>
                      {row.valuesPeriodo.map((value, idx) => (
                        <Fragment key={`${row.indicador}-${idx}`}>
                          <td className="px-3 py-2 text-right">{formatEvolutionValue(value, row.kind)}</td>
                          <td className={`px-3 py-2 text-right text-xs ${getVariationClass(row.variationsMoM[idx])}`}>
                            {getVariationLabel(row.variationsMoM[idx])}
                          </td>
                        </Fragment>
                      ))}
                      <td className={`px-3 py-2 text-right font-semibold ${getVariationClass(row.variacaoPct)}`}>
                        {getVariationLabel(row.variacaoPct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-500">Visualização em janela de 6 meses com rolagem horizontal. Clique nas barras ou nos meses da tabela para filtrar, no estilo Power BI.</p>
      </div>

      <div className="bg-white border rounded-xl p-3 space-y-4">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-slate-900">Tabela de Evolução por Segmento</h3>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            {SEGMENTS.map((segment) => (
              <span key={`legend-${segment.key}`} className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                {segment.label}
              </span>
            ))}
          </div>
        </div>

        <section className="space-y-2">
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full table-auto text-sm">
              <thead className="bg-white">
                <tr>
                  <th className="px-3 py-2 text-left">Indicador</th>
                  {evolucaoSegmento.periodLabels.map((label, idx) => (
                    <Fragment key={`seg-head-${label}-${idx}`}>
                      <th className="px-3 py-2 text-right">{label}</th>
                      <th className="px-3 py-2 text-right text-xs font-normal text-slate-400">Var %</th>
                    </Fragment>
                  ))}
                  <th className="px-3 py-2 text-right">Var % Período</th>
                </tr>
              </thead>
              <tbody>
                {evolucaoSegmento.rows.map((row, idx) => (
                  <Fragment key={`seg-frag-${row.segment}-${idx}`}>
                    {idx % 3 === 0 && (
                      <tr className="bg-slate-100/80 border-y border-slate-300">
                        <td className="px-3 py-2 font-semibold" style={{ color: row.color }} colSpan={1 + (evolucaoSegmento.periodLabels.length * 2) + 1}>
                          {row.segmentLabel}
                        </td>
                      </tr>
                    )}
                    <tr className="odd:bg-white even:bg-slate-50/70">
                      <td className="px-3 py-2 font-medium text-slate-700">{row.label}</td>
                      {row.valuesPeriodo.map((value, valueIdx) => (
                        <Fragment key={`seg-row-${row.segment}-${idx}-${valueIdx}`}>
                          <td className="px-3 py-2 text-right">{formatEvolutionValue(value, row.kind)}</td>
                          <td className={`px-3 py-2 text-right text-xs ${getVariationClass(row.variationsMoM[valueIdx])}`}>
                            {getVariationLabel(row.variationsMoM[valueIdx])}
                          </td>
                        </Fragment>
                      ))}
                      <td className={`px-3 py-2 text-right font-semibold ${getVariationClass(row.variacaoPct)}`}>
                        {getVariationLabel(row.variacaoPct)}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">DETALHAMENTO: GIRO DE CONTRATOS</h3>
          <p className="text-xs text-slate-500">Período: {giroContratos.periodLabel || 'Sem período selecionado'}</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl border overflow-hidden bg-white">
            <div className="px-4 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              <p className="text-xs font-semibold tracking-wide">INICIADOS</p>
              <p className="text-3xl font-bold leading-tight mt-1">{fmtNumber(giroContratos.iniciados.totalContratos)}</p>
              <p className="text-sm mt-1 opacity-95">Valor Financeiro Total: {fmtBRL(giroContratos.iniciados.totalValor)}</p>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Tipo de Contrato</p>
                <div className="space-y-2">
                  {giroContratos.iniciados.breakdown.map((item) => (
                    <div key={`ini-type-${item.segment}`}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-700">{item.label} ({fmtNumber(item.count)})</span>
                        <span className="text-slate-500">{fmtReadableFaturamento(item.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.barPct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Top 10 Clientes</p>
                <div className="space-y-1.5">
                  {giroContratos.iniciados.topClientes.length === 0 && (
                    <p className="text-xs text-slate-500">Sem contratos iniciados para o período selecionado.</p>
                  )}
                  {giroContratos.iniciados.topClientes.map((item, idx) => (
                    <div key={`ini-client-${item.cliente}-${idx}`} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 truncate pr-3">{idx + 1}. {item.cliente}</span>
                      <span className="text-slate-900 font-semibold">{fmtNumber(item.count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden bg-white">
            <div className="px-4 py-4 bg-gradient-to-r from-indigo-700 to-slate-900 text-white">
              <p className="text-xs font-semibold tracking-wide">ENCERRADOS</p>
              <p className="text-3xl font-bold leading-tight mt-1">{fmtNumber(giroContratos.encerrados.totalContratos)}</p>
              <p className="text-sm mt-1 opacity-95">Valor Financeiro Total: {fmtBRL(giroContratos.encerrados.totalValor)}</p>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Tipo de Contrato</p>
                <div className="space-y-2">
                  {giroContratos.encerrados.breakdown.map((item) => (
                    <div key={`end-type-${item.segment}`}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-700">{item.label} ({fmtNumber(item.count)})</span>
                        <span className="text-slate-500">{fmtReadableFaturamento(item.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.barPct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Top 10 Clientes</p>
                <div className="space-y-1.5">
                  {giroContratos.encerrados.topClientes.length === 0 && (
                    <p className="text-xs text-slate-500">Sem contratos encerrados para o período selecionado.</p>
                  )}
                  {giroContratos.encerrados.topClientes.map((item, idx) => (
                    <div key={`end-client-${item.cliente}-${idx}`} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 truncate pr-3">{idx + 1}. {item.cliente}</span>
                      <span className="text-slate-900 font-semibold">{fmtNumber(item.count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Detalhamento de Notas</h3>
            <p className="text-sm text-slate-500">Tabela filtrada por ano, mês e segmento selecionados.</p>
          </div>
          <div className="text-sm text-slate-600 font-medium">{fmtNumber(noteDetailsCount)} notas • {fmtBRL(noteDetailsTotal)}</div>
        </div>

        <div className="overflow-auto border rounded-lg max-h-[420px]">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-right">#</th>
                <th className="px-3 py-2 text-left">IdNota</th>
                <th className="px-3 py-2 text-left">Nota</th>
                <th className="px-3 py-2 text-left">Emissão</th>
                <th className="px-3 py-2 text-left">Competência</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-right">ValorTotal</th>
              </tr>
            </thead>
            <tbody>
              {dataPrepared.noteDetails.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">Sem notas para os filtros atuais.</td>
                </tr>
              )}

              {dataPrepared.noteDetails.map((note, idx) => (
                <tr key={`${note.IdNota}-${note.Nota}`} className="odd:bg-white even:bg-slate-50/60">
                  <td className="px-3 py-2 text-right text-slate-500">{idx + 1}</td>
                  <td className="px-3 py-2">{note.IdNota || '-'}</td>
                  <td className="px-3 py-2">{note.Nota || '-'}</td>
                  <td className="px-3 py-2">{note.Emissao ? fmtDateBR(note.Emissao) : '-'}</td>
                  <td className="px-3 py-2">{note.Competencia ? fmtDateBR(note.Competencia) : '-'}</td>
                  <td className="px-3 py-2">{note.Cliente || '-'}</td>
                  <td className="px-3 py-2 text-right">{fmtBRL(note.ValorTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t border-slate-200">
              <tr>
                <td colSpan={5} className="px-3 py-2 text-sm font-semibold text-slate-700">Totalizador</td>
                <td className="px-3 py-2 text-right text-sm font-semibold text-slate-700">{fmtNumber(noteDetailsCount)} notas</td>
                <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">{fmtBRL(noteDetailsTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {(loading || loadingItems) && <div className="text-sm text-slate-500">Carregando dados de faturamento...</div>}
      {(error || errorItems) && <div className="text-sm text-red-600">Erro ao carregar dados de faturamento.</div>}
    </div>
  );
}
