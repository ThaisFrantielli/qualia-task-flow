const { Pool } = require('pg');
const tables = [
  'dim_contratos_locacao','dim_frota','dim_movimentacao_patios','dim_movimentacao_veiculos',
  'fat_carro_reserva','fat_financeiro_universal','fat_manutencao_unificado','fat_movimentacao_ocorrencias',
  'fat_multas','fat_sinistros','hist_vida_veiculo_timeline','historico_situacao_veiculos'
];

(async ()=>{
  const pool = new Pool({
    host: process.env.PG_HOST || '137.131.163.167',
    port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'F4tu5xy3',
    database: process.env.PG_DATABASE || 'bluconecta_dw',
  });

  try{
    await pool.connect();
    for(const t of tables){
      try{
        const r = await pool.query(`SELECT COUNT(*) AS c FROM public."${t}"`);
        console.log(t.padEnd(35), r.rows[0].c);
      }catch(e){
        console.log(t.padEnd(35), 'ERROR', e.message);
      }
    }
  }catch(e){
    console.error('Connection error:', e.message);
    process.exit(1);
  }finally{
    await pool.end();
  }
})();
