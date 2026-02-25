const { Pool } = require('pg');
const pg = new Pool({ host: '137.131.163.167', port: 5432, user: 'postgres', password: 'F4tu5xy3', database: 'bluconecta_dw' });

async function run() {
  // 1. Veículos sem eventos com DataCompra depois de 31/01/2026
  const r1 = await pg.query(`
    SELECT f."Placa", f."Status", f."DataCompra", f."FinalidadeUso"
    FROM dim_frota f
    LEFT JOIN historico_situacao_veiculos h ON UPPER(TRIM(h."Placa")) = UPPER(TRIM(f."Placa"))
    WHERE f."FinalidadeUso" != 'TERCEIRO'
    GROUP BY f."Placa", f."Status", f."DataCompra", f."FinalidadeUso"
    HAVING COUNT(h."Placa") = 0
      AND MIN(f."DataCompra") IS NOT NULL
      AND MIN(f."DataCompra")::date > '2026-01-31'
    ORDER BY MIN(f."DataCompra") DESC
    LIMIT 20
  `);
  console.log('--- Sem eventos, DataCompra > 31/01/2026:', r1.rows.length);
  r1.rows.forEach(x => console.log(x));

  // 2. Veículos sem eventos com DataCompra NULL
  const r2 = await pg.query(`
    SELECT COUNT(*) as total_sem_eventos_sem_datacompra
    FROM dim_frota f
    LEFT JOIN historico_situacao_veiculos h ON UPPER(TRIM(h."Placa")) = UPPER(TRIM(f."Placa"))
    WHERE f."FinalidadeUso" != 'TERCEIRO'
    GROUP BY f."Placa", f."Status", f."DataCompra"
    HAVING COUNT(h."Placa") = 0 AND MIN(f."DataCompra") IS NULL
  `);
  console.log('--- Sem eventos e DataCompra NULL:', r2.rows.length, 'veículos');

  // 3. Total de veículos sem eventos
  const r3 = await pg.query(`
    SELECT COUNT(DISTINCT f."Placa") as total
    FROM dim_frota f
    LEFT JOIN historico_situacao_veiculos h ON UPPER(TRIM(h."Placa")) = UPPER(TRIM(f."Placa"))
    WHERE f."FinalidadeUso" != 'TERCEIRO'
      AND h."Placa" IS NULL
  `);
  console.log('--- Total sem eventos (qualquer DataCompra):', r3.rows[0].total);

  await pg.end();
}
run().catch(e => { console.error(e.message); pg.end(); });
