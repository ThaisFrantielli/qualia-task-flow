export type FleetState = 'LOCACAO' | 'MANUTENCAO' | 'SINISTRO' | 'MULTA' | 'OUTRO';

type AnyEvent = Record<string, any>;
type AnyObject = Record<string, any>;

function stripAccents(input: string) {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeEventName(raw: unknown): string {
  if (!raw) return '';
  return stripAccents(String(raw)).trim().toUpperCase();
}

export function getEventDate(e: AnyEvent): Date | null {
  const raw = e?.DataEvento ?? e?.Data ?? e?.data_evento ?? e?.data;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function eventToState(e: AnyEvent): FleetState | null {
  const n = normalizeEventName(e?.TipoEvento ?? e?.Evento ?? e?.tipo_evento ?? e?.evento);
  if (!n) return null;

  // Locação/Aluguel - veículo em uso produtivo
  if (n.includes('LOCACAO') || n.includes('LOCA') || n.includes('ALUGUEL') || n.includes('RETIRADA')) {
    return 'LOCACAO';
  }
  
  // Manutenção - veículo em oficina
  if (n.includes('MANUTENCAO') || n.includes('MANUT') || n.includes('OFICINA') || n.includes('REPARO') || n.includes('SERVICO')) {
    return 'MANUTENCAO';
  }

  // Sinistro - pode indicar manutenção ou indisponibilidade
  if (n.includes('SINISTRO') || n.includes('ACIDENTE') || n.includes('COLISAO') || n.includes('BATIDA')) {
    return 'SINISTRO';
  }

  // Multas/Infrações
  if (n.includes('MULTA') || n.includes('INFRACAO') || n.includes('AIT')) {
    return 'MULTA';
  }

  // Devolução (transição para disponível)
  if (n.includes('DEVOLUCAO') || n.includes('DEVOL') || n.includes('RETORNO') || n.includes('ENTREGA')) {
    return 'OUTRO';
  }

  // Venda/Baixa
  if (n.includes('VENDA') || n.includes('VENDIDO') || n.includes('BAIXA') || n.includes('ALIENACAO')) {
    return 'OUTRO';
  }

  // Compra/Aquisição
  if (n.includes('COMPRA') || n.includes('AQUISICAO')) {
    return 'OUTRO';
  }

  // Movimentação de pátio
  if (n.includes('MOVIMENTACAO') || n.includes('PATIO') || n.includes('TRANSFER')) {
    return 'OUTRO';
  }

  return 'OUTRO';
}

export function calcStateDurationsDays(events: AnyEvent[], now = new Date()): {
  totalDays: number;
  locacaoDays: number;
  manutencaoDays: number;
  sinistroDays: number;
} {
  const normalized = events
    .map((e) => ({ e, d: getEventDate(e) }))
    .filter((x): x is { e: AnyEvent; d: Date } => !!x.d)
    .sort((a, b) => a.d.getTime() - b.d.getTime());

  if (normalized.length === 0) {
    return { totalDays: 0, locacaoDays: 0, manutencaoDays: 0, sinistroDays: 0 };
  }

  const first = normalized[0].d;
  const totalDaysRaw = (now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
  const totalDays = Math.max(1, totalDaysRaw);

  let locacaoDays = 0;
  let manutencaoDays = 0;
  let sinistroDays = 0;
  let state: FleetState = eventToState(normalized[0].e) ?? 'OUTRO';

  for (let i = 0; i < normalized.length; i++) {
    const { e, d } = normalized[i];
    const nextDate = normalized[i + 1]?.d ?? now;

    // aplica mudança de estado no início do evento (quando o evento for um marcador de estado)
    const maybeState = eventToState(e);
    if (maybeState) state = maybeState;

    const duration = Math.max(0, (nextDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (state === 'LOCACAO') locacaoDays += duration;
    if (state === 'MANUTENCAO') manutencaoDays += duration;
    if (state === 'SINISTRO') sinistroDays += duration;
  }

  return { totalDays, locacaoDays, manutencaoDays, sinistroDays };
}

// ============================================
// NOVAS FUNÇÕES PARA MÉTRICAS AGREGADAS
// ============================================

export interface VehicleLifecycleMetrics {
  placa: string;
  dataCompra: Date | null;
  dataVenda: Date | null;
  diasVida: number;           // Total de dias desde compra até hoje/venda
  diasLocado: number;         // Soma de todos os períodos de locação
  diasManutencao: number;     // Soma de (dataRetirada - dataChegada) de cada OS
  diasParado: number;         // diasVida - diasLocado
  percentualUtilizacao: number; // (diasLocado / diasVida) * 100
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

  // SQL Server formatted dates
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

  // Fallback
  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime())) return direct;
  return null;
}

function normalizePlacaKey(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Calcula dias de locação somando todos os períodos de contratos
 */
function calcDiasLocadoFromContratos(contratos: AnyObject[], now = new Date()): number {
  return contratos.reduce((sum, c) => {
    const inicio = parseDateAny(c?.Inicio ?? c?.DataInicial ?? c?.InicioContrato ?? c?.DataInicio);
    const fim = parseDateAny(c?.Fim ?? c?.DataEncerramento ?? c?.DataFimEfetiva ?? c?.DataTermino);
    if (!inicio) return sum;
    const end = fim || now;
    const days = Math.max(0, (end.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
}

/**
 * Calcula dias de manutenção somando (dataRetirada - dataChegada) de cada OS
 */
function calcDiasManutencaoFromOS(osRecords: AnyObject[], now = new Date()): number {
  return osRecords.reduce((sum, os) => {
    const chegada = parseDateAny(os?.DataEntrada ?? os?.DataChegada ?? os?.DataAgendamento ?? os?.Data);
    const retirada = parseDateAny(os?.DataSaida ?? os?.DataRetirada ?? os?.DataConclusao);
    if (!chegada) return sum;
    const end = retirada || now;
    const days = Math.max(0, (end.getTime() - chegada.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
}

/**
 * Calcula dias parado: vida útil - dias locado
 */
function calcDiasParado(dataCompra: Date | null, dataVenda: Date | null, diasLocado: number, now = new Date()): number {
  if (!dataCompra) return 0;
  const fim = dataVenda || now;
  const diasVida = Math.max(0, (fim.getTime() - dataCompra.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diasVida - diasLocado);
}

/**
 * Agrupa métricas por veículo e calcula médias
 */
export function aggregateFleetMetrics(
  frota: AnyObject[],
  contratos: AnyObject[],
  manutencao: AnyObject[],
  now = new Date()
): FleetAggregatedMetrics {
  // Criar mapas por placa
  const contratosByPlaca: Record<string, AnyObject[]> = {};
  const manutencaoByPlaca: Record<string, AnyObject[]> = {};
  
  // Agrupar contratos por placa
  (contratos || []).forEach(c => {
    const placa = normalizePlacaKey(c?.PlacaPrincipal ?? c?.Placa);
    if (!placa) return;
    if (!contratosByPlaca[placa]) contratosByPlaca[placa] = [];
    contratosByPlaca[placa].push(c);
  });
  
  // Agrupar manutenções por placa
  (manutencao || []).forEach(m => {
    const placa = normalizePlacaKey(m?.Placa);
    if (!placa) return;
    if (!manutencaoByPlaca[placa]) manutencaoByPlaca[placa] = [];
    manutencaoByPlaca[placa].push(m);
  });
  
  // Processar cada veículo
  const metricsPerVehicle: VehicleLifecycleMetrics[] = [];
  
  (frota || []).forEach(v => {
    const placa = normalizePlacaKey(v?.Placa);
    if (!placa) return;
    
    const dataCompra = parseDateAny(v?.DataCompra ?? v?.DataAquisicao);
    const dataVenda = parseDateAny(v?.DataVenda ?? v?.DataAlienacao ?? v?.DataBaixa);
    
    const contratosPlaca = contratosByPlaca[placa] || [];
    const manutPlaca = manutencaoByPlaca[placa] || [];
    
    const diasLocado = calcDiasLocadoFromContratos(contratosPlaca, now);
    const diasManutencao = calcDiasManutencaoFromOS(manutPlaca, now);
    
    // Dias de vida: da compra até hoje/venda
    const fim = dataVenda || now;
    const diasVida = dataCompra 
      ? Math.max(0, (fim.getTime() - dataCompra.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const diasParado = calcDiasParado(dataCompra, dataVenda, diasLocado, now);
    
    const percentualUtilizacao = diasVida > 0 
      ? Math.min(100, Math.max(0, (diasLocado / diasVida) * 100))
      : 0;
    
    metricsPerVehicle.push({
      placa,
      dataCompra,
      dataVenda,
      diasVida,
      diasLocado,
      diasManutencao,
      diasParado,
      percentualUtilizacao
    });
  });
  
  const totalVeiculos = metricsPerVehicle.length || 1;
  
  const totalLocadoDays = metricsPerVehicle.reduce((s, m) => s + m.diasLocado, 0);
  const totalManutencaoDays = metricsPerVehicle.reduce((s, m) => s + m.diasManutencao, 0);
  const totalParadoDays = metricsPerVehicle.reduce((s, m) => s + m.diasParado, 0);
  
  const mediaLocado = totalLocadoDays / totalVeiculos;
  const mediaManutencao = totalManutencaoDays / totalVeiculos;
  const mediaParado = totalParadoDays / totalVeiculos;
  
  // Utilização % global
  const utilizacaoPct = (totalLocadoDays + totalParadoDays) > 0
    ? (totalLocadoDays / (totalLocadoDays + totalParadoDays)) * 100
    : 0;
  
  return {
    mediaLocado,
    mediaManutencao,
    mediaParado,
    totalVeiculos,
    totalLocadoDays,
    totalManutencaoDays,
    totalParadoDays,
    utilizacaoPct,
    metricsPerVehicle
  };
}

/**
 * Formata duração em dias para representação mista: anos, meses, dias.
 */
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
