require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
});

async function run(){
  try{
    const os = 'OS-262364';
    const q = `SELECT "IdOrdemServico", "OrdemServico", "CustoTotalOS", "ValorTotal", "ValorNaoReembolsavel", "ValorReembolsavel" FROM fat_manutencao_unificado WHERE "OrdemServico" = $1 LIMIT 5`;
    const res = await pool.query(q, [os]);
    console.log('rows:', JSON.stringify(res.rows, null, 2));
  }catch(err){
    console.error('erro:', err.message);
  }finally{
    await pool.end();
  }
}

run();
