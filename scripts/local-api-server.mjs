/**
 * Servidor local que replica /api/bi-data-batch e /api/bi-data para
 * dev local sem precisar de `vercel dev` ou deploy.
 *
 * Uso:
 *   node scripts/local-api-server.mjs
 *
 * Depois, em .env.local defina:
 *   VITE_API_TARGET=http://localhost:3001
 *
 * E inicie o Vite normalmente:
 *   npm run dev
 */

import http from 'node:http';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

// Carrega .env.local (credenciais do BD)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const { Pool } = pg;

const primaryPool = new Pool({
  host: process.env.ORACLE_PG_HOST || 'db.qcptedntbdsvqplrrqpi.supabase.co',
  port: parseInt(process.env.ORACLE_PG_PORT || '5432'),
  user: process.env.ORACLE_PG_USER || 'postgres',
  password: process.env.ORACLE_PG_PASSWORD || '',
  database: process.env.ORACLE_PG_DATABASE || 'postgres',
  max: 20,                      // mais conexões para suportar React StrictMode (double-invoke)
  min: 2,                       // mantém conexões abertas e prontas
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  query_timeout: 60000,         // 60s timeout por query
  allowExitOnIdle: true,
  ssl: { rejectUnauthorized: false },
});

const heavyPool = new Pool({
  host: process.env.HEAVY_PG_HOST || process.env.ORACLE_PG_HOST || 'db.qcptedntbdsvqplrrqpi.supabase.co',
  port: parseInt(process.env.HEAVY_PG_PORT || '5432'),
  user: process.env.HEAVY_PG_USER || process.env.ORACLE_PG_USER || 'postgres',
  password: process.env.HEAVY_PG_PASSWORD || process.env.ORACLE_PG_PASSWORD || '',
  database: process.env.HEAVY_PG_DATABASE || process.env.ORACLE_PG_DATABASE || 'postgres',
  max: 20,
  min: 2,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  query_timeout: 60000,
  allowExitOnIdle: true,
  ssl: { rejectUnauthorized: false },
});

const HEAVY_TABLES = new Set([
  'fat_faturamentos',
  'fat_faturamento_itens',
  'fat_itens_ordem_servico',
  'fat_movimentacao_ocorrencias',
]);

function isHeavyTable(table) {
  if (HEAVY_TABLES.has(table)) return true;
  const t = String(table || '').toLowerCase();
  return t.includes('faturamento') || t.includes('itens_os');
}

function getPoolForTable(table) {
  return isHeavyTable(table) ? heavyPool : primaryPool;
}

const ALLOWED_TABLES = new Set([
  'dim_frota', 'dim_contratos_locacao', 'dim_movimentacao_patios',
  'dim_movimentacao_veiculos', 'historico_situacao_veiculos',
  'hist_vida_veiculo_timeline', 'fat_carro_reserva', 'fat_manutencao_unificado',
  'fat_sinistros', 'fat_multas', 'fat_faturamentos', 'fat_faturamento_itens',
  'agg_custos_detalhados', 'fat_movimentacao_ocorrencias', 'fat_precos_locacao',
  'agg_lead_time_etapas', 'agg_funil_conversao', 'agg_performance_usuarios',
  'fat_detalhe_itens_os_2022', 'fat_detalhe_itens_os_2023',
  'fat_detalhe_itens_os_2024', 'fat_detalhe_itens_os_2025',
  'fat_detalhe_itens_os_2026', 'fat_itens_ordem_servico', 'fato_financeiro_dre',
  'dim_clientes', 'dim_alienacoes', 'dim_condutores', 'dim_fornecedores',
  'agg_dre_mensal', 'dim_compras',
]);

const FIELD_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const DW_PREFERRED_COLS = ['DataAtualizacaoDados', 'dataatualizacaodados'];
const DW_FALLBACK_COLS  = ['DataAtualizacao', 'dataatualizacao', 'UltimaAtualizacao', 'ultimaatualizacao', 'updated_at', 'UpdatedAt', 'DataCarga', 'datacarga'];
const ETL_COLS         = ['DataExecucaoETL', 'DataExecucaoEtl', 'dataexecucaoetl', 'DataExecucao', 'dataexecucao', 'etl_executed_at', 'ETLExecutedAt', 'DataCargaDW', 'datacargadw'];

