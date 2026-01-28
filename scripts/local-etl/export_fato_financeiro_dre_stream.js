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

const outPath = 'public/data/fato_financeiro_dre_stream.ndjson';

// IMPORTANT: OrdensServico pode ter múltiplas linhas por OrdemCompra.
// Para manter 1:1 com LancamentosComNaturezas (100% da base), escolhemos 1 OS por OrdemCompra via OUTER APPLY.
const query = `SELECT
    -- ID determinístico (o DW não possui IdLancamentoNatureza nativo)
    CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', CONCAT(
      CAST(ln.NumeroLancamento AS VARCHAR(50)), '|',
      ISNULL(ln.Natureza, ''), '|',
      FORMAT(ln.DataCompetencia, 'yyyy-MM-dd'), '|',
      ISNULL(CAST(ln.ValorNatureza AS VARCHAR(50)), ''), '|',
      ISNULL(CAST(ln.PercentualNatureza AS VARCHAR(50)), '')
    )), 2) as IdLancamentoNatureza,
    ln.NumeroLancamento as IdLancamento,
    ln.NumeroLancamento as NumeroLancamento,
    FORMAT(ln.DataCompetencia, 'yyyy-MM-dd') as DataCompetencia,
    ln.Natureza,
    CASE WHEN ln.TipoLancamento = 'Entrada' THEN 'Entrada' WHEN ln.TipoLancamento = 'Saída' THEN 'Saída' ELSE 'Outro' END as TipoLancamento,
    (CASE
      WHEN CHARINDEX(',', ISNULL(CAST(ISNULL(ln.ValorPagoRecebido, 0) AS VARCHAR), '')) > 0
        THEN TRY_CAST(REPLACE(REPLACE(ISNULL(CAST(ISNULL(ln.ValorPagoRecebido, 0) AS VARCHAR), '0'), '.', ''), ',', '.') AS DECIMAL(20,2))
      ELSE TRY_CAST(ISNULL(ln.ValorPagoRecebido, 0) AS DECIMAL(20,2))
     END) as Valor,
    ln.Descricao as DescricaoLancamento,
    ln.Conta,
    ln.FormaPagamento,
    FORMAT(ln.DataPagamentoRecebimento, 'yyyy-MM-dd') as DataPagamentoRecebimento,
    ln.PagarReceberDe as NomeEntidade,
    ln.PagarReceberDe,
    ln.NumeroDocumento,
    COALESCE(cli.NomeFantasia, os1.Cliente, '') as NomeCliente,
    os1.Placa as Placa,
    os1.ContratoComercial as ContratoComercial,
    os1.ContratoLocacao as ContratoLocacao
FROM LancamentosComNaturezas ln WITH (NOLOCK, INDEX(0))
OUTER APPLY (
  SELECT TOP 1
    os.Placa,
    os.Cliente,
    os.ContratoComercial,
    os.ContratoLocacao,
    os.IdCliente
  FROM OrdensServico os WITH (NOLOCK)
  WHERE ISNULL(ln.OrdemCompra, '') = ISNULL(os.OrdemCompra, '')
    AND os.SituacaoOrdemServico <> 'Cancelada'
  ORDER BY os.OrdemServicoCriadaEm DESC
) os1
LEFT JOIN Clientes cli WITH (NOLOCK) ON os1.IdCliente = cli.IdCliente
ORDER BY ln.DataCompetencia DESC
OPTION (MAXDOP 2, FAST 500, RECOMPILE)`;

async function run() {
  const pool = await sql.connect(sqlConfig);
  const req = pool.request();
  req.stream = true;

  const ws = fs.createWriteStream(outPath, { encoding: 'utf8' });
  let count = 0;
  let hadError = false;

  req.on('row', row => {
    ws.write(JSON.stringify(row) + '\n');
    count++;
  });

  req.on('error', err => {
    hadError = true;
    console.error('Query stream error:', err.message);
    ws.end();
    pool.close();
  });

  req.on('done', async result => {
    console.log('Query stream done. registros:', count);
    ws.end();
    await pool.close();

    if (hadError) {
      console.error('Export finalizado com erro de conexão. Arquivo pode estar incompleto:', outPath);
      process.exitCode = 2;
    }
  });

  console.log('Iniciando exportação streaming para', outPath);
  req.query(query);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
