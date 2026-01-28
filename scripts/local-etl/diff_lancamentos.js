const fs = require('fs');
const path = require('path');
const sql = require('mssql');

(async () => {
  try {
    const config = {
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      server: process.env.SQL_SERVER,
      port: parseInt(process.env.SQL_PORT || '3494'),
      database: process.env.SQL_DATABASE,
      options: { encrypt: false, trustServerCertificate: true },
      requestTimeout: 0
    };

    await sql.connect(config);

    const tables = ['Lancamentos', 'LancamentosComNaturezas'];

    async function getColumns(table) {
      const q = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table.replace("'", "''")}'`;
      const r = await sql.query(q);
      return r.recordset.map(r => r.COLUMN_NAME);
    }

    const cols = {};
    for (const t of tables) {
      cols[t] = await getColumns(t);
    }

    function pickKey(columns) {
      const candidates = ['NumeroLancamento', 'IdLancamento', 'Id', 'Numero', 'Numero_Lancamento'];
      for (const c of candidates) if (columns.includes(c)) return c;
      return columns[0];
    }

    function pickNature(columns) {
      const lowered = columns.map(c => c.toLowerCase());
      const idx = lowered.findIndex(c => c.includes('natureza') || c.includes('natureza_id') || c.includes('descricao_natureza') || c.includes('nome_natureza'));
      if (idx >= 0) return columns[idx];
      const alt = ['Natureza', 'DescricaoNatureza', 'NomeNatureza', 'descricao'];
      for (const a of alt) if (columns.includes(a)) return a;
      return null;
    }

    const keyA = pickKey(cols['Lancamentos']);
    const keyB = pickKey(cols['LancamentosComNaturezas']);
    const natureA = pickNature(cols['Lancamentos']);
    const natureB = pickNature(cols['LancamentosComNaturezas']);

    console.log('Detected columns:');
    console.log('Lancamentos key:', keyA, 'nature:', natureA);
    console.log('LancamentosComNaturezas key:', keyB, 'nature:', natureB);

    const res = {};

    const c1 = await sql.query(`SELECT COUNT(*) as cnt FROM Lancamentos`);
    const c2 = await sql.query(`SELECT COUNT(*) as cnt FROM LancamentosComNaturezas`);
    res.counts = { Lancamentos: c1.recordset[0].cnt, LancamentosComNaturezas: c2.recordset[0].cnt };

    // distinct key counts
    const d1 = await sql.query(`SELECT COUNT(DISTINCT [${keyA}]) as cnt FROM Lancamentos`);
    const d2 = await sql.query(`SELECT COUNT(DISTINCT [${keyB}]) as cnt FROM LancamentosComNaturezas`);
    res.distinct = { Lancamentos: d1.recordset[0].cnt, LancamentosComNaturezas: d2.recordset[0].cnt };

    // keys present in B not in A
    const qMissingB = `SELECT COUNT(*) as cnt FROM LancamentosComNaturezas c LEFT JOIN Lancamentos l ON c.[${keyB}] = l.[${keyA}] WHERE l.[${keyA}] IS NULL`;
    const qMissingA = `SELECT COUNT(*) as cnt FROM Lancamentos l LEFT JOIN LancamentosComNaturezas c ON c.[${keyB}] = l.[${keyA}] WHERE c.[${keyB}] IS NULL`;
    const mB = await sql.query(qMissingB);
    const mA = await sql.query(qMissingA);
    res.missing = { inB_not_inA: mB.recordset[0].cnt, inA_not_inB: mA.recordset[0].cnt };

    // samples of missing keys (limit 100)
    const sB = await sql.query(`SELECT TOP 100 c.[${keyB}] as keyValue FROM LancamentosComNaturezas c LEFT JOIN Lancamentos l ON c.[${keyB}] = l.[${keyA}] WHERE l.[${keyA}] IS NULL`);
    const sA = await sql.query(`SELECT TOP 100 l.[${keyA}] as keyValue FROM Lancamentos l LEFT JOIN LancamentosComNaturezas c ON c.[${keyB}] = l.[${keyA}] WHERE c.[${keyB}] IS NULL`);
    res.samples = { inB_not_inA: sB.recordset.map(r => r.keyValue), inA_not_inB: sA.recordset.map(r => r.keyValue) };

    // compare nature values when key exists in both and nature columns detected
    if (natureA && natureB) {
      const qDiffNature = `SELECT TOP 200 c.[${keyB}] as keyValue, c.[${natureB}] as nature_b, l.[${natureA}] as nature_a FROM LancamentosComNaturezas c JOIN Lancamentos l ON c.[${keyB}] = l.[${keyA}] WHERE ISNULL(c.[${natureB}], '') <> ISNULL(l.[${natureA}], '')`;
      const diff = await sql.query(qDiffNature);
      res.nature_differences = diff.recordset;
      console.log('Nature differences sample rows:', res.nature_differences.length);
    } else {
      res.nature_differences = null;
      console.log('Nature column not detected in one or both tables; skipping comparison');
    }

    // sample full rows for diagnostics (from B missing in A) - guard empty lists
    let sampleRows = [];
    if (res.samples && Array.isArray(res.samples.inB_not_inA) && res.samples.inB_not_inA.length > 0) {
      const inList = res.samples.inB_not_inA
        .slice(0, 50)
        .map(v => typeof v === 'number' ? v : `N'${v.toString().replace("'","''")}'`)
        .join(',');
      const sampleFull = await sql.query(`SELECT TOP 50 * FROM LancamentosComNaturezas c WHERE c.[${keyB}] IN (${inList})`);
      sampleRows = sampleFull.recordset;
    }
    res.sample_rows_inB_not_inA = sampleRows;

    const outPath = path.join(__dirname, 'diff_lancamentos_result.json');
    fs.writeFileSync(outPath, JSON.stringify(res, null, 2), 'utf8');
    console.log('Wrote summary to', outPath);

    await sql.close();
  } catch (e) {
    console.error('erro', e.message);
    process.exit(1);
  }
})();
