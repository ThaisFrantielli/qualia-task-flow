require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_POOLER_HOST || process.env.ORACLE_PG_POOLER_HOST,
  port: Number(process.env.PG_POOLER_PORT || process.env.ORACLE_PG_POOLER_PORT || 6543),
  user: process.env.PG_POOLER_USER || process.env.ORACLE_PG_POOLER_USER,
  password: process.env.PG_PASSWORD || process.env.ORACLE_PG_PASSWORD,
  database: process.env.PG_DATABASE || 'postgres',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const q1 = await pool.query('select max("UltimaAtualizacao") as max_ult, min("UltimaAtualizacao") as min_ult from public."historico_situacao_veiculos"');
  const q2 = await pool.query('select count(*)::int as c from public."historico_situacao_veiculos" where "UltimaAtualizacao" >= $1 and "UltimaAtualizacao" < $2', ['2026-04-01', '2026-04-02']);
  const q3 = await pool.query('select "Placa","UltimaAtualizacao","SituacaoVeiculo","Informacoes" from public."historico_situacao_veiculos" where "UltimaAtualizacao" >= $1 and "UltimaAtualizacao" < $2 order by "UltimaAtualizacao" asc limit 10', ['2026-04-01', '2026-04-02']);

  console.log('max/min', q1.rows[0]);
  console.log('count_2026_04_01', q2.rows[0].c);
  console.log('sample', q3.rows);

  await pool.end();
})().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
