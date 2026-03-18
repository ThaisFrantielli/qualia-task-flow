import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { Pool } = pg;
const pool = new Pool({
  host: process.env.ORACLE_PG_HOST,
  port: Number(process.env.ORACLE_PG_PORT || 5432),
  user: process.env.ORACLE_PG_USER,
  password: process.env.ORACLE_PG_PASSWORD,
  database: process.env.ORACLE_PG_DATABASE || 'postgres',
  ssl: { rejectUnauthorized: false },
});

try {
  const query = `
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('hist_vida_veiculo_timeline', 'historico_situacao_veiculos')
    order by table_name
  `;
  const res = await pool.query(query);
  console.log(JSON.stringify(res.rows, null, 2));
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
} finally {
  await pool.end();
}
