import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pgConfig = {
  host: process.env.PG_POOLER_HOST || process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_POOLER_PORT || process.env.PG_PORT || '5432'),
  user: process.env.PG_POOLER_USER || process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  database: process.env.PG_DATABASE || 'postgres',
  ssl: { rejectUnauthorized: false },
};

async function main() {
  const pool = new Pool(pgConfig);
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT COALESCE("TipoDeContrato", 'NULL') AS tipo, COUNT(*) as cnt
       FROM public."dim_contratos_locacao"
       GROUP BY tipo
       ORDER BY cnt DESC`);

    console.log('Distinct tipos em dim_contratos_locacao:');
    for (const row of res.rows) {
      console.log(`${row.tipo} — ${row.cnt}`);
    }
  } catch (err) {
    console.error('Erro ao consultar:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
