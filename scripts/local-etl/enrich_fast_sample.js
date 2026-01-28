require('dotenv').config();
const fs = require('fs');
const readline = require('readline');
const sql = require('mssql');

const IN_PATH = 'public/data/fato_financeiro_dre_fast.ndjson';
const OUT_PATH = 'public/data/fato_financeiro_dre_fast_enriched_sample.ndjson';
const SAMPLE_SIZE = 10000;

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || '200.219.192.34',
  port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT,10) : 3494,
  database: process.env.SQL_DATABASE || 'blufleet-dw',
  options: { encrypt: false, trustServerCertificate: true }
};

const plateRegex = /([A-Z]{3}-[0-9A-Z]{4})/g;

async function enrichRow(pool, row) {
  const out = Object.assign({}, row);
  out.NomeCliente = '';
  out.Placa = '';
  out.ContratoComercial = '';
  out.ContratoLocacao = '';

  const desc = (row.DescricaoLancamento || '') + ' ' + (row.NumeroDocumento || '');
  const compact = desc.replace(/[^A-Z0-9\-\/ ]+/gi, ' ');
  const matches = Array.from(compact.matchAll(plateRegex)).map(m=>m[1]);
  const plate = matches.length ? matches[0] : null;

  // Try OrdensServico by plate
  if (plate) {
    const r = await pool.request()
      .input('plate', sql.VarChar, plate)
      .query("SELECT TOP 1 Placa, Cliente, ContratoComercial, ContratoLocacao FROM OrdensServico WITH (NOLOCK) WHERE Placa = @plate AND SituacaoOrdemServico <> 'Cancelada' ORDER BY DataInicioServico DESC");
    if (r.recordset && r.recordset.length) {
      const s = r.recordset[0];
      out.Placa = s.Placa || plate;
      out.NomeCliente = s.Cliente || '';
      out.ContratoComercial = s.ContratoComercial || '';
      out.ContratoLocacao = s.ContratoLocacao || '';
      return out;
    }
  }

  // Try VeiculosComprados by NumeroDocumento (exact or left before /)
  const numDoc = (row.NumeroDocumento || '').toString();
  const numDocLeft = numDoc.includes('/') ? numDoc.split('/')[0] : numDoc;
  if (numDocLeft) {
    const r2 = await pool.request()
      .input('num', sql.VarChar, numDocLeft)
      .query("SELECT TOP 1 Placa, NumeroNotaFiscal FROM VeiculosComprados WITH (NOLOCK) WHERE NumeroNotaFiscal = @num ORDER BY DataCompra DESC");
    if (r2.recordset && r2.recordset.length) {
      const s = r2.recordset[0];
      out.Placa = s.Placa || out.Placa;
      return out;
    }

    const r3 = await pool.request()
      .input('numfull', sql.VarChar, numDoc)
      .query("SELECT TOP 1 Placa FROM VeiculosVendidos WITH (NOLOCK) WHERE FaturaVenda = @numfull ORDER BY DataVenda DESC");
    if (r3.recordset && r3.recordset.length) {
      out.Placa = r3.recordset[0].Placa || out.Placa;
      return out;
    }
  }

  // If still no plate, try a plate extracted fallback
  if (plate) {
    // try ContratosLocacao by placa
    const r4 = await pool.request()
      .input('plate2', sql.VarChar, plate)
      .query("SELECT TOP 1 cl.PlacaPrincipal, cc.NumeroDocumento as ContratoComercial, cl.ContratoLocacao FROM ContratosLocacao cl WITH (NOLOCK) JOIN ContratosComerciais cc WITH (NOLOCK) ON cl.IdContrato = cc.IdContratoComercial WHERE cl.PlacaPrincipal = @plate2 AND cl.SituacaoContratoLocacao = 'Ativo' ORDER BY cl.DataInicio DESC");
    if (r4.recordset && r4.recordset.length) {
      const s = r4.recordset[0];
      out.Placa = s.PlacaPrincipal || plate;
      out.ContratoComercial = s.ContratoComercial || '';
      out.ContratoLocacao = s.ContratoLocacao || '';
      return out;
    }
  }

  return out;
}

(async function main(){
  if (!fs.existsSync(IN_PATH)) {
    console.error('Input NDJSON not found:', IN_PATH);
    process.exit(2);
  }
  if (fs.existsSync(OUT_PATH)) fs.unlinkSync(OUT_PATH);

  const pool = await sql.connect(sqlConfig);
  const rl = readline.createInterface({ input: fs.createReadStream(IN_PATH), crlfDelay: Infinity });
  let count = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    const enriched = await enrichRow(pool, row);
    fs.appendFileSync(OUT_PATH, JSON.stringify(enriched) + '\n');
    count++;
    if (count % 1000 === 0) console.log('Enriched', count);
    if (count >= SAMPLE_SIZE) break;
  }
  await pool.close();
  console.log('Done. Enriched rows:', count, 'wrote to', OUT_PATH);
})();
