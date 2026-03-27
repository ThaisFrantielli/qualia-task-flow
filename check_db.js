const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PG_HOST || 'db.slblveepmslxqmcibvkf.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'F4tu5xy3@123!',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'dim_frota' 
      AND table_schema = 'public' 
      ORDER BY ordinal_position
    `);
    console.log('Columns in dim_frota:');
    console.log(res.rows.map(r => r.column_name).join('\n'));
    
    const sample = await pool.query('SELECT * FROM public.dim_frota LIMIT 1');
    console.log('\nSample row (keys):');
    console.log(Object.keys(sample.rows[0] || {}).join(', '));
    console.log('\nSample row (values):');
    console.log(JSON.stringify(sample.rows[0], null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
