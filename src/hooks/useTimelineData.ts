import { useMemo } from 'react';
import useBIDataBatch from '@/hooks/useBIDataBatch';

export interface TimelineAggregated {
  Placa: string;
  data_compra: string | null;
  data_venda: string | null;
  qtd_locacoes: number;
  qtd_manutencoes: number;
  qtd_sinistros: number;
  total_eventos: number;
  primeiro_evento: string | null;
  ultimo_evento: string | null;
  dias_vida: number | null;
  Modelo?: string;
  Montadora?: string;
  Status?: string;
  ValorAquisicao?: number;
  KmAtual?: number;
}

export interface TimelineEvent {
  Placa: string;
  TipoEvento: string;
  DataEvento: string;
  Detalhe1?: string;
  Detalhe2?: string;
  ValorEvento?: number;
}

type TimelineMode = 'aggregated' | 'recent' | 'vehicle';

interface UseTimelineDataResult<T> {
  data: T[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const TIMELINE_TABLES = [
  'fat_manutencao_unificado',
  'fat_carro_reserva',
  'fat_multas',
  'fat_sinistros',
  'dim_movimentacao_veiculos',
  'dim_movimentacao_patios',
] as const;

function normalizePlaca(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase();
}

function toDate(raw: unknown): Date | null {
  if (!raw) return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(raw: unknown): string | null {
  const d = toDate(raw);
  return d ? d.toISOString() : null;
}

function toNumber(raw: unknown): number | undefined {
  const n = Number(raw ?? NaN);
  return Number.isFinite(n) ? n : undefined;
}

function eventFromRow(row: Record<string, unknown>, tipo: string): TimelineEvent | null {
  const placa = normalizePlaca(row.Placa ?? row.placa);
  if (!placa) return null;

  const dataEvento =
    toIso(row.DataEvento) ||
    toIso(row.DataOcorrencia) ||
    toIso(row.DataSinistro) ||
    toIso(row.DataInfracao) ||
    toIso(row.DataEntrada) ||
    toIso(row.DataSaida) ||
    toIso(row.DataCriacaoOcorrencia) ||
    toIso(row.UltimaAtualizacao) ||
    toIso(row.ultimaatualizacao);

  if (!dataEvento) return null;

  return {
    Placa: placa,
    TipoEvento: tipo,
    DataEvento: dataEvento,
    Detalhe1: String(row.Tipo ?? row.TipoOcorrencia ?? row.Status ?? row.Situacao ?? '').trim() || undefined,
    Detalhe2: String(row.Descricao ?? row.Observacao ?? row.Origem ?? row.Patio ?? '').trim() || undefined,
    ValorEvento: toNumber(row.ValorTotal ?? row.ValorSinistro ?? row.ValorMulta ?? row.CustoTotalOS ?? row.Valor),
  };
}

function readTableRows(results: Record<string, unknown>, table: string): Record<string, unknown>[] {
  const entry = results[table] as { data?: unknown[] } | undefined;
  return Array.isArray(entry?.data) ? (entry.data as Record<string, unknown>[]) : [];
}

function mapRowsToEvents(results: Record<string, unknown>): TimelineEvent[] {
  const eventos: TimelineEvent[] = [];

  const manut = readTableRows(results, 'fat_manutencao_unificado');
  const reserva = readTableRows(results, 'fat_carro_reserva');
  const multas = readTableRows(results, 'fat_multas');
  const sinistros = readTableRows(results, 'fat_sinistros');
  const movVeiculos = readTableRows(results, 'dim_movimentacao_veiculos');
  const movPatios = readTableRows(results, 'dim_movimentacao_patios');

  for (const row of manut) {
    const ev = eventFromRow(row, 'MANUTENCAO');
    if (ev) eventos.push(ev);
  }
  for (const row of reserva) {
    const ev = eventFromRow(row, 'CARRO_RESERVA');
    if (ev) eventos.push(ev);
  }
  for (const row of multas) {
    const ev = eventFromRow(row, 'MULTA');
    if (ev) eventos.push(ev);
  }
  for (const row of sinistros) {
    const ev = eventFromRow(row, 'SINISTRO');
    if (ev) eventos.push(ev);
  }
  for (const row of movVeiculos) {
    const ev = eventFromRow(row, 'MOVIMENTACAO_VEICULO');
    if (ev) eventos.push(ev);
  }
  for (const row of movPatios) {
    const ev = eventFromRow(row, 'MOVIMENTACAO_PATIO');
    if (ev) eventos.push(ev);
  }

  eventos.sort((a, b) => new Date(b.DataEvento).getTime() - new Date(a.DataEvento).getTime());
  return eventos;
}

function aggregateTimeline(events: TimelineEvent[]): TimelineAggregated[] {
  const byPlaca = new Map<string, TimelineAggregated>();

  for (const ev of events) {
    const placa = ev.Placa;
    const current = byPlaca.get(placa) ?? {
      Placa: placa,
      data_compra: null,
      data_venda: null,
      qtd_locacoes: 0,
      qtd_manutencoes: 0,
      qtd_sinistros: 0,
      total_eventos: 0,
      primeiro_evento: null,
      ultimo_evento: null,
      dias_vida: null,
    };

    current.total_eventos += 1;
    if (ev.TipoEvento === 'CARRO_RESERVA') current.qtd_locacoes += 1;
    if (ev.TipoEvento === 'MANUTENCAO') current.qtd_manutencoes += 1;
    if (ev.TipoEvento === 'SINISTRO') current.qtd_sinistros += 1;

    const t = new Date(ev.DataEvento).getTime();
    const firstTs = current.primeiro_evento ? new Date(current.primeiro_evento).getTime() : null;
    const lastTs = current.ultimo_evento ? new Date(current.ultimo_evento).getTime() : null;

    if (firstTs == null || t < firstTs) current.primeiro_evento = ev.DataEvento;
    if (lastTs == null || t > lastTs) current.ultimo_evento = ev.DataEvento;

    if (current.primeiro_evento && current.ultimo_evento) {
      const diffMs = new Date(current.ultimo_evento).getTime() - new Date(current.primeiro_evento).getTime();
      current.dias_vida = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }

    byPlaca.set(placa, current);
  }

  return Array.from(byPlaca.values()).sort((a, b) => b.total_eventos - a.total_eventos);
}

export function useTimelineData<T = TimelineAggregated>(
  mode: TimelineMode = 'aggregated',
  placa?: string,
  options?: { enabled?: boolean }
): UseTimelineDataResult<T> {
  const enabled = options?.enabled ?? true;
  const { results, loading, error, refetch } = useBIDataBatch(
    [...TIMELINE_TABLES],
    undefined,
    { enabled, staleTime: 5 * 60 * 1000 }
  );

  const data = useMemo(() => {
    if (!enabled) return [] as T[];

    const allEvents = mapRowsToEvents(results as Record<string, unknown>);
    const filteredEvents = placa
      ? allEvents.filter((ev) => normalizePlaca(ev.Placa) === normalizePlaca(placa))
      : allEvents;

    if (mode === 'aggregated') {
      return aggregateTimeline(filteredEvents) as T[];
    }

    return filteredEvents as T[];
  }, [results, mode, placa, enabled]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
