require('dotenv').config();
const sql = require('mssql');
const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER || '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE || 'blufleet-dw',
    options: { encrypt: false, trustServerCertificate: true }
};

async function run() {
  const pool = await sql.connect(sqlConfig);
  const q = `SELECT TOP 5
    CONVERT(VARCHAR(36), NEWID()) + '|' + CAST(ln.NumeroLancamento AS VARCHAR(50)) + '|' + ISNULL(ln.Natureza, '') as IdLancamentoNatureza,
    ln.NumeroLancamento as IdLancamento,
    ln.NumeroLancamento as NumeroLancamento,
    FORMAT(ln.DataCompetencia, 'yyyy-MM-dd') as DataCompetencia,
    ln.Natureza,
    CASE WHEN ln.TipoLancamento = 'Entrada' THEN 'Entrada' WHEN ln.TipoLancamento = 'Saída' THEN 'Saída' ELSE 'Outro' END as TipoLancamento,
    (CASE WHEN CHARINDEX(',', ISNULL(CAST(ISNULL(ln.ValorPagoRecebido, 0) AS VARCHAR), '')) > 0 THEN TRY_CAST(REPLACE(REPLACE(ISNULL(CAST(ISNULL(ln.ValorPagoRecebido, 0) AS VARCHAR), '0'), '.', ''), ',', '.') AS DECIMAL(15,2)) ELSE TRY_CAST(ISNULL(ln.ValorPagoRecebido, 0) AS DECIMAL(15,2)) END) as Valor,
    ln.Descricao as DescricaoLancamento,
    ln.Conta,
    ln.FormaPagamento,
    FORMAT(ln.DataPagamentoRecebimento, 'yyyy-MM-dd') as DataPagamentoRecebimento,
    ln.PagarReceberDe as NomeEntidade,
    ln.PagarReceberDe,
    ln.NumeroDocumento,
    COALESCE(cli.NomeFantasia, os.Cliente, '') as NomeCliente,
    os.Placa as Placa,
    os.ContratoComercial as ContratoComercial,
    os.ContratoLocacao as ContratoLocacao
  FROM LancamentosComNaturezas ln WITH (NOLOCK)
  LEFT JOIN OrdensServico os WITH (NOLOCK) ON ISNULL(ln.OrdemCompra, '') = ISNULL(os.OrdemCompra, '') AND os.SituacaoOrdemServico <> 'Cancelada'
  LEFT JOIN Clientes cli WITH (NOLOCK) ON os.IdCliente = cli.IdCliente
  ORDER BY ln.DataCompetencia DESC`;

  const res = await pool.request().query(q);
  console.log(JSON.stringify(res.recordset, null, 2));
  await pool.close();
}

run().catch(e=>{ console.error('Erro:', e.message); process.exit(1)});
