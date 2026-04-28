import { useMemo } from 'react';

export type DepreciationMethod = 'exponential' | 'linear';

export interface DepreciationPoint {
  month: number;
  value: number;
}

export interface FipeHistoryPoint {
  date: Date;
  value: number;
  codigoFipe?: string;
  anoModelo?: number;
  modelo?: string;
  mesFipe?: string;
}

export interface DepreciationInput {
  acquisitionValue: number;   // preço público MENOS desconto
  precoPP?: number;           // preço público 0km (sem desconto). Se ausente, usa acquisitionValue.
  months: number;
  method: DepreciationMethod;
  fipeHistory: FipeHistoryPoint[];
  manualAnnualRate?: number | null;
  rateYears?: number | null;
}

export interface DepreciationResult {
  canCalculate: boolean;
  reason?: string;
  annualRate: number;
  annualRateSource: 'fipe' | 'manual';
  initialFipe: number;
  latestFipe: number;
  initialDate: Date | null;
  latestDate: Date | null;
  yearsBetween: number;
  futureValue: number;            // alias de futureValueEstimated (compat)
  precoPP: number;
  futureValuePP: number;          // Venda PP = PP × (1 + taxa)^anos
  futureValueEstimated: number;   // Venda Estimada = Aquisição × (1 + taxa)^anos
  depreciationTotal: number;
  depreciationMonthly: number;
  depreciationAnnual: number;
  annualPercentage: number;
  gapValue: number;
  gapPercent: number;
  timeline: DepreciationPoint[];
  insight: string;
}

// FRAÇÃOANO equivalente (basis ACT/ACT — divide pelo nº de dias do ano de início)
function yearFraction(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = (end.getTime() - start.getTime()) / msPerDay;
  const y = start.getFullYear();
  const isLeap = (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0));
  const daysInYear = isLeap ? 366 : 365;
  return days / daysInYear;
}

const clampMoney = (v: number) => {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, v);
};

function buildInsight(rate: number, gapPercent: number): string {
  const absRate = Math.abs(rate);

  if (rate > 0.02) {
    return 'Valorizacao historica acima da media. Pode sustentar precificacao premium, com monitoramento de volatilidade.';
  }

  if (absRate <= 0.04 && gapPercent >= -0.08) {
    return 'Este veiculo possui baixa depreciacao e e recomendado para locacao de prazo maior.';
  }

  if (absRate > 0.12 || gapPercent < -0.2) {
    return 'Alta depreciacao projetada. Revisar prazo de venda, politica de renovacao e preco de locacao.';
  }

  return 'Depreciacao moderada. Balancear prazo contratual, km projetada e estrategia de renovacao.';
}

