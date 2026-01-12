// Centralized fleet timeline helpers
type AnyObject = Record<string, any>;

export function parseDateAny(raw?: string | null): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

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

  const sql = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (sql) {
    const yyyy = Number(sql[1]);
    const mm = Number(sql[2]);
    const dd = Number(sql[3]);
    const hh = sql[4] ? Number(sql[4]) : 0;
    const mi = sql[5] ? Number(sql[5]) : 0;
    const ss = sql[6] ? Number(sql[6]) : 0;
    const dt = new Date(yyyy, mm - 1, dd, hh, mi, ss, 0);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime())) return direct;
  return null;
}

export function normalizePlacaKey(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function stripAccents(input: string): string {
  try {
      return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (e) {
    return input;
  }
}

export function normalizeEventName(raw: unknown): string {
  if (!raw) return '';
  const s = String(raw ?? '').trim();
  // remove accents and uppercase
  try {
      return stripAccents(s).toUpperCase();
  } catch (e) {
    return s.toUpperCase();
  }
}

type FleetState = 'LOCACAO' | 'MANUTENCAO' | 'SINISTRO' | 'MULTA' | 'OUTRO';

export function getEventDate(e: AnyObject): Date | null {
  const raw = e?.DataEvento ?? e?.Data ?? e?.data_evento ?? e?.data ?? e?.DataInicio ?? e?.DataInicioLocacao;
  return parseDateAny(raw);
}

export function eventToState(e: AnyObject): FleetState | null {
  const n = normalizeEventName(e?.TipoEvento ?? e?.Evento ?? e?.tipo_evento ?? e?.evento ?? e?.Status ?? e?.StatusEvento);
  if (!n) return null;
  if (n.includes('LOCAC') || n.includes('ALUGUEL') || n.includes('RETIRADA')) return 'LOCACAO';
  if (n.includes('MANUT') || n.includes('OFICINA') || n.includes('REPARO') || n.includes('SERVICO')) return 'MANUTENCAO';
  if (n.includes('SINIST') || n.includes('ACIDENT') || n.includes('COLISAO') || n.includes('BATIDA')) return 'SINISTRO';
  if (n.includes('MULTA') || n.includes('INFRAC')) return 'MULTA';
  return 'OUTRO';
}

export function calcStateDurationsDays(events: AnyObject[], now = new Date()): {
  totalDays: number;
  locacaoDays: number;
  manutencaoDays: number;
  sinistroDays: number;
} {
  if (!Array.isArray(events) || events.length === 0) {
    return { totalDays: 0, locacaoDays: 0, manutencaoDays: 0, sinistroDays: 0 };
  }

  const normalized = events
    .map((e) => ({ e, d: getEventDate(e), s: eventToState(e) }))
    .filter((x) => x.d && x.d instanceof Date)
    .sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime());

  if (normalized.length === 0) return { totalDays: 0, locacaoDays: 0, manutencaoDays: 0, sinistroDays: 0 };

  const first = normalized[0].d as Date;
  const totalDays = Math.max(0, (now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));

  let locacaoDays = 0;
  let manutencaoDays = 0;
  let sinistroDays = 0;

  for (let i = 0; i < normalized.length; i++) {
    const cur = normalized[i];
    const start = cur.d as Date;
    const end = i < normalized.length - 1 ? (normalized[i + 1].d as Date) : now;
    if (!start || !end) continue;
    const days = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const state = cur.s;
    if (state === 'LOCACAO') locacaoDays += days;
    else if (state === 'MANUTENCAO') manutencaoDays += days;
    else if (state === 'SINISTRO') sinistroDays += days;
  }

  return { totalDays, locacaoDays, manutencaoDays, sinistroDays };
}

export function extractDataCompra(veiculo: AnyObject): Date | null {
  if (!veiculo) return null;
  const candidates = [
    // Preferência: campo vindo de dim_frota (DW) conforme mapeamento do usuário
    veiculo?.ValorCompra,
    veiculo?.DataCompra,
    veiculo?.DataAquisicao,
    veiculo?.['Data Compra'],
    veiculo?.['Data de Compra'],
    veiculo?.datacompra,
    veiculo?.dataaquisicao,
    veiculo?.Compra?.DataCompra,
    veiculo?.compra?.DataCompra
  ];
  for (const c of candidates) {
    const d = parseDateAny(c);
    if (d) return d;
  }
  return null;
}

export function extractDataVenda(veiculo: AnyObject): Date | null {
  if (!veiculo) return null;
  const candidates = [
    // Campo vindo de dim_frota / VeiculosVendidos no DW
    veiculo?.DataVenda ?? veiculo?.Datavenda ?? veiculo?.dataVenda ?? veiculo?.datavenda,
    veiculo?.DataBaixa,
    veiculo?.DataAlienacao,
    veiculo?.venda?.DataVenda
  ];
  for (const c of candidates) {
    const d = parseDateAny(c);
    if (d) return d;
  }
  return null;
}

function buildContractIntervals(contratos: AnyObject[], now = new Date(), lifeStart: Date | null = null, lifeEnd: Date | null = null) {
  const intervals: Array<{ start: Date; end: Date }> = [];
  if (!Array.isArray(contratos)) return { raw: intervals, merged: [], totalDays: 0 };
  for (const c of contratos) {
    const start = parseDateAny(
      c?.Inicio ?? c?.DataInicio ?? c?.DataInicial ?? c?.InicioContrato ?? c?.DataRetirada ?? c?.DataInicioLocacao
    );
    const end = parseDateAny(
      c?.DataEncerramento ?? c?.Fim ?? c?.DataFim ?? c?.DataFimEfetiva ?? c?.DataTermino ?? c?.DataFimLocacao
    );
    if (!start) continue;
    let s = start;
    let e = end || now;
    if (lifeStart && s.getTime() < lifeStart.getTime()) s = lifeStart;
    if (lifeEnd && e.getTime() > lifeEnd.getTime()) e = lifeEnd;
    if (e.getTime() <= s.getTime()) continue;
    intervals.push({ start: s, end: e });
  }

  intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Array<{ start: Date; end: Date }> = [];
  for (const iv of intervals) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ start: new Date(iv.start), end: new Date(iv.end) });
      continue;
    }
    if (iv.start.getTime() <= last.end.getTime()) {
      if (iv.end.getTime() > last.end.getTime()) last.end = new Date(iv.end);
    } else {
      merged.push({ start: new Date(iv.start), end: new Date(iv.end) });
    }
  }
  const totalDays = merged.reduce((sum, m) => sum + Math.max(0, (m.end.getTime() - m.start.getTime()) / (1000 * 60 * 60 * 24)), 0);
  return { raw: intervals, merged, totalDays };
}

