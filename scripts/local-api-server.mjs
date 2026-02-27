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

const pool = new Pool({
  host: process.env.ORACLE_PG_HOST || '137.131.163.167',
  port: parseInt(process.env.ORACLE_PG_PORT || '5432'),
  user: process.env.ORACLE_PG_USER || 'postgres',
  password: process.env.ORACLE_PG_PASSWORD || 'F4tu5xy3',
  database: process.env.ORACLE_PG_DATABASE || 'bluconecta_dw',
  max: 20,                      // mais conexões para suportar React StrictMode (double-invoke)
  min: 2,                       // mantém conexões abertas e prontas
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  query_timeout: 60000,         // 60s timeout por query
  allowExitOnIdle: true,
  ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
});

const ALLOWED_TABLES = new Set([
  'dim_frota', 'dim_contratos_locacao', 'dim_movimentacao_patios',
  'dim_movimentacao_veiculos', 'historico_situacao_veiculos',
  'hist_vida_veiculo_timeline', 'fat_carro_reserva', 'fat_manutencao_unificado',
  'fat_sinistros', 'fat_multas', 'fat_faturamentos', 'fat_faturamento_itens',
  'agg_custos_detalhados', 'fat_movimentacao_ocorrencias', 'fat_precos_locacao',
  'agg_lead_time_etapas', 'agg_funil_conversao', 'agg_performance_usuarios',
  'fat_detalhe_itens_os_2022', 'fat_detalhe_itens_os_2023',
  'fat_detalhe_itens_os_2024', 'fat_detalhe_itens_os_2025',
  'fat_detalhe_itens_os_2026', 'fato_financeiro_dre',
  'dim_clientes', 'dim_alienacoes', 'dim_condutores', 'dim_fornecedores',
  'agg_dre_mensal', 'dim_compras',
]);

const FIELD_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function getUpdateMetadata(rows) {
  if (!rows?.length) return null;
  const first = rows[0];
  const keys = Object.keys(first).map(k => k.toLowerCase());
  const find = (candidates) => {
    for (const c of candidates) {
      if (keys.includes(c.toLowerCase())) {
        return first[Object.keys(first).find(k => k.toLowerCase() === c.toLowerCase())];
      }
    }
    return null;
  };
  const dw = find(['DataAtualizacaoDados', 'dataatualizacaodados']);
  const fallback = find(['DataAtualizacao', 'dataatualizacao', 'UltimaAtualizacao', 'updated_at', 'DataCarga']);
  const etl = find(['DataExecucaoETL', 'dataexecucaoetl', 'DataCargaDW']);
  return { dw_data_update: dw, fallback_update: fallback, etl_execution: etl };
}

async function handleBatch(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const tablesParam = url.searchParams.get('tables') || '';
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
    const { rows } = await pool.query(`SELECT * FROM "${safeTable}"`);
    const meta = getUpdateMetadata(rows);
    results[table] = {
      data: rows,
      record_count: rows.length,
      metadata: meta,
    };
    console.log(`  [OK] ${table}: ${rows.length} rows`);
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

  if (!table || !ALLOWED_TABLES.has(table)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: `Table not allowed: ${table}` }));
  }

  const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '');
  let query = `SELECT * FROM "${safeTable}"`;
  // Garantir ordenação cronológica para tabelas de histórico —
  // resolveStatusForDate no frontend itera do fim do array para o início
  // assumindo que índices maiores = eventos mais recentes.
  if (table === 'historico_situacao_veiculos') {
    query += ` ORDER BY "UltimaAtualizacao" ASC`;
  }
  const { rows } = await pool.query(query);
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({ data: rows, record_count: rows.length }));
  console.log(`  [OK] ${table}: ${rows.length} rows`);
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
  console.log(`   Banco: ${process.env.ORACLE_PG_HOST}:${process.env.ORACLE_PG_PORT}/${process.env.ORACLE_PG_DATABASE}\n`);
});
