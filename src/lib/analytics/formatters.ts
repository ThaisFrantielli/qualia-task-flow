/**
 * Utilitários de formatação para Analytics
 * Centraliza todas as funções de formatação usadas nos dashboards
 */

// ============= NÚMEROS =============

export function parseNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    return parseFloat(v.replace(/[^0-9.-]/g, '')) || 0;
  }
  return 0;
}

export function parseCurrency(v: unknown): number {
  return parseNum(v);
}

// ============= MOEDA =============

export function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(v);
}

export function fmtCompact(v: number): string {
  if (v >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

export function fmtCompactNumber(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return v.toFixed(0);
}

// ============= DECIMAIS =============

export function fmtDecimal(v: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
}

export function fmtPercent(v: number, decimals: number = 1): string {
  return `${v.toFixed(decimals)}%`;
}

export function fmtInteger(v: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(v));
}

// ============= DATAS =============

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function getMonthKey(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getYearKey(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return String(date.getFullYear());
}

export function getDayKey(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

export function monthLabel(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  if (!y || !m) return '';
  return `${MONTHS_SHORT[Number(m) - 1]}/${String(y).slice(2)}`;
}

export function monthLabelFull(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  if (!y || !m) return '';
  return `${MONTHS_FULL[Number(m) - 1]} ${y}`;
}

export function yearLabel(year: string | number): string {
  return String(year);
}

export function dayLabel(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function fmtDate(d: string | Date | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

export function fmtDateTime(d: string | Date | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

// ============= TEMPO =============

export function fmtDuration(days: number): string {
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}m`;
  return `${(days / 365).toFixed(1)}a`;
}

export function fmtDurationHours(hours: number): string {
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

// ============= DELTA/VARIAÇÃO =============

export function fmtDelta(current: number, previous: number, format: 'percent' | 'absolute' = 'percent'): string {
  if (previous === 0) return current > 0 ? '+∞' : '0%';
  const delta = format === 'percent' 
    ? ((current - previous) / previous) * 100
    : current - previous;
  const prefix = delta > 0 ? '+' : '';
  return format === 'percent' 
    ? `${prefix}${delta.toFixed(1)}%`
    : `${prefix}${fmtCompact(delta)}`;
}

export function getDeltaColor(delta: number, invertColors: boolean = false): string {
  if (delta === 0) return 'text-muted-foreground';
  if (invertColors) {
    return delta > 0 ? 'text-destructive' : 'text-emerald-600';
  }
  return delta > 0 ? 'text-emerald-600' : 'text-destructive';
}

// ============= SEMÁFORO =============

export type SemaphoreLevel = 'success' | 'warning' | 'error' | 'neutral';

export function getSemaphoreLevel(
  value: number,
  thresholds: { success: number; warning: number },
  higherIsBetter: boolean = true
): SemaphoreLevel {
  if (higherIsBetter) {
    if (value >= thresholds.success) return 'success';
    if (value >= thresholds.warning) return 'warning';
    return 'error';
  } else {
    if (value <= thresholds.success) return 'success';
    if (value <= thresholds.warning) return 'warning';
    return 'error';
  }
}

export function getSemaphoreColor(level: SemaphoreLevel): string {
  switch (level) {
    case 'success': return 'text-emerald-600 bg-emerald-50';
    case 'warning': return 'text-amber-600 bg-amber-50';
    case 'error': return 'text-rose-600 bg-rose-50';
    default: return 'text-slate-600 bg-slate-50';
  }
}