export function calcDiasLocadoFromContratos(contratos: AnyObject[], now = new Date(), lifeStart: Date | null = null, lifeEnd: Date | null = null): number {
  const { totalDays } = buildContractIntervals(contratos, now, lifeStart, lifeEnd);
  return totalDays;
}

export function calcDiasManutencaoFromOS(osRecords: AnyObject[], now = new Date()): number {
  if (!Array.isArray(osRecords) || osRecords.length === 0) return 0;

  // Heurística: agrupar por identificação de ocorrência/movimentação quando disponível,
  // parear registro de chegada (etapa de chegada/entrada) com etapa de retirada (aguardando retirada/retirada/saida/conclusao).
  const byOcc: Record<string, AnyObject[]> = {};
  for (let i = 0; i < osRecords.length; i++) {
    const r = osRecords[i];
    const occKey = String(r?.OcorrenciaId ?? r?.MovimentacaoId ?? r?.Id ?? r?.IdOcorrencia ?? `${r?.Placa ?? 'NA'}_${i}`);
    if (!byOcc[occKey]) byOcc[occKey] = [];
    byOcc[occKey].push(r);
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  let sum = 0;

  function normalizeEtapaText(t?: any): string {
    if (!t) return '';
    return String(t).trim().toUpperCase();
  }

  function isArrival(etapa: string): boolean {
    if (!etapa) return false;
    return etapa.includes('CHEG') || etapa.includes('ENTR') || etapa.includes('RECEB') || etapa.includes('AGENDAMENTO');
  }

  function isRetirada(etapa: string): boolean {
    if (!etapa) return false;
    return etapa.includes('AGUARDANDO RETIRADA') || etapa.includes('RETIR') || etapa.includes('SAIDA') || etapa.includes('CONCLUI') || etapa.includes('LIBERAD');
  }

  for (const key of Object.keys(byOcc)) {
    const group = byOcc[key].slice().map((r) => ({ r, d: parseDateAny(r?.DataEtapa ?? r?.Data ?? r?.DataChegada ?? r?.DataEntrada) })).filter(x => x.d).sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime());
    if (group.length === 0) continue;

    // Tentar parear: para cada arrival -> next retirada (no mesmo grupo). Se não encontrar retirada, usa `now`.
    for (let i = 0; i < group.length; i++) {
      const rec = group[i];
      const etapaText = normalizeEtapaText(rec.r?.etapa ?? rec.r?.Etapa ?? rec.r?.EtapaMovimentacao ?? rec.r?.DescricaoEtapa);
      if (!isArrival(etapaText)) continue;
      const start = rec.d as Date;
      // procurar retirada após a chegada
      let end: Date | null = null;
      for (let j = i + 1; j < group.length; j++) {
        const next = group[j];
        const nextEt = normalizeEtapaText(next.r?.etapa ?? next.r?.Etapa ?? next.r?.EtapaMovimentacao ?? next.r?.DescricaoEtapa);
        if (isRetirada(nextEt)) { end = next.d as Date; break; }
      }
      if (!end) end = now;
      const days = Math.max(0, (end.getTime() - start.getTime()) / msPerDay);
      sum += days;
    }
  }

  return sum;
}

