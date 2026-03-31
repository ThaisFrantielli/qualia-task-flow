require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_POOLER_HOST || process.env.PG_HOST || process.env.ORACLE_PG_HOST,
  port: parseInt(process.env.PG_PORT || process.env.ORACLE_PG_PORT || '5432', 10),
  user: process.env.PG_USER || process.env.ORACLE_PG_USER,
  password: process.env.PG_PASSWORD || process.env.ORACLE_PG_PASSWORD,
  database: process.env.PG_DATABASE || process.env.ORACLE_PG_DATABASE,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    console.log('Conectando ao Postgres...');
    const client = await pool.connect();

    console.log('\nConsultando amostra (50 linhas) de dim_frota...');
    const sampleQ = `SELECT "IdVeiculo", "Placa", "kminformado", "KmInformado", "kmconfirmado", "KmConfirmado" FROM public.dim_frota LIMIT 50`;
    const sample = await client.query(sampleQ);
    console.table(sample.rows);

    console.log('\nContagens para kminformado / kmconfirmado: NULL vs 0 vs >0');
    const statsQ = `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE "kminformado" IS NULL) as null_kminformado,
      COUNT(*) FILTER (WHERE "kminformado" = 0) as zero_kminformado,
      COUNT(*) FILTER (WHERE "kminformado" > 0) as positive_kminformado,
      COUNT(*) FILTER (WHERE "kmconfirmado" IS NULL) as null_kmconfirmado,
      COUNT(*) FILTER (WHERE "kmconfirmado" = 0) as zero_kmconfirmado,
      COUNT(*) FILTER (WHERE "kmconfirmado" > 0) as positive_kmconfirmado
    FROM public.dim_frota`;

    const stats = await client.query(statsQ);
    console.log(stats.rows[0]);

    client.release();
    await pool.end();
    console.log('\nConcluído.');
  } catch (err) {
    console.error('Erro ao consultar dim_frota:', err && err.message ? err.message : err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
})();