export function calculate(input: DepreciationInput): DepreciationResult {
  const acquisitionValue = Number(input.acquisitionValue) || 0;
  const months = Math.max(1, Math.round(Number(input.months) || 0));
  const method = input.method;
  const requestedRateYears = Number(input.rateYears);
  const hasRateYears = Number.isFinite(requestedRateYears) && requestedRateYears > 0;

  const history = [...(input.fipeHistory || [])]
    .filter((p) => p?.date instanceof Date && Number.isFinite(p?.value))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const hasManualRate = Number.isFinite(input.manualAnnualRate as number);

  const precoPPInput = Number(input.precoPP);
  const precoPP = Number.isFinite(precoPPInput) && precoPPInput > 0 ? precoPPInput : acquisitionValue;

  if (!Number.isFinite(acquisitionValue) || acquisitionValue < 0) {
    return {
      canCalculate: false,
      reason: 'Informe um valor de aquisicao valido para calcular a projecao.',
      annualRate: 0,
      annualRateSource: hasManualRate ? 'manual' : 'fipe',
      initialFipe: 0,
      latestFipe: 0,
      initialDate: null,
      latestDate: null,
      yearsBetween: 0,
      futureValue: 0,
      precoPP,
      futureValuePP: 0,
      futureValueEstimated: 0,
      depreciationTotal: 0,
      depreciationMonthly: 0,
      depreciationAnnual: 0,
      annualPercentage: 0,
      gapValue: 0,
      gapPercent: 0,
      timeline: [],
      insight: 'Sem base suficiente para gerar insight.',
    };
  }

  if (history.length <= 1 && !hasManualRate) {
    const reason = history.length === 0
      ? 'Sem historico FIPE suficiente. Informe taxa anual manual para continuar.'
      : 'Apenas um ponto FIPE encontrado. Informe taxa anual manual para continuar.';

    return {
      canCalculate: false,
      reason,
      annualRate: 0,
      annualRateSource: 'fipe',
      initialFipe: history[0]?.value || 0,
      latestFipe: history[0]?.value || 0,
      initialDate: history[0]?.date || null,
      latestDate: history[0]?.date || null,
      yearsBetween: 0,
      futureValue: acquisitionValue,
      precoPP,
      futureValuePP: precoPP,
      futureValueEstimated: acquisitionValue,
      depreciationTotal: 0,
      depreciationMonthly: 0,
      depreciationAnnual: 0,
      annualPercentage: 0,
      gapValue: 0,
      gapPercent: 0,
      timeline: [],
      insight: 'Sem base suficiente para gerar insight.',
    };
  }

  const initial = history[0];
  const latest = history[history.length - 1];

  let annualRateFromFipe = 0;
  let historyYearsBetween = 0;

  if (history.length > 1) {
    historyYearsBetween = yearFraction(initial.date, latest.date);
  }

  const yearsBetween = hasRateYears
    ? requestedRateYears
    : (historyYearsBetween > 0 ? historyYearsBetween : months / 12);

  if (yearsBetween > 0 && initial.value > 0 && latest.value > 0) {
    annualRateFromFipe = Math.pow(latest.value / initial.value, 1 / yearsBetween) - 1;
  }

  const annualRate = hasManualRate
    ? Number(input.manualAnnualRate)
    : annualRateFromFipe;

  const annualRateSource: 'fipe' | 'manual' = hasManualRate ? 'manual' : 'fipe';

  // Tempo de projeção em anos: usa rateYears (FRAÇÃOANO) se disponível; caso contrário months/12
  const time = hasRateYears ? requestedRateYears : months / 12;

  const futureValueEstimatedRaw = method === 'linear'
    ? acquisitionValue * (1 + annualRate * time)
    : acquisitionValue * Math.pow(1 + annualRate, time);

  const futureValuePPRaw = method === 'linear'
    ? precoPP * (1 + annualRate * time)
    : precoPP * Math.pow(1 + annualRate, time);

  const futureValueEstimated = clampMoney(futureValueEstimatedRaw);
  const futureValuePP = clampMoney(futureValuePPRaw);
  const futureValue = futureValueEstimated; // alias para compatibilidade

  const depreciationTotal = acquisitionValue - futureValueEstimated;
  const depreciationMonthly = depreciationTotal / months;
  const depreciationAnnual = depreciationTotal / time;
  const annualPercentage = acquisitionValue > 0 ? depreciationAnnual / acquisitionValue : 0;

  const latestFipe = latest?.value || 0;
  const gapValue = futureValueEstimated - latestFipe;
  const gapPercent = latestFipe > 0 ? gapValue / latestFipe : 0;

  const timeline: DepreciationPoint[] = [];
  for (let m = 0; m <= months; m++) {
    const t = m / 12;
    const valueRaw = method === 'linear'
      ? acquisitionValue * (1 + annualRate * t)
      : acquisitionValue * Math.pow(1 + annualRate, t);

    timeline.push({
      month: m,
      value: clampMoney(valueRaw),
    });
  }

  return {
    canCalculate: true,
    annualRate,
    annualRateSource,
    initialFipe: initial?.value || 0,
    latestFipe,
    initialDate: initial?.date || null,
    latestDate: latest?.date || null,
    yearsBetween,
    futureValue,
    precoPP,
    futureValuePP,
    futureValueEstimated,
    depreciationTotal,
    depreciationMonthly,
    depreciationAnnual,
    annualPercentage,
    gapValue,
    gapPercent,
    timeline,
    insight: buildInsight(annualRate, gapPercent),
  };
}

export function useDepreciation(input: DepreciationInput): DepreciationResult {
  return useMemo(() => calculate(input), [
    input.acquisitionValue,
    input.precoPP,
    input.months,
    input.method,
    input.manualAnnualRate,
    input.rateYears,
    input.fipeHistory,
  ]);
}
