import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, type PoolClient } from 'pg';

const pool = new Pool({
  host: process.env.ORACLE_PG_HOST || '137.131.163.167',
  port: parseInt(process.env.ORACLE_PG_PORT || '5432'),
  user: process.env.ORACLE_PG_USER || 'postgres',
  password: process.env.ORACLE_PG_PASSWORD || 'F4tu5xy3',
  database: process.env.ORACLE_PG_DATABASE || 'bluconecta_dw',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 7000,
  ssl: false,
});

const ALLOWED_TABLES = new Set([
  'dim_frota', 'dim_contratos_locacao', 'dim_movimentacao_patios',
  'dim_movimentacao_veiculos', 'historico_situacao_veiculos',
  'hist_vida_veiculo_timeline', 'fat_carro_reserva', 'fat_manutencao_unificado',
  'fat_sinistros', 'fat_multas', 'fat_faturamentos', 'fat_faturamento_itens', 'agg_custos_detalhados',
  'fat_movimentacao_ocorrencias', 'fat_precos_locacao',
  'agg_lead_time_etapas', 'agg_funil_conversao', 'agg_performance_usuarios',
  'fat_detalhe_itens_os_2022', 'fat_detalhe_itens_os_2023',
  'fat_detalhe_itens_os_2024', 'fat_detalhe_itens_os_2025',
  'fat_detalhe_itens_os_2026', 'fato_financeiro_dre',
  'dim_clientes', 'dim_alienacoes', 'dim_condutores', 'dim_fornecedores',
  'agg_dre_mensal', 'dim_compras',
]);

const FIELD_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

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

function buildContratosQuery(): string {
  return `
    SELECT
      c."IdContratoLocacao", c."ContratoLocacao",
      c."NumeroContratoLocacao" AS "NumeroContrato",
      c."NomeCliente", c."PlacaPrincipal", c."PlacaReserva",
      c."DataInicial" AS "DataInicial",
      c."DataFinal" AS "DataFinal",
      c."DataInicial" AS "DataInicio",
      c."DataFinal" AS "DataTermino",
      c."ContratoDeOrigem" AS "ContratoDeOrigem",
      c."DataMigracao" AS "DataMigracao",
      c."OrigemMigracao" AS "OrigemMigracao",
      c."TipoVeiculoTemporario",
      c."TipoDeContrato" AS "TipoLocacao",
      c."UltimoValorLocacao" AS "ValorMensalAtual",
      c."UltimoValorLocacao" AS "ValorLocacao",
      c."SituacaoContratoLocacao",
      c."SituacaoContratoLocacao" AS "SituacaoContrato",
      c."DataEncerramento", c."ContratoComercial",
      f.*, 
      f."GrupoVeiculo" AS "Categoria",
      f."OdometroConfirmado" AS "KmConfirmado",
      f."IdadeEmMeses" AS "IdadeEmMeses",
      f."IdadeEmMeses" AS "IdadeVeiculo",
      f."ValorAtualFIPE" AS "ValorFipe",
      f."ValorCompra",
      COALESCE(md_contrato.estrategia, md_placa.estrategia) AS estrategia,
      COALESCE(md_contrato.valor_aquisicao, md_placa.valor_aquisicao) AS valor_aquisicao,
      COALESCE(md_contrato.observacoes, md_placa.observacoes) AS observacoes,
      COALESCE(md_contrato.modelo_aquisicao, md_placa.modelo_aquisicao) AS modelo_aquisicao
    FROM public."dim_contratos_locacao" c
    LEFT JOIN public."dim_frota" f
      ON UPPER(TRIM(COALESCE(c."PlacaPrincipal", ''))) = UPPER(TRIM(COALESCE(f."Placa", '')))
    -- Join user-saved metadata (by placa or by contrato id)
    LEFT JOIN public.dim_contratos_metadata md_placa
      ON md_placa.id_referencia = UPPER(TRIM(COALESCE(c."PlacaPrincipal", '')))
    LEFT JOIN public.dim_contratos_metadata md_contrato
      ON TRIM(c."NumeroContratoLocacao") = TRIM(md_contrato.id_referencia)
    -- Expose metadata fields as top-level columns
    LIMIT $1
  `;
}

interface TableRequest {
  table: string;
  fields?: string[];
  limit: number;
  year?: number;
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
  const yearParam = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
  const validYear = yearParam && yearParam > 2000 && yearParam < 2100 ? yearParam : undefined;

  const requests = parseTableRequests(rawTables, fieldsParam, limitDefault).map(r => ({ ...r, year: validYear }));
  if (requests.length === 0) {
    return res.status(400).json({ error: 'No valid tables requested' });
  }

