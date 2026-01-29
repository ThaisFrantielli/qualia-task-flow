require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || '200.219.192.34',
  port: parseInt(process.env.SQL_PORT || '3494', 10),
  database: process.env.SQL_DATABASE || 'blufleet-dw',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 0,
};

function parseArgs(argv) {
  const args = { from: null, to: null, out: 'public/data/fato_financeiro_dre_dw.ndjson', resume: true, checkpoint: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--from') args.from = argv[++i];
    else if (a === '--to') args.to = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--checkpoint') args.checkpoint = argv[++i];
    else if (a === '--no-resume') args.resume = false;
  }
  return args;
}

function monthToDateRange(month) {
  const fromDate = new Date(month + '-01T00:00:00');
  const toDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return { fromDate, toDate };
}

async function listMonths(pool) {
  const q = `SELECT DISTINCT FORMAT(DataCompetencia,'yyyy-MM') AS mes
             FROM LancamentosComNaturezas WITH (NOLOCK, INDEX(0))
             WHERE DataCompetencia IS NOT NULL
             ORDER BY mes`;
  const res = await pool.request().query(q);
  return res.recordset.map(r => r.mes).filter(Boolean);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function exportOneMonth(month, outPath) {
  const { fromDate, toDate } = monthToDateRange(month);
  const tmpPath = `${outPath}.${month}.tmp`;
  const pool = await sql.connect(sqlConfig);
  const req = pool.request();
  req.stream = true;
  req.input('fromDate', sql.DateTime, fromDate);
  req.input('toDate', sql.DateTime, toDate);

  // 1:1 com LancamentosComNaturezas. Enriquecimento usa OUTER APPLY TOP 1 em OrdensServico.
  const query = `SELECT
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
    WHERE ln.OrdemCompra IS NOT NULL
      AND LTRIM(RTRIM(ln.OrdemCompra)) <> ''
      AND os.OrdemCompra = ln.OrdemCompra
      AND os.SituacaoOrdemServico <> 'Cancelada'
    ORDER BY os.OrdemServicoCriadaEm DESC
  ) os1
  LEFT JOIN Clientes cli WITH (NOLOCK) ON os1.IdCliente = cli.IdCliente
  WHERE ln.DataCompetencia >= @fromDate AND ln.DataCompetencia <= @toDate
  OPTION (MAXDOP 2, FAST 500, RECOMPILE)`;

  ensureDir(outPath);
  try { fs.unlinkSync(tmpPath); } catch (e) {}
  const ws = fs.createWriteStream(tmpPath, { encoding: 'utf8', flags: 'w' });

  let count = 0;
  let hadError = false;

  req.on('row', row => {
    ws.write(JSON.stringify(row) + '\n');
    count++;
  });

  req.on('error', err => {
    hadError = true;
    console.error(`[${month}] stream error:`, err && err.message ? err.message : err);
    try { ws.end(); } catch (e) {}
    try { pool.close(); } catch (e) {}
  });

  const donePromise = new Promise((resolve) => {
    req.on('done', async () => {
      try { ws.end(); } catch (e) {}
      try { await pool.close(); } catch (e) {}
      resolve({ count, hadError });
    });
  });

  req.query(query);
  return donePromise;
}

async function exportNullCompetencia(outPath) {
  const monthKey = '__NULL__';
  const tmpPath = `${outPath}.${monthKey}.tmp`;
  const pool = await sql.connect(sqlConfig);
  const req = pool.request();
  req.stream = true;

  const query = `SELECT
    CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', CONCAT(
      CAST(ln.NumeroLancamento AS VARCHAR(50)), '|',
      ISNULL(ln.Natureza, ''), '|',
      ISNULL(FORMAT(ln.DataCompetencia, 'yyyy-MM-dd'), ''), '|',
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
    WHERE ln.OrdemCompra IS NOT NULL
      AND LTRIM(RTRIM(ln.OrdemCompra)) <> ''
      AND os.OrdemCompra = ln.OrdemCompra
      AND os.SituacaoOrdemServico <> 'Cancelada'
    ORDER BY os.OrdemServicoCriadaEm DESC
  ) os1
  LEFT JOIN Clientes cli WITH (NOLOCK) ON os1.IdCliente = cli.IdCliente
  WHERE ln.DataCompetencia IS NULL
  OPTION (MAXDOP 2, FAST 500, RECOMPILE)`;

  ensureDir(outPath);
  try { fs.unlinkSync(tmpPath); } catch (e) {}
  const ws = fs.createWriteStream(tmpPath, { encoding: 'utf8', flags: 'w' });

  let count = 0;
  let hadError = false;

  req.on('row', row => {
    ws.write(JSON.stringify(row) + '\n');
    count++;
  });

  req.on('error', err => {
    hadError = true;
    console.error(`[${monthKey}] stream error:`, err && err.message ? err.message : err);
    try { ws.end(); } catch (e) {}
    try { pool.close(); } catch (e) {}
  });

  const donePromise = new Promise((resolve) => {
    req.on('done', async () => {
      try { ws.end(); } catch (e) {}
      try { await pool.close(); } catch (e) {}
      resolve({ count, hadError, tmpPath });
    });
  });

  req.query(query);
  return donePromise;
}

async function appendFile(fromPath, toPath) {
  await new Promise((resolve, reject) => {
    const rs = fs.createReadStream(fromPath);
    const ws = fs.createWriteStream(toPath, { flags: 'a' });
    rs.on('error', reject);
    ws.on('error', reject);
    ws.on('close', resolve);
    rs.pipe(ws);
  });
}

(async function main() {
  const args = parseArgs(process.argv);
  const defaultCheckpoint = path.join(
    process.cwd(),
    'public',
    'data',
    `${path.basename(args.out)}.months_done.json`
  );
  const checkpointPath = args.checkpoint ? path.resolve(args.checkpoint) : defaultCheckpoint;

  const pool = await sql.connect(sqlConfig);
  let months = [];
  try {
    months = await listMonths(pool);
  } finally {
    await pool.close();
  }

  if (args.from) months = months.filter(m => m >= args.from);
  if (args.to) months = months.filter(m => m <= args.to);

  const doneSet = new Set();
  if (args.resume && fs.existsSync(checkpointPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
      if (Array.isArray(prev)) prev.forEach(m => doneSet.add(m));
    } catch (e) {}
  }

  // Fresh start when not resuming
  if (!args.resume) {
    try { fs.unlinkSync(args.out); } catch (e) {}
    try { fs.unlinkSync(checkpointPath); } catch (e) {}
  }

  console.log('Out:', args.out);
  console.log('Months to export:', months.length);
  console.log('Resume:', args.resume, 'already done:', doneSet.size);

  for (const month of months) {
    if (args.resume && doneSet.has(month)) {
      console.log(`[${month}] skip (checkpoint)`);
      continue;
    }

    let ok = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[${month}] exporting (attempt ${attempt}/3)...`);
      const { count, hadError } = await exportOneMonth(month, args.out);
      console.log(`[${month}] rows: ${count} error: ${hadError}`);
      if (!hadError) {
        const tmpPath = `${args.out}.${month}.tmp`;
        await appendFile(tmpPath, args.out);
        try { fs.unlinkSync(tmpPath); } catch (e) {}
        ok = true;
        break;
      }
      // backoff
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }

    if (!ok) {
      console.error(`[${month}] FAILED after retries. Stopping.`);
      process.exit(2);
    }

    doneSet.add(month);
    fs.writeFileSync(checkpointPath, JSON.stringify(Array.from(doneSet).sort()), 'utf8');
  }

  // Exporta também linhas com DataCompetencia NULL (não entram no batching por mês)
  const nullKey = '__NULL__';
  if (args.resume && doneSet.has(nullKey)) {
    console.log(`[${nullKey}] skip (checkpoint)`);
  } else {
    let ok = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[${nullKey}] exporting (attempt ${attempt}/3)...`);
      const { count, hadError, tmpPath } = await exportNullCompetencia(args.out);
      console.log(`[${nullKey}] rows: ${count} error: ${hadError}`);
      if (!hadError) {
        await appendFile(tmpPath, args.out);
        try { fs.unlinkSync(tmpPath); } catch (e) {}
        ok = true;
        break;
      }
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
    if (!ok) {
      console.error(`[${nullKey}] FAILED after retries. Stopping.`);
      process.exit(2);
    }
    doneSet.add(nullKey);
    fs.writeFileSync(checkpointPath, JSON.stringify(Array.from(doneSet).sort()), 'utf8');
  }

  console.log('DONE. Export file:', args.out);
})().catch(e => {
  console.error('Export failed:', e && e.message ? e.message : e);
  process.exit(1);
});
