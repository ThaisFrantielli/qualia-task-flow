require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const glob = require('glob');
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

function normalizeNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/\./g, '').replace(/,/g, '.');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

async function queryDWMonth(month) {
  // month = 'YYYY-MM'
  const fromDate = new Date(month + '-01T00:00:00');
  const toDate = new Date(fromDate.getFullYear(), fromDate.getMonth()+1, 0, 23,59,59,999);
  const pool = await sql.connect(sqlConfig);
  const req = pool.request();
  req.input('fromDate', sql.DateTime, fromDate);
  req.input('toDate', sql.DateTime, toDate);

  const q = `SELECT
    ln.NumeroLancamento as NumeroLancamento,
    FORMAT(ln.DataCompetencia,'yyyy-MM-dd') as DataCompetencia,
    ln.Natureza,
    ln.Descricao as DescricaoLancamento,
    CASE WHEN CHARINDEX(',', ISNULL(CAST(ISNULL(ln.ValorPagoRecebido,0) AS VARCHAR),'0'))>0
         THEN TRY_CAST(REPLACE(REPLACE(ISNULL(CAST(ISNULL(ln.ValorPagoRecebido,0) AS VARCHAR),'0'),'.',''),',','.') AS DECIMAL(20,2))
         ELSE TRY_CAST(ISNULL(ln.ValorPagoRecebido,0) AS DECIMAL(20,2)) END as Valor
  FROM LancamentosComNaturezas ln WITH (NOLOCK, INDEX(0))
  WHERE ln.DataCompetencia >= @fromDate AND ln.DataCompetencia <= @toDate`;

  const res = await req.query(q);
  await pool.close();
  return res.recordset.map(r => ({
    NumeroLancamento: String(r.NumeroLancamento),
    DataCompetencia: r.DataCompetencia,
    Natureza: r.Natureza || null,
    DescricaoLancamento: r.DescricaoLancamento || null,
    Valor: Number(r.Valor || 0)
  }));
}

function readLocalMonth(month) {
  const files = glob.sync('public/data/fato_financeiro_dre*.ndjson');
  if (files.length === 0) throw new Error('NDJSON exports not found (public/data)');

  const rows = [];
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    s.split('\n').forEach(line => {
      if (!line || !line.trim()) return;
      try {
        const obj = JSON.parse(line);
        const mes = (obj.DataCompetencia || '').substring(0,7);
        if (mes !== month) return;
        rows.push({
          NumeroLancamento: String(obj.NumeroLancamento),
          DataCompetencia: obj.DataCompetencia,
          Natureza: obj.Natureza || null,
          DescricaoLancamento: obj.DescricaoLancamento || obj.Descricao || null,
          Valor: normalizeNumber(obj.Valor || obj.ValorPagoRecebido || 0)
        });
      } catch(e) {}
    });
  }
  return rows;
}

function aggregateByNature(rows) {
  const map = new Map();
  for (const r of rows) {
    const nat = r.Natureza || 'UNKNOWN';
    const cur = map.get(nat) || 0;
    map.set(nat, cur + Number(r.Valor || 0));
  }
  return map; // Map<Natureza, sum>
}

function aggregateByLancamento(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = r.NumeroLancamento || ('_no_' + Math.random());
    const rec = map.get(key) || { NumeroLancamento: key, DataCompetencia: r.DataCompetencia, Natureza: r.Natureza, DescricaoLancamento: r.DescricaoLancamento, Valor: 0 };
    rec.Valor += Number(r.Valor || 0);
    if (!rec.Natureza && r.Natureza) rec.Natureza = r.Natureza;
    if (!rec.DescricaoLancamento && r.DescricaoLancamento) rec.DescricaoLancamento = r.DescricaoLancamento;
    map.set(key, rec);
  }
  return map; // Map<NumeroLancamento, rec>
}

function writeCsv(filePath, headers, rows) {
  const out = [headers.join(',')];
  for (const r of rows) {
    const line = headers.map(h => {
      const v = r[h] === undefined || r[h] === null ? '' : String(r[h]).replace(/"/g,'""');
      // quote if contains comma
      return v.includes(',') || v.includes(';') ? `"${v}"` : v;
    }).join(',');
    out.push(line);
  }
  fs.writeFileSync(filePath, out.join('\n'), 'utf8');
}

(async function main(){
  try{
    const months = process.argv.slice(2);
    if (!months || months.length === 0) {
      console.error('Usage: node investigate_dre_month.js YYYY-MM [YYYY-MM ...]');
      process.exit(2);
    }

    for (const month of months) {
      console.log('Investigating month', month);
      const dwRows = await queryDWMonth(month);
      console.log('DW rows:', dwRows.length);
      const localRows = readLocalMonth(month);
      console.log('Local rows:', localRows.length);

      // aggregate by nature
      const dwByNature = aggregateByNature(dwRows);
      const localByNature = aggregateByNature(localRows);

      const allNatures = Array.from(new Set([...dwByNature.keys(), ...localByNature.keys()]));
      const natRows = allNatures.map(n => ({
        Natureza: n,
        DW: Number(dwByNature.get(n) || 0),
        Local: Number(localByNature.get(n) || 0),
        Diff: Number((dwByNature.get(n) || 0) - (localByNature.get(n) || 0))
      })).sort((a,b) => Math.abs(b.Diff) - Math.abs(a.Diff));

      const natCsvPath = path.join('public','data',`dre_compare_natureza_${month}.csv`);
      writeCsv(natCsvPath, ['Natureza','DW','Local','Diff'], natRows);
      console.log('Wrote', natCsvPath);

      // aggregate by lancamento and compute diffs
      const dwByLanc = aggregateByLancamento(dwRows);
      const localByLanc = aggregateByLancamento(localRows);

      const allLanc = Array.from(new Set([...dwByLanc.keys(), ...localByLanc.keys()]));
      const lancRows = allLanc.map(k => {
        const dw = dwByLanc.get(k);
        const lo = localByLanc.get(k);
        const dwVal = dw ? Number(dw.Valor || 0) : 0;
        const loVal = lo ? Number(lo.Valor || 0) : 0;
        return {
          NumeroLancamento: k,
          DataCompetencia: (dw && dw.DataCompetencia) || (lo && lo.DataCompetencia) || '',
          NaturezaDW: (dw && dw.Natureza) || '',
          NaturezaLocal: (lo && lo.Natureza) || '',
          DescricaoDW: (dw && dw.DescricaoLancamento) || '',
          DescricaoLocal: (lo && lo.DescricaoLancamento) || '',
          DW: dwVal,
          Local: loVal,
          Diff: dwVal - loVal,
          AbsDiff: Math.abs(dwVal - loVal)
        };
      });

      lancRows.sort((a,b) => b.AbsDiff - a.AbsDiff);
      const top20 = lancRows.slice(0,20);

      const topCsvPath = path.join('public','data',`dre_top20_discrepancies_${month}.csv`);
      writeCsv(topCsvPath, ['NumeroLancamento','DataCompetencia','NaturezaDW','NaturezaLocal','DW','Local','Diff','DescricaoDW','DescricaoLocal'], top20);
      console.log('Wrote', topCsvPath);

      console.log('Month', month, 'done. Top discrepancy saved to', topCsvPath);
    }

    process.exit(0);
  }catch(e){
    console.error('Error investigate:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