export interface VehicleLifecycleMetrics {
  placa: string;
  dataCompra: Date | null;
  dataVenda: Date | null;
  diasVida: number;
  diasLocado: number;
  diasManutencao: number;
  diasParado: number;
  percentualUtilizacao: number;
}

export interface FleetAggregatedMetrics {
  mediaLocado: number;
  mediaManutencao: number;
  mediaParado: number;
  totalVeiculos: number;
  totalLocadoDays: number;
  totalManutencaoDays: number;
  totalParadoDays: number;
  utilizacaoPct: number;
  metricsPerVehicle: VehicleLifecycleMetrics[];
}

export function aggregateFleetMetrics(
  frota: AnyObject[],
  contratos: AnyObject[] | { data?: AnyObject[] } | null,
  manutencao: AnyObject[] | { data?: AnyObject[] } | null,
  now = new Date()
): FleetAggregatedMetrics {
  const frotaArr = Array.isArray(frota) ? frota : [];
  const contratosArr = Array.isArray(contratos) ? contratos : (contratos as any)?.data || [];
  const manutArr = Array.isArray(manutencao) ? manutencao : (manutencao as any)?.data || [];

  const contratosByPlaca: Record<string, AnyObject[]> = {};
  const manutByPlaca: Record<string, AnyObject[]> = {};

  for (const c of contratosArr) {
    const placa = normalizePlacaKey(c?.PlacaPrincipal ?? c?.Placa ?? c?.placa);
    if (!placa) continue;
    if (!contratosByPlaca[placa]) contratosByPlaca[placa] = [];
    contratosByPlaca[placa].push(c);
  }

  for (const m of manutArr) {
    const placa = normalizePlacaKey(m?.Placa ?? m?.placa);
    if (!placa) continue;
    if (!manutByPlaca[placa]) manutByPlaca[placa] = [];
    manutByPlaca[placa].push(m);
  }

  const metricsPerVehicle: VehicleLifecycleMetrics[] = [];

  for (const v of frotaArr) {
    const placaRaw = v?.Placa ?? v?.placa ?? '';
    const placa = normalizePlacaKey(placaRaw);
    if (!placa) continue;

    const dataCompra = extractDataCompra(v);
    const dataVenda = extractDataVenda(v);
    const lifeStart = dataCompra;
    const lifeEnd = dataVenda || null;

    const contratosPlaca = contratosByPlaca[placa] || [];
    const manutPlaca = manutByPlaca[placa] || [];

    const diasLocadoRaw = calcDiasLocadoFromContratos(contratosPlaca, now, lifeStart, lifeEnd);

    const fim = lifeEnd || now;
    const diasVida = dataCompra ? Math.max(0, (fim.getTime() - dataCompra.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const diasLocado = dataCompra ? Math.min(diasLocadoRaw, diasVida) : diasLocadoRaw;

    const diasManutencao = calcDiasManutencaoFromOS(manutPlaca, now);

    const diasParado = dataCompra ? Math.max(0, diasVida - diasLocado) : 0;

    const percentualUtilizacao = diasVida > 0 ? Math.min(100, Math.max(0, (diasLocado / diasVida) * 100)) : 0;

    metricsPerVehicle.push({
      placa,
      dataCompra,
      dataVenda,
      diasVida,
      diasLocado,
      diasManutencao: diasManutencao,
      diasParado,
      percentualUtilizacao
    });
  }

  const totalVeiculos = Math.max(1, metricsPerVehicle.length);
  const totalLocadoDays = metricsPerVehicle.reduce((s, m) => s + m.diasLocado, 0);
  const totalManutencaoDays = metricsPerVehicle.reduce((s, m) => s + m.diasManutencao, 0);
  const totalParadoDays = metricsPerVehicle.reduce((s, m) => s + m.diasParado, 0);

  const mediaLocado = totalLocadoDays / totalVeiculos;
  const mediaManutencao = totalManutencaoDays / totalVeiculos;
  const mediaParado = totalParadoDays / totalVeiculos;

  const utilizacaoPct = (totalLocadoDays + totalParadoDays) > 0 ? (totalLocadoDays / (totalLocadoDays + totalParadoDays)) * 100 : 0;

  return {
    mediaLocado,
    mediaManutencao,
    mediaParado,
    totalVeiculos: metricsPerVehicle.length,
    totalLocadoDays,
    totalManutencaoDays,
    totalParadoDays,
    utilizacaoPct,
    metricsPerVehicle
  };
}

export function formatDurationDays(days?: number | null): string {
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

export function extractVehicleDates(veiculo: AnyObject): { compra: Date | null; venda: Date | null } {
  return {
    compra: extractDataCompra(veiculo),
    venda: extractDataVenda(veiculo)
  };
}
