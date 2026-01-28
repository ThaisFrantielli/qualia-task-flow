require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || '200.219.192.34',
  port: 3494,
  database: process.env.SQL_DATABASE || 'blufleet-dw',
  connectionTimeout: 180000,
  requestTimeout: 720000,
  options: { encrypt: false, trustServerCertificate: true }
};

const outPath = 'c:/Users/frant/Documents/public/data/fato_financeiro_dre_stream.ndjson';

const query = `SELECT 
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
FROM LancamentosComNaturezas ln WITH (NOLOCK, INDEX(0))
LEFT JOIN OrdensServico os WITH (NOLOCK) ON ISNULL(ln.OrdemCompra, '') = ISNULL(os.OrdemCompra, '') AND os.SituacaoOrdemServico <> 'Cancelada'
LEFT JOIN Clientes cli WITH (NOLOCK) ON os.IdCliente = cli.IdCliente
ORDER BY ln.DataCompetencia DESC
OPTION (MAXDOP 2, FAST 500, RECOMPILE)`;

async function run() {
  const pool = await sql.connect(sqlConfig);
  const req = pool.request();
  req.stream = true;

  const ws = fs.createWriteStream(outPath, { encoding: 'utf8' });
  let count = 0;

  req.on('row', row => {
    ws.write(JSON.stringify(row) + '\n');
    count++;
  });

  req.on('error', err => {
    console.error('Query stream error:', err.message);
    ws.end();
    pool.close();
  });

  req.on('done', async result => {
    console.log('Query stream done. registros:', count);
    ws.end();
    await pool.close();
  });

  console.log('Iniciando exportação streaming para', outPath);
  req.query(query);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
