require('dotenv').config();
const fs = require('fs');
const sql = require('mssql');
const { Pool } = require('pg');

const RUNSYNC = 'scripts/local-etl/run-sync-v2.js';

function extractQueries(fileContent) {
  const re = /\{[\s\S]*?table:\s*'([^']+)'[\s\S]*?query:\s*`([\s\S]*?)`/g;
  const matches = [];
  let m;
  while ((m = re.exec(fileContent)) !== null) {
    matches.push({ table: m[1], query: m[2].trim() });
  }
  return matches;
}

function removeTrailingOrderBy(q) {
  // remove final ORDER BY ... (simple heuristic)
  return q.replace(/ORDER\s+BY[\s\S]*$/i, '');
}

(async () => {
  const content = fs.readFileSync(RUNSYNC, 'utf8');
  const extracted = extractQueries(content);
  if (!extracted.length) {
    console.error('No queries extracted from', RUNSYNC);
    process.exit(1);
  }

  // Connect SQL Server
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

  try {
    await pgPool.connect();
  } catch (e) {
    console.error('Postgres connection error:', e.message);
    process.exit(1);
  }

  console.log('Table'.padEnd(36), 'Source(SQL)'.padStart(12), 'Target(PG)'.padStart(12), 'Diff'.padStart(12));

  for (const item of extracted) {
    const table = item.table;
    const srcQ = removeTrailingOrderBy(item.query);
    const countSql = `SELECT COUNT(*) as c FROM ( ${srcQ} ) AS _sub`;

    let srcCount = 'ERR';
    try {
      const r = await sqlPool.request().query(countSql);
      srcCount = r.recordset && r.recordset[0] ? parseInt(r.recordset[0].c || r.recordset[0].C || r.recordset[0].count || 0) : 0;
    } catch (e) {
      // fallback: try to detect a single source table FROM <table> and run simple count
      try {
        const m = item.query.match(/FROM\s+([\w\.\[\]]+)/i);
        if (m) {
          const simple = `SELECT COUNT(*) as c FROM ${m[1]}`;
          const r2 = await sqlPool.request().query(simple);
          srcCount = r2.recordset && r2.recordset[0] ? parseInt(r2.recordset[0].c || 0) : 0;
        } else {
          srcCount = `ERR:${e.message.split('\n')[0]}`;
        }
      } catch (e2) {
        srcCount = `ERR:${e2.message.split('\n')[0]}`;
      }
    }

    let tgtCount = 'ERR';
    try {
      const r = await pgPool.query(`SELECT COUNT(*) as c FROM public."${table}"`);
      tgtCount = r.rows && r.rows[0] ? parseInt(r.rows[0].c) : 0;
    } catch (e) {
      tgtCount = `ERR:${e.message.split('\n')[0]}`;
    }

    let diff = 'NA';
    if (typeof srcCount === 'number' && typeof tgtCount === 'number') diff = srcCount - tgtCount;

    console.log(table.padEnd(36), String(srcCount).padStart(12), String(tgtCount).padStart(12), String(diff).padStart(12));
  }

  await sql.close();
  await pgPool.end();
})();
