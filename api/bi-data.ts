import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// PostgreSQL connection to Oracle Cloud server
const pool = new Pool({
  host: process.env.ORACLE_PG_HOST || '137.131.163.167',
  port: parseInt(process.env.ORACLE_PG_PORT || '5432'),
  user: process.env.ORACLE_PG_USER || 'postgres',
  password: process.env.ORACLE_PG_PASSWORD || '',
  database: process.env.ORACLE_PG_DATABASE || 'bluconecta_dw',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: false,
});

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
  'agg_dre_mensal',
]);

// Allowed fields per table (whitelist to prevent injection via fields param)
const FIELD_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// In-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Special query for dim_contratos_locacao with direct column access + JOIN
function buildContratosQuery(fields?: string[]): string {
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
      f."IdadeVeiculo" AS "IdadeVeiculo",
      f."IdadeVeiculo" AS "IdadeEmMeses",
      f."ValorAtualFIPE" AS "ValorFipe",
      m.estrategia as "estrategia_salva", 
      m.valor_aquisicao_zero as "valor_zero_salvo", 
      m.observacoes as "observacoes_salvas",
      m.modelo_aquisicao as "modelo_aquisicao"
    FROM public."dim_contratos_locacao" c
    LEFT JOIN public."dim_frota" f 
      ON UPPER(TRIM(c."PlacaPrincipal")) = UPPER(TRIM(f."Placa"))
    LEFT JOIN public.dim_contratos_metadata m 
      ON c."PlacaPrincipal" = m.id_referencia
    LIMIT $1
  `;
}

export async function queryTable(
  table: string,
  limit: number,
  fields?: string[]
): Promise<{ rows: Record<string, unknown>[]; }> {
  const client = await pool.connect();
  try {
    let result;
    if (table === 'dim_contratos_locacao') {
      result = await client.query(buildContratosQuery(fields), [limit]);
    } else if (fields && fields.length > 0) {
      // Validate field names
      const safeFields = fields.filter(f => FIELD_REGEX.test(f));
      if (safeFields.length === 0) {
        result = await client.query(`SELECT * FROM public."${table}" LIMIT $1`, [limit]);
      } else {
        const cols = safeFields.map(f => `"${f}"`).join(', ');
        result = await client.query(`SELECT ${cols} FROM public."${table}" LIMIT $1`, [limit]);
      }
    } else {
      result = await client.query(`SELECT * FROM public."${table}" LIMIT $1`, [limit]);
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

  const limitParam = req.query.limit;
  const limit = limitParam ? Math.min(parseInt(String(limitParam), 10), 100000) : 50000;
  const fields = parseFields(req.query.fields as string | undefined);

  // Check cache
  const cacheKey = `${table}_${limit}_${fields?.join(',') || '*'}`;
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(cached.data);
  }

  try {
    const { rows } = await queryTable(table, limit, fields);

    const payload = {
      metadata: {
        generated_at: new Date().toISOString(),
        source: 'live' as const,
        table,
        record_count: rows.length,
        cached: false,
      },
      data: rows,
    };

    cache.set(cacheKey, { data: payload, timestamp: Date.now() });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[bi-data] Error querying table "${table}":`, message);
    return res.status(500).json({ error: 'Database query failed', details: message });
  }
}
