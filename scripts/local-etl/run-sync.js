/*
  run-sync.js
  - Carrega variáveis de ambiente via dotenv
  - Conecta ao SQL Server (rede interna)
  - Executa uma query de teste (SELECT TOP 100 * FROM Vendas)
  - Converte resultado em JSON
  - Faz upload para Supabase Storage no bucket 'bi-reports' como 'dashboard_data.json'
*/

require('dotenv').config();
const sql = require('mssql');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env');
  process.exit(1);
}

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 1433,
  options: {
    encrypt: process.env.SQL_ENCRYPT === 'true' || false,
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true' || true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

// Lista de relatórios a serem extraídos (Static JSON architecture)
const REPORTS = [
  {
    filename: 'compras_full.json',
    query: `
      SELECT 
          v.IdVeiculo,
          v.Placa,
          v.Montadora,
          v.Modelo,
          v.AnoFabricacao,
          v.SituacaoVeiculo,
          FORMAT(vc.DataCompra, 'yyyy-MM-dd') as DataCompra,
          YEAR(vc.DataCompra) as AnoCompra,
          MONTH(vc.DataCompra) as MesCompra,
          COALESCE(vc.Instituicao, 'Recurso Próprio') AS Banco,
          CAST(vc.ValorCompra AS FLOAT) as ValorCompra,
          CAST(vc.ValorAtualFIPE AS FLOAT) as ValorFipe,
          CAST(vc.ValorAlienado AS FLOAT) as ValorAlienado
      FROM VeiculosComprados vc
      INNER JOIN Veiculos v ON vc.IdVeiculo = v.IdVeiculo
      WHERE vc.DataCompra >= DATEADD(year, -5, GETDATE())
      ORDER BY vc.DataCompra DESC
    `,
  },
];
async function fetchData(query) {
  let pool;
  try {
    pool = await sql.connect(sqlConfig);
    console.log('Connected to SQL Server:', sqlConfig.server);

    const result = await pool.request().query(query);

    const rows = result.recordset || [];
    return rows;
  } catch (err) {
    console.error('SQL Error:', err.message || err);
    throw err;
  } finally {
    try {
      if (pool) await pool.close();
    } catch (e) {
      // ignore
    }
  }
}

async function uploadToSupabase(jsonObj, path) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    // use default - running in Node.js
  });

  const bucket = 'bi-reports';
  const jsonString = JSON.stringify(jsonObj, null, 2);
  const buffer = Buffer.from(jsonString, 'utf-8');

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { upsert: true, contentType: 'application/json' });

    if (error) {
      console.error('Upload error:', error.message || error);
      throw error;
    }

    console.log('Upload successful, path:', data?.path || `${bucket}/${path}`);
    return data;
  } catch (err) {
    console.error('Supabase upload failed:', err.message || err);
    throw err;
  }
}

async function main() {
  try {
    console.log('Starting local ETL sync...');

    for (const report of REPORTS) {
      console.log('Running report:', report.filename);
      const rows = await fetchData(report.query);

      const payload = {
        generated_at: new Date().toISOString(),
        source: 'local_etl',
        report: report.filename,
        row_count: rows.length,
        data: rows,
      };

      const path = report.filename;
      await uploadToSupabase(payload, path);
      console.log(`Report uploaded: ${path} (rows: ${rows.length})`);
    }

    console.log('Sucesso: todos os relatórios sincronizados para Supabase Storage.');
    process.exit(0);
  } catch (err) {
    console.error('Erro durante o sync:', err?.message || err);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}
