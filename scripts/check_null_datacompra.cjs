const { Pool } = require('pg');
const pg = new Pool({ host: '137.131.163.167', port: 5432, user: 'postgres', password: 'F4tu5xy3', database: 'bluconecta_dw' });

async function run() {
  const checkDate = '2026-01-31';

  // 1. NULL Finalidade, Locado, DataCompra <= 31/01 (esses viram Produtiva no CASO 3 do frontend)
  const r1 = await pg.query(
    'SELECT COUNT(*) as total FROM dim_frota ' +
    'WHERE "FinalidadeUso" IS NULL AND "Placa" IS NOT NULL AND TRIM("Placa") != \'\' ' +
    'AND "SituacaoVeiculo" = \'Locado\' ' +
    'AND ("DataCompra" IS NULL OR "DataCompra" <= $1::date)',
    [checkDate]
  );
  console.log('NULL Finalidade Locado DataCompra <= 31/01 (frontend Produtiva):', r1.rows[0].total);

  // 2. NULL Finalidade, Locado, DataCompra > 31/01 (excluidos pelo DataCompra check no CASO 3)
  const r2 = await pg.query(
    'SELECT COUNT(*) as total FROM dim_frota ' +
    'WHERE "FinalidadeUso" IS NULL AND "Placa" IS NOT NULL AND TRIM("Placa") != \'\' ' +
    'AND "SituacaoVeiculo" = \'Locado\' ' +
    'AND "DataCompra" > $1::date',
    [checkDate]
  );
  console.log('NULL Finalidade Locado DataCompra > 31/01 (excluidos DataCompra check):', r2.rows[0].total);

  // 3. Quantos veiculos o frontend conta em 31/01 se incluir NULL (sem filtrar TERCEIRO por SQL)
  // i.e. replica o filtro JS: Placa != null AND FinalidadeUso != 'TERCEIRO' (inclui NULL)
  const r3 = await pg.query(
    'SELECT COUNT(*) as total FROM dim_frota ' +
    'WHERE "Placa" IS NOT NULL AND TRIM("Placa") != \'\' ' +
    'AND ("FinalidadeUso" IS NULL OR "FinalidadeUso" != \'TERCEIRO\')'
  );
  console.log('\nTotal frota com filtro JS (inclui NULL FinalidadeUso):', r3.rows[0].total);

  // 4. Quantos com filtro SQL (exclui NULL)
  const r4 = await pg.query(
    'SELECT COUNT(*) as total FROM dim_frota ' +
    'WHERE "Placa" IS NOT NULL AND TRIM("Placa") != \'\' ' +
    'AND "FinalidadeUso" != \'TERCEIRO\''
  );
  console.log('Total frota com filtro SQL (exclui NULL FinalidadeUso):', r4.rows[0].total);

  // 5. Diferenca entre os dois filtros
  const total_js = parseInt(r3.rows[0].total);
  const total_sql = parseInt(r4.rows[0].total);
  console.log('Diferenca (JS - SQL):', total_js - total_sql, '← sao os 331 NULL');

  // 6. DataCompra distribution dos 321 Locado NULL
  const r6 = await pg.query(
    'SELECT ' +
    '  CASE WHEN "DataCompra" IS NULL THEN \'NULL\' ' +
    '       WHEN "DataCompra" > \'2026-01-31\' THEN \'APOS_3101\' ' +
    '       ELSE \'ATE_3101\' END as compra_bucket, ' +
    '  COUNT(*) as total ' +
    'FROM dim_frota ' +
    'WHERE "FinalidadeUso" IS NULL AND "Placa" IS NOT NULL AND TRIM("Placa") != \'\' ' +
    'AND "SituacaoVeiculo" = \'Locado\' GROUP BY 1'
  );
  console.log('\nDataCompra dos 321 NULL Locado:');
  r6.rows.forEach(x => console.log('  ' + x.compra_bucket + ':', x.total));

  await pg.end();
}
run().catch(e => { console.error(e.message); pg.end(); });
