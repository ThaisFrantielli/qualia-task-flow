require('dotenv').config();
const fs = require('fs');
const sql = require('mssql');

const OUT_NDJSON = 'public/data/mapa_universal_sample.ndjson';
const OUT_MANIFEST = 'public/data/mapa_universal_sample_manifest.json';
const SAMPLE_LIMIT = 1000; // ajustável

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || '200.219.192.34',
  port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT,10) : 3494,
  database: process.env.SQL_DATABASE || 'blufleet-dw',
    options: { encrypt: false, trustServerCertificate: true, requestTimeout: 600000 }
};

const QUERY = `
SET NOCOUNT ON;
;WITH MapaUniversalBrutoComDuplicatas AS (
    SELECT
        L0.NumeroLancamento,
        L0.Natureza,
        COALESCE(
            OS.Placa, V_Mestre.Placa, V_Emergencia.Placa, VC_CompraDireta.Placa, VC_Compra_via_OC.Placa,
            OI_via_Nota.Placa, OI.Placa, VC.Placa, CL_via_Item.PlacaPrincipal, V_Fallback.Placa,
            L0.PlacaExtraidaTexto,
            CASE WHEN L0.NumeroDocumento LIKE '[A-Z][A-Z][A-Z]-[0-9][A-Z0-9][0-9][0-9]%' THEN LEFT(L0.NumeroDocumento, 8) ELSE NULL END,
            CL_via_Item.PlacaReserva
        ) AS Placa,
        COALESCE(OS.ContratoLocacao, CL_via_Item.ContratoLocacao) AS ContratoLocacao,
        COALESCE(
            OS.ContratoComercial,
            CC_via_Item.NumeroDocumento,
            CASE WHEN L0.NumeroDocumento LIKE 'CTO-%' THEN L0.NumeroDocumento ELSE NULL END
        ) AS ContratoComercial,
        COALESCE(
            CASE
                WHEN L0.Natureza LIKE '%VENDA DE VEICULO SINISTRADO%' AND L0.Descricao LIKE 'INFRAÇÃO AIT:%' THEN NULL
                WHEN L0.Natureza LIKE '01.01.02.%' OR L0.Natureza LIKE '01 - RECEITAS' THEN VV.Comprador
                ELSE COALESCE(C_via_OS.NomeFantasia, L0.ClienteExtraidoTexto, C_via_Item.NomeFantasia, C_via_Fatura.NomeFantasia)
            END,
            CASE
                WHEN COALESCE(
                    OS.Placa, V_Mestre.Placa, V_Emergencia.Placa, VC_CompraDireta.Placa, VC_Compra_via_OC.Placa,
                    OI_via_Nota.Placa, OI.Placa, VC.Placa, CL_via_Item.PlacaPrincipal, V_Fallback.Placa,
                    L0.PlacaExtraidaTexto,
                    CASE WHEN L0.NumeroDocumento LIKE '[A-Z][A-Z][A-Z]-[0-9][A-Z0-9][0-9][0-9]%' THEN LEFT(L0.NumeroDocumento, 8) ELSE NULL END,
                    CL_via_Item.PlacaReserva
                ) IS NULL
                THEN L0.PagarReceberDe
                ELSE NULL
            END
        ) AS Cliente
    FROM (
        SELECT
            L.*,
            CASE WHEN CHARINDEX('-', L.NumeroDocumento) > 0 THEN LEFT(L.NumeroDocumento, CHARINDEX('-', L.NumeroDocumento) - 1) ELSE L.NumeroDocumento END AS ChaveNFCompra,
            REPLACE(REPLACE(REPLACE(REPLACE(L.NumeroDocumento, '-', ''), ' ', ''), '.', ''), '/', '') AS ChaveInfracaoLimpa,
            CASE WHEN PATINDEX('%FIN-[0-9]%', L.Descricao) > 0 THEN
                SUBSTRING(L.Descricao, PATINDEX('%FIN-[0-9]%', L.Descricao), CHARINDEX(':', L.Descricao + ':', PATINDEX('%FIN-[0-9]%', L.Descricao)) - PATINDEX('%FIN-[0-9]%', L.Descricao))
            ELSE NULL END AS CodigoContratoExtraido,
            CASE WHEN PATINDEX('%[A-Z][A-Z][A-Z]-[0-9][A-Z0-9][0-9][0-9]%', L.Descricao) > 0 THEN
                SUBSTRING(L.Descricao, PATINDEX('%[A-Z][A-Z][A-Z]-[0-9][A-Z0-9][0-9][0-9]%', L.Descricao), 8)
            ELSE NULL END AS PlacaExtraidaTexto,
            CASE WHEN L.Descricao LIKE 'INFRAÇÃO AIT:%-%-%' THEN
                LTRIM(RTRIM(SUBSTRING(L.Descricao, CHARINDEX('-', L.Descricao, CHARINDEX('-', L.Descricao) + 1) + 1,
                    CHARINDEX('-', L.Descricao, CHARINDEX('-', L.Descricao, CHARINDEX('-', L.Descricao) + 1) + 1)
                    - CHARINDEX('-', L.Descricao, CHARINDEX('-', L.Descricao) + 1) - 1)))
            ELSE NULL END AS ClienteExtraidoTexto
        FROM dbo.LancamentosComNaturezas AS L
        WHERE L.DataCompetencia >= '2022-01-01'
    ) AS L0
    LEFT JOIN dbo.VeiculosComprados AS VC_CompraDireta
        ON L0.ChaveNFCompra = VC_CompraDireta.NumeroNotaFiscal AND L0.Natureza LIKE '02.01.01.%'
    LEFT JOIN dbo.NotasFiscais AS NF_Compra
        ON L0.OrdemCompra = NF_Compra.OrdemCompra AND L0.Natureza LIKE '02.01.01.%'
    LEFT JOIN dbo.VeiculosComprados AS VC_Compra_via_OC
        ON NF_Compra.NumeroNF = VC_Compra_via_OC.NumeroNotaFiscal AND NF_Compra.IdFornecedor = VC_Compra_via_OC.IdFornecedorNotaFiscal
    LEFT JOIN dbo.OcorrenciasInfracoes AS OI_via_Nota
        ON L0.NumeroDocumento = OI_via_Nota.Nota AND L0.Natureza LIKE '%MULTAS%'
    LEFT JOIN dbo.OcorrenciasInfracoes AS OI
        ON L0.ChaveInfracaoLimpa = REPLACE(REPLACE(REPLACE(REPLACE(OI.AutoInfracao, '-', ''), ' ', ''), '.', ''), '/', '')
    LEFT JOIN dbo.VeiculosVendidos AS VV
        ON L0.NumeroDocumento = VV.FaturaVenda AND L0.Natureza LIKE '01.01.02.%'
    LEFT JOIN dbo.Veiculos AS V_Mestre ON VV.IdVeiculo = V_Mestre.IdVeiculo
    LEFT JOIN dbo.Veiculos AS V_Emergencia
        ON LEFT(L0.NumeroDocumento, 8) = V_Emergencia.Placa AND (L0.Natureza LIKE '01.01.02.%' OR L0.Natureza LIKE '01 - RECEITAS')
    LEFT JOIN dbo.Veiculos AS V_Fallback ON L0.PlacaExtraidaTexto = V_Fallback.Placa
    LEFT JOIN dbo.Alienacoes AS A ON L0.CodigoContratoExtraido = A.CodigoContrato
    LEFT JOIN dbo.VeiculosComprados AS VC ON A.IdAlienacao = VC.IdAlienacao
    LEFT JOIN dbo.OrdensServico AS OS ON L0.OrdemCompra = OS.OrdemCompra
    LEFT JOIN dbo.Clientes AS C_via_OS ON OS.IdCliente = C_via_OS.IdCliente
    LEFT JOIN dbo.Faturamentos AS F ON L0.NumeroDocumento = F.Nota AND L0.Natureza LIKE '01.%'
    LEFT JOIN dbo.FaturamentoItems AS FI ON F.IdNota = FI.IdNota
    LEFT JOIN dbo.ContratosLocacao AS CL_via_Item ON FI.IdContratoLocacao = CL_via_Item.IdContratoLocacao
    LEFT JOIN dbo.ContratosComerciais AS CC_via_Item ON CL_via_Item.ContratoComercial = CC_via_Item.NumeroDocumento
    LEFT JOIN dbo.Clientes AS C_via_Item ON CC_via_Item.IdCliente = C_via_Item.IdCliente
    LEFT JOIN dbo.Clientes AS C_via_Fatura ON F.IdCliente = C_via_Fatura.IdCliente
)
SELECT
    NumeroLancamento,
    MIN(Natureza) AS Natureza,
    MIN(Placa) AS Placa,
    MIN(ContratoLocacao) AS ContratoLocacao,
    MIN(ContratoComercial) AS ContratoComercial,
    MIN(Cliente) AS Cliente
INTO #MapaFinal
FROM MapaUniversalBrutoComDuplicatas
GROUP BY NumeroLancamento;

SELECT COUNT(1) AS Total FROM #MapaFinal;
SELECT TOP (${SAMPLE_LIMIT}) * FROM #MapaFinal;
`;

(async function main(){
  try {
    if (!fs.existsSync('public/data')) fs.mkdirSync('public/data', { recursive: true });
    if (fs.existsSync(OUT_NDJSON)) fs.unlinkSync(OUT_NDJSON);
    if (fs.existsSync(OUT_MANIFEST)) fs.unlinkSync(OUT_MANIFEST);

    console.log('Conectando ao SQL Server...');
    const pool = await sql.connect(sqlConfig);
    console.log('Executando query (pode demorar)...');
    const result = await pool.request().query(QUERY);

    // result.recordsets[0] -> count, [1] -> sample rows
    const total = result.recordsets[0] && result.recordsets[0][0] ? result.recordsets[0][0].Total : null;
    const rows = result.recordsets[1] || [];

    for (const r of rows) {
      fs.appendFileSync(OUT_NDJSON, JSON.stringify(r) + '\n');
    }

    const manifest = { totalRows: total, sampleWritten: rows.length, generatedAt: new Date().toISOString() };
    fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2));

    console.log('Concluído. Total:', total, 'Amostra escrita:', rows.length);
    await pool.close();

    // update todo list: mark steps 1-3 completed
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
