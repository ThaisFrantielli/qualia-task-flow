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
  acquisitionValue: number;
  precoPP: number;
  months: number;
  method: DepreciationMethod;
  fipeHistory: FipeHistoryPoint[];   // histórico ANUAL filtrado (mesmo mês de referência)
  projectionYears: number;           // FRAÇÃOANO(dataInicial, dataFinal) — prazo do contrato
  startDate?: Date | null;           // dataInicial do contrato
  endDate?: Date | null;             // dataFinal do contrato
  manualAnnualRate?: number | null;
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
  rateYears: number;
  projectionYears: number;
  futureValuePP: number;
  futureValueEstimated: number;
  futureValue: number;
  depreciationTotal: number;
  depreciationMonthly: number;
  depreciationAnnual: number;
  annualPercentage: number;
  gapValue: number;
  gapPercent: number;
  timeline: DepreciationPoint[];
  insight: string;
}

const clampMoney = (v: number) => {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, v);
};

// Equivalente ao FRAÇÃOANO do Excel (base 30/360)
function yearFraction(start: Date, end: Date): number {
  const d1 = start.getDate();
  const m1 = start.getMonth() + 1;
  const y1 = start.getFullYear();

  const d2 = end.getDate();
  const m2 = end.getMonth() + 1;
  const y2 = end.getFullYear();

  const days = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
  return days / 360;
}

// Retorna o ponto FIPE mais próximo de uma data alvo
function closestPoint(history: FipeHistoryPoint[], target: Date): FipeHistoryPoint {
  return history.reduce((best, p) => {
    const distBest = Math.abs(best.date.getTime() - target.getTime());
    const distP = Math.abs(p.date.getTime() - target.getTime());
    return distP < distBest ? p : best;
  });
}

function buildInsight(rate: number, gapPercent: number): string {
  const absRate = Math.abs(rate);
  if (rate > 0.02) {
    return 'Valorizacao historica acima da media. Pode sustentar precificacao premium, com monitoramento de volatilidade.';
  }
  if (absRate <= 0.04 && gapPercent >= -0.08) {
    return 'Este veiculo possui baixa depreciacao e e recomendado para contratos de prazo maior.';
  }
  if (absRate > 0.12 || gapPercent < -0.2) {
    return 'Alta depreciacao projetada. Revisar prazo contratual, politica de renovacao e composicao da mensalidade.';
  }
  return 'Depreciacao moderada. Balancear prazo contratual, km projetada e estrategia de renovacao.';
}

const EMPTY_RESULT = (
  acquisitionValue: number,
  precoPP: number,
  reason: string,
  annualRateSource: 'fipe' | 'manual',
  initialFipe = 0,
  latestFipe = 0,
  initialDate: Date | null = null,
  latestDate: Date | null = null,
): DepreciationResult => ({
  canCalculate: false,
  reason,
  annualRate: 0,
  annualRateSource,
  initialFipe,
  latestFipe,
  initialDate,
  latestDate,
  rateYears: 0,
  projectionYears: 0,
  futureValuePP: precoPP || acquisitionValue,
  futureValueEstimated: acquisitionValue,
  futureValue: acquisitionValue,
  depreciationTotal: 0,
  depreciationMonthly: 0,
  depreciationAnnual: 0,
  annualPercentage: 0,
  gapValue: 0,
  gapPercent: 0,
  timeline: [],
  insight: 'Sem base suficiente para gerar insight.',
});

