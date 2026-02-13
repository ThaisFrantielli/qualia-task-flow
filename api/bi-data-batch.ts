import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

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

const FIELD_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function buildContratosQuery(): string {
  return `
    SELECT
      c."IdContratoLocacao", c."ContratoLocacao", c."NumeroContrato",
      c."NomeCliente", c."PlacaPrincipal", c."PlacaReserva",
      c."DataInicial" AS "DataInicial",
      c."DataFinal" AS "DataFinal",
      c."ContratoDeOrigem" AS "ContratoDeOrigem",
      c."DataMigracao" AS "DataMigracao",
      c."OrigemMigracao" AS "OrigemMigracao",
      c."TipoVeiculoTemporario", c."TipoLocacao",
      c."DataInicio", c."DataTermino",
      c."ValorMensalAtual", c."ValorLocacao",
      c."SituacaoContratoLocacao", c."SituacaoContrato",
      c."DataEncerramento", c."ContratoComercial",
      f.*, 
      f."GrupoVeiculo" AS "Categoria",
      f."OdometroConfirmado" AS "KmConfirmado",
      f."IdadeEmMeses" AS "IdadeEmMeses",
      f."IdadeEmMeses" AS "IdadeVeiculo",
      f."ValorAtualFIPE" AS "ValorFipe",
      f."ValorCompra",
      COALESCE(md_contrato.estrategia, md_placa.estrategia) AS estrategia,
      COALESCE(md_contrato.valor_aquisicao_zero, md_placa.valor_aquisicao_zero) AS valor_aquisicao_zero,
      COALESCE(md_contrato.observacoes, md_placa.observacoes) AS observacoes,
      COALESCE(md_contrato.modelo_aquisicao, md_placa.modelo_aquisicao) AS modelo_aquisicao
    FROM public."dim_contratos_locacao" c
    LEFT JOIN public."dim_frota" f
      ON UPPER(TRIM(COALESCE(c."PlacaPrincipal", ''))) = UPPER(TRIM(COALESCE(f."Placa", '')))
    -- Join user-saved metadata (by placa or by contrato id)
    LEFT JOIN public.dim_contratos_metadata md_placa
      ON md_placa.id_referencia = UPPER(TRIM(COALESCE(c."PlacaPrincipal", '')))
    LEFT JOIN public.dim_contratos_metadata md_contrato
      ON md_contrato.id_referencia = CAST(c."IdContratoLocacao" AS TEXT)
    -- Expose metadata fields as top-level columns
    LIMIT $1
  `;
}

interface TableRequest {
  table: string;
  fields?: string[];
  limit: number;
}

function parseTableRequests(tablesStr: string, fieldsStr?: string, limitDefault = 50000): TableRequest[] {
  const tables = tablesStr.split(',').map(t => t.trim().replace(/\.json$/, '')).filter(Boolean);
  
  // Parse fields: format is "table1:col1,col2;table2:col3,col4" or just global "col1,col2"
  const fieldMap: Record<string, string[]> = {};
  if (fieldsStr) {
    const parts = fieldsStr.split(';');
    for (const part of parts) {
      const colonIdx = part.indexOf(':');
      if (colonIdx > 0) {
        const tbl = part.slice(0, colonIdx).trim();
        const cols = part.slice(colonIdx + 1).split(',').map(f => f.trim()).filter(f => FIELD_REGEX.test(f));
        if (cols.length) fieldMap[tbl] = cols;
      }
    }
  }

  return tables
    .filter(t => ALLOWED_TABLES.has(t))
    .map(t => ({ table: t, fields: fieldMap[t], limit: limitDefault }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const rawTables = req.query.tables;
  if (!rawTables || typeof rawTables !== 'string') {
    return res.status(400).json({ error: 'Missing "tables" query parameter' });
  }

  const limitParam = req.query.limit;
  const limitDefault = limitParam ? Math.min(parseInt(String(limitParam), 10), 100000) : 50000;
  const fieldsParam = typeof req.query.fields === 'string' ? req.query.fields : (Array.isArray(req.query.fields) ? String(req.query.fields[0]) : undefined);

  const requests = parseTableRequests(rawTables, fieldsParam, limitDefault);
  if (requests.length === 0) {
    return res.status(400).json({ error: 'No valid tables requested' });
  }

  const batchCacheKey = `batch_${rawTables}_${fieldsParam || '*'}_${limitDefault}`;
  const cached = cache.get(batchCacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(cached.data);
  }

  const client = await pool.connect();
  try {
    const results = await Promise.all(
      requests.map(async (r) => {
        const tableCacheKey = `batch_${r.table}_${r.fields?.join(',') || '*'}`;
        const tableCached = cache.get(tableCacheKey);
        if (tableCached && (Date.now() - tableCached.timestamp) < CACHE_TTL) {
          return { table: r.table, ...(tableCached.data as any) };
        }

        let result;
        if (r.table === 'dim_contratos_locacao') {
          result = await client.query(buildContratosQuery(), [r.limit]);
        } else if (r.fields && r.fields.length > 0) {
          const cols = r.fields.filter(f => FIELD_REGEX.test(f)).map(f => `"${f}"`).join(', ');
          result = await client.query(
            cols ? `SELECT ${cols} FROM public."${r.table}" LIMIT $1` : `SELECT * FROM public."${r.table}" LIMIT $1`,
            [r.limit]
          );
        } else {
          result = await client.query(`SELECT * FROM public."${r.table}" LIMIT $1`, [r.limit]);
        }

        const rows = result.rows.map((row: Record<string, unknown>) => {
          const converted: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(row)) {
            converted[key] = typeof value === 'bigint' ? Number(value) : value;
          }
          return converted;
        });

        const tablePayload = { record_count: rows.length, data: rows };
        cache.set(tableCacheKey, { data: tablePayload, timestamp: Date.now() });
        return { table: r.table, ...tablePayload };
      })
    );

    const payload = {
      metadata: {
        generated_at: new Date().toISOString(),
        source: 'live' as const,
        tables: requests.map(r => r.table),
        cached: false,
      },
      results: Object.fromEntries(results.map(r => [r.table, { record_count: r.record_count, data: r.data }])),
    };

    cache.set(batchCacheKey, { data: payload, timestamp: Date.now() });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[bi-data-batch] Error:`, message);
    return res.status(500).json({ error: 'Database query failed', details: message });
  } finally {
    client.release();
  }
}
