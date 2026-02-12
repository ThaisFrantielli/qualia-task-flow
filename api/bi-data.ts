import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// Validate required environment variables
const requiredEnvVars = {
  ORACLE_PG_HOST: process.env.ORACLE_PG_HOST,
  ORACLE_PG_PORT: process.env.ORACLE_PG_PORT,
  ORACLE_PG_USER: process.env.ORACLE_PG_USER,
  ORACLE_PG_PASSWORD: process.env.ORACLE_PG_PASSWORD,
  ORACLE_PG_DATABASE: process.env.ORACLE_PG_DATABASE,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('[bi-data] Missing environment variables:', missingVars.join(', '));
  console.error('[bi-data] Available env keys:', Object.keys(process.env).filter(k => k.includes('PG')).join(', '));
}

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

// Whitelist of allowed tables to prevent SQL injection
const ALLOWED_TABLES = new Set([
  'dim_frota',
  'dim_contratos_locacao',
  'dim_movimentacao_patios',
  'dim_movimentacao_veiculos',
  'historico_situacao_veiculos',
  'hist_vida_veiculo_timeline',
  'fat_carro_reserva',
  'fat_manutencao_unificado',
  'fat_sinistros',
  'fat_multas',
  'agg_custos_detalhados',
  'fat_movimentacao_ocorrencias',
  'fat_precos_locacao',
  'agg_lead_time_etapas',
  'agg_funil_conversao',
  'agg_performance_usuarios',
  'fat_detalhe_itens_os_2022',
  'fat_detalhe_itens_os_2023',
  'fat_detalhe_itens_os_2024',
  'fat_detalhe_itens_os_2025',
  'fat_detalhe_itens_os_2026',
  'fato_financeiro_dre',
  'dim_clientes',
  'dim_alienacoes',
  'dim_condutores',
  'dim_fornecedores',
  'agg_dre_mensal',
]);

