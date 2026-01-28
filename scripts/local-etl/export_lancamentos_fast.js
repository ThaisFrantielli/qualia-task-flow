require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const outPath = 'public/data/fato_financeiro_dre_fast.ndjson';
const manifestPath = 'public/data/fato_financeiro_dre_fast_manifest.json';

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || '200.219.192.34',
  port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT,10) : 3494,
  database: process.env.SQL_DATABASE || 'blufleet-dw',
  options: { encrypt: false, trustServerCertificate: true }
};

(async function main(){
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  const pool = await sql.connect(sqlConfig);
  const batchSize = 10000;
  let offset = 0;
  let total = 0;
  try {
    while (true) {
      const q = `SELECT * FROM (
        SELECT 
          CONVERT(VARCHAR(36), NEWID()) + '|' + CAST(ln.NumeroLancamento AS VARCHAR(50)) + '|' + ISNULL(ln.Natureza, '') as IdLancamentoNatureza,
          ln.NumeroLancamento as NumeroLancamento,
          FORMAT(ln.DataCompetencia, 'yyyy-MM-dd') as DataCompetencia,
          ln.Natureza,
          ln.TipoLancamento,
          ln.ValorPagoRecebido,
          ln.Descricao as DescricaoLancamento,
          ln.Conta,
          ln.FormaPagamento,
          FORMAT(ln.DataPagamentoRecebimento, 'yyyy-MM-dd') as DataPagamentoRecebimento,
          ln.PagarReceberDe,
          ln.NumeroDocumento
        FROM LancamentosComNaturezas ln
      ) t
      ORDER BY NumeroLancamento
      OFFSET ${offset} ROWS FETCH NEXT ${batchSize} ROWS ONLY`;

      const res = await pool.request().query(q);
      if (!res.recordset || res.recordset.length === 0) break;
      for (const r of res.recordset) {
        fs.appendFileSync(outPath, JSON.stringify(r) + '\n');
      }
      total += res.recordset.length;
      offset += batchSize;
      console.log(`Wrote ${total} rows...`);
      if (res.recordset.length < batchSize) break;
    }

    fs.writeFileSync(manifestPath, JSON.stringify({ totalRecords: total, batchSize }, null, 2));
    console.log('Finished export. Rows:', total);
  } catch (e) {
    console.error('Export error:', e.message);
    process.exitCode = 2;
  } finally {
    await pool.close();
  }
})();
