require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const sql = require('mssql');
const sqlConfig = { user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, server: process.env.SQL_SERVER || '200.219.192.34', port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT,10) : 3494, database: process.env.SQL_DATABASE || 'blufleet-dw', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 180000 };
(async()=>{
  const pool = await sql.connect(sqlConfig);
  const sampleNums = ['336863','336862','336861','336860','323551'];
  const q = `SELECT L.NumeroLancamento, L.NumeroDocumento, L.Descricao, L.OrdemCompra,
    vc.NumeroNotaFiscal AS VC_NumeroNotaFiscal, vc.Placa AS VC_Placa, vc.NomeFornecedorNotaFiscal,
    vv.FaturaVenda AS VV_FaturaVenda, vv.Placa AS VV_Placa, vv.Comprador AS VV_Comprador,
    os.OrdemServico, os.Placa AS OS_Placa, os.ContratoLocacao AS OS_ContratoLocacao, os.ContratoComercial AS OS_ContratoComercial,
    cl.PlacaPrincipal AS CL_PlacaPrincipal, cl.PlacaReserva AS CL_PlacaReserva, cl.ContratoLocacao AS CL_ContratoLocacao
  FROM dbo.LancamentosComNaturezas L
  LEFT JOIN dbo.VeiculosComprados vc ON vc.NumeroNotaFiscal = L.NumeroDocumento OR vc.NumeroNotaFiscal = LEFT(L.NumeroDocumento, CHARINDEX('/', L.NumeroDocumento + '/')-1)
  LEFT JOIN dbo.VeiculosVendidos vv ON vv.FaturaVenda = L.NumeroDocumento OR vv.FaturaVenda = LEFT(L.NumeroDocumento, CHARINDEX('/', L.NumeroDocumento + '/')-1
  )
  LEFT JOIN dbo.OrdensServico os ON os.OrdemCompra = L.OrdemCompra
  LEFT JOIN dbo.ContratosLocacao cl ON cl.PlacaPrincipal = CASE WHEN PATINDEX('%[A-Z][A-Z][A-Z]-[0-9]%', L.Descricao) > 0 THEN SUBSTRING(L.Descricao, PATINDEX('%[A-Z][A-Z][A-Z]-[0-9]%', L.Descricao), 8) ELSE NULL END OR cl.PlacaPrincipal = LEFT(L.NumeroDocumento,8)
  WHERE L.NumeroLancamento IN (${sampleNums.map(n=>"'"+n+"'").join(',')})`;
  try{
    const r = await pool.request().query(q);
    console.log('Rows:', r.recordset.length);
    console.dir(r.recordset, { depth: null, maxArrayLength: null });
  }catch(e){
    console.error('Erro consulta', e.message);
  }
  await pool.close();
})().catch(e=>{console.error('Erro geral', e.message); process.exit(1)});
