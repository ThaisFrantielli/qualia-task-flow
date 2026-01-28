require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const sql = require('mssql');
const sqlConfig = { user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, server: process.env.SQL_SERVER || '200.219.192.34', port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT,10) : 3494, database: process.env.SQL_DATABASE || 'blufleet-dw', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 180000 };
(async()=>{
  const pool = await sql.connect(sqlConfig);
  const q = `SELECT TOP 200
    COALESCE(cli.NomeFantasia, os.Cliente, os_by_plate.Cliente, '') as NomeCliente,
    COALESCE(os.Placa, os_by_plate.Placa, vv.Placa, vc.Placa, plateExtract.PlacaExtraida, '') as Placa,
    COALESCE(os.ContratoComercial, clinfo.ContratoComercial, '') as ContratoComercial,
    COALESCE(os.ContratoLocacao, clinfo.ContratoLocacao, '') as ContratoLocacao
  FROM LancamentosComNaturezas ln WITH (NOLOCK)

  -- Extrai placa
  OUTER APPLY (
    SELECT TOP 1
      CASE WHEN PATINDEX('%[A-Z][A-Z][A-Z]-[0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z]%', REPLACE(REPLACE(ln.Descricao, CHAR(13), ''), CHAR(10), '')) > 0
           THEN (
             CASE WHEN PATINDEX('%[A-Z]%', SUBSTRING(REPLACE(REPLACE(ln.Descricao, CHAR(13), ''), CHAR(10), ''), PATINDEX('%[A-Z][A-Z][A-Z]-[0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z]%', REPLACE(REPLACE(ln.Descricao, CHAR(13), ''), CHAR(10), '')) + 4, 4)) > 0
                  THEN SUBSTRING(REPLACE(REPLACE(ln.Descricao, CHAR(13), ''), CHAR(10), ''), PATINDEX('%[A-Z][A-Z][A-Z]-[0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z]%', REPLACE(REPLACE(ln.Descricao, CHAR(13), ''), CHAR(10), '')), 8)
                  ELSE NULL END
           ) ELSE NULL END as PlacaExtraida
  ) plateExtract

  -- OrdensServico via OrdemCompra
  OUTER APPLY (
    SELECT TOP 1 os.Placa, os.Cliente, os.IdCliente, os.ContratoComercial, os.ContratoLocacao, os.DataInicioServico
    FROM OrdensServico os WITH (NOLOCK)
    WHERE ln.OrdemCompra IS NOT NULL AND LEN(LTRIM(RTRIM(ln.OrdemCompra))) > 0
      AND ln.OrdemCompra = os.OrdemCompra
      AND os.SituacaoOrdemServico <> 'Cancelada'
    ORDER BY os.DataInicioServico DESC
  ) os

  -- OrdensServico via placa extra
  OUTER APPLY (
    SELECT TOP 1 os2.Placa, os2.Cliente, os2.IdCliente, os2.ContratoComercial, os2.ContratoLocacao, os2.DataInicioServico
    FROM OrdensServico os2 WITH (NOLOCK)
    WHERE plateExtract.PlacaExtraida IS NOT NULL
      AND os2.Placa = plateExtract.PlacaExtraida
      AND os2.SituacaoOrdemServico <> 'Cancelada'
    ORDER BY os2.DataInicioServico DESC
  ) os_by_plate

  -- VeiculosVendidos
  OUTER APPLY (
    SELECT TOP 1 vv.Placa, vv.FaturaVenda
    FROM VeiculosVendidos vv WITH (NOLOCK)
    WHERE vv.FaturaVenda = ln.NumeroDocumento OR vv.FaturaVenda = LEFT(ln.NumeroDocumento, CASE WHEN CHARINDEX('/', ln.NumeroDocumento) > 0 THEN CHARINDEX('/', ln.NumeroDocumento)-1 ELSE LEN(ln.NumeroDocumento) END)
  ) vv

  -- VeiculosComprados
  OUTER APPLY (
    SELECT TOP 1 vc.Placa, vc.NumeroNotaFiscal, vc.DataCompra
    FROM VeiculosComprados vc WITH (NOLOCK)
    WHERE vc.NumeroNotaFiscal = ln.NumeroDocumento
       OR vc.NumeroNotaFiscal = LEFT(ln.NumeroDocumento, CASE WHEN CHARINDEX('/', ln.NumeroDocumento) > 0 THEN CHARINDEX('/', ln.NumeroDocumento)-1 ELSE LEN(ln.NumeroDocumento) END)
    ORDER BY vc.DataCompra DESC
  ) vc

  -- Buscar contrato ativo pela placa
  OUTER APPLY (
    SELECT TOP 1 cl.PlacaPrincipal, cl.ContratoLocacao, cc.NumeroDocumento as ContratoComercial, cli2.NomeFantasia as NomeClienteContrato
    FROM ContratosLocacao cl
    JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
    LEFT JOIN Clientes cli2 ON cc.IdCliente = cli2.IdCliente
    WHERE (cl.PlacaPrincipal = os.Placa OR cl.PlacaPrincipal = vv.Placa OR cl.PlacaPrincipal = vc.Placa OR cl.PlacaPrincipal = plateExtract.PlacaExtraida)
      AND cl.SituacaoContratoLocacao NOT IN ('Encerrado','Cancelado')
    ORDER BY cl.DataInicial DESC
  ) clinfo

  LEFT JOIN Clientes cli WITH (NOLOCK) ON os.IdCliente = cli.IdCliente
  LEFT JOIN Clientes cli_by_plate WITH (NOLOCK) ON os_by_plate.IdCliente = cli_by_plate.IdCliente
  ORDER BY ln.DataCompetencia DESC`;
  const res2 = await pool.request().query(q);
  const rows = res2.recordset;
  const counts = {
    NomeCliente: rows.filter(r=>r.NomeCliente && r.NomeCliente.trim()!=='').length,
    Placa: rows.filter(r=>r.Placa && r.Placa.trim()!=='').length,
    ContratoComercial: rows.filter(r=>r.ContratoComercial && r.ContratoComercial.trim()!=='').length,
    ContratoLocacao: rows.filter(r=>r.ContratoLocacao && r.ContratoLocacao.trim()!=='').length,
  };
  console.log('Sample size:', rows.length, 'Counts non-empty:', counts);
  console.log('Examples:', rows.slice(0,20));
  await pool.close();
})().catch(e=>{console.error('Erro', e.message); process.exit(1)});
