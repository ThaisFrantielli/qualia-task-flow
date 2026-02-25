const { Pool } = require('pg');
const pg = new Pool({ host: '137.131.163.167', port: 5432, user: 'postgres', password: 'F4tu5xy3', database: 'bluconecta_dw' });

async function run() {
  // 1. NULL FinalidadeUso: tem eventos vs não tem
  const r1 = await pg.query(
    'SELECT ' +
    '  CASE WHEN h."Placa" IS NULL THEN \'SEM_EVENTOS\' ELSE \'TEM_EVENTOS\' END as tem_historico, ' +
    '  f."SituacaoVeiculo", COUNT(*) as total ' +
    'FROM dim_frota f ' +
    'LEFT JOIN (SELECT DISTINCT "Placa" FROM historico_situacao_veiculos) h ' +
    '  ON UPPER(TRIM(h."Placa")) = UPPER(TRIM(f."Placa")) ' +
    'WHERE f."FinalidadeUso" IS NULL AND f."Placa" IS NOT NULL AND TRIM(f."Placa") != \'\' ' +
    'GROUP BY 1, 2 ORDER BY 1, total DESC'
  );
  console.log('--- NULL FinalidadeUso: tem vs nao tem eventos historicos:');
  r1.rows.forEach(x => console.log('  ' + x.tem_historico + ' | ' + x.SituacaoVeiculo + ': ' + x.total));

  // 2. NomeFornecedorTerceiro
  const r2 = await pg.query(
    'SELECT CASE WHEN "NomeFornecedorTerceiro" IS NOT NULL THEN \'TEM_FORNECEDOR\' ELSE \'SEM_FORNECEDOR\' END as fornecedor, COUNT(*) as total ' +
    'FROM dim_frota WHERE "FinalidadeUso" IS NULL AND "Placa" IS NOT NULL AND TRIM("Placa") != \'\' GROUP BY 1'
  );
  console.log('\nNULL FinalidadeUso por NomeFornecedorTerceiro:');
  r2.rows.forEach(x => console.log('  ' + x.fornecedor + ':', x.total));

  // 3. NULL FinalidadeUso SEM eventos - ficam como CASO 3 no frontend (Produtiva=Locado)
  const r3 = await pg.query(
    'SELECT COUNT(*) as total FROM dim_frota f ' +
    'WHERE f."FinalidadeUso" IS NULL AND f."Placa" IS NOT NULL AND TRIM(f."Placa") != \'\' ' +
    'AND NOT EXISTS (SELECT 1 FROM historico_situacao_veiculos h WHERE UPPER(TRIM(h."Placa")) = UPPER(TRIM(f."Placa")))'
  );
  console.log('\nNULL FinalidadeUso SEM eventos (CASO 3 - viram Produtiva):', r3.rows[0].total);

  await pg.end();
}
run().catch(e => { console.error(e.message); pg.end(); });
