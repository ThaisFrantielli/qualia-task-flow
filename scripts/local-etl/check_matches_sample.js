require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const sql = require('mssql');
const sqlConfig = { user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, server: process.env.SQL_SERVER || '200.219.192.34', port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT,10) : 3494, database: process.env.SQL_DATABASE || 'blufleet-dw', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 180000 };
(async()=>{
  const pool = await sql.connect(sqlConfig);
  const q = `WITH Sample AS (
    SELECT TOP 100 NumeroLancamento, NumeroDocumento, Descricao, OrdemCompra,
      LEFT(NumeroDocumento, CHARINDEX('/', NumeroDocumento + '/') - 1) AS NumDocBeforeSlash,
      REPLACE(REPLACE(REPLACE(REPLACE(NumeroDocumento, '-', ''), ' ', ''), '.', ''), '/', '') AS NumDocClean,
      CASE WHEN PATINDEX('%[A-Z][A-Z][A-Z]-[0-9]%', Descricao) > 0 THEN SUBSTRING(Descricao, PATINDEX('%[A-Z][A-Z][A-Z]-[0-9]%', Descricao), 8) ELSE NULL END AS PlacaExtract
    FROM dbo.LancamentosComNaturezas
    ORDER BY DataCompetencia DESC
  )
  SELECT s.NumeroLancamento, s.NumeroDocumento, s.NumDocBeforeSlash, s.NumDocClean, s.PlacaExtract,
    (SELECT COUNT(*) FROM dbo.VeiculosComprados vc WHERE vc.NumeroNotaFiscal = s.NumeroDocumento OR vc.NumeroNotaFiscal = s.NumDocBeforeSlash OR REPLACE(REPLACE(REPLACE(REPLACE(vc.NumeroNotaFiscal,'-',''),' ',''),'.',''),'/','') = s.NumDocClean) AS Matches_VeiculosComprados,
    (SELECT COUNT(*) FROM dbo.VeiculosVendidos vv WHERE vv.FaturaVenda = s.NumeroDocumento OR vv.FaturaVenda = s.NumDocBeforeSlash OR REPLACE(REPLACE(REPLACE(REPLACE(vv.FaturaVenda,'-',''),' ',''),'.',''),'/','') = s.NumDocClean) AS Matches_VeiculosVendidos,
    (SELECT COUNT(*) FROM dbo.OrdensServico os WHERE os.OrdemCompra = s.OrdemCompra) AS Matches_OrdensServico,
    (SELECT COUNT(*) FROM dbo.ContratosLocacao cl WHERE cl.PlacaPrincipal = s.PlacaExtract OR cl.PlacaPrincipal = LEFT(s.NumeroDocumento,8) OR cl.PlacaReserva = s.PlacaExtract OR cl.PlacaReserva = LEFT(s.NumeroDocumento,8)) AS Matches_ContratosLocacao
  FROM Sample s`;
  const res = await pool.request().query(q);
  const rows = res.recordset;
  const totals = {
    VeiculosComprados: rows.filter(r=>r.Matches_VeiculosComprados>0).length,
    VeiculosVendidos: rows.filter(r=>r.Matches_VeiculosVendidos>0).length,
    OrdensServico: rows.filter(r=>r.Matches_OrdensServico>0).length,
    ContratosLocacao: rows.filter(r=>r.Matches_ContratosLocacao>0).length,
  };
  console.log('Sample size:', rows.length);
  console.log('Rows with matches:', totals);
  console.log('Examples with any match (up to 20):');
  const matched = rows.filter(r=>r.Matches_VeiculosComprados>0 || r.Matches_VeiculosVendidos>0 || r.Matches_OrdensServico>0 || r.Matches_ContratosLocacao>0).slice(0,20);
  console.log(matched);
  await pool.close();
})().catch(e=>{console.error('Erro', e.message); process.exit(1)});
