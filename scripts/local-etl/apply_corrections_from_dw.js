require('dotenv').config();
const sql = require('mssql');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || '200.219.192.34',
  port: parseInt(process.env.SQL_PORT || '3494', 10),
  database: process.env.SQL_DATABASE || 'blufleet-dw',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 0
};

const pgPool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: process.env.PG_PORT || 5432,
  user: (process.env.PG_USER || '').toLowerCase().trim(),
  password: (process.env.PG_PASSWORD || '').trim(),
  database: (process.env.PG_DATABASE || 'bluconecta_dw').toLowerCase().trim(),
});

function normalizeNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/\./g, '').replace(/,/g, '.');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

async function queryDWForNumero(numero, month) {
  const fromDate = new Date(month + '-01T00:00:00');
  const toDate = new Date(fromDate.getFullYear(), fromDate.getMonth()+1, 0, 23,59,59,999);
  const pool = await sql.connect(sqlConfig);
  const req = pool.request();
  req.input('fromDate', sql.DateTime, fromDate);
  req.input('toDate', sql.DateTime, toDate);
  req.input('num', sql.VarChar(100), String(numero));

  const q = `SELECT
    ln.NumeroLancamento as NumeroLancamento,
    CASE WHEN CHARINDEX(',', ISNULL(CAST(ISNULL(ln.ValorPagoRecebido,0) AS VARCHAR),'0'))>0
         THEN TRY_CAST(REPLACE(REPLACE(ISNULL(CAST(ISNULL(ln.ValorPagoRecebido,0) AS VARCHAR),'0'),'.',''),',','.') AS DECIMAL(20,2))
         ELSE TRY_CAST(ISNULL(ln.ValorPagoRecebido,0) AS DECIMAL(20,2)) END as Valor
  FROM LancamentosComNaturezas ln WITH (NOLOCK, INDEX(0))
  WHERE ln.DataCompetencia >= @fromDate AND ln.DataCompetencia <= @toDate
    AND CAST(ln.NumeroLancamento AS VARCHAR(100)) = @num`;

  const res = await req.query(q);
  await pool.close();
  const sum = res.recordset.reduce((s,r)=>s + Number(r.Valor||0),0);
  return sum;
}

function parseCsvRows(csvPath) {
  const content = fs.readFileSync(csvPath,'utf8').split('\n').filter(Boolean);
  if (content.length <= 1) return [];
  const header = content[0].split(',').map(h=>h.replace(/"/g,'').trim());
  const idxNumero = header.indexOf('NumeroLancamento');
  const idxData = header.indexOf('DataCompetencia');
  const idxDiff = header.indexOf('Diff');
  const arr = [];
  for (let i=1;i<content.length;i++){
    const cols = content[i].split(',');
    const numero = cols[idxNumero] ? cols[idxNumero].replace(/"/g,'').trim() : '';
    const data = cols[idxData] ? cols[idxData].replace(/"/g,'').trim() : '';
    const diff = cols[idxDiff] ? Number(cols[idxDiff].replace(/"/g,'').trim()) : 0;
    if (!numero) continue;
    if (Math.abs(diff) < 0.005) continue; // ignore near-zero
    arr.push({ numero, month: (data||'').substring(0,7), diff });
  }
  return arr;
}

async function findValorColumn(client) {
  const colsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'fato_financeiro_dre'`);
  const cols = colsRes.rows.map(r=>r.column_name);
  const candidate = cols.find(c => c.toLowerCase().includes('valor')) || cols.find(c => c.toLowerCase().includes('valorpag')) || 'Valor';
  return candidate;
}

(async function main(){
  try{
    const csvPaths = process.argv.slice(2);
    if (!csvPaths || csvPaths.length === 0) {
      console.error('Usage: node apply_corrections_from_dw.js <reconcile_csv1> [csv2 ...]');
      process.exit(2);
    }

    const pgClient = await pgPool.connect();
    const valorCol = await findValorColumn(pgClient);
    const idColRes = await pgClient.query(`SELECT column_name FROM information_schema.columns WHERE table_name='fato_financeiro_dre' AND column_name ILIKE '%idlancamento%' LIMIT 1`);
    const idCol = idColRes.rows[0] ? idColRes.rows[0].column_name : 'IdLancamentoNatureza';

    for (const csvPath of csvPaths) {
      const items = parseCsvRows(csvPath);
      console.log('Found', items.length, 'items in', csvPath);
      for (const it of items) {
        process.stdout.write(`Fixing ${it.numero} ${it.month} ... `);
        const dwSum = await queryDWForNumero(it.numero, it.month);
        // fetch local rows from Postgres
        const selQ = `SELECT "${idCol}" as id, "NumeroLancamento" as numerolancamento, "DataCompetencia" as datacomp, "${valorCol}" as valor FROM fato_financeiro_dre WHERE "NumeroLancamento" = $1`;
        const res = await pgClient.query(selQ, [it.numero]);
        const localRows = res.rows.map(r => ({ id: r.id, valor: normalizeNumber(r.valor) }));
        const localSum = localRows.reduce((s,r)=>s + Number(r.valor||0),0);
        if (localRows.length === 0) {
          console.log('no local rows, skipping');
          continue;
        }
        if (Math.abs(localSum - dwSum) < 0.005) { console.log('already equal'); continue; }
        // if localSum is zero, set first row to dwSum
        const updates = [];
        if (localSum === 0) {
          updates.push({ id: localRows[0].id, newVal: Number(dwSum.toFixed(2)) });
          for (let k=1;k<localRows.length;k++) updates.push({ id: localRows[k].id, newVal: 0 });
        } else {
          const scale = dwSum / localSum;
          for (const r of localRows) {
            const nv = Math.round((r.valor * scale) * 100) / 100;
            updates.push({ id: r.id, newVal: nv });
          }
          // adjust rounding residual to match exactly
          const newSum = updates.reduce((s,u)=>s + u.newVal,0);
          const residual = Math.round((dwSum - newSum) * 100) / 100;
          if (Math.abs(residual) >= 0.01) {
            updates[0].newVal = Math.round((updates[0].newVal + residual) * 100) / 100;
          }
        }

        // apply updates in transaction
        await pgClient.query('BEGIN');
        try{
          for (const u of updates) {
            const q = `UPDATE fato_financeiro_dre SET "${valorCol}" = $1 WHERE "${idCol}" = $2`;
            await pgClient.query(q, [u.newVal, u.id]);
          }
          await pgClient.query('COMMIT');
          console.log('applied');
        }catch(e){
          await pgClient.query('ROLLBACK');
          console.log('error applying, rolled back:', e.message);
        }
      }
    }

    pgClient.release();
    await pgPool.end();
    process.exit(0);
  }catch(e){
    console.error('Error apply corrections:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
