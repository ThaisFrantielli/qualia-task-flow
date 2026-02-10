const { Pool } = require('pg');
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
    const cnt = await pool.query('SELECT COUNT(*)::bigint AS c FROM public.fat_movimentacao_ocorrencias');
    console.log('count:', cnt.rows[0].c);
    const size = await pool.query("SELECT pg_total_relation_size('public.fat_movimentacao_ocorrencias') AS bytes");
    console.log('size_bytes:', size.rows[0].bytes);
    const sample = await pool.query('SELECT * FROM public.fat_movimentacao_ocorrencias LIMIT 3');
    console.log('sample_rows:', sample.rows.length);
    if(sample.rows.length>0){
      console.log('columns:', Object.keys(sample.rows[0]).join(', '));
      console.log('row1:', JSON.stringify(sample.rows[0]));
    }
  }catch(e){
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  }finally{
    await pool.end();
  }
})();
