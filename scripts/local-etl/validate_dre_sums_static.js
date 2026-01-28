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
  requestTimeout: 0,
};

function normalizeNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/\./g, '').replace(/,/g, '.');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function monthCompare(a, b) { return a.localeCompare(b); }

async function queryDW(fromDate, toDate) {
  const pool = await sql.connect(sqlConfig);
  const req = pool.request();
  const q = `SELECT FORMAT(DataCompetencia, 'yyyy-MM') as mes,
                    CASE WHEN TipoLancamento = 'Entrada' THEN 'Entrada'
                         WHEN TipoLancamento = 'Saída' THEN 'Saída'
                         ELSE 'Outro' END as tipo,
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

function aggregateLocalFromParts(base = 'fato_financeiro_dre') {
  const dataDir = path.join(process.cwd(), 'public', 'data');
  const manifestPath = path.join(dataDir, `${base}_manifest.json`);
  if (!fs.existsSync(manifestPath)) throw new Error(`Manifest não encontrado: ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const total = manifest.total_chunks || manifest.totalParts || 0;
  if (!total) throw new Error('Manifest inválido: sem total_parts/total_chunks');

  const map = {};
  const monthsSet = new Set();
  for (let i = 1; i <= total; i++) {
    const partPath = path.join(dataDir, `${base}_part${i}of${total}.json`);
    if (!fs.existsSync(partPath)) throw new Error(`Parte ausente: ${partPath}`);
    const arr = JSON.parse(fs.readFileSync(partPath, 'utf8'));
    if (!Array.isArray(arr)) continue;
    for (const obj of arr) {
      const mes = String(obj.DataCompetencia || '').substring(0, 7);
      if (!mes) continue;
      monthsSet.add(mes);
      const tipo = obj.TipoLancamento === 'Entrada' ? 'Entrada' : (obj.TipoLancamento === 'Saída' ? 'Saída' : 'Outro');
      const valor = normalizeNumber(obj.Valor ?? obj.ValorPagoRecebido ?? 0);
      if (!map[mes]) map[mes] = { Entrada: 0, Saída: 0, Outro: 0 };
      map[mes][tipo] = (map[mes][tipo] || 0) + valor;
    }
  }

  const months = Array.from(monthsSet).sort(monthCompare);
  return { map, months };
}

(async function main() {
  try {
    const base = process.argv[2] || 'fato_financeiro_dre';
    console.log('Validating DRE sums between DW and static JSON parts:', base);

    const { map: localMap, months } = aggregateLocalFromParts(base);
    if (months.length === 0) throw new Error('Nenhum mês encontrado nos JSON parts');

    const fromMonth = months[0];
    const toMonth = months[months.length - 1];
    const fromDate = new Date(fromMonth + '-01T00:00:00');
    const toDateBase = new Date(toMonth + '-01T00:00:00');
    const eom = new Date(toDateBase.getFullYear(), toDateBase.getMonth() + 1, 0, 23, 59, 59, 999);
    console.log('Querying DW from', fromDate.toISOString().slice(0, 10), 'to', eom.toISOString().slice(0, 10));

    const dwMap = await queryDW(fromDate, eom);
    const allMonths = Array.from(new Set([...Object.keys(dwMap), ...Object.keys(localMap)])).sort(monthCompare);

    console.log('month, dw_entrada, local_entrada, diff_entrada, dw_saida, local_saida, diff_saida');
    for (const m of allMonths) {
      const dw = dwMap[m] || { Entrada: 0, Saída: 0, Outro: 0 };
      const lo = localMap[m] || { Entrada: 0, Saída: 0, Outro: 0 };
      const eDiff = Number(dw.Entrada || 0) - Number(lo.Entrada || 0);
      const sDiff = Number(dw['Saída'] || 0) - Number(lo['Saída'] || 0);
      console.log(`${m}, ${dw.Entrada || 0}, ${lo.Entrada || 0}, ${eDiff}, ${dw['Saída'] || 0}, ${lo['Saída'] || 0}, ${sDiff}`);
    }

    process.exit(0);
  } catch (e) {
    console.error('Erro validação static:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
