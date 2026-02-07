const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: process.env.PG_PORT || 5432,
  user: (process.env.PG_USER || '').toLowerCase().trim(),
  password: (process.env.PG_PASSWORD || '').trim(),
  database: (process.env.PG_DATABASE || 'bluconecta_dw').toLowerCase().trim(),
});

const checks = [
  { table: 'dim_frota', expected: 5822 },
  { table: 'dim_contratos_locacao', expected: 7002 },
  { table: 'dim_clientes', expected: 1590 },
  { table: 'dim_movimentacao_veiculos', expected: 6899 },
  { table: 'dim_movimentacao_patios', expected: 72603 },
  { table: 'dim_veiculos_acessorios', expected: 88109 },
  { table: 'historico_situacao_veiculos', expected: 207156 },
  { table: 'dim_fornecedores', expected: 4265 }
];

(async () => {
  const client = await pool.connect();
  try {
    console.log('Conectado ao PostgreSQL:', pool.options.database, '@', pool.options.host + ':' + pool.options.port);
    let allOk = true;
    for (const c of checks) {
      try {
        const res = await client.query(`SELECT COUNT(*)::bigint AS cnt FROM public."${c.table}"`);
        const cnt = parseInt(res.rows[0].cnt, 10);
        const ok = cnt === c.expected;
        if (!ok) allOk = false;
        console.log(`${c.table.padEnd(30)} expected=${String(c.expected).padStart(8)}  actual=${String(cnt).padStart(8)}  ${ok ? 'OK' : 'MISMATCH'}`);
      } catch (err) {
        allOk = false;
        console.log(`${c.table.padEnd(30)} ERROR querying table: ${err.message}`);
      }
    }
    console.log('\nSummary:', allOk ? 'ALL MATCH' : 'SOME DIFFERENCES');
    process.exit(allOk ? 0 : 2);
  } finally {
    client.release();
    await pool.end();
  }
})();
