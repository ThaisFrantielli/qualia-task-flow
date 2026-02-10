require('dotenv').config();
const fs = require('fs');
const sql = require('mssql');
const { Pool } = require('pg');

const RUNSYNC = 'scripts/local-etl/run-sync-v2.js';
const SELECTED = [
  'dim_contratos_locacao','dim_frota','dim_movimentacao_patios','dim_movimentacao_veiculos',
  'fat_carro_reserva','fat_financeiro_universal','fat_manutencao_unificado','fat_movimentacao_ocorrencias',
  'fat_multas','fat_sinistros','hist_vida_veiculo_timeline','historico_situacao_veiculos'
];

function extractQueries(fileContent) {
  const re = /\{[\s\S]*?table:\s*'([^']+)'[\s\S]*?query:\s*`([\s\S]*?)`/g;
  const matches = new Map();
  let m;
  while ((m = re.exec(fileContent)) !== null) {
    matches.set(m[1], m[2].trim());
  }
  return matches;
}

function sanitizeForSubquery(q) {
  // remove final ORDER BY or OPTION (...) which break subqueries in SQL Server
  q = q.replace(/ORDER\s+BY[\s\S]*$/i, '');
  q = q.replace(/OPTION\s*\([^\)]*\)\s*$/i, '');
  return q.trim();
}

(async () => {
  const content = fs.readFileSync(RUNSYNC, 'utf8');
  const queries = extractQueries(content);

  const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER || '200.219.192.34',
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT) : 3494,
    database: process.env.SQL_DATABASE || 'blufleet-dw',
    options: { encrypt: false, trustServerCertificate: true }
  };

  const pgPool = new Pool({
    host: process.env.PG_HOST || '137.131.163.167',
    port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'F4tu5xy3',
    database: process.env.PG_DATABASE || 'bluconecta_dw'
  });

  let sqlPool;
  try {
    sqlPool = await sql.connect(sqlConfig);
  } catch (e) {
    console.error('SQL Server connection error:', e.message);
    process.exit(1);
  }

  try { await pgPool.connect(); } catch(e) { console.error('PG conn error', e.message); process.exit(1);} 

  console.log('Table'.padEnd(36), 'Source(SQL)'.padStart(12), 'Target(PG)'.padStart(12), 'Diff'.padStart(12));

  for (const table of SELECTED) {
    const rawQuery = queries.get(table);
    let srcCount = 'ERR';
    if (rawQuery) {
      const q = sanitizeForSubquery(rawQuery);
      const countSql = `SELECT COUNT(*) as c FROM ( ${q} ) AS _sub`;
      try {
        const r = await sqlPool.request().query(countSql);
        srcCount = r.recordset && r.recordset[0] ? parseInt(r.recordset[0].c) : 0;
      } catch (e) {
        // fallback to simple FROM table count
        try {
          const m = q.match(/FROM\s+([A-Za-z0-9_\[\]\.]+)\s*(WHERE[\s\S]*)?$/i);
          if (m) {
            const simple = `SELECT COUNT(*) as c FROM ${m[1]} ${m[2] || ''}`;
            const r2 = await sqlPool.request().query(simple);
            srcCount = r2.recordset && r2.recordset[0] ? parseInt(r2.recordset[0].c) : 0;
          } else {
            srcCount = `ERR:${e.message.split('\n')[0]}`;
          }
        } catch (e2) {
          srcCount = `ERR:${e2.message.split('\n')[0]}`;
        }
      }
    } else {
      srcCount = 'NO_QUERY';
    }

    let tgtCount = 'ERR';
    try {
      const r = await pgPool.query(`SELECT COUNT(*) as c FROM public."${table}"`);
      tgtCount = r.rows && r.rows[0] ? parseInt(r.rows[0].c) : 0;
    } catch (e) {
      tgtCount = `ERR:${e.message.split('\n')[0]}`;
    }

    const diff = (typeof srcCount === 'number' && typeof tgtCount === 'number') ? srcCount - tgtCount : 'NA';
    console.log(table.padEnd(36), String(srcCount).padStart(12), String(tgtCount).padStart(12), String(diff).padStart(12));
  }

  await sql.close();
  await pgPool.end();
})();