  const batchCacheKey = `batch_${rawTables}_${fieldsParam || '*'}_${limitDefault}_y${validYear ?? 'all'}`;
  const cached = cache.get(batchCacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(cached.data);
  }

  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
  } catch (connErr: unknown) {
    const connMsg = connErr instanceof Error ? connErr.message : String(connErr);
    console.error('[bi-data-batch] Connection failed:', connMsg);
    // Return 200 with empty per-table payloads so the UI degrades gracefully
    const emptyResults = Object.fromEntries(
      requests.map(r => [
        r.table,
        {
          record_count: 0,
          metadata: {
            generated_at: new Date().toISOString(),
            source: 'live' as const,
            table: r.table,
            record_count: 0,
            error: `DB connection failed: ${connMsg}`,
          },
          data: [] as Record<string, unknown>[],
        },
      ])
    );
    return res.status(200).json({
      metadata: {
        generated_at: new Date().toISOString(),
        source: 'live' as const,
        tables: requests.map(r => r.table),
        cached: false,
        error: `DB connection failed: ${connMsg}`,
      },
      results: emptyResults,
    });
  }

  try {
    const results = await Promise.all(
      requests.map(async (r) => {
        const tableCacheKey = `batch_${r.table}_${r.fields?.join(',') || '*'}`;
        const tableCached = cache.get(tableCacheKey);
        if (tableCached && (Date.now() - tableCached.timestamp) < CACHE_TTL) {
          return { table: r.table, ...(tableCached.data as any) };
        }

        let result;
        try {
        if (r.table === 'dim_contratos_locacao') {
          try {
            result = await client.query(buildContratosQuery(), [r.limit]);
          } catch (metaErr: unknown) {
            // Fallback: metadata table may not exist yet — run without it
            console.warn('[bi-data-batch] dim_contratos_locacao with metadata failed, falling back:', metaErr instanceof Error ? metaErr.message : metaErr);
            result = await client.query(
              `SELECT c.*, f.*,
                 f."GrupoVeiculo" AS "Categoria",
                 f."OdometroConfirmado" AS "KmConfirmado",
                 f."IdadeEmMeses" AS "IdadeVeiculo",
                 f."ValorAtualFIPE" AS "ValorFipe"
               FROM public."dim_contratos_locacao" c
               LEFT JOIN public."dim_frota" f
                 ON UPPER(TRIM(COALESCE(c."PlacaPrincipal", ''))) = UPPER(TRIM(COALESCE(f."Placa", '')))
               LIMIT $1`,
              [r.limit]
            );
          }
        } else if (r.table === 'fat_faturamentos') {
          // DataCompetencia é TEXT no formato ISO '2026-01-01T...' — usar LEFT() para filtrar por ano
          if (r.year) {
            result = await client.query(
              `SELECT * FROM public."fat_faturamentos"
               WHERE LEFT("DataCompetencia", 4) = CAST($2 AS TEXT)
               ORDER BY "DataCompetencia" DESC LIMIT $1`,
              [r.limit, r.year]
            );
          } else {
            result = await client.query(
              `SELECT * FROM public."fat_faturamentos" ORDER BY "DataCompetencia" DESC LIMIT $1`,
              [r.limit]
            );
          }
        } else if (r.table === 'fat_faturamento_itens') {
          // Filtrar itens pelo ano da fatura via JOIN — DataCompetencia é TEXT
          if (r.year) {
            result = await client.query(
              `SELECT i.* FROM public."fat_faturamento_itens" i
               INNER JOIN public."fat_faturamentos" f ON f."IdNota" = i."IdNota"
               WHERE LEFT(f."DataCompetencia", 4) = CAST($2 AS TEXT)
               ORDER BY i."IdItemNota" ASC LIMIT $1`,
              [r.limit, r.year]
            );
          } else {
            result = await client.query(
              `SELECT i.* FROM public."fat_faturamento_itens" i
               INNER JOIN public."fat_faturamentos" f ON f."IdNota" = i."IdNota"
               ORDER BY f."DataCompetencia" DESC, i."IdItemNota" ASC LIMIT $1`,
              [r.limit]
            );
          }
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

        const dwLastUpdate = extractDwLastUpdate(rows);
        const etlExecutedAt = getMaxTimestampFromColumns(rows, ETL_EXECUTION_COLUMNS);

        const tablePayload = {
          record_count: rows.length,
          metadata: {
            generated_at: new Date().toISOString(),
            source: 'live' as const,
            table: r.table,
            record_count: rows.length,
            dw_last_update: dwLastUpdate,
            dw_last_update_local: formatPtBrDateTime(dwLastUpdate),
            etl_executed_at: etlExecutedAt,
            etl_executed_at_local: formatPtBrDateTime(etlExecutedAt),
          },
          data: rows,
        };
        cache.set(tableCacheKey, { data: tablePayload, timestamp: Date.now() });
        return { table: r.table, ...tablePayload };
        } catch (tableErr: unknown) {
          const msg = tableErr instanceof Error ? tableErr.message : String(tableErr);
          console.error(`[bi-data-batch] Table "${r.table}" query failed:`, msg);
          const emptyPayload = {
            record_count: 0,
            metadata: {
              generated_at: new Date().toISOString(),
              source: 'live' as const,
              table: r.table,
              record_count: 0,
              error: msg,
            },
            data: [] as Record<string, unknown>[],
          };
          return { table: r.table, ...emptyPayload };
        }
      })
    );

    const payload = {
      metadata: {
        generated_at: new Date().toISOString(),
        source: 'live' as const,
        tables: requests.map(r => r.table),
        cached: false,
      },
      results: Object.fromEntries(results.map(r => [r.table, { record_count: r.record_count, metadata: r.metadata, data: r.data }])) ,
    };

    cache.set(batchCacheKey, { data: payload, timestamp: Date.now() });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[bi-data-batch] Error:`, message);
    // Return 200 with empty results so the UI degrades gracefully
    const emptyResults = Object.fromEntries(
      requests.map(r => [
        r.table,
        {
          record_count: 0,
          metadata: {
            generated_at: new Date().toISOString(),
            source: 'live' as const,
            table: r.table,
            record_count: 0,
            error: message,
          },
          data: [] as Record<string, unknown>[],
        },
      ])
    );
    return res.status(200).json({
      metadata: {
        generated_at: new Date().toISOString(),
        source: 'live' as const,
        tables: requests.map(r => r.table),
        cached: false,
        error: message,
      },
      results: emptyResults,
    });
  } finally {
    client?.release();
  }
}
