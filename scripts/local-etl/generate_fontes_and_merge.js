require('dotenv').config();
const fs = require('fs');
const sql = require('mssql');

const IN_PATH = 'public/data/mapa_universal_full.ndjson';
const OUT_PATH = 'public/data/mapa_universal_full_with_fontes.ndjson';

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || '200.219.192.34',
  port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT,10) : 3494,
  database: process.env.SQL_DATABASE || 'blufleet-dw',
  options: { encrypt: false, trustServerCertificate: true, requestTimeout: 0 }
};

const baseCTE = `
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
`;

async function runQueryMap(pool, sqlText) {
  const res = await pool.request().query(sqlText);
  const map = new Map();
  if (res && res.recordset) {
    for (const r of res.recordset) map.set(String(r.NumeroLancamento), r.Fonte);
  }
  return map;
}

(async function main(){
  if (!fs.existsSync(IN_PATH)) { console.error('NDJSON base não existe:', IN_PATH); process.exit(2); }
  if (fs.existsSync(OUT_PATH)) fs.unlinkSync(OUT_PATH);

  const pool = await sql.connect(sqlConfig);
  try {
    console.log('Gerando mapa FontePlaca...');
    const q1 = baseCTE + `SELECT NumeroLancamento,
    CASE
      WHEN MAX(CASE WHEN OS.Placa IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'OrdensServico'
      WHEN MAX(CASE WHEN V_Mestre.Placa IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'Veiculos'
      WHEN MAX(CASE WHEN V_Emergencia.Placa IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'VeiculosEmergencia'
      WHEN MAX(CASE WHEN VC_CompraDireta.Placa IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'VeiculosComprados'
      WHEN MAX(CASE WHEN VC_Compra_via_OC.Placa IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'VeiculosComprados'
      WHEN MAX(CASE WHEN OI_via_Nota.Placa IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'OcorrenciasInfracoes'
      WHEN MAX(CASE WHEN OI.Placa IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'OcorrenciasInfracoes'
      WHEN MAX(CASE WHEN VC.Placa IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'VeiculosCompradosViaAlienacao'
      WHEN MAX(CASE WHEN CL_via_Item.PlacaPrincipal IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'ContratosLocacaoItem'
      WHEN MAX(CASE WHEN V_Fallback.Placa IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'Veiculos'
      WHEN MAX(CASE WHEN L0.PlacaExtraidaTexto IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'LancamentosComNaturezas(Descricao)'
      WHEN MAX(CASE WHEN (CASE WHEN L0.NumeroDocumento LIKE '[A-Z][A-Z][A-Z]-[0-9][A-Z0-9][0-9][0-9]%' THEN LEFT(L0.NumeroDocumento, 8) ELSE NULL END) IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'NumeroDocumento'
      WHEN MAX(CASE WHEN CL_via_Item.PlacaReserva IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'ContratosLocacaoReserva'
      ELSE NULL
    END AS Fonte
    FROM MapaUniversalBrutoComDuplicatas
    GROUP BY NumeroLancamento`;

    const mapPlaca = await runQueryMap(pool, q1);

    console.log('Gerando mapa FonteContratoComercial...');
    const q2 = baseCTE + `SELECT NumeroLancamento,
    CASE
      WHEN MAX(CASE WHEN OS.ContratoComercial IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'OrdensServico'
      WHEN MAX(CASE WHEN CC_via_Item.NumeroDocumento IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'ContratosComerciais'
      WHEN MAX(CASE WHEN (CASE WHEN L0.NumeroDocumento LIKE 'CTO-%' THEN L0.NumeroDocumento ELSE NULL END) IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'LancamentosComNaturezas(NumeroDocumento)'
      ELSE NULL
    END AS Fonte
    FROM MapaUniversalBrutoComDuplicatas
    GROUP BY NumeroLancamento`;
    const mapContratoCom = await runQueryMap(pool, q2);

    console.log('Gerando mapa FonteContratoLocacao...');
    const q3 = baseCTE + `SELECT NumeroLancamento,
    CASE
      WHEN MAX(CASE WHEN OS.ContratoLocacao IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'OrdensServico'
      WHEN MAX(CASE WHEN CL_via_Item.ContratoLocacao IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'FaturamentoItem/ContratoLocacao'
      ELSE NULL
    END AS Fonte
    FROM MapaUniversalBrutoComDuplicatas
    GROUP BY NumeroLancamento`;
    const mapContratoLoc = await runQueryMap(pool, q3);

    console.log('Gerando mapa FonteCliente...');
    const q4 = baseCTE + `SELECT NumeroLancamento,
    CASE
      WHEN MAX(CASE WHEN VV.Comprador IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'VeiculosVendidos'
      WHEN MAX(CASE WHEN C_via_OS.NomeFantasia IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'Clientes-via-OS'
      WHEN MAX(CASE WHEN L0.ClienteExtraidoTexto IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'LancamentosComNaturezas(Descricao)'
      WHEN MAX(CASE WHEN C_via_Item.NomeFantasia IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'Clientes-via-Item'
      WHEN MAX(CASE WHEN C_via_Fatura.NomeFantasia IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'Clientes-via-Fatura'
      WHEN MAX(CASE WHEN (CASE WHEN COALESCE(OS.Placa, V_Mestre.Placa, V_Emergencia.Placa, VC_CompraDireta.Placa, VC_Compra_via_OC.Placa, OI_via_Nota.Placa, OI.Placa, VC.Placa, CL_via_Item.PlacaPrincipal, V_Fallback.Placa, L0.PlacaExtraidaTexto, CASE WHEN L0.NumeroDocumento LIKE '[A-Z][A-Z][A-Z]-[0-9][A-Z0-9][0-9][0-9]%' THEN LEFT(L0.NumeroDocumento, 8) ELSE NULL END, CL_via_Item.PlacaReserva) IS NULL THEN 1 ELSE 0 END) = 1 THEN 'PagarReceberDe'
      ELSE NULL
    END AS Fonte
    FROM MapaUniversalBrutoComDuplicatas
    GROUP BY NumeroLancamento`;
    const mapCliente = await runQueryMap(pool, q4);

    console.log('Mesclando fontes no NDJSON...');
    const rl = require('readline').createInterface({ input: fs.createReadStream(IN_PATH), crlfDelay: Infinity });
    const out = fs.createWriteStream(OUT_PATH, { flags: 'a' });
    let written = 0;
    for await (const line of rl) {
      if (!line.trim()) continue;
      const obj = JSON.parse(line);
      const key = String(obj.NumeroLancamento);
      obj.FontePlaca = mapPlaca.get(key) || null;
      obj.FonteContratoComercial = mapContratoCom.get(key) || null;
      obj.FonteContratoLocacao = mapContratoLoc.get(key) || null;
      obj.FonteCliente = mapCliente.get(key) || null;
      // FonteDescricao simple compose
      const parts = [];
      if (obj.FontePlaca) parts.push('Placa:' + obj.FontePlaca);
      if (obj.FonteContratoComercial) parts.push('ContratoComercial:' + obj.FonteContratoComercial);
      if (obj.FonteContratoLocacao) parts.push('ContratoLocacao:' + obj.FonteContratoLocacao);
      if (obj.FonteCliente) parts.push('Cliente:' + obj.FonteCliente);
      obj.FonteDescricao = parts.join('; ');
      out.write(JSON.stringify(obj) + '\n');
      written++;
      if (written % 1000 === 0) console.log('merged', written);
    }
    out.end();
    console.log('Merge concluído. linhas:', written, 'arquivo:', OUT_PATH);
  } catch (err) {
    console.error('Erro:', err && err.message ? err.message : err);
    process.exit(2);
  } finally {
    await sql.close();
  }
})();
