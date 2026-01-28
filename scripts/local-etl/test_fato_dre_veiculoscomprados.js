require('dotenv').config();
const sql = require('mssql');
const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER || '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE || 'blufleet-dw',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 120000
};

async function run() {
  const pool = await sql.connect(sqlConfig);
  const q = `SELECT TOP 100
    ln.NumeroLancamento,
    ln.NumeroDocumento,
    COALESCE(cli.NomeFantasia, clinfo.NomeClienteContrato, os.Cliente, '') as NomeCliente,
    COALESCE(os.Placa, vv.Placa, vc.Placa, '') as Placa,
    COALESCE(clinfo.ContratoComercial, os.ContratoComercial, '') as ContratoComercial,
    COALESCE(clinfo.ContratoLocacao, os.ContratoLocacao, '') as ContratoLocacao
  FROM LancamentosComNaturezas ln WITH (NOLOCK, INDEX(0))
  OUTER APPLY (
    SELECT TOP 1 os.Placa, os.Cliente, os.IdCliente, os.ContratoComercial, os.ContratoLocacao, os.DataInicioServico
    FROM OrdensServico os WITH (NOLOCK)
    WHERE ln.OrdemCompra IS NOT NULL AND LEN(LTRIM(RTRIM(ln.OrdemCompra))) > 0
      AND ln.OrdemCompra = os.OrdemCompra
      AND os.SituacaoOrdemServico <> 'Cancelada'
    ORDER BY os.DataInicioServico DESC
  ) os
  OUTER APPLY (
    SELECT TOP 1 vv.Placa, vv.FaturaVenda
    FROM VeiculosVendidos vv WITH (NOLOCK)
    WHERE vv.FaturaVenda = ln.NumeroDocumento
  ) vv
  OUTER APPLY (
    SELECT TOP 1 vc.Placa, vc.NumeroNotaFiscal, vc.DataCompra
    FROM VeiculosComprados vc WITH (NOLOCK)
    WHERE vc.NumeroNotaFiscal = ln.NumeroDocumento
       OR vc.NumeroNotaFiscal = LEFT(ln.NumeroDocumento, CASE WHEN CHARINDEX('/', ln.NumeroDocumento) > 0 THEN CHARINDEX('/', ln.NumeroDocumento)-1 ELSE LEN(ln.NumeroDocumento) END)
    ORDER BY vc.DataCompra DESC
  ) vc
  OUTER APPLY (
    SELECT TOP 1 cl.PlacaPrincipal, cl.ContratoLocacao, cc.NumeroDocumento as ContratoComercial, cli2.NomeFantasia as NomeClienteContrato
    FROM ContratosLocacao cl
    JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
    LEFT JOIN Clientes cli2 ON cc.IdCliente = cli2.IdCliente
    WHERE (cl.PlacaPrincipal = os.Placa OR cl.PlacaPrincipal = vv.Placa OR cl.PlacaPrincipal = vc.Placa)
      AND cl.SituacaoContratoLocacao NOT IN ('Encerrado','Cancelado')
    ORDER BY cl.DataInicial DESC
  ) clinfo
  LEFT JOIN Clientes cli WITH (NOLOCK) ON os.IdCliente = cli.IdCliente
  ORDER BY ln.DataCompetencia DESC`;

  const res = await pool.request().query(q);
  console.log('Total rows returned:', res.recordset.length);
  const counts = { NomeCliente:0, Placa:0, ContratoComercial:0, ContratoLocacao:0 };
  res.recordset.forEach(r=>{
    if (r.NomeCliente && r.NomeCliente.trim() !== '') counts.NomeCliente++;
    if (r.Placa && r.Placa.trim() !== '') counts.Placa++;
    if (r.ContratoComercial && r.ContratoComercial.trim() !== '') counts.ContratoComercial++;
    if (r.ContratoLocacao && r.ContratoLocacao.trim() !== '') counts.ContratoLocacao++;
  });
  console.log('Counts in sample:', counts);
  console.log('Sample rows (first 10):');
  console.log(JSON.stringify(res.recordset.slice(0,10), null, 2));
  await pool.close();
}

run().catch(e=>{ console.error('Erro:', e.message); process.exit(1)});
