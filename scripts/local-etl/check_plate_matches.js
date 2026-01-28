require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const sql = require('mssql');
const sqlConfig = { user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, server: process.env.SQL_SERVER || '200.219.192.34', port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT,10) : 3494, database: process.env.SQL_DATABASE || 'blufleet-dw', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 180000 };
(async()=>{
  const pool = await sql.connect(sqlConfig);
  const q = `SELECT TOP 500 NumeroLancamento, Descricao FROM dbo.LancamentosComNaturezas ORDER BY DataCompetencia DESC`;
  const res = await pool.request().query(q);
  const plateRegex = /([A-Z]{3}-[0-9A-Z]{4})/g;
  const rows = res.recordset.map(r=>{
    const desc = (r.Descricao || '').replace(/\r|\n/g, '');
    const compact = desc.replace(/\s+/g, '');
    const matches = Array.from(compact.matchAll(plateRegex)).map(m=>m[1]);
    const placa = matches.find(t => /[A-Z]/.test(t.slice(-4))) || null;
    return { NumeroLancamento: r.NumeroLancamento, Placa: placa };
  });
  const plates = Array.from(new Set(rows.map(r=>r.Placa).filter(Boolean))).slice(0,200);
  if(plates.length===0){ console.log('Nenhuma placa extraída'); await pool.close(); return; }
  // build IN list
  const inList = plates.map(p=>"'"+p+"'").join(',');
  const q2 = `
    SELECT 'Veiculos' as Fonte, Placa, IdVeiculo FROM dbo.Veiculos WHERE REPLACE(Placa,' ','') IN (${inList})
    UNION ALL
    SELECT 'ContratosLocacao', PlacaPrincipal, IdContratoLocacao FROM dbo.ContratosLocacao WHERE REPLACE(PlacaPrincipal,' ','') IN (${inList}) OR REPLACE(PlacaReserva,' ','') IN (${inList})
    UNION ALL
    SELECT 'OrdensServico', Placa, IdOrdemServico FROM dbo.OrdensServico WHERE REPLACE(Placa,' ','') IN (${inList})
    UNION ALL
    SELECT 'VeiculosComprados', Placa, IdVeiculo FROM dbo.VeiculosComprados WHERE REPLACE(Placa,' ','') IN (${inList})
    UNION ALL
    SELECT 'VeiculosVendidos', Placa, IdVeiculo FROM dbo.VeiculosVendidos WHERE REPLACE(Placa,' ','') IN (${inList})
  `;
  const r2 = await pool.request().query(q2);
  const found = r2.recordset;
  console.log('Placas extraídas (ex):', plates.slice(0,20));
  console.log('Matches encontrados:', found.length);
  const grouped = {};
  for(const f of found){ grouped[f.Fonte] = (grouped[f.Fonte]||0)+1; }
  console.log('Contagem por fonte:', grouped);
  console.log('Exemplos encontrados (até 40):');
  console.dir(found.slice(0,40), { depth: null, maxArrayLength: null });
  await pool.close();
})().catch(e=>{console.error('Erro', e.message); process.exit(1)});