// In-memory cache (per serverless instance)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawTable = req.query.table;
  if (!rawTable || typeof rawTable !== 'string') {
    return res.status(400).json({ error: 'Missing "table" query parameter' });
  }

  // Normalize: remove .json suffix, remove trailing year suffixes for base matching
  const table = rawTable.replace(/\.json$/, '');

  if (!ALLOWED_TABLES.has(table)) {
    return res.status(403).json({ error: `Table "${table}" is not allowed` });
  }

  // Optional limit parameter (default: no limit for small tables, 50000 for safety)
  const limitParam = req.query.limit;
  const limit = limitParam ? Math.min(parseInt(String(limitParam), 10), 100000) : 50000;

  // Check cache
  const cacheKey = `${table}_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return res.status(200).json(cached.data);
  }

  let client;
  try {
    client = await pool.connect();
    let result;
    if (table === 'dim_contratos_locacao') {
      // NOTE: ensure Postgres uses the exact cased column names when necessary.
      // The query below aliases JSON extraction fields using double-quoted identifiers
      // so that consumers can reference them unambiguously (e.g. c."IdContratoLocacao").
      // Verified: all selected aliases below use double quotes for case-sensitive names.
      // Enriquecer contratos com dados da frota via LEFT JOIN (c.PlacaPrincipal = f.Placa)
      result = await client.query(
        `WITH contratos AS (
            SELECT
              to_jsonb(c)->>'IdContratoLocacao' AS "IdContratoLocacao",
              to_jsonb(c)->>'ContratoLocacao' AS "ContratoLocacao",
              to_jsonb(c)->>'NumeroContrato' AS "NumeroContrato",
              to_jsonb(c)->>'id_contrato_locacao' AS "id_contrato_locacao",
              to_jsonb(c)->>'NomeCliente' AS "NomeCliente",
              to_jsonb(c)->>'nome_cliente' AS "nome_cliente",
              to_jsonb(c)->>'PlacaPrincipal' AS "PlacaPrincipal",
              to_jsonb(c)->>'placaprincipal' AS "placaprincipal",
              to_jsonb(c)->>'PlacaReserva' AS "PlacaReserva",
              to_jsonb(c)->>'placa_reserva' AS "placa_reserva",
              to_jsonb(c)->>'TipoVeiculoTemporario' AS "TipoVeiculoTemporario",
              to_jsonb(c)->>'tipo_veiculo_temporario' AS "tipo_veiculo_temporario",
              to_jsonb(c)->>'TipoLocacao' AS "TipoLocacao",
              to_jsonb(c)->>'DataInicio' AS "DataInicio",
              to_jsonb(c)->>'DataInicial' AS "DataInicial",
              to_jsonb(c)->>'DataTermino' AS "DataTermino",
              to_jsonb(c)->>'DataFinal' AS "DataFinal",
              to_jsonb(c)->>'ValorMensalAtual' AS "ValorMensalAtual",
              to_jsonb(c)->>'ValorLocacao' AS "ValorLocacao",
              to_jsonb(c)->>'SituacaoContratoLocacao' AS "SituacaoContratoLocacao",
              to_jsonb(c)->>'SituacaoContrato' AS "SituacaoContrato",
              to_jsonb(c)->>'DataEncerramento' AS "DataEncerramento",
              to_jsonb(c)->>'ContratoComercial' AS "ContratoComercial",
              UPPER(TRIM(COALESCE(to_jsonb(c)->>'PlacaPrincipal', to_jsonb(c)->>'placaprincipal', ''))) AS placa_norm
            FROM public."dim_contratos_locacao" c
            LIMIT $1
          ),
          frota AS (
            SELECT
              COALESCE(to_jsonb(f)->>'Placa', to_jsonb(f)->>'placa') AS "plate",
              COALESCE(to_jsonb(f)->>'Montadora', to_jsonb(f)->>'montadora') AS "Montadora",
              COALESCE(to_jsonb(f)->>'Modelo', to_jsonb(f)->>'modelo', to_jsonb(f)->>'modelo_veiculo') AS "Modelo",
              COALESCE(to_jsonb(f)->>'Categoria', to_jsonb(f)->>'categoria', to_jsonb(f)->>'GrupoVeiculo', to_jsonb(f)->>'grupoveiculo') AS "Categoria",
              COALESCE(to_jsonb(f)->>'KmInformado', to_jsonb(f)->>'kminformado', to_jsonb(f)->>'currentKm', to_jsonb(f)->>'km') AS "currentKm",
              COALESCE(to_jsonb(f)->>'IdadeVeiculo', to_jsonb(f)->>'idadeveiculo', to_jsonb(f)->>'ageMonths') AS "ageMonths",
              COALESCE(to_jsonb(f)->>'ValorFipeAtual', to_jsonb(f)->>'valorfipeatual', to_jsonb(f)->>'ValorFipe', to_jsonb(f)->>'valorfipe') AS "valorFipeAtual",
              COALESCE(to_jsonb(f)->>'ValorCompra', to_jsonb(f)->>'valorcompra') AS "ValorCompra",
              UPPER(TRIM(COALESCE(to_jsonb(f)->>'Placa', to_jsonb(f)->>'placa', ''))) AS placa_norm
            FROM public."dim_frota" f
          )
          SELECT
            c."IdContratoLocacao",
            c."ContratoLocacao",
            c."NumeroContrato",
            c."id_contrato_locacao",
            c."NomeCliente",
            c."nome_cliente",
            c."PlacaPrincipal",
            c."placaprincipal",
            c."PlacaReserva",
            c."placa_reserva",
            c."TipoVeiculoTemporario",
            c."tipo_veiculo_temporario",
            c."TipoLocacao",
            c."DataInicio",
            c."DataInicial",
            c."DataTermino",
            c."DataFinal",
            c."ValorMensalAtual",
            c."ValorLocacao",
            c."SituacaoContratoLocacao",
            c."SituacaoContrato",
            c."DataEncerramento",
            c."ContratoComercial",
            f."plate",
            f."Montadora",
            f."Modelo",
            f."Categoria",
            f."currentKm",
            f."ageMonths",
            f."valorFipeAtual",
            f."ValorCompra"
          FROM contratos c
          LEFT JOIN frota f ON c.placa_norm = f.placa_norm`,
        [limit]
      );
    } else {
      result = await client.query(`SELECT * FROM public."${table}" LIMIT $1`, [limit]);
    }

    // Convert BigInt to Number if needed
    const rows = result.rows.map((row: Record<string, unknown>) => {
      const converted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        converted[key] = typeof value === 'bigint' ? Number(value) : value;
      }
      return converted;
    });

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

    // Store in cache
    cache.set(cacheKey, { data: payload, timestamp: Date.now() });

    // Set cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return res.status(200).json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[bi-data] Error querying table "${table}":`, message);
    return res.status(500).json({
      error: 'Database query failed',
      details: message,
    });
  } finally {
    if (client) client.release();
  }
}