function parseDateLike(v) {
  if (v == null) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(String(v).trim().replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

function maxTimestamp(rows, cols) {
  if (!rows?.length) return undefined;
  const colSet = new Set(cols.map(c => c.toLowerCase()));
  let max = null;
  for (const row of rows) {
    for (const [k, v] of Object.entries(row)) {
      if (!colSet.has(k.toLowerCase())) continue;
      const d = parseDateLike(v);
      if (d && (max === null || d.getTime() > max)) max = d.getTime();
    }
  }
  return max != null ? new Date(max).toISOString() : undefined;
}

function fmtBrasilia(iso) {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(d);
}

function buildMetadata(rows, tableName) {
  const dwLastUpdate = maxTimestamp(rows, DW_PREFERRED_COLS) || maxTimestamp(rows, DW_FALLBACK_COLS);
  const etlExecutedAt = maxTimestamp(rows, ETL_COLS);
  return {
    generated_at: new Date().toISOString(),
    source: 'local-dev',
    table: tableName,
    record_count: rows.length,
    dw_last_update: dwLastUpdate,
    dw_last_update_local: fmtBrasilia(dwLastUpdate),
    etl_executed_at: etlExecutedAt,
    etl_executed_at_local: fmtBrasilia(etlExecutedAt),
  };
}

function isUndefinedTableError(err) {
  const code = err && typeof err === 'object' ? err.code : undefined;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return code === '42P01' || /relation\s+"?.+"?\s+does not exist/i.test(msg);
}

function normalizeTimelineFallbackRows(rows) {
  return rows.map((r) => {
    const tipo = r.TipoEvento ?? r.Evento ?? r.Status ?? r.status ?? r.Situacao ?? r.situacao ?? 'STATUS';
    const data = r.DataEvento ?? r.Data ?? r.UltimaAtualizacao ?? r.ultimaatualizacao ?? null;
    return {
      ...r,
      TipoEvento: tipo,
      DataEvento: data,
    };
  });
}

async function queryWithTimelineFallback(dbPool, table, sqlText, params = []) {
  try {
    const resp = await dbPool.query(sqlText, params);
    return { rows: resp.rows, usedFallback: false };
  } catch (err) {
    if (table === 'hist_vida_veiculo_timeline' && isUndefinedTableError(err)) {
      const fallback = await dbPool.query('SELECT * FROM "historico_situacao_veiculos"');
      return { rows: normalizeTimelineFallbackRows(fallback.rows), usedFallback: true };
    }
    throw err;
  }
}

async function handleBatch(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const tablesParam = url.searchParams.get('tables') || '';
  const yearParam = url.searchParams.get('year');
  const limitParam = parseInt(url.searchParams.get('limit') || '50000', 10);
  const limitDefault = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100000) : 50000;
  const tables = tablesParam.split(',').map(t => t.trim()).filter(Boolean);

  if (!tables.length) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'No tables specified' }));
  }

  const invalid = tables.filter(t => !ALLOWED_TABLES.has(t));
  if (invalid.length) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: `Tables not allowed: ${invalid.join(', ')}` }));
  }

  const results = {};
  // pool.query() libera a conexão automaticamente após cada query
  for (const table of tables) {
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    const dbPool = getPoolForTable(table);
    // Protege cada query para que uma falha não derrube toda a rota
    try {
      let rows;
      if (yearParam && (table === 'fat_faturamentos' || table === 'fat_faturamento_itens')) {
        if (table === 'fat_faturamentos') {
          // DataCompetencia é TEXT formato '2026-01-01T...' — filtrar por LEFT(col,4)
          const resp = await dbPool.query(
            `SELECT * FROM "${safeTable}" WHERE LEFT("DataCompetencia", 4) = $1 ORDER BY "DataCompetencia" DESC`,
            [String(yearParam)]
          );
          rows = resp.rows;
        } else {
          // fat_faturamento_itens: JOIN para filtrar pelo ano da fatura
          const resp = await dbPool.query(
            `SELECT i.* FROM "${safeTable}" i
             INNER JOIN public.fat_faturamentos f ON f."IdNota" = i."IdNota"
             WHERE LEFT(f."DataCompetencia", 4) = $1
             ORDER BY i."IdItemNota" ASC`,
            [String(yearParam)]
          );
          rows = resp.rows;
        }
      } else {
        if (table === 'fat_itens_ordem_servico') {
          const resp = await dbPool.query(
            `SELECT *
             FROM "${safeTable}"
             ORDER BY COALESCE("DataCriacaoOcorrencia", "DataAtualizacaoDados") DESC
             LIMIT $1`,
            [limitDefault]
          );
          rows = resp.rows;
        } else {
          const resp = await queryWithTimelineFallback(dbPool, table, `SELECT * FROM "${safeTable}" LIMIT ${limitDefault}`);
          rows = resp.rows;
          if (resp.usedFallback) {
            console.warn('[local-api] hist_vida_veiculo_timeline ausente; usando fallback historico_situacao_veiculos');
          }
        }
      }
      results[table] = {
        data: rows,
        record_count: rows.length,
        metadata: buildMetadata(rows, table),
      };
      console.log(`  [OK] ${table}: ${rows.length} rows`);
    } catch (err) {
      // Em caso de erro (p.ex. ECONNRESET), logamos e retornamos erro por tabela
      console.error(`[local-api] Error querying ${table}:`, err.message);
      results[table] = {
        error: String(err.message),
        data: [],
        record_count: 0,
        metadata: buildMetadata([], table),
      };
      // tentar liberar a conexão e continuar com próximas tabelas
      try { await dbPool.query('SELECT 1'); } catch (_) { /* swallow */ }
    }
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({
    results,
    metadata: { generated_at: new Date().toISOString(), source: 'local-dev' },
  }));
}

