require('dotenv').config();
const fs = require('fs');
const sql = require('mssql');

const OUT_PATH = 'public/data/mapa_universal_sources_raw.ndjson';

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || '200.219.192.34',
  port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT,10) : 3494,
  database: process.env.SQL_DATABASE || 'blufleet-dw',
  options: { encrypt: false, trustServerCertificate: true, requestTimeout: 0 }
};

const QUERY = `SET NOCOUNT ON;
;WITH base AS (
  SELECT
    L.NumeroLancamento,
    L.Natureza,
    OS.Placa as OS_Placa,
    V_Mestre.Placa as V_Mestre_Placa,
    V_Emergencia.Placa as V_Emergencia_Placa,
    VC_CompraDireta.Placa as VC_CompraDireta_Placa,
    VC_Compra_via_OC.Placa as VC_Compra_via_OC_Placa,
    OI_via_Nota.Placa as OI_via_Nota_Placa,
    OI.Placa as OI_Placa,
    VC.Placa as VC_Placa,
    CL_via_Item.PlacaPrincipal as CL_via_Item_PlacaPrincipal,
    CASE WHEN PATINDEX('%[A-Z][A-Z][A-Z]-[0-9][A-Z0-9][0-9][0-9]%', L.Descricao) > 0 THEN SUBSTRING(L.Descricao, PATINDEX('%[A-Z][A-Z][A-Z]-[0-9][A-Z0-9][0-9][0-9]%', L.Descricao), 8) ELSE NULL END as L_PlacaExtraidaTexto,
    CL_via_Item.PlacaReserva as CL_via_Item_PlacaReserva,
    OS.ContratoLocacao as OS_ContratoLocacao,
    CL_via_Item.ContratoLocacao as CL_Item_ContratoLocacao,
    OS.ContratoComercial as OS_ContratoComercial,
    CC_via_Item.NumeroDocumento as CC_Item_NumeroDocumento,
    VV.Comprador as VV_Comprador,
    C_via_OS.NomeFantasia as C_via_OS_Nome,
    CASE WHEN L.Descricao LIKE 'INFRAÇÃO AIT:%-%-%' THEN LTRIM(RTRIM(SUBSTRING(L.Descricao, CHARINDEX('-', L.Descricao, CHARINDEX('-', L.Descricao) + 1) + 1, CHARINDEX('-', L.Descricao, CHARINDEX('-', L.Descricao, CHARINDEX('-', L.Descricao) + 1) + 1) - CHARINDEX('-', L.Descricao, CHARINDEX('-', L.Descricao) + 1) - 1))) ELSE NULL END as L_ClienteExtraidoTexto,
    C_via_Item.NomeFantasia as C_via_Item_Nome,
    C_via_Fatura.NomeFantasia as C_via_Fatura_Nome
  FROM dbo.LancamentosComNaturezas L
  LEFT JOIN dbo.VeiculosComprados AS VC_CompraDireta ON CASE WHEN CHARINDEX('-', L.NumeroDocumento) > 0 THEN LEFT(L.NumeroDocumento, CHARINDEX('-', L.NumeroDocumento) - 1) ELSE L.NumeroDocumento END = VC_CompraDireta.NumeroNotaFiscal AND L.Natureza LIKE '02.01.01.%'
  LEFT JOIN dbo.NotasFiscais AS NF_Compra ON L.OrdemCompra = NF_Compra.OrdemCompra AND L.Natureza LIKE '02.01.01.%'
  LEFT JOIN dbo.VeiculosComprados AS VC_Compra_via_OC ON NF_Compra.NumeroNF = VC_Compra_via_OC.NumeroNotaFiscal AND NF_Compra.IdFornecedor = VC_Compra_via_OC.IdFornecedorNotaFiscal
  LEFT JOIN dbo.OcorrenciasInfracoes AS OI_via_Nota ON L.NumeroDocumento = OI_via_Nota.Nota AND L.Natureza LIKE '%MULTAS%'
  LEFT JOIN dbo.OcorrenciasInfracoes AS OI ON REPLACE(REPLACE(REPLACE(REPLACE(OI.AutoInfracao, '-', ''), ' ', ''), '.', ''), '/', '') = REPLACE(REPLACE(REPLACE(REPLACE(L.NumeroDocumento, '-', ''), ' ', ''), '.', ''), '/', '')
  LEFT JOIN dbo.VeiculosVendidos AS VV ON L.NumeroDocumento = VV.FaturaVenda AND L.Natureza LIKE '01.01.02.%'
  LEFT JOIN dbo.Veiculos AS V_Mestre ON VV.IdVeiculo = V_Mestre.IdVeiculo
  LEFT JOIN dbo.Veiculos AS V_Emergencia ON LEFT(L.NumeroDocumento, 8) = V_Emergencia.Placa AND (L.Natureza LIKE '01.01.02.%' OR L.Natureza LIKE '01 - RECEITAS')
    LEFT JOIN dbo.Veiculos AS V_Fallback ON (
      CASE WHEN PATINDEX('%[A-Z][A-Z][A-Z]-[0-9][A-Z0-9][0-9][0-9]%', L.Descricao) > 0 THEN SUBSTRING(L.Descricao, PATINDEX('%[A-Z][A-Z][A-Z]-[0-9][A-Z0-9][0-9][0-9]%', L.Descricao), 8) ELSE NULL END
    ) = V_Fallback.Placa
  LEFT JOIN dbo.Alienacoes AS A ON (CASE WHEN PATINDEX('%FIN-[0-9]%', L.Descricao) > 0 THEN SUBSTRING(L.Descricao, PATINDEX('%FIN-[0-9]%', L.Descricao), CHARINDEX(':', L.Descricao + ':', PATINDEX('%FIN-[0-9]%', L.Descricao)) - PATINDEX('%FIN-[0-9]%', L.Descricao)) ELSE NULL END) = A.CodigoContrato
  LEFT JOIN dbo.VeiculosComprados AS VC ON A.IdAlienacao = VC.IdAlienacao
  LEFT JOIN dbo.OrdensServico AS OS ON L.OrdemCompra = OS.OrdemCompra
  LEFT JOIN dbo.Clientes AS C_via_OS ON OS.IdCliente = C_via_OS.IdCliente
  LEFT JOIN dbo.Faturamentos AS F ON L.NumeroDocumento = F.Nota AND L.Natureza LIKE '01.%'
  LEFT JOIN dbo.FaturamentoItems AS FI ON F.IdNota = FI.IdNota
  LEFT JOIN dbo.ContratosLocacao AS CL_via_Item ON FI.IdContratoLocacao = CL_via_Item.IdContratoLocacao
  LEFT JOIN dbo.ContratosComerciais AS CC_via_Item ON CL_via_Item.ContratoComercial = CC_via_Item.NumeroDocumento
  LEFT JOIN dbo.Clientes AS C_via_Item ON CC_via_Item.IdCliente = C_via_Item.IdCliente
  LEFT JOIN dbo.Clientes AS C_via_Fatura ON F.IdCliente = C_via_Fatura.IdCliente
  WHERE L.DataCompetencia >= '2022-01-01'
)
SELECT
  NumeroLancamento,
  MIN(Natureza) as Natureza,
  MAX(OS_Placa) as OS_Placa,
  MAX(V_Mestre_Placa) as V_Mestre_Placa,
  MAX(V_Emergencia_Placa) as V_Emergencia_Placa,
  MAX(VC_CompraDireta_Placa) as VC_CompraDireta_Placa,
  MAX(VC_Compra_via_OC_Placa) as VC_Compra_via_OC_Placa,
  MAX(OI_via_Nota_Placa) as OI_via_Nota_Placa,
  MAX(OI_Placa) as OI_Placa,
  MAX(VC_Placa) as VC_Placa,
  MAX(CL_via_Item_PlacaPrincipal) as CL_via_Item_PlacaPrincipal,
  MAX(L_PlacaExtraidaTexto) as L_PlacaExtraidaTexto,
  MAX(CL_via_Item_PlacaReserva) as CL_via_Item_PlacaReserva,
  MAX(OS_ContratoLocacao) as OS_ContratoLocacao,
  MAX(CL_Item_ContratoLocacao) as CL_Item_ContratoLocacao,
  MAX(OS_ContratoComercial) as OS_ContratoComercial,
  MAX(CC_Item_NumeroDocumento) as CC_Item_NumeroDocumento,
  MAX(VV_Comprador) as VV_Comprador,
  MAX(C_via_OS_Nome) as C_via_OS_Nome,
  MAX(L_ClienteExtraidoTexto) as L_ClienteExtraidoTexto,
  MAX(C_via_Item_Nome) as C_via_Item_Nome,
  MAX(C_via_Fatura_Nome) as C_via_Fatura_Nome
FROM base
GROUP BY NumeroLancamento
ORDER BY NumeroLancamento`;

(async function main(){
  try{
    if (!fs.existsSync('public/data')) fs.mkdirSync('public/data', { recursive: true });
    if (fs.existsSync(OUT_PATH)) fs.unlinkSync(OUT_PATH);

    const pool = await sql.connect(sqlConfig);
    const request = new sql.Request(pool);
    request.stream = true;

    const out = fs.createWriteStream(OUT_PATH, { flags: 'a' });
    let rows = 0;

    request.on('row', row => {
      out.write(JSON.stringify(row) + '\n');
      rows++;
      if (rows % 1000 === 0) console.log('exported', rows);
    });

    request.on('error', err => {
      console.error('Erro na stream:', err.message);
      process.exit(2);
    });

    request.on('done', result => {
      out.end();
      console.log('Export concluído. Linhas:', rows, 'arquivo:', OUT_PATH);
      pool.close();
    });

    request.query(QUERY);
  }catch(err){
    console.error('Erro export:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
