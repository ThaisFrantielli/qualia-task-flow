// Centralized fleet timeline helpers - v2
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

function overlapDaysBetweenIntervals(
  a: Array<{ start: Date; end: Date }>,
  b: Array<{ start: Date; end: Date }>
): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  let i = 0;
  let j = 0;
  let overlapMs = 0;

  const aa = [...a].sort((x, y) => x.start.getTime() - y.start.getTime());
  const bb = [...b].sort((x, y) => x.start.getTime() - y.start.getTime());

  while (i < aa.length && j < bb.length) {
    const start = Math.max(aa[i].start.getTime(), bb[j].start.getTime());
    const end = Math.min(aa[i].end.getTime(), bb[j].end.getTime());
    if (end > start) overlapMs += (end - start);

    if (aa[i].end.getTime() < bb[j].end.getTime()) i++;
    else j++;
  }

  return overlapMs / msPerDay;
}

export function calcDiasLocadoFromContratos(contratos: AnyObject[], now = new Date(), lifeStart: Date | null = null, lifeEnd: Date | null = null): number {
  const { totalDays } = buildContractIntervals(contratos, now, lifeStart, lifeEnd);
  return totalDays;
}

export function calcDiasManutencaoFromOS(
  osRecords: AnyObject[],
  now = new Date(),
  lifeStart: Date | null = null,
  lifeEnd: Date | null = null
): number {
  if (!Array.isArray(osRecords) || osRecords.length === 0) return 0;

  const msPerDay = 1000 * 60 * 60 * 24;
  let sum = 0;

  // Separa registros que são "Intervalos Completos" (ex: fat_manutencao_unificado com DataEntrada/DataSaida)
  // dos registros que são "Eventos de Movimentação" (ex: fat_movimentacao_ocorrencias com Etapa)
  const eventStream: AnyObject[] = [];

  for (const r of osRecords) {
    // Se o registro tem DataEntrada E (DataSaida ou DataConclusao), podemos calcular direto
    // Mas CUIDADO: fat_movimentacao também pode ter DataEtapa que se parece com data.
    // A chave é que fat_manutencao NÃO tem 'Etapa' ou a 'Etapa' é null/generica, enquanto movimentacao tem 'Etapa' descritiva.
    // Vamos priorizar o formato de intervalo se as datas existirem e parecerem ser de Entrada/Saida de OS.

    const dEntrada = parseDateAny(
      r?.DataEntrada ??
      r?.DataInicioServico ??
      r?.DataInicio ??
      r?.DataAberturaOcorrencia ??
      r?.DataOcorrencia ??
      r?.DataAbertura ??
      r?.DataAgendamento ??
      r?.DataCriacao ??
      r?.DataEtapa
    );
    const dSaida = parseDateAny(
      r?.DataSaida ??
      r?.DataConclusaoOcorrencia ??
      r?.DataFim ??
      r?.DataConclusao ??
      r?.DataRetiradaVeiculo ??
      r?.DataRetirada ??
      r?.DataConfirmacaoSaida ??
      r?.DataConclusaoServico
    );
    

    // Se temos datas claras de inicio/fim e NÃO é um evento de fluxo (ou é, mas já tem o total calculado), usamos o intervalo.
    // No caso do fallback (fat_manutencao), temos DataEntrada/DataSaida e NÃO temos Etapa de 'Aguardando Chegada'.
    // Se temos datas claras de inicio/fim, usamos o intervalo.
    // Isso garante que fat_manutencao_unificado (que tem DataEntrada) seja processado como intervalo,
    // enquanto fat_movimentacao_ocorrencias (que não tem DataEntrada, apenas DataEtapa) cai no fallback de eventos.
    if (dEntrada) {
      // É um intervalo.
      const end = dSaida || now;
      let s = dEntrada;
      let e = end;
      if (lifeStart && s.getTime() < lifeStart.getTime()) s = lifeStart;
      if (lifeEnd && e.getTime() > lifeEnd.getTime()) e = lifeEnd;
      if (e.getTime() > s.getTime()) {
        sum += (e.getTime() - s.getTime()) / msPerDay;
      }
      continue; // Processado
    }

    // Se não conseguimos processar como intervalo direto, jogamos para o stream de eventos
    eventStream.push(r);
  }

  // Se não sobrou nada para evento, retornamos a soma dos intervalos
  if (eventStream.length === 0) return sum;

  // --- LOGICA DE EVENT STREAM (Pareamento de Etapas) ---
  const byOcc: Record<string, AnyObject[]> = {};
  for (let i = 0; i < eventStream.length; i++) {
    const r = eventStream[i];
    const occKey = String(r?.Ocorrencia ?? r?.OcorrenciaId ?? r?.MovimentacaoId ?? r?.Id ?? r?.IdOcorrencia ?? `${r?.Placa ?? 'NA'}_${i}`);
    if (!byOcc[occKey]) byOcc[occKey] = [];
    byOcc[occKey].push(r);
  }

  function normalizeEtapaText(t?: any): string {
    if (!t) return '';
    return String(t).trim().toUpperCase();
  }

  function isArrival(etapa: string): boolean {
    if (!etapa) return false;
    return etapa.includes('AGUARDANDO CHEGADA') || etapa.includes('CHEG') || etapa.includes('ENTR') || etapa.includes('RECEB');
  }

  function isRetirada(etapa: string): boolean {
    if (!etapa) return false;
    return etapa.includes('AGUARDANDO RETIRADA DO VEICULO') || etapa.includes('AGUARDANDO RETIRADA') || etapa.includes('RETIR') || etapa.includes('SAIDA') || etapa.includes('CONCLUI') || etapa.includes('LIBERAD');
  }

  for (const key of Object.keys(byOcc)) {
    const group = byOcc[key].slice().map((r) => ({ r, d: parseDateAny(r?.DataEtapa ?? r?.Data ?? r?.DataChegada ?? r?.DataEntrada ?? r?.DataConfirmacao ?? r?.DataDeConfirmacao) })).filter(x => x.d).sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime());
    if (group.length === 0) continue;

    for (let i = 0; i < group.length; i++) {
      const rec = group[i];
      const etapaText = normalizeEtapaText(rec.r?.etapa ?? rec.r?.Etapa ?? rec.r?.EtapaMovimentacao ?? rec.r?.DescricaoEtapa);
      if (!isArrival(etapaText)) continue;

      let start = rec.d as Date;
      let end: Date | null = null;

      for (let j = i + 1; j < group.length; j++) {
        const next = group[j];
        const nextEt = normalizeEtapaText(next.r?.etapa ?? next.r?.Etapa ?? next.r?.EtapaMovimentacao ?? next.r?.DescricaoEtapa);
        if (isRetirada(nextEt)) { end = next.d as Date; break; }
      }

      if (!end) end = now;
      if (lifeStart && start.getTime() < lifeStart.getTime()) start = lifeStart;
      if (lifeEnd && end.getTime() > lifeEnd.getTime()) end = lifeEnd;
      sum += Math.max(0, (end.getTime() - start.getTime()) / msPerDay);
    }
  }

  return sum;
}

