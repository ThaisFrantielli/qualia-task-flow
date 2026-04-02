import type { DateRange } from 'react-day-picker';

export type LifecycleView = 'iniciados' | 'encerrados';
export type TemporalGranularity = 'mensal' | 'anual';

export interface NormalizedContractLifecycle {
  id: string;
  cliente: string;
  placa: string;
  situacao: string;
  valorLocacao: number;
  dataInicio: Date | null;
  dataFimEfetiva: Date | null;
  raw: AnyRecord;
}

export interface LifecycleFilters {
  dateRange?: DateRange;
  cliente?: string;
  placa?: string;
  situacao?: string;
}

export interface LifecycleSeriesRow {
  key: string;
  label: string;
  contratos: number;
  valorLocacao: number;
  ticketMedio: number;
}

interface LifecycleKPIs {
  quantidade: number;
  valorTotal: number;
  ticketMedio: number;
  variacaoPercentual: number;
  previousQuantidade: number;
  previousValorTotal: number;
  previousTicketMedio: number;
}

type AnyRecord = Record<string, unknown>;

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) {
    const [d, m, y] = raw.split('/').map(Number);
    const parsed = new Date(y, m - 1, d);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseMoney(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const raw = String(value ?? '').trim();
  if (!raw) return 0;

  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');

  if (hasComma && hasDot) {
    const parsed = Number.parseFloat(raw.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (hasComma) {
    const parsed = Number.parseFloat(raw.replace(',', '.').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number.parseFloat(raw.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getString(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return '';
}

function normalizedValueOrAll(value?: string): string {
  return (value ?? 'Todos').trim() || 'Todos';
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function normalizeContractsLifecycle(rows: AnyRecord[]): NormalizedContractLifecycle[] {
  return rows.map((row, index) => {
    const dataInicio = parseDate(row.DataInicial ?? row.DataInicio ?? row.datainicio);
    const dataFinal = parseDate(row.DataFinal ?? row.DataFim ?? row.DataTermino ?? row.datafim);
    const dataEncerramento = parseDate(row.DataEncerramento ?? row.dataencerramento);

    const valorLocacao = [
      parseMoney(row.ValorLocacao),
      parseMoney(row.UltimoValorLocacao),
      parseMoney(row.valorlocacao),
    ].find((n) => n > 0) ?? 0;

    const id = getString(
      row.IdContratoLocacao,
      row.idcontratolocacao,
      row.ContratoLocacao,
      row.ContratoComercial,
      row.Id,
      String(index + 1),
    );

    return {
      id,
      cliente: getString(row.NomeCliente, row.Cliente, row.RazaoSocial, row.nomecliente, row.cliente) || 'Não informado',
      placa: getString(row.PlacaPrincipal, row.Placa, row.placa, row.placaprincipal) || 'Sem placa',
      situacao: getString(row.SituacaoContratoLocacao, row.Status, row.situacaocontratolocacao) || 'Não informado',
      valorLocacao,
      dataInicio,
      dataFimEfetiva: dataFinal ?? dataEncerramento,
      raw: row,
    };
  });
}

export function getReferenceDate(contract: NormalizedContractLifecycle, view: LifecycleView): Date | null {
  return view === 'iniciados' ? contract.dataInicio : contract.dataFimEfetiva;
}

export function buildDefaultDateRange(): DateRange {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const to = endOfDay(now);
  return { from, to };
}

export function applyLifecycleFilters(
  contracts: NormalizedContractLifecycle[],
  view: LifecycleView,
  filters: LifecycleFilters,
): NormalizedContractLifecycle[] {
  const dateRange = filters.dateRange;
  const from = dateRange?.from ? startOfDay(dateRange.from) : null;
  const to = dateRange?.to ? endOfDay(dateRange.to) : null;

  const cliente = normalizedValueOrAll(filters.cliente);
  const placa = normalizedValueOrAll(filters.placa);
  const situacao = normalizedValueOrAll(filters.situacao);

  return contracts.filter((contract) => {
    const refDate = getReferenceDate(contract, view);
    if (!refDate) return false;

    if (from && refDate < from) return false;
    if (to && refDate > to) return false;

    if (cliente !== 'Todos' && contract.cliente !== cliente) return false;
    if (placa !== 'Todos' && contract.placa !== placa) return false;
    if (situacao !== 'Todos' && contract.situacao !== situacao) return false;

    return true;
  });
}

function getRangeOrDefault(range?: DateRange): { from: Date; to: Date } {
  const fallback = buildDefaultDateRange();
  const from = range?.from ? startOfDay(range.from) : (fallback.from as Date);
  const to = range?.to ? endOfDay(range.to) : (fallback.to as Date);
  return { from, to };
}

function getPreviousRange(range?: DateRange): DateRange {
  const current = getRangeOrDefault(range);
  const span = current.to.getTime() - current.from.getTime() + 1;
  const previousTo = new Date(current.from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - (span - 1));
  return { from: previousFrom, to: previousTo };
}

function periodKey(date: Date, granularity: TemporalGranularity): string {
  if (granularity === 'anual') return String(date.getFullYear());
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function periodLabel(date: Date, granularity: TemporalGranularity): string {
  if (granularity === 'anual') return String(date.getFullYear());
  return `${MONTHS_SHORT[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`;
}

function periodSortKey(key: string, granularity: TemporalGranularity): number {
  if (granularity === 'anual') return Number.parseInt(key, 10);
  const [year, month] = key.split('-').map(Number);
  return year * 100 + month;
}

export function buildLifecycleSeries(
  contracts: NormalizedContractLifecycle[],
  view: LifecycleView,
  granularity: TemporalGranularity,
): LifecycleSeriesRow[] {
  const grouped = new Map<string, { label: string; contratos: number; valorLocacao: number }>();

  for (const contract of contracts) {
    const refDate = getReferenceDate(contract, view);
    if (!refDate) continue;

    const key = periodKey(refDate, granularity);
    const label = periodLabel(refDate, granularity);
    const prev = grouped.get(key);

    if (!prev) {
      grouped.set(key, {
        label,
        contratos: 1,
        valorLocacao: contract.valorLocacao,
      });
      continue;
    }

    prev.contratos += 1;
    prev.valorLocacao += contract.valorLocacao;
  }

  return Array.from(grouped.entries())
    .sort((a, b) => periodSortKey(a[0], granularity) - periodSortKey(b[0], granularity))
    .map(([key, value]) => ({
      key,
      label: value.label,
      contratos: value.contratos,
      valorLocacao: value.valorLocacao,
      ticketMedio: value.contratos > 0 ? value.valorLocacao / value.contratos : 0,
    }));
}

export function computeLifecycleKPIs(
  contracts: NormalizedContractLifecycle[],
  view: LifecycleView,
  filters: LifecycleFilters,
): LifecycleKPIs {
  const currentRows = applyLifecycleFilters(contracts, view, filters);
  const previousRows = applyLifecycleFilters(contracts, view, {
    ...filters,
    dateRange: getPreviousRange(filters.dateRange),
  });

  const quantidade = currentRows.length;
  const valorTotal = currentRows.reduce((sum, row) => sum + row.valorLocacao, 0);
  const ticketMedio = quantidade > 0 ? valorTotal / quantidade : 0;

  const previousQuantidade = previousRows.length;
  const previousValorTotal = previousRows.reduce((sum, row) => sum + row.valorLocacao, 0);
  const previousTicketMedio = previousQuantidade > 0 ? previousValorTotal / previousQuantidade : 0;

  const variacaoPercentual = previousQuantidade > 0
    ? ((quantidade - previousQuantidade) / previousQuantidade) * 100
    : quantidade > 0
      ? 100
      : 0;

  return {
    quantidade,
    valorTotal,
    ticketMedio,
    variacaoPercentual,
    previousQuantidade,
    previousValorTotal,
    previousTicketMedio,
  };
}

export function buildTopClients(
  contracts: NormalizedContractLifecycle[],
): Array<{ name: string; value: number }> {
  const grouped = new Map<string, number>();

  for (const row of contracts) {
    grouped.set(row.cliente, (grouped.get(row.cliente) ?? 0) + row.valorLocacao);
  }

  return Array.from(grouped.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function buildStatusDistribution(
  contracts: NormalizedContractLifecycle[],
): Array<{ name: string; value: number }> {
  const grouped = new Map<string, number>();

  for (const row of contracts) {
    grouped.set(row.situacao, (grouped.get(row.situacao) ?? 0) + 1);
  }

  return Array.from(grouped.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
