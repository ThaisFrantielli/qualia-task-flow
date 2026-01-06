export type FleetState = 'LOCACAO' | 'MANUTENCAO' | 'OUTRO';

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

  // Normalização de alto nível (arquivos atuais usam: LOCAÇÃO/DEVOLUÇÃO/MANUTENÇÃO/SINISTRO)
  if (n.includes('LOCACAO') || n.includes('LOCA')) return 'LOCACAO';
  if (n.includes('MANUTENCAO') || n.includes('MANUT')) return 'MANUTENCAO';

  // Eventos que normalmente indicam saída de locação / disponibilidade
  if (n.includes('DEVOLUCAO') || n.includes('DEVOL')) return 'OUTRO';

  // Demais eventos (sinistro, roubo, movimentação etc.)
  return 'OUTRO';
}

export function calcStateDurationsDays(events: AnyEvent[], now = new Date()): {
  totalDays: number;
  locacaoDays: number;
  manutencaoDays: number;
} {
  const normalized = events
    .map((e) => ({ e, d: getEventDate(e) }))
    .filter((x): x is { e: AnyEvent; d: Date } => !!x.d)
    .sort((a, b) => a.d.getTime() - b.d.getTime());

  if (normalized.length === 0) {
    return { totalDays: 0, locacaoDays: 0, manutencaoDays: 0 };
  }

  const first = normalized[0].d;
  const totalDaysRaw = (now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
  const totalDays = Math.max(1, totalDaysRaw);

  let locacaoDays = 0;
  let manutencaoDays = 0;
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
  }

  return { totalDays, locacaoDays, manutencaoDays };
}
