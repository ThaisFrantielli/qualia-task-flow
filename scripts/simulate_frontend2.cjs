const { Pool } = require('pg');
const pg = new Pool({ host: '137.131.163.167', port: 5432, user: 'postgres', password: 'F4tu5xy3', database: 'bluconecta_dw' });

function normalizeStatus(value) {
  return (value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getCategory(status) {
  const s = normalizeStatus(status);
  if (s.includes('LOCAD') || s.includes('USO INTERNO') || s.includes('EM MOBILIZ')) return 'Produtiva';
  if (
    s.includes('VEND') || s.includes('BAIXAD') || s.includes('SINISTR') ||
    s.includes('ROUB') || s.includes('FURT') || s.includes('DEVOLV') ||
    s.includes('NAO DISPONIV') || s.includes('DESMOBILIZ') ||
    (s.includes('DISPONIVEL') && s.includes('VENDA'))
  ) return 'Inativa';
  return 'Improdutiva';
}

async function run() {
  const checkDate = '2026-01-31';
  const checkDateObj = new Date(checkDate + 'T23:59:59');

  // 1. Todos veiculos candidatos (filtro JS: Placa nao nula, FinalidadeUso != TERCEIRO inclui NULL)
  const frota = await pg.query(
    'SELECT "Placa", "SituacaoVeiculo", "FinalidadeUso", "DataCompra" FROM dim_frota ' +
    'WHERE "Placa" IS NOT NULL AND TRIM("Placa") != \'\' AND ("FinalidadeUso" IS NULL OR "FinalidadeUso" != \'TERCEIRO\')'
  );
  console.log('Total frota candidata:', frota.rows.length);

  // 2. Pega o ultimo evento com SituacaoVeiculo nao nula para cada placa, ate 31/01
  const eventos = await pg.query(
    'SELECT DISTINCT ON ("Placa") "Placa", "SituacaoVeiculo" as status_evento ' +
    'FROM historico_situacao_veiculos ' +
    'WHERE "SituacaoVeiculo" IS NOT NULL AND "SituacaoVeiculo" != \'\' ' +
    'AND "UltimaAtualizacao" <= $1 ' +
    'ORDER BY "Placa", "UltimaAtualizacao" DESC',
    [checkDate + ' 23:59:59']
  );
  console.log('Eventos com status ate 31/01:', eventos.rows.length);

  // verifica se ALGUM evento existe para a placa (mesmo apos 31/01) para CASO 4
  const qualquerEvento = await pg.query(
    'SELECT DISTINCT "Placa" FROM historico_situacao_veiculos WHERE "SituacaoVeiculo" IS NOT NULL AND "SituacaoVeiculo" != \'\''
  );
  const temEventoAlgumDia = new Set(qualquerEvento.rows.map(r => (r.Placa || '').toUpperCase().trim()));

  const eventoMap = {};
  for (const e of eventos.rows) {
    const k = (e.Placa || '').toUpperCase().trim();
    eventoMap[k] = e.status_evento;
  }

  let produtiva = 0, improdutiva = 0, inativa = 0, semStatus = 0, casoDataCompra = 0;
  const statusCounts = {};

  for (const v of frota.rows) {
    const placa = (v.Placa || '').toUpperCase().trim();
    let status = eventoMap[placa];

    if (!status) {
      // sem evento ate 31/01 — verifica se tem evento algum dia (CASO 4)
      if (temEventoAlgumDia.has(placa)) {
        // CASO 4: tem eventos mas todos sao apos 31/01 → excluir
        semStatus++;
        continue;
      }
      // CASO 3: nenhum evento jamais → fallback dim_frota, checar DataCompra
      if (v.DataCompra) {
        const dc = new Date(v.DataCompra);
        if (dc.getTime() > checkDateObj.getTime()) {
          casoDataCompra++;
          continue; // comprado apos 31/01
        }
      }
      status = v.SituacaoVeiculo;
    }

    if (!status) { semStatus++; continue; }

    const cat = getCategory(status);
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (cat === 'Inativa') { inativa++; continue; }
    if (cat === 'Produtiva') produtiva++;
    else improdutiva++;
  }

  const active = produtiva + improdutiva;
  console.log('\n=== RESULTADO 31/01/2026 ===');
  console.log('Produtiva:', produtiva);
  console.log('Improdutiva:', improdutiva);
  console.log('Total ativo (prod+improd):', active);
  console.log('% Improdutiva:', active > 0 ? ((improdutiva / active) * 100).toFixed(1) + '%' : '-');
  console.log('Inativa (excluida):', inativa);
  console.log('Sem status / CASO4:', semStatus);
  console.log('Excluido DataCompra apos 31/01:', casoDataCompra);

  console.log('\nTop status counts:');
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([s, c]) => console.log('  ' + s + ' [' + getCategory(s) + ']:', c));

  // Agora rodar COM filtro SQL (exclui NULL FinalidadeUso) para comparar
  const frota2 = await pg.query(
    'SELECT "Placa", "SituacaoVeiculo", "FinalidadeUso", "DataCompra" FROM dim_frota ' +
    'WHERE "Placa" IS NOT NULL AND TRIM("Placa") != \'\' AND "FinalidadeUso" != \'TERCEIRO\''
  );
  let prod2 = 0, imp2 = 0, ina2 = 0, sem2 = 0;
  for (const v of frota2.rows) {
    const placa = (v.Placa || '').toUpperCase().trim();
    let status = eventoMap[placa];
    if (!status) {
      if (temEventoAlgumDia.has(placa)) { sem2++; continue; }
      if (v.DataCompra) {
        const dc = new Date(v.DataCompra);
        if (dc.getTime() > checkDateObj.getTime()) { sem2++; continue; }
      }
      status = v.SituacaoVeiculo;
    }
    if (!status) { sem2++; continue; }
    const cat = getCategory(status);
    if (cat === 'Inativa') { ina2++; continue; }
    if (cat === 'Produtiva') prod2++;
    else imp2++;
  }
  const active2 = prod2 + imp2;
  console.log('\n=== COM FILTRO SQL (exclui NULL Finalidade) ===');
  console.log('Total ativo:', active2, '| Improdutiva:', imp2, '| %:', active2 > 0 ? ((imp2/active2)*100).toFixed(1)+'%' : '-');

  await pg.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
