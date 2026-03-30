export const STATUS_LABELS: Record<string, string> = {
  novo: "Solicitação",
  em_analise: "Em Análise",
  aguardando_departamento: "Aguard. Depto.",
  em_tratativa: "Em Tratativa",
  aguardando_cliente: "Aguard. Cliente",
  resolvido: "Resolvido",
};

export const KANBAN_COLUMNS = Object.keys(STATUS_LABELS);

// Map canonical column keys to possible ticket.status values in DB
export const STATUS_KEY_MAP: Record<string, string[]> = {
  novo: ["novo", "solicitacao", "aberto"],
  em_analise: ["em_analise"],
  aguardando_departamento: ["aguardando_departamento", "aguardando_setor", "aguardando_triagem"],
  em_tratativa: ["em_tratativa", "em_atendimento"],
  aguardando_cliente: ["aguardando_cliente"],
  resolvido: ["resolvido", "fechado", "concluida", "concluído", "concluido"],
};

export function normalizeStatusToColumn(rawStatus: string | null | undefined): string {
  const sRaw = (rawStatus || "").toString();
  const normalize = (v: string) => (v || "").toString().toLowerCase().replace(/[-\s]/g, "_");
  const s = normalize(sRaw);

  for (const col of KANBAN_COLUMNS) {
    const allowed = (STATUS_KEY_MAP[col] || [col]).map(normalize);
    if (allowed.includes(s)) return col;
    if (allowed.some((a) => a && s.includes(a))) return col;
    if (allowed.some((a) => a && a.includes(s))) return col;
  }

  // fallback: return 'novo' as default column
  return 'novo';
}
