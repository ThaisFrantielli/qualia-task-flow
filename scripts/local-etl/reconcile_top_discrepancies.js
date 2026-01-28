require('dotenv').config();
const sql = require('mssql');
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
    FORMAT(ln.DataCompetencia,'yyyy-MM-dd') as DataCompetencia,
    ln.Natureza,
    ln.Descricao as DescricaoLancamento,
    CASE WHEN CHARINDEX(',', ISNULL(CAST(ISNULL(ln.ValorPagoRecebido,0) AS VARCHAR),'0'))>0
         THEN TRY_CAST(REPLACE(REPLACE(ISNULL(CAST(ISNULL(ln.ValorPagoRecebido,0) AS VARCHAR),'0'),'.',''),',','.') AS DECIMAL(20,2))
         ELSE TRY_CAST(ISNULL(ln.ValorPagoRecebido,0) AS DECIMAL(20,2)) END as Valor
  FROM LancamentosComNaturezas ln WITH (NOLOCK, INDEX(0))
  WHERE ln.DataCompetencia >= @fromDate AND ln.DataCompetencia <= @toDate
    AND CAST(ln.NumeroLancamento AS VARCHAR(100)) = @num`;

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

function readLocalForNumero(numero, month) {
  const dataDir = path.join(process.cwd(),'public','data');
  if (!fs.existsSync(dataDir)) return [];
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('fato_financeiro_dre') && f.endsWith('.ndjson'))
    .map(f => path.join(dataDir,f));
  const rows = [];
  for (const f of files) {
    const s = fs.readFileSync(f,'utf8');
    s.split('\n').forEach(line => {
      if (!line || !line.trim()) return;
      try {
        const obj = JSON.parse(line);
        const mes = (obj.DataCompetencia || '').substring(0,7);
        if (mes !== month) return;
        if (String(obj.NumeroLancamento) !== String(numero)) return;
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
    const csvPaths = process.argv.slice(2);
    if (!csvPaths || csvPaths.length === 0) {
      console.error('Usage: node reconcile_top_discrepancies.js <csv1> [csv2 ...]');
      process.exit(2);
    }

    for (const csvPath of csvPaths) {
      const content = fs.readFileSync(csvPath,'utf8').split('\n').filter(Boolean);
      if (content.length <= 1) { console.log('CSV vazio:', csvPath); continue; }
      const header = content[0].split(',').map(h => h.replace(/"/g,'').trim());
      const idxNumero = header.indexOf('NumeroLancamento');
      const idxData = header.indexOf('DataCompetencia');
      if (idxNumero === -1 || idxData === -1) {
        console.error('CSV sem colunas esperadas (NumeroLancamento,DataCompetencia):', csvPath);
        continue;
      }

      const pairs = new Map(); // key = numero|month -> {numero,month}
      for (let i=1;i<content.length;i++) {
        const row = content[i].trim(); if (!row) continue;
        const cols = row.split(',');
        const numero = cols[idxNumero] ? cols[idxNumero].replace(/"/g,'').trim() : '';
        const data = cols[idxData] ? cols[idxData].replace(/"/g,'').trim() : '';
        const month = data.substring(0,7);
        if (!numero) continue;
        pairs.set(numero + '|' + month, { numero, month });
      }

      const reports = [];
      for (const p of pairs.values()) {
        process.stdout.write(`Reconciling ${p.numero} ${p.month} ... `);
        const dwRows = await queryDWForNumero(p.numero, p.month);
        const localRows = readLocalForNumero(p.numero, p.month);
        const dwSum = dwRows.reduce((s,r)=>s + Number(r.Valor||0),0);
        const localSum = localRows.reduce((s,r)=>s + Number(r.Valor||0),0);
        const dwDesc = (dwRows[0] && dwRows[0].DescricaoLancamento) || '';
        const localDesc = (localRows[0] && localRows[0].DescricaoLancamento) || '';
        const dwNat = (dwRows[0] && dwRows[0].Natureza) || '';
        const localNat = (localRows[0] && localRows[0].Natureza) || '';
        reports.push({
          NumeroLancamento: p.numero,
          DataCompetencia: p.month,
          DW: dwSum.toFixed(2),
          Local: localSum.toFixed(2),
          Diff: (dwSum - localSum).toFixed(2),
          DescricaoDW: dwDesc,
          DescricaoLocal: localDesc,
          NaturezaDW: dwNat,
          NaturezaLocal: localNat
        });
        console.log('done');
      }

      const outPath = path.join('public','data',`reconcile_report_${path.basename(csvPath).replace(/[^a-zA-Z0-9._-]/g,'_')}.csv`);
      writeCsv(outPath, ['NumeroLancamento','DataCompetencia','DW','Local','Diff','DescricaoDW','DescricaoLocal','NaturezaDW','NaturezaLocal'], reports);
      console.log('Wrote', outPath);
    }

    process.exit(0);
  }catch(e){
    console.error('Error reconcile:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