export function calculate(input: DepreciationInput): DepreciationResult {
  const acquisitionValue = Number(input.acquisitionValue) || 0;
  const precoPP = Number(input.precoPP) || acquisitionValue;
  const months = Math.max(1, Math.round(Number(input.months) || 0));
  const method = input.method;
  const projectionYears = Number(input.projectionYears) > 0
    ? Number(input.projectionYears)
    : months / 12;
  const hasManualRate = Number.isFinite(input.manualAnnualRate as number);

  // Histórico ordenado do mais antigo ao mais recente
  const history = [...(input.fipeHistory || [])]
    .filter((p) => p?.date instanceof Date && Number.isFinite(p?.value) && p.value > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (!Number.isFinite(acquisitionValue) || acquisitionValue < 0) {
    return EMPTY_RESULT(acquisitionValue, precoPP, 'Informe um valor de aquisicao valido.', hasManualRate ? 'manual' : 'fipe');
  }

  if (history.length <= 1 && !hasManualRate) {
    const reason = history.length === 0
      ? 'Sem historico FIPE suficiente. Informe taxa anual manual para continuar.'
      : 'Apenas um ponto FIPE encontrado. Informe taxa anual manual para continuar.';
    return EMPTY_RESULT(
      acquisitionValue, precoPP, reason, 'fipe',
      history[0]?.value, history[0]?.value,
      history[0]?.date, history[0]?.date,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LÓGICA DA PLANILHA:
  //   rateStart = ponto FIPE mais próximo da dataInicial do contrato
  //   rateEnd   = ponto FIPE mais próximo da dataFinal do contrato
  //   taxa      = (rateEnd.value / rateStart.value)^(1/projectionYears) - 1
  //   rateYears = yearFraction(rateStart.date, rateEnd.date)  ← apenas para display
  //
  // Se não houver datas de contrato, usa history[0] e history[last]
  // ─────────────────────────────────────────────────────────────────────────
  const startDate = input.startDate instanceof Date ? input.startDate : null;
  const endDate = input.endDate instanceof Date ? input.endDate : null;

  const rateStart = startDate ? closestPoint(history, startDate) : history[0];
  const rateEnd = endDate ? closestPoint(history, endDate) : history[history.length - 1];

  // rateYears: janela real entre os pontos FIPE selecionados (para display no Resumo)
  const rateYears = rateStart.date.getTime() !== rateEnd.date.getTime()
    ? yearFraction(rateStart.date, rateEnd.date)
    : projectionYears;

  // Taxa anualizada usando projectionYears como denominador — idêntico à planilha
  let annualRateFromFipe = 0;
  if (projectionYears > 0 && rateStart.value > 0 && rateEnd.value > 0) {
    annualRateFromFipe = Math.pow(rateEnd.value / rateStart.value, 1 / projectionYears) - 1;
  }

  const annualRate: number = hasManualRate ? Number(input.manualAnnualRate) : annualRateFromFipe;
  const annualRateSource: 'fipe' | 'manual' = hasManualRate ? 'manual' : 'fipe';

  // Planilha: Valor futuro = PP × (1 + taxa)^projectionYears
  const futureValuePPRaw = method === 'linear'
    ? precoPP * (1 + annualRate * projectionYears)
    : precoPP * Math.pow(1 + annualRate, projectionYears);

  // Planilha: Venda Estimada = Aquisição × (1 + taxa)^projectionYears
  const futureValueEstimatedRaw = method === 'linear'
    ? acquisitionValue * (1 + annualRate * projectionYears)
    : acquisitionValue * Math.pow(1 + annualRate, projectionYears);

  const futureValuePP = clampMoney(futureValuePPRaw);
  const futureValueEstimated = clampMoney(futureValueEstimatedRaw);
  const futureValue = futureValueEstimated;

  const depreciationTotal = acquisitionValue - futureValueEstimated;
  const depreciationMonthly = depreciationTotal / months;
  const depreciationAnnual = depreciationTotal / projectionYears;
  const annualPercentage = acquisitionValue > 0 ? depreciationAnnual / acquisitionValue : 0;

  const latestFipe = rateEnd?.value || 0;

  // GAP = Venda PP projetada vs FIPE do ponto final
  const gapValue = futureValuePP - latestFipe;
  const gapPercent = latestFipe > 0 ? gapValue / latestFipe : 0;

  const timeline: DepreciationPoint[] = [];
  for (let m = 0; m <= months; m++) {
    const t = (m / months) * projectionYears;
    const valueRaw = method === 'linear'
      ? acquisitionValue * (1 + annualRate * t)
      : acquisitionValue * Math.pow(1 + annualRate, t);
    timeline.push({ month: m, value: clampMoney(valueRaw) });
  }

  return {
    canCalculate: true,
    annualRate,
    annualRateSource,
    initialFipe: rateStart?.value || 0,
    latestFipe,
    initialDate: rateStart?.date || null,
    latestDate: rateEnd?.date || null,
    rateYears,
    projectionYears,
    futureValuePP,
    futureValueEstimated,
    futureValue,
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
    input.projectionYears,
    input.startDate,
    input.endDate,
    input.fipeHistory,
  ]);
}