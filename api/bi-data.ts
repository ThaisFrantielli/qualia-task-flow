import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// PostgreSQL connection to Supabase DW (Primary)
const primaryPool = new Pool({
  host: process.env.ORACLE_PG_POOLER_HOST || process.env.PG_POOLER_HOST || process.env.ORACLE_PG_HOST || 'db.qcptedntbdsvqplrrqpi.supabase.co',
  port: parseInt(process.env.ORACLE_PG_POOLER_PORT || process.env.PG_POOLER_PORT || process.env.ORACLE_PG_PORT || '5432'),
  user: process.env.ORACLE_PG_POOLER_USER || process.env.PG_POOLER_USER || process.env.ORACLE_PG_USER || 'postgres',
  password: process.env.ORACLE_PG_PASSWORD || process.env.PG_PASSWORD || '',
  database: process.env.ORACLE_PG_DATABASE || process.env.PG_DATABASE || 'postgres',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 7000,
  ssl: { rejectUnauthorized: false },
});

// PostgreSQL connection to Supabase DW (Heavy)
const heavyPool = new Pool({
  host: process.env.HEAVY_PG_POOLER_HOST || process.env.HEAVY_PG_HOST || process.env.ORACLE_PG_POOLER_HOST || process.env.ORACLE_PG_HOST || 'db.qcptedntbdsvqplrrqpi.supabase.co',
  port: parseInt(process.env.HEAVY_PG_POOLER_PORT || process.env.HEAVY_PG_PORT || process.env.ORACLE_PG_POOLER_PORT || process.env.ORACLE_PG_PORT || '5432'),
  user: process.env.HEAVY_PG_POOLER_USER || process.env.HEAVY_PG_USER || process.env.ORACLE_PG_POOLER_USER || process.env.ORACLE_PG_USER || 'postgres',
  password: process.env.HEAVY_PG_PASSWORD || process.env.ORACLE_PG_PASSWORD || process.env.PG_PASSWORD || '',
  database: process.env.HEAVY_PG_DATABASE || process.env.ORACLE_PG_DATABASE || process.env.PG_DATABASE || 'postgres',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 7000,
  ssl: { rejectUnauthorized: false },
});

const HEAVY_TABLES = new Set([
  'fat_faturamentos',
  'fat_faturamento_itens',
  'fat_itens_ordem_servico',
  'fat_movimentacao_ocorrencias',
]);

function isHeavyTable(table: string): boolean {
  if (HEAVY_TABLES.has(table)) return true;
  const t = table.toLowerCase();
  return t.includes('faturamento') || t.includes('itens_os');
}

// Whitelist of allowed tables
const ALLOWED_TABLES = new Set([
  'dim_frota', 'dim_contratos_locacao', 'dim_movimentacao_patios',
  'dim_movimentacao_veiculos', 'historico_situacao_veiculos',
  'hist_vida_veiculo_timeline', 'fat_carro_reserva', 'fat_manutencao_unificado',
  'fat_sinistros', 'fat_multas', 'agg_custos_detalhados',
  'fat_movimentacao_ocorrencias', 'fat_precos_locacao',
  'agg_lead_time_etapas', 'agg_funil_conversao', 'agg_performance_usuarios',
  'fat_detalhe_itens_os_2022', 'fat_detalhe_itens_os_2023',
  'fat_detalhe_itens_os_2024', 'fat_detalhe_itens_os_2025',
  'fat_detalhe_itens_os_2026', 'fato_financeiro_dre',
  'dim_clientes', 'dim_alienacoes', 'dim_condutores', 'dim_fornecedores',
  'agg_dre_mensal', 'dim_compras',
  'fluxo_caixa_projetado',
  'fat_faturamentos', 'fat_faturamento_itens',
  'fat_itens_ordem_servico',
]);

// Allowed fields per table (whitelist to prevent injection via fields param)
const FIELD_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// In-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const DW_UPDATE_PREFERRED_COLUMNS = [
  'DataAtualizacaoDados',
  'dataatualizacaodados',
];