function calcDiasManutencaoFromAberturaRetirada(
  osRecords: AnyObject[],
  _now = new Date(),
  lifeStart: Date | null = null,
  lifeEnd: Date | null = null
): number {
  const { totalDaysRaw } = buildManutencaoIntervalsFromAberturaRetirada(osRecords, lifeStart, lifeEnd);
  return totalDaysRaw;
}

function buildManutencaoIntervalsFromAberturaRetirada(
  osRecords: AnyObject[],
  lifeStart: Date | null = null,
  lifeEnd: Date | null = null
): {
  raw: Array<{ start: Date; end: Date }>;
  merged: Array<{ start: Date; end: Date }>;
  totalDaysRaw: number;
  totalDaysMerged: number;
} {
  if (!Array.isArray(osRecords) || osRecords.length === 0) {
    return { raw: [], merged: [], totalDaysRaw: 0, totalDaysMerged: 0 };
  }
  const msPerDay = 1000 * 60 * 60 * 24;

  const byOcc: Record<string, AnyObject[]> = {};
  for (let i = 0; i < osRecords.length; i++) {
    const r = osRecords[i];
    const occKey = String(
      r?.Ocorrencia ?? r?.IdOcorrencia ?? r?.NumeroOcorrencia ?? r?.OcorrenciaId ?? r?.MovimentacaoId ?? `${r?.Placa ?? 'NA'}_${i}`
    );
    if (!byOcc[occKey]) byOcc[occKey] = [];
    byOcc[occKey].push(r);
  }

  const intervals: Array<{ start: Date; end: Date }> = [];
  for (const k of Object.keys(byOcc)) {
    const group = byOcc[k];
    let aberturaMin: Date | null = null;
    let retiradaMax: Date | null = null;

    for (const r of group) {
      const abertura = parseDateAny(
        r?.DataAberturaOcorrencia ??
        r?.DataAbertura ??
        r?.DataEntrada ??
        r?.DataOcorrencia ??
        r?.DataAgendamento ??
        r?.DataCriacao ??
        r?.DataEtapa ??
        r?.Data
      );
      const retirada = parseDateAny(
        r?.DataRetiradaVeiculo ??
        r?.DataRetirada ??
        r?.DataSaida ??
        r?.DataConclusaoOcorrencia ??
        r?.DataConfirmacaoSaida ??
        r?.DataConclusaoServico ??
        r?.DataConclusao
      );

      if (abertura && (!aberturaMin || abertura.getTime() < aberturaMin.getTime())) aberturaMin = abertura;
      if (retirada && (!retiradaMax || retirada.getTime() > retiradaMax.getTime())) retiradaMax = retirada;
    }

    // Regra do KPI: seguir o mesmo conceito dos deltas roxos exibidos no card,
    // portanto só conta ocorrência com início e fim válidos.
    if (!aberturaMin || !retiradaMax) continue;
    let start = aberturaMin;
    let end = retiradaMax;

    if (lifeStart && start.getTime() < lifeStart.getTime()) start = lifeStart;
    if (lifeEnd && end.getTime() > lifeEnd.getTime()) end = lifeEnd;

    const diffMs = end.getTime() - start.getTime();
    if (diffMs > 0) intervals.push({ start, end });
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

  const totalDaysRaw = intervals.reduce((sum, iv) => sum + Math.max(0, (iv.end.getTime() - iv.start.getTime()) / msPerDay), 0);
  const totalDaysMerged = merged.reduce((sum, iv) => sum + Math.max(0, (iv.end.getTime() - iv.start.getTime()) / msPerDay), 0);
  return { raw: intervals, merged, totalDaysRaw, totalDaysMerged };
}

export interface VehicleLifecycleMetrics {
  placa: string;
  dataCompra: Date | null;
  dataVenda: Date | null;
  dataRoubo: Date | null;
  dataFimVida: Date | null;
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
  movimentacoes: AnyObject[] | { data?: AnyObject[] } | null = null, // Novo argumento opcional
  sinistros: AnyObject[] | { data?: AnyObject[] } | null = null,
  now = new Date()
): FleetAggregatedMetrics {
  const frotaArr = Array.isArray(frota) ? frota : [];
  const contratosArr = Array.isArray(contratos) ? contratos : (contratos as any)?.data || [];
  const manutArr = Array.isArray(manutencao) ? manutencao : (manutencao as any)?.data || [];
  const movArr = Array.isArray(movimentacoes) ? movimentacoes : (movimentacoes as any)?.data || [];
  const sinArr = Array.isArray(sinistros) ? sinistros : (sinistros as any)?.data || [];

  const contratosByPlaca: Record<string, AnyObject[]> = {};
  const manutByPlaca: Record<string, AnyObject[]> = {};
  const movByPlaca: Record<string, AnyObject[]> = {};
  const sinistrosByPlaca: Record<string, AnyObject[]> = {};

  function isRouboSinistro(s: AnyObject): boolean {
    // Regra restritiva: só considerar fim de vida quando o próprio status/classificação
    // do sinistro indicar perda do veículo (evita falso positivo em "roubo de acessórios").
    const statusTxt = normalizeEventName(
      s?.Status ??
      s?.StatusSinistro ??
      s?.SituacaoOcorrencia ??
      s?.Classificacao ??
      s?.TipoSinistro
    );
    if (!statusTxt) return false;

    const hasRouboStatus = statusTxt.includes('ROUB') || statusTxt.includes('FURT');
    const hasPerdaTotal = statusTxt.includes('PERDA TOTAL') || statusTxt.includes('IRRECUPER') || statusTxt.includes('NAO RECUPER');
    return hasRouboStatus || hasPerdaTotal;
  }

  function extractDataRouboFromSinistros(items: AnyObject[]): Date | null {
    let minDt: Date | null = null;
    for (const s of items) {
      if (!isRouboSinistro(s)) continue;
      const d = parseDateAny(
        s?.DataSinistro ??
        s?.DataOcorrencia ??
        s?.DataAberturaOcorrencia ??
        s?.DataAbertura ??
        s?.DataEvento ??
        s?.Data
      );
      if (!d) continue;
      if (!minDt || d.getTime() < minDt.getTime()) minDt = d;
    }
    return minDt;
  }

  function resolveDataFimVida(compra: Date | null, venda: Date | null, roubo: Date | null): Date | null {
    const candidates = [venda, roubo].filter(Boolean) as Date[];
    if (candidates.length === 0) return null;
    const valid = compra
      ? candidates.filter((d) => d.getTime() >= compra.getTime())
      : candidates;
    if (valid.length === 0) return null;
    return valid.reduce((min, cur) => (cur.getTime() < min.getTime() ? cur : min));
  }

  function resolveDataCompraFallback(
    contratosPlaca: AnyObject[],
    manutPlacaRaw: AnyObject[],
    movPlacaRaw: AnyObject[]
  ): Date | null {
    const candidates: Date[] = [];

    for (const c of contratosPlaca || []) {
      const d = parseDateAny(
        c?.Inicio ?? c?.DataInicio ?? c?.DataInicial ?? c?.InicioContrato ?? c?.DataRetirada ?? c?.DataInicioLocacao
      );
      if (d) candidates.push(d);
    }

    const addManutCandidate = (r: AnyObject) => {
      const d = parseDateAny(
        r?.DataAberturaOcorrencia ??
        r?.DataAbertura ??
        r?.DataEntrada ??
        r?.DataOcorrencia ??
        r?.DataAgendamento ??
        r?.DataCriacao ??
        r?.DataEtapa ??
        r?.Data
      );
      if (d) candidates.push(d);
    };

    for (const r of manutPlacaRaw || []) addManutCandidate(r);
    for (const r of movPlacaRaw || []) addManutCandidate(r);

    if (candidates.length === 0) return null;
    return candidates.reduce((min, cur) => (cur.getTime() < min.getTime() ? cur : min));
  }

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

  for (const m of movArr) {
    const placa = normalizePlacaKey(m?.Placa ?? m?.placa);
    if (!placa) continue;
    if (!movByPlaca[placa]) movByPlaca[placa] = [];
    movByPlaca[placa].push(m);
  }

  for (const s of sinArr) {
    const placa = normalizePlacaKey(s?.Placa ?? s?.placa);
    if (!placa) continue;
    if (!sinistrosByPlaca[placa]) sinistrosByPlaca[placa] = [];
    sinistrosByPlaca[placa].push(s);
  }

  const metricsPerVehicle: VehicleLifecycleMetrics[] = [];

  for (const v of frotaArr) {
    const placaRaw = v?.Placa ?? v?.placa ?? '';
    const placa = normalizePlacaKey(placaRaw);
    if (!placa) continue;

    const dataCompraOriginal = extractDataCompra(v);
    const contratosPlaca = contratosByPlaca[placa] || [];
    const manutPlacaRaw = manutByPlaca[placa] || [];
    const movPlacaRaw = movByPlaca[placa] || [];
    const dataCompra = dataCompraOriginal ?? resolveDataCompraFallback(contratosPlaca, manutPlacaRaw, movPlacaRaw);
    const dataVenda = extractDataVenda(v);
    const dataRoubo = extractDataRouboFromSinistros(sinistrosByPlaca[placa] || []);
    const lifeStart = dataCompra;
    const lifeEnd = resolveDataFimVida(dataCompra, dataVenda, dataRoubo);

    const contratosIntervals = buildContractIntervals(contratosPlaca, now, lifeStart, lifeEnd);
    const diasLocadoContrato = contratosIntervals.totalDays;

    const fim = lifeEnd || now;
    const diasVida = dataCompra ? Math.max(0, (fim.getTime() - dataCompra.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const diasLocadoBase = dataCompra ? Math.min(diasLocadoContrato, diasVida) : diasLocadoContrato;

    // Preferir movimentações da própria placa quando existirem; senão usar manutenção consolidada.
    const diasManutRoxoMov = movPlacaRaw.length > 0
      ? calcDiasManutencaoFromAberturaRetirada(movPlacaRaw, now, lifeStart, lifeEnd)
      : 0;
    const diasManutRoxoConsolidado = manutPlacaRaw.length > 0
      ? calcDiasManutencaoFromAberturaRetirada(manutPlacaRaw, now, lifeStart, lifeEnd)
      : 0;
    const diasManutRoxo = diasManutRoxoMov > 0 ? diasManutRoxoMov : diasManutRoxoConsolidado;

    const manutIntervalsSource = movPlacaRaw.length > 0 ? movPlacaRaw : manutPlacaRaw;
    const manutIntervals = buildManutencaoIntervalsFromAberturaRetirada(manutIntervalsSource, lifeStart, lifeEnd);
    const overlapLocacaoManutencao = overlapDaysBetweenIntervals(contratosIntervals.merged, manutIntervals.merged);
    const diasLocadoEfetivo = Math.max(0, diasLocadoBase - overlapLocacaoManutencao);
    const diasLocado = dataCompra ? Math.min(diasVida, diasLocadoEfetivo) : diasLocadoEfetivo;

    const diasManutMov = movPlacaRaw.length > 0
      ? calcDiasManutencaoFromOS(movPlacaRaw, now, lifeStart, lifeEnd)
      : 0;
    const diasManutConsolidado = manutPlacaRaw.length > 0
      ? calcDiasManutencaoFromOS(manutPlacaRaw, now, lifeStart, lifeEnd)
      : 0;
    const diasManutFallback = diasManutMov > 0 ? diasManutMov : diasManutConsolidado;
    const diasManutBase = diasManutRoxo > 0 ? diasManutRoxo : diasManutFallback;
    const diasManutencao = diasVida > 0 ? Math.min(diasVida, diasManutBase) : diasManutBase;

    const diasParado = dataCompra ? Math.max(0, diasVida - diasLocado) : 0;

    const percentualUtilizacao = diasVida > 0 ? Math.min(100, Math.max(0, (diasLocado / diasVida) * 100)) : 0;

    metricsPerVehicle.push({
      placa,
      dataCompra,
      dataVenda,
      dataRoubo,
      dataFimVida: lifeEnd,
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
