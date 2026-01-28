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

async function queryDW(fromDate, toDate) {
  const pool = await sql.connect(sqlConfig);
  const req = pool.request();
  // Use ValorPagoRecebido normalized
  const q = `SELECT FORMAT(DataCompetencia, 'yyyy-MM') as mes,
                    CASE WHEN TipoLancamento = 'Entrada' THEN 'Entrada' WHEN TipoLancamento = 'Saída' THEN 'Saída' ELSE 'Outro' END as tipo,
                    SUM(CASE WHEN CHARINDEX(',', ISNULL(CAST(ISNULL(ValorPagoRecebido,0) AS VARCHAR),'0'))>0
                              THEN TRY_CAST(REPLACE(REPLACE(ISNULL(CAST(ISNULL(ValorPagoRecebido,0) AS VARCHAR),'0'),'.',''),',','.') AS DECIMAL(20,2))
                              ELSE TRY_CAST(ISNULL(ValorPagoRecebido,0) AS DECIMAL(20,2)) END) as soma
             FROM LancamentosComNaturezas WITH (NOLOCK, INDEX(0))
             WHERE DataCompetencia >= @fromDate AND DataCompetencia <= @toDate
             GROUP BY FORMAT(DataCompetencia,'yyyy-MM'), CASE WHEN TipoLancamento = 'Entrada' THEN 'Entrada' WHEN TipoLancamento = 'Saída' THEN 'Saída' ELSE 'Outro' END
             ORDER BY mes`;
  req.input('fromDate', sql.DateTime, fromDate);
  req.input('toDate', sql.DateTime, toDate);
  const res = await req.query(q);
  await pool.close();
  const map = {};
  res.recordset.forEach(r => {
    const m = r.mes;
    if (!map[m]) map[m] = { Entrada: 0, Saída: 0, Outro: 0 };
    map[m][r.tipo] = Number(r.soma || 0);
  });
  return map;
}

function aggregateLocalNDJSON(fromMonth, toMonth) {
  const files = glob.sync('public/data/fato_financeiro_dre*.ndjson');
  if (files.length === 0) throw new Error('NDJSON files not found in public/data for fato_financeiro_dre');

  const map = {};
  function add(mes, tipo, valor) {
    if (mes < fromMonth || mes > toMonth) return;
    if (!map[mes]) map[mes] = { Entrada: 0, Saída: 0, Outro: 0 };
    map[mes][tipo] = (map[mes][tipo] || 0) + valor;
  }

  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    s.split('\n').forEach(line => {
      if (!line || !line.trim()) return;
      try {
        const obj = JSON.parse(line);
        const mes = (obj.DataCompetencia || '').substring(0,7);
        if (!mes) return;
        const tipo = obj.TipoLancamento === 'Entrada' ? 'Entrada' : (obj.TipoLancamento === 'Saída' ? 'Saída' : 'Outro');
        const valor = normalizeNumber(obj.Valor || obj.ValorPagoRecebido || 0);
        add(mes, tipo, valor);
      } catch (e) {
        // skip
      }
    });
  }
  return map;
}

function monthsRangeFromMap(map) {
  const months = Object.keys(map).sort();
  if (months.length === 0) return null;
  return { from: months[0] + '-01', to: months[months.length -1] + '-01' };
}

function monthCompare(a,b){ return a.localeCompare(b); }

(async function main(){
  try{
    console.log('Validating DRE sums between DW and local NDJSON exports');
    // determine available months from local files
    const localFiles = glob.sync('public/data/fato_financeiro_dre*.ndjson');
    if (localFiles.length === 0) {
      console.error('No local NDJSON exports found (public/data/fato_financeiro_dre*.ndjson)');
      process.exit(1);
    }
    // discover months from first file (fast approach)
    const sample = fs.readFileSync(localFiles[0], 'utf8').split('\n').find(l => l && l.trim());
    let localMap = {};
    try{ localMap = aggregateLocalNDJSON('0000-00','9999-99'); } catch(e){ console.error(e.message); process.exit(1); }
    const months = Object.keys(localMap).sort(monthCompare);
    if (months.length === 0) { console.error('No months found in local NDJSON'); process.exit(1); }

    const fromMonth = months[0];
    const toMonth = months[months.length-1];
    const fromDate = new Date(fromMonth + '-01T00:00:00');
    const toDate = new Date(toMonth + '-01T00:00:00');
    // set eom
    const eom = new Date(toDate.getFullYear(), toDate.getMonth()+1, 0, 23,59,59,999);

    console.log('Querying DW from', fromDate.toISOString().slice(0,10),'to', eom.toISOString().slice(0,10));
    const dwMap = await queryDW(fromDate, eom);

    // Aggregate local data for the same range
    const localAgg = aggregateLocalNDJSON(fromMonth, toMonth);

    // build comparison
    const allMonths = Array.from(new Set([...Object.keys(dwMap), ...Object.keys(localAgg)])).sort(monthCompare);
    console.log('month, dw_entrada, local_entrada, diff_entrada, dw_saida, local_saida, diff_saida');
    allMonths.forEach(m => {
      const dw = dwMap[m] || { Entrada:0, Saída:0, Outro:0 };
      const lo = localAgg[m] || { Entrada:0, Saída:0, Outro:0 };
      const eDiff = Number(dw.Entrada || 0) - Number(lo.Entrada || 0);
      const sDiff = Number(dw['Saída'] || 0) - Number(lo['Saída'] || 0);
      console.log(`${m}, ${dw.Entrada||0}, ${lo.Entrada||0}, ${eDiff}, ${dw['Saída']||0}, ${lo['Saída']||0}, ${sDiff}`);
    });

    process.exit(0);
  }catch(e){
    console.error('Erro validação:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
