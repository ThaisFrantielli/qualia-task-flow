export type FleetState = 'LOCACAO' | 'MANUTENCAO' | 'SINISTRO' | 'MULTA' | 'OUTRO';

type AnyEvent = Record<string, any>;

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