const DW_UPDATE_FALLBACK_COLUMNS = [
  'DataAtualizacao',
  'dataatualizacao',
  'UltimaAtualizacao',
  'ultimaatualizacao',
  'updated_at',
  'UpdatedAt',
  'DataCarga',
  'datacarga',
];

const ETL_EXECUTION_COLUMNS = [
  'DataExecucaoETL',
  'DataExecucaoEtl',
  'dataexecucaoetl',
  'DataExecucao',
  'dataexecucao',
  'etl_executed_at',
  'ETLExecutedAt',
  'DataCargaDW',
  'datacargadw',
];

function parseDateLike(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().replace(' ', 'T');
    if (!normalized) return null;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function getMaxTimestampFromColumns(
  rows: Record<string, unknown>[],
  columnCandidates: string[]
): string | undefined {
  if (!rows.length) return undefined;

  const candidateSet = new Set(columnCandidates.map(c => c.toLowerCase()));
  let maxTs: number | null = null;

  for (const row of rows) {
    for (const [key, raw] of Object.entries(row)) {
      if (!candidateSet.has(key.toLowerCase())) continue;
      const parsed = parseDateLike(raw);
      if (!parsed) continue;
      const ts = parsed.getTime();
      if (maxTs == null || ts > maxTs) {
        maxTs = ts;
      }
    }
  }

  return maxTs != null ? new Date(maxTs).toISOString() : undefined;
}

function extractDwLastUpdate(rows: Record<string, unknown>[]): string | undefined {
  return (
    getMaxTimestampFromColumns(rows, DW_UPDATE_PREFERRED_COLUMNS) ||
    getMaxTimestampFromColumns(rows, DW_UPDATE_FALLBACK_COLUMNS)
  );
}

function formatPtBrDateTime(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' };
  return new Intl.DateTimeFormat('pt-BR', opts).format(d);
}

// Special query for dim_contratos_locacao with direct column access + JOIN
function buildContratosQuery(_fields?: string[]): string {
  // Direct column access — no to_jsonb overhead
  return `
    SELECT 
      c.*, 
      c."DataInicial" AS "DataInicial",
      c."DataFinal" AS "DataFinal",
      c."ContratoDeOrigem" AS "ContratoDeOrigem",
      c."DataMigracao" AS "DataMigracao",
      c."OrigemMigracao" AS "OrigemMigracao",
      f.*, 
      f."GrupoVeiculo" AS "Categoria",
      f."OdometroConfirmado" AS "KmConfirmado",
      f."IdadeEmMeses" AS "IdadeEmMeses",
      f."IdadeEmMeses" AS "IdadeVeiculo",
      f."ValorAtualFIPE" AS "ValorFipe",
      m.estrategia as "estrategia_salva",
      m.valor_aquisicao as "valor_aquisicao",
      m.observacoes as "observacoes_salvas",
      m.acao_usuario as "acao_usuario",
      m.modelo_aquisicao as "modelo_aquisicao"
    FROM public."dim_contratos_locacao" c
    LEFT JOIN public."dim_frota" f 
      ON regexp_replace(UPPER(TRIM(c."PlacaPrincipal")), '[^A-Z0-9]', '', 'g') = regexp_replace(UPPER(TRIM(f."Placa")), '[^A-Z0-9]', '', 'g')
    LEFT JOIN public.dim_contratos_metadata m 
      ON UPPER(TRIM(c."ContratoLocacao"::text)) = UPPER(TRIM(m.id_referencia::text))
    LIMIT $1
  `;
}

function isUndefinedTableError(err: unknown): boolean {
  const code = typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code?: unknown }).code)
    : '';
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return code === '42P01' || /relation\s+"?.+"?\s+does not exist/i.test(msg);
}

function normalizeTimelineFallbackRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    ...r,
    TipoEvento: r.TipoEvento ?? r.Evento ?? r.Status ?? r.status ?? r.Situacao ?? r.situacao ?? 'STATUS',
    DataEvento: r.DataEvento ?? r.Data ?? r.UltimaAtualizacao ?? r.ultimaatualizacao ?? null,
  }));
}

