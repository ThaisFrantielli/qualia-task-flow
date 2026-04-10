import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';

const plateArg = process.argv[2] || 'SGO-5B70';
const limit = parseInt(process.argv[3] || '100000', 10);
const normalized = plateArg.toUpperCase().replace(/[^A-Z0-9]/g, '');

const primaryPoolConfig = {
  host: process.env.ORACLE_PG_POOLER_HOST || process.env.PG_POOLER_HOST || process.env.ORACLE_PG_HOST || 'db.qcptedntbdsvqplrrqpi.supabase.co',
  port: parseInt(process.env.ORACLE_PG_POOLER_PORT || process.env.PG_POOLER_PORT || process.env.ORACLE_PG_PORT || '5432', 10),
  user: process.env.ORACLE_PG_POOLER_USER || process.env.PG_POOLER_USER || process.env.ORACLE_PG_USER || 'postgres',
  password: process.env.ORACLE_PG_PASSWORD || process.env.PG_PASSWORD || '',
  database: process.env.ORACLE_PG_DATABASE || process.env.PG_DATABASE || 'postgres',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 7000,
  ssl: { rejectUnauthorized: false },
};

const pool = new Pool(primaryPoolConfig);

async function run() {
  const client = await pool.connect();
  try {
    const sql = `
SELECT *
FROM public."fat_manutencao_unificado"
WHERE regexp_replace(UPPER(TRIM(COALESCE("Placa","placa","PlacaVeiculo","placa_veiculo","placa_veiculo_analitica","PlacaVeiculoAnalitica"))), '[^A-Z0-9]', '', 'g') = $1
ORDER BY COALESCE("DataEvento","Data","dataevento","data","Data") DESC
LIMIT $2
    `;

    console.log('Executando consulta para placa (normalizada):', normalized, 'limit:', limit);
    const res = await client.query(sql, [normalized, limit]);
    const rows = res.rows.map(r => {
      const converted = {};
      for (const [k, v] of Object.entries(r)) {
        converted[k] = typeof v === 'bigint' ? Number(v) : v;
      }
      return converted;
    });

    const outPath = `./temp_manut_${normalized}.json`;
    fs.writeFileSync(outPath, JSON.stringify({ count: rows.length, plate: plateArg, normalized, rows }, null, 2), 'utf-8');
    console.log(`Resultado salvo em: ${outPath}`);
    console.log('Registros retornados:', rows.length);
  } catch (err) {
    console.error('Erro executando consulta:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => {
  console.error('Erro inesperado:', e);
  process.exit(1);
});
