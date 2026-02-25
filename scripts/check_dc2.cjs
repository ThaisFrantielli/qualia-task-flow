const { Pool } = require('pg');
const pg = new Pool({ host: '137.131.163.167', port: 5432, user: 'postgres', password: 'F4tu5xy3', database: 'bluconecta_dw' });

async function run() {
  // tipo da coluna DataCompra
  const r0 = await pg.query('SELECT pg_typeof("DataCompra") as tipo, "DataCompra" FROM dim_frota WHERE "FinalidadeUso" IS NULL AND "Placa" IS NOT NULL LIMIT 5');
  console.log('Tipo DataCompra:', r0.rows);

  // distribuicao DataCompra para NULL Finalidade Locado (usando CAST TEXT para comparar)
  const r1 = await pg.query(
    'SELECT ' +
    '  CASE WHEN "DataCompra" IS NULL THEN \'NULL\' ' +
    '       WHEN "DataCompra"::text > \'2026-01-31\' THEN \'APOS_3101\' ' +
    '       ELSE \'ATE_3101\' END as bucket, ' +
    '  COUNT(*) as total ' +
    'FROM dim_frota ' +
    'WHERE "FinalidadeUso" IS NULL AND "Placa" IS NOT NULL AND TRIM("Placa") != \'\' ' +
    'AND "SituacaoVeiculo" = \'Locado\' GROUP BY 1 ORDER BY 1'
  );
  console.log('\nDataCompra dos 321 NULL Locado:', r1.rows);

  // Total frota JS filter vs SQL filter
  const r2 = await pg.query('SELECT COUNT(*) FROM dim_frota WHERE "Placa" IS NOT NULL AND TRIM("Placa") != \'\' AND ("FinalidadeUso" IS NULL OR "FinalidadeUso" != \'TERCEIRO\')');
  const r3 = await pg.query('SELECT COUNT(*) FROM dim_frota WHERE "Placa" IS NOT NULL AND TRIM("Placa") != \'\' AND "FinalidadeUso" != \'TERCEIRO\'');
  console.log('\nTotal JS filter (inclui NULL):', r2.rows[0].count);
  console.log('Total SQL filter (exclui NULL):', r3.rows[0].count);
  console.log('Delta:', parseInt(r2.rows[0].count) - parseInt(r3.rows[0].count));

  await pg.end();
}
run().catch(e => { console.error(e.message); pg.end(); });