export async function queryTable(
  table: string,
  limit: number,
  fields?: string[]
): Promise<{ rows: Record<string, unknown>[]; }> {
  const pool = isHeavyTable(table) ? heavyPool : primaryPool;
  const client = await pool.connect();
  try {
    let result;
    if (table === 'dim_contratos_locacao') {
      try {
        result = await client.query(buildContratosQuery(fields), [limit]);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err));
        console.warn('[bi-data] dim_contratos_locacao query with joins failed, falling back to simple select:', errMsg);
        // fallback to a simple select to avoid breaking the API when auxiliary tables are missing or schema differs
        result = await client.query(`SELECT * FROM public."dim_contratos_locacao" LIMIT $1`, [limit]);
      }
    } else if (fields && fields.length > 0) {
      // Validate field names
      const safeFields = fields.filter(f => FIELD_REGEX.test(f));
      if (safeFields.length === 0) {
        result = await client.query(`SELECT * FROM public."${table}" LIMIT $1`, [limit]);
      } else {
        const cols = safeFields.map(f => `"${f}"`).join(', ');
        result = await client.query(`SELECT ${cols} FROM public."${table}" LIMIT $1`, [limit]);
      }
    } else if (table === 'historico_situacao_veiculos') {
      // Ordenar por data ASC para que a iteração do frontend (do mais recente para o mais antigo) funcione corretamente
      result = await client.query(`SELECT * FROM public."${table}" ORDER BY "UltimaAtualizacao" ASC LIMIT $1`, [limit]);
    } else {
      try {
        result = await client.query(`SELECT * FROM public."${table}" LIMIT $1`, [limit]);
      } catch (err) {
        if (table === 'hist_vida_veiculo_timeline' && isUndefinedTableError(err)) {
          const fallback = await client.query(`SELECT * FROM public."historico_situacao_veiculos" LIMIT $1`, [limit]);
          const rows = normalizeTimelineFallbackRows(
            fallback.rows as Record<string, unknown>[]
          );
          return { rows };
        }
        throw err;
      }
    }

    // Convert BigInt to Number
    const rows = result.rows.map((row: Record<string, unknown>) => {
      const converted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        converted[key] = typeof value === 'bigint' ? Number(value) : value;
      }
      return converted;
    });

    return { rows };
  } finally {
    client.release();
  }
}

