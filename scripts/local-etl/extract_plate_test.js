const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const sql = require('mssql');
const sqlConfig = { user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, server: process.env.SQL_SERVER || '200.219.192.34', port: 3494, database: process.env.SQL_DATABASE || 'blufleet-dw', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 120000 };
(async()=>{
  const pool = await sql.connect(sqlConfig);
  const q = `SELECT TOP 200 NumeroLancamento, Descricao FROM LancamentosComNaturezas ORDER BY DataCompetencia DESC`;
  const res = await pool.request().query(q);
  const rows = res.recordset;
  const plateRegex = /([A-Z]{3}-[0-9A-Z]{4})/g; // captura ABC-1234 ou ABC-9A74
  const results = rows.map(r=>{
    const desc = (r.Descricao || '').replace(/\r|\n/g, '');
    const compact = desc.replace(/\s+/g, '');
    const matches = Array.from(compact.matchAll(plateRegex)).map(m=>m[1]);
    // filtra tokens cujos últimos 4 são todos dígitos (provavelmente FIN-1234)
    const placa = matches.find(t => /[A-Z]/.test(t.slice(-4))) || null;
    return { NumeroLancamento: r.NumeroLancamento, Descricao: r.Descricao, PlacaExtraida: placa };
  });
  const total = results.length;
  const nonnull = results.filter(r=>r.PlacaExtraida).length;
  console.log('Total sample:', total, 'Placas extraidas:', nonnull);
  console.log('Exemplos:', results.slice(0,10));
  await pool.close();
})().catch(e=>{console.error('Erro', e.message); process.exit(1)});
