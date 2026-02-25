const { Pool } = require('pg');
const pg = new Pool({ host: '137.131.163.167', port: 5432, user: 'postgres', password: 'F4tu5xy3', database: 'bluconecta_dw' });

async function run() {
  // Colunas da dim_frota
  const c1 = await pg.query(
    'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'dim_frota\' ORDER BY ordinal_position'
  );
  console.log('Colunas dim_frota:');
  c1.rows.forEach(r => console.log('  ' + r.column_name + ' (' + r.data_type + ')'));

  // Colunas do historico
  const c2 = await pg.query(
    'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'historico_situacao_veiculos\' ORDER BY ordinal_position'
  );
  console.log('\nColunas historico_situacao_veiculos:');
  c2.rows.forEach(r => console.log('  ' + r.column_name + ' (' + r.data_type + ')'));

  await pg.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