async function buildCashflowProjection(req: VercelRequest, limit: number) {
  // Fetch contratos with joined frota and metadata via existing helper
  const { rows } = await queryTable('dim_contratos_locacao', limit);

  // Filters from query params (client, categoria, filial)
  const clienteFilter = typeof req.query.cliente === 'string' ? req.query.cliente.toLowerCase() : undefined;
  const categoriaFilter = typeof req.query.categoria === 'string' ? req.query.categoria.toLowerCase() : undefined;
  const filialFilter = typeof req.query.filial === 'string' ? req.query.filial.toLowerCase() : undefined;

  const today = new Date();

  // Helper to read string/number fields safely
  const toNumber = (v: unknown) => {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const cleaned = v.replace(/[^0-9.,-]/g, '').replace(',', '.');
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : 0;
    }
    if (typeof v === 'bigint') return Number(v);
    return 0;
  };

  // Pre-process rows: apply filters and extract relevant fields
  const processed = rows.map(r => {
    const vencStr = (r['DataEncerramento'] ?? r['DataFinal'] ?? r['datafinal'] ?? r['DataFinal']) as string | undefined;
    const dataInicialStr = (r['DataInicial'] ?? r['Inicio'] ?? r['dataInicial']) as string | undefined;
    const dataFinalStr = (r['DataFinal'] ?? r['DataFinal'] ?? r['datafinal']) as string | undefined;
    const vencimento = vencStr ? new Date(vencStr) : (dataFinalStr ? new Date(dataFinalStr) : null);

    const ultimoVal = toNumber(r['UltimoValorLocacao'] ?? r['ValorMensalAtual'] ?? r['ValorMensalAtual'] ?? r['ValorMensalAtual'] ?? r['ValorMensalAtual'] ?? r['ValorMensalAtual'] ?? r['ValorMensalAtual'] ?? r['ValorMensalAtual'] ?? r['ValorMensalAtual'] ?? r['ValorMensalAtual'] ?? r['ValorMensalAtual'] ?? r['ValorMensalAtual'] ?? r['ValorMensalAtual'] ?? r['CustoAtual'] ?? r['ValorMensalAtual'] ?? r['ValorMensalAtual']);
    const valorFipe = toNumber(r['ValorFipe'] ?? r['valorFipeAtual'] ?? r['valorFipe'] ?? r['valorFipeAtual']);
    const valorAquisicao = toNumber(r['valor_aquisicao'] ?? r['ValorAquisicao'] ?? r['valorAquisicao']);
    const estrategia = (r['estrategia_salva'] ?? r['estrategia'] ?? r['Estrategia'] ?? '') as string;

    // status checks - exclude if Encerrado or Vendido in any plausible status field
    const statusFields = ['Status', 'status', 'SituacaoContrato', 'SituacaoContratoLocacao', 'SituacaoContrato', 'StatusLocacao', 'statuslocacao', 'SituacaoDoFaturamento'];
    const isExcluded = statusFields.some(k => {
      const v = r[k];
      return typeof v === 'string' && /encerrado|vendido/i.test(v);
    });

    const cliente = (r['NomeCliente'] ?? r['nomecliente'] ?? r['Cliente'] ?? r['cliente']) as string | undefined;
    const categoria = (r['Categoria'] ?? r['categoria'] ?? r['GrupoVeiculo'] ?? r['grupoveiculo']) as string | undefined;
    const filial = (r['Filial'] ?? r['filial']) as string | undefined;

    return {
      raw: r,
      vencimento,
      dataInicial: dataInicialStr ? new Date(dataInicialStr) : null,
      dataFinal: dataFinalStr ? new Date(dataFinalStr) : null,
      ultimoVal,
      valorFipe,
      valorAquisicao,
      estrategia: estrategia ?? '',
      isExcluded,
      cliente: cliente ?? '',
      categoria: categoria ?? '',
      filial: filial ?? '',
    };
  }).filter(r => {
    // apply global filters (case-insensitive substring)
    if (clienteFilter && !r.cliente.toLowerCase().includes(clienteFilter)) return false;
    if (categoriaFilter && !r.categoria.toLowerCase().includes(categoriaFilter)) return false;
    if (filialFilter && !r.filial.toLowerCase().includes(filialFilter)) return false;
    return true;
  });

  // Build months range up to the latest DataFinal/vencimento among processed contracts
  const maxEndTime = processed.reduce((max, c) => {
    const d = c.dataFinal ?? c.vencimento;
    if (!d) return max;
    const t = d.getTime();
    return t > max ? t : max;
  }, 0);

  const months: Array<{ year: number; month: number }> = [];
  if (maxEndTime > 0) {
    const last = new Date(maxEndTime);
    // start from current month
    let cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(last.getFullYear(), last.getMonth(), 1);
    while (cursor <= end) {
      months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  } else {
    // fallback to 24 months
    for (let i = 0; i < 24; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
  }

  // Initial faturamento: sum UltimoValorLocacao of contracts active today (DataInicial <= today <= DataFinal) and not excluded
  const initalFaturamento = processed.reduce((sum, c) => {
    const start = c.dataInicial; const end = c.dataFinal;
    const active = start && end && start <= today && today <= end && !c.isExcluded;
    return sum + (active ? c.ultimoVal : 0);
  }, 0);

  // Helper: retorna true para QUALQUER estratégia de renovação (não gera perda de receita)
  const isAnyRenewal = (estr: string): boolean => {
    const low = estr.toLowerCase();
    return (
      estr === 'RENEW_PERIOD' ||
      estr === 'RENEW_PERIOD_RAISE' ||
      estr === 'RENEW_SWAP_ZERO' ||
      estr === 'RENEW_SWAP_SEMINOVO' ||
      low.includes('renova') // cobre variações textuais (ex: "Renova com troca zero", etc.)
    );
  };

  const rowsByMonth = months.map(m => {
  const monthStart = new Date(m.year, m.month - 1, 1);
  const monthEnd = new Date(m.year, m.month, 0);
    // perdaPrevista = apenas contratos que REALMENTE encerram (sem nenhuma estratégia de renovação)
    // Renova mesmo veículo / troca zero / troca seminovo → NÃO entram na perda
    const loss = processed.reduce((s, c) => {
      if (!c.vencimento) return s;
      if (c.isExcluded) return s;
      if (c.vencimento.getFullYear() === m.year && (c.vencimento.getMonth() + 1) === m.month) {
        if (!isAnyRenewal(c.estrategia)) return s + c.ultimoVal;
      }
      return s;
    }, 0);

    const valorFipeVenda = processed.reduce((s, c) => {
      if (!c.vencimento) return s;
      if (c.vencimento.getFullYear() === m.year && (c.vencimento.getMonth() + 1) === m.month) return s + c.valorFipe;
      return s;
    }, 0);

    const qtdeVenda = processed.reduce((n, c) => {
      if (!c.vencimento) return n;
      if (c.vencimento.getFullYear() === m.year && (c.vencimento.getMonth() + 1) === m.month) return n + 1;
      return n;
    }, 0);

    const valorEstAquisicao = processed.reduce((s, c) => {
      if (!c.vencimento) return s;
      if (c.vencimento.getFullYear() === m.year && (c.vencimento.getMonth() + 1) === m.month) {
        const eAq = String(c.estrategia);
        const isSwapZero =
          eAq === 'RENEW_SWAP_ZERO' ||
          eAq.toLowerCase().includes('renova com troca (zero)') ||
          eAq.toLowerCase().includes('renova com troca zero');
        if (isSwapZero) return s + c.valorAquisicao;
      }
      return s;
    }, 0);

    const qtdeAquisicao = processed.reduce((n, c) => {
      if (!c.vencimento) return n;
      if (c.vencimento.getFullYear() === m.year && (c.vencimento.getMonth() + 1) === m.month) {
        const eAq = String(c.estrategia);
        const isSwapZero =
          eAq === 'RENEW_SWAP_ZERO' ||
          eAq.toLowerCase().includes('renova com troca (zero)') ||
          eAq.toLowerCase().includes('renova com troca zero');
        if (isSwapZero) return n + 1;
      }
      return n;
    }, 0);

    // Renovação = receita retida pelos contratos que renovam (informativo)
    // NÃO é somada ao faturamentoFinal pois esses contratos já não saíram da base (não entraram em loss)
    const receitaRenovacoes = processed.reduce((s, c) => {
      if (!c.vencimento) return s;
      if (c.vencimento.getFullYear() === m.year && (c.vencimento.getMonth() + 1) === m.month) {
        if (isAnyRenewal(c.estrategia)) return s + c.ultimoVal;
      }
      return s;
    }, 0);

    const qtdeRenovacoes = processed.reduce((n, c) => {
      if (!c.vencimento) return n;
      if (c.vencimento.getFullYear() === m.year && (c.vencimento.getMonth() + 1) === m.month) {
        if (isAnyRenewal(c.estrategia)) return n + 1;
      }
      return n;
    }, 0);

    const activeCount = processed.reduce((n, c) => {
      const start = c.dataInicial;
      const end = c.dataFinal;
      const activeInMonth = start && start <= monthEnd && (!end || end >= monthStart) && !c.isExcluded;
      return activeInMonth ? n + 1 : n;
    }, 0);

    return {
      year: m.year,
      month: m.month,
      loss,
      valorFipeVenda,
      qtdeVenda,
      valorEstAquisicao,
      qtdeAquisicao,
      receitaRenovacoes,
      qtdeRenovacoes,
      activeCount,
    };
  });

  // Build final sequence with faturamento inicial/final
  const result: Array<Record<string, unknown>> = [];
  let prevFaturamento = initalFaturamento;
  for (let i = 0; i < rowsByMonth.length; i++) {
    const r = rowsByMonth[i];
    const faturamentoInicial = prevFaturamento;
    // faturamentoFinal = faturamentoInicial - perdaPrevista
    // (apenas encerrados reais reduzem o faturamento; renovados já ficam na base)
    const faturamentoFinal = faturamentoInicial - r.loss;
    result.push({
      mes: `${String(r.month).padStart(2, '0')}/${r.year}`,
      faturamentoInicial: Number(faturamentoInicial.toFixed(2)),
      perdaPrevista: Number(r.loss.toFixed(2)),
      receitaEstimada: Number(r.receitaRenovacoes.toFixed(2)),
      faturamentoFinal: Number(faturamentoFinal.toFixed(2)),
      qtdeParaVenda: r.qtdeVenda,
      valorFipeVenda: Number(r.valorFipeVenda.toFixed(2)),
      qtdeParaAquisicao: r.qtdeAquisicao,
      valorEstimadoAquisicao: Number(r.valorEstAquisicao.toFixed(2)),
      qtdeRenovacoes: r.qtdeRenovacoes,
      activeCount: r.activeCount,
    });
    prevFaturamento = faturamentoFinal;
  }

  return {
    metadata: {
      generated_at: new Date().toISOString(),
      source: 'projection',
      months: result.length,
      filtros: { cliente: clienteFilter, categoria: categoriaFilter, filial: filialFilter },
      initial_faturamento: Number(initalFaturamento.toFixed(2)),
      contracts_count: processed.length,
    },
    data: result,
  };
}

function parseFields(raw: string | string[] | undefined): string[] | undefined {
  if (!raw) return undefined;
  const str = typeof raw === 'string' ? raw : raw[0];
  return str.split(',').map(f => f.trim()).filter(Boolean);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const rawTable = req.query.table;
  if (!rawTable || typeof rawTable !== 'string') {
    return res.status(400).json({ error: 'Missing "table" query parameter' });
  }

  const table = rawTable.replace(/\.json$/, '');
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(403).json({ error: `Table "${table}" is not allowed` });
  }

  // Tabelas com muitos registros precisam de limite maior
  const TABLE_LIMIT_OVERRIDES: Record<string, number> = {
    'historico_situacao_veiculos': 300000,
    'fat_manutencao_unificado': 150000,
  };
  const limitParam = req.query.limit;
  const defaultLimit = TABLE_LIMIT_OVERRIDES[table] ?? 50000;
  const limit = limitParam ? Math.min(parseInt(String(limitParam), 10), 300000) : defaultLimit;
  const fields = parseFields(req.query.fields as string | undefined);

  // Check cache (allow bust param to force refresh)
  const cacheKey = `${table}_${limit}_${fields?.join(',') || '*'}`;
  const forceRefresh = !!req.query.bust || !!req.query.refresh;
  const cached = cache.get(cacheKey);
  if (!forceRefresh && cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(cached.data);
  }

  try {
    if (table === 'fluxo_caixa_projetado') {
      const payload = await buildCashflowProjection(req, limit);
      cache.set(cacheKey, { data: payload, timestamp: Date.now() });
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json(payload);
    }

    const { rows } = await queryTable(table, limit, fields);

    const dwLastUpdate = extractDwLastUpdate(rows);
    const etlExecutedAt = getMaxTimestampFromColumns(rows, ETL_EXECUTION_COLUMNS);

    const payload = {
      metadata: {
        generated_at: new Date().toISOString(),
        source: 'live' as const,
        table,
        record_count: rows.length,
        dw_last_update: dwLastUpdate,
        dw_last_update_local: formatPtBrDateTime(dwLastUpdate),
        etl_executed_at: etlExecutedAt,
        etl_executed_at_local: formatPtBrDateTime(etlExecutedAt),
        cached: false,
      },
      data: rows,
    };

    cache.set(cacheKey, { data: payload, timestamp: Date.now() });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[bi-data] Error querying table "${table}":`, err);
    // Return 200 with empty data so the UI degrades gracefully instead of showing error state
    return res.status(200).json({
      metadata: {
        generated_at: new Date().toISOString(),
        source: 'live' as const,
        table,
        record_count: 0,
        cached: false,
        error: message,
      },
      data: [],
    });
  }
}
