require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || '200.219.192.34',
  port: parseInt(process.env.SQL_PORT || '3494', 10),
  database: process.env.SQL_DATABASE || 'blufleet-dw',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 0
};

function normalizeNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/\./g, '').replace(/,/g, '.');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

async function queryDWMonth(month) {
  const fromDate = new Date(month + '-01T00:00:00');
  const toDate = new Date(fromDate.getFullYear(), fromDate.getMonth()+1, 0, 23,59,59,999);
  const pool = await sql.connect(sqlConfig);
  const req = pool.request();
  req.input('fromDate', sql.DateTime, fromDate);
  req.input('toDate', sql.DateTime, toDate);
  const q = `SELECT
    CAST(ln.NumeroLancamento AS VARCHAR(100)) as NumeroLancamento,
    FORMAT(ln.DataCompetencia,'yyyy-MM-dd') as DataCompetencia,
    CASE WHEN CHARINDEX(',', ISNULL(CAST(ISNULL(ln.ValorPagoRecebido,0) AS VARCHAR),'0'))>0
         THEN TRY_CAST(REPLACE(REPLACE(ISNULL(CAST(ISNULL(ln.ValorPagoRecebido,0) AS VARCHAR),'0'),'.',''),',','.') AS DECIMAL(20,2))
         ELSE TRY_CAST(ISNULL(ln.ValorPagoRecebido,0) AS DECIMAL(20,2)) END as Valor
  FROM LancamentosComNaturezas ln WITH (NOLOCK, INDEX(0))
  WHERE ln.DataCompetencia >= @fromDate AND ln.DataCompetencia <= @toDate`;
  const res = await req.query(q);
  await pool.close();
  const map = new Map();
  res.recordset.forEach(r => {
    const k = String(r.NumeroLancamento);
    const dc = (r.DataCompetencia && r.DataCompetencia instanceof Date) ? r.DataCompetencia.toISOString().substring(0,10) : String(r.DataCompetencia || '');
    const cur = map.get(k) || { NumeroLancamento: k, DataCompetencia: dc, Valor:0 };
    cur.Valor += Number(r.Valor||0);
    map.set(k, cur);
  });
  return map; // Map<numero, {NumeroLancamento,DataCompetencia,Valor}>
}

function aggregateLocal(month) {
  const files = glob.sync('public/data/fato_financeiro_dre*.ndjson');
  const map = new Map();
  for (const f of files) {
    const s = fs.readFileSync(f,'utf8');
    s.split('\n').forEach(line => {
      if (!line || !line.trim()) return;
      try{
        const obj = JSON.parse(line);
        const mes = (obj.DataCompetencia||'').substring(0,7);
        if (mes !== month) return;
        const num = String(obj.NumeroLancamento);
        const cur = map.get(num) || { NumeroLancamento: num, DataCompetencia: obj.DataCompetencia || '', Valor: 0 };
        cur.Valor += normalizeNumber(obj.Valor || obj.ValorPagoRecebido || 0);
        map.set(num, cur);
      }catch(e){}
    });
  }
  return map;
}

function writeCsv(filePath, headers, rows) {
  const out = [headers.join(',')];
  for (const r of rows) {
    const line = headers.map(h => {
      const v = r[h] === undefined || r[h] === null ? '' : String(r[h]).replace(/"/g,'""');
      return v.includes(',') || v.includes(';') ? `"${v}"` : v;
    }).join(',');
    out.push(line);
  }
  fs.writeFileSync(filePath, out.join('\n'), 'utf8');
}

(async function main(){
  try{
    const months = process.argv.slice(2);
    if (!months || months.length === 0) { console.error('Usage: node export_all_lanc_diffs.js YYYY-MM [YYYY-MM ...]'); process.exit(2); }
    for (const month of months) {
      console.log('Processing', month);
      const dw = await queryDWMonth(month);
      const local = aggregateLocal(month);
      const allKeys = Array.from(new Set([...dw.keys(), ...local.keys()]));
      const rows = allKeys.map(k => {
        const d = dw.get(k); const l = local.get(k);
        const dwVal = d ? Number(d.Valor||0) : 0;
        const localVal = l ? Number(l.Valor||0) : 0;
        const diff = Math.round((dwVal - localVal) * 100) / 100;
        return { NumeroLancamento: k, DataCompetencia: (d && d.DataCompetencia) || (l && l.DataCompetencia) || '', DW: dwVal.toFixed(2), Local: localVal.toFixed(2), Diff: diff.toFixed(2) };
      }).filter(r => Math.abs(Number(r.Diff)) > 0.004).sort((a,b) => Math.abs(Number(b.Diff)) - Math.abs(Number(a.Diff)));

      const outPath = path.join('public','data', `dre_all_discrepancies_${month}.csv`);
      writeCsv(outPath, ['NumeroLancamento','DataCompetencia','DW','Local','Diff'], rows);
      console.log('Wrote', outPath, 'rows:', rows.length);
    }
    process.exit(0);
  }catch(e){ console.error('Error export all lanc diffs:', e && e.message ? e.message : e); process.exit(1);} 
})();
