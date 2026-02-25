const { Pool } = require('pg');
const pg = new Pool({ host: '137.131.163.167', port: 5432, user: 'postgres', password: 'F4tu5xy3', database: 'bluconecta_dw' });

function normalizeStatus(value) {
  return (value || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
function getCategory(status) {
  const s = normalizeStatus(status);
  if (s.includes('LOCAD') || s.includes('USO INTERNO') || s.includes('EM MOBILIZ')) return 'Produtiva';
  if (s.includes('VEND') || s.includes('BAIXAD') || s.includes('SINISTR') ||
      s.includes('ROUB') || s.includes('FURT') || s.includes('DEVOLV') ||
      s.includes('NAO DISPONIV') || s.includes('DESMOBILIZ') ||
      (s.includes('DISPONIVEL') && s.includes('VENDA'))) return 'Inativa';
  return 'Improdutiva';
}

async function run() {
  // 1. Datas de atualizacao distintas em dim_frota
  const d1 = await pg.query(
    'SELECT "DataAtualizacaoDados", COUNT(*) as total FROM dim_frota GROUP BY 1 ORDER BY 1 DESC LIMIT 10'
  );
  console.log('DataAtualizacaoDados dim_frota:');
  d1.rows.forEach(r => console.log('  ' + r.DataAtualizacaoDados + ':', r.total));

  // 2. Datas de atualizacao distintas em historico
  const d2 = await pg.query(
    'SELECT "DataAtualizacaoDados", COUNT(*) as total FROM historico_situacao_veiculos GROUP BY 1 ORDER BY 1 DESC LIMIT 10'
  );
  console.log('\nDataAtualizacaoDados historico (top 10):');
  d2.rows.forEach(r => console.log('  ' + r.DataAtualizacaoDados + ':', r.total));

  // 3. Veiculos em dim_frota com DataAtualizacaoDados mais recente (última ETL) 
  // que seriam ativos em 31/01 (CASO 3 - sem eventos, SituacaoVeiculo produtiva)
  const latestETL = d1.rows[0].DataAtualizacaoDados;
  console.log('\nÚltima ETL dim_frota:', latestETL);

  // Qual era ETL anterior?
  const prevETL = d1.rows[1] ? d1.rows[1].DataAtualizacaoDados : null;
  console.log('ETL anterior:', prevETL);

  // 4. Veiculos adicionados na ultima ETL que sao ativos em 31/01
  // (sem eventos = CASO 3, nao TERCEIRO, SituacaoVeiculo ativo)
  if (d1.rows.length > 1) {
    const prevDate = d1.rows[1].DataAtualizacaoDados;
    // Placas que existem nas ETL mais recentes mas eram diferentes antes
    // Como toda dim_frota é sobrescrita, verificar se há placas com DataAtualizacaoDados diferente é difícil
    // Mas podemos checar o historico: veiculos que conseguiram eventos RECENTES (apos prevDate)
    // mas cujos eventos sao anteriores a 31/01 (fazendo-os passarem de CASO4 para CASO1)
    const recHist = await pg.query(
      'SELECT h."Placa", h."UltimaAtualizacao", h."SituacaoVeiculo", h."DataAtualizacaoDados" ' +
      'FROM historico_situacao_veiculos h ' +
      'WHERE h."DataAtualizacaoDados" = $1 ' +
      'AND h."UltimaAtualizacao" <= \'2026-01-31 23:59:59\' ' +
      'AND h."SituacaoVeiculo" IS NOT NULL ' +
      'ORDER BY h."DataAtualizacaoDados" DESC ' +
      'LIMIT 50',
      [latestETL]
    );
    console.log('\nHistorico com DataAtualizacaoDados=' + latestETL + ' e UltimaAtualizacao<=31/01:', recHist.rows.length);
    recHist.rows.slice(0, 20).forEach(r => console.log('  Placa:', r.Placa, '| Data:', r.UltimaAtualizacao, '| Status:', r.SituacaoVeiculo));
  }

  await pg.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