async function handleSingle(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const table = url.searchParams.get('table') || '';
  const yearParam = url.searchParams.get('year');
  const limitParam = parseInt(url.searchParams.get('limit') || '50000', 10);
  const limitDefault = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100000) : 50000;

  if (!table || !ALLOWED_TABLES.has(table)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: `Table not allowed: ${table}` }));
  }

  try {
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    const dbPool = getPoolForTable(table);
    let rows;
    if (yearParam && (table === 'fat_faturamentos' || table === 'fat_faturamento_itens')) {
      if (table === 'fat_faturamentos') {
        const resp = await dbPool.query(
          `SELECT * FROM "${safeTable}" WHERE LEFT("DataCompetencia", 4) = $1 ORDER BY "DataCompetencia" DESC`,
          [String(yearParam)]
        );
        rows = resp.rows;
      } else {
        const resp = await dbPool.query(
          `SELECT i.* FROM "${safeTable}" i
           INNER JOIN public.fat_faturamentos f ON f."IdNota" = i."IdNota"
           WHERE LEFT(f."DataCompetencia", 4) = $1
           ORDER BY i."IdItemNota" ASC`,
          [String(yearParam)]
        );
        rows = resp.rows;
      }
    } else {
      if (table === 'fat_itens_ordem_servico') {
        const resp = await dbPool.query(
          `SELECT *
           FROM "${safeTable}"
           ORDER BY COALESCE("DataCriacaoOcorrencia", "DataAtualizacaoDados") DESC
           LIMIT $1`,
          [limitDefault]
        );
        rows = resp.rows;
      } else {
        let query = `SELECT * FROM "${safeTable}" LIMIT ${limitDefault}`;
        if (table === 'historico_situacao_veiculos') {
          query = `SELECT * FROM "${safeTable}" ORDER BY "UltimaAtualizacao" ASC LIMIT ${limitDefault}`;
        }
        const resp = await queryWithTimelineFallback(dbPool, table, query);
        rows = resp.rows;
        if (resp.usedFallback) {
          console.warn('[local-api] /api/bi-data fallback ativo para timeline');
        }
      }
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ data: rows, record_count: rows.length }));
    console.log(`  [OK] ${table}: ${rows.length} rows`);
  } catch (err) {
    console.error(`[local-api] Error querying ${table}:`, err.message);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({
      data: [],
      record_count: 0,
      metadata: {
        generated_at: new Date().toISOString(),
        source: 'local-dev',
        table,
        error: err.message,
      },
    }));
  }
}

const PORT = 3001;

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS' });
    return res.end();
  }

  const pathname = new URL(req.url, `http://localhost`).pathname;
  console.log(`[local-api] ${req.method} ${req.url}`);

  try {
    if (pathname === '/api/bi-data-batch') return await handleBatch(req, res);
    if (pathname === '/api/bi-data') return await handleSingle(req, res);

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    console.error('[local-api] Error:', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n✅ Local API server rodando em http://localhost:${PORT}`);
  console.log(`   Servindo: /api/bi-data-batch e /api/bi-data`);
  console.log(`   Banco PRIMARY: ${process.env.ORACLE_PG_HOST}:${process.env.ORACLE_PG_PORT}/${process.env.ORACLE_PG_DATABASE}`);
  console.log(`   Banco HEAVY:   ${process.env.HEAVY_PG_HOST || process.env.ORACLE_PG_HOST}:${process.env.HEAVY_PG_PORT || process.env.ORACLE_PG_PORT}/${process.env.HEAVY_PG_DATABASE || process.env.ORACLE_PG_DATABASE}\n`);
});
