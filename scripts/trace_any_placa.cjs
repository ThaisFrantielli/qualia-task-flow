const { Pool } = require('pg');
const pg = new Pool({ host: '137.131.163.167', port: 5432, user: 'postgres', password: 'F4tu5xy3', database: 'bluconecta_dw' });

function getCategory(status) {
  const s = (status||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  if (s.includes('LOCAD') || s.includes('USO INTERNO') || s.includes('EM MOBILIZ')) return 'Produtiva';
  if (s.includes('VEND') || s.includes('BAIXAD') || s.includes('SINISTR') ||
      s.includes('ROUB') || s.includes('FURT') || s.includes('DEVOLV') ||
      s.includes('NAO DISPONIV') || s.includes('DESMOBILIZ') ||
      (s.includes('DISPONIVEL') && s.includes('VENDA'))) return 'Inativa';
  return 'Improdutiva';
}

async function run() {
  const placa = process.argv[2] || 'REM-2D15';

  const f = await pg.query(
    'SELECT "SituacaoVeiculo", "FinalidadeUso", "DataCompra" FROM dim_frota WHERE UPPER(TRIM("Placa")) = $1',
    [placa]
  );
  console.log('=== dim_frota (estado atual) ===');
  if (f.rows[0]) {
    console.log('  SituacaoVeiculo:', f.rows[0].SituacaoVeiculo, '→', getCategory(f.rows[0].SituacaoVeiculo));
    console.log('  FinalidadeUso  :', f.rows[0].FinalidadeUso || '(null)');
    console.log('  DataCompra     :', f.rows[0].DataCompra || '(null)');
  } else {
    console.log('  NÃO encontrado em dim_frota');
  }

  const r = await pg.query(
    'SELECT "UltimaAtualizacao", "SituacaoAnteriorVeiculo", "SituacaoVeiculo", "LocalizacaoVeiculo", "Informacoes" ' +
    'FROM historico_situacao_veiculos WHERE UPPER(TRIM("Placa")) = $1 ORDER BY "UltimaAtualizacao" ASC',
    [placa]
  );

  console.log('\n=== historico_situacao_veiculos (' + r.rows.length + ' eventos) ===\n');
  if (r.rows.length === 0) {
    console.log('  Nenhum evento — veículo cairia em CASO 3 (fallback dim_frota)');
  } else {
    r.rows.forEach((e, i) => {
      const dt = new Date(e.UltimaAtualizacao).toISOString().substr(0, 19);
      const ant = e.SituacaoAnteriorVeiculo || '';
      const cur = e.SituacaoVeiculo || '(sem status)';
      const cat = e.SituacaoVeiculo ? '[' + getCategory(e.SituacaoVeiculo) + ']' : '';
      const seta = ant ? ant + ' → ' + cur : cur;
      console.log(
        String(i).padStart(3) + ' | ' + dt + ' | ' +
        seta.padEnd(48) + cat.padEnd(15) +
        (e.Informacoes ? '| ' + e.Informacoes.substr(0, 80) : '')
      );
    });
  }

  // Status em datas-chave
  const datas = ['2026-01-31', '2026-02-12', '2026-02-25'];
  console.log('\n=== Status nas datas-chave ===');
  for (const d of datas) {
    const co = new Date(d + 'T23:59:59');
    let status = null;
    for (let j = r.rows.length - 1; j >= 0; j--) {
      const evDate = new Date(r.rows[j].UltimaAtualizacao);
      if (evDate > co) continue;
      const s = r.rows[j].SituacaoVeiculo;
      if (!s) continue;
      status = s;
      break;
    }
    if (!status && r.rows.length === 0) status = f.rows[0]?.SituacaoVeiculo + ' (CASO 3)';
    else if (!status && r.rows.some(e => e.SituacaoVeiculo)) status = 'null (CASO 4 — todos eventos posteriores)';
    else if (!status) status = 'null';
    console.log('  ' + d + ': ' + status + (status && !status.includes('CASO') ? ' → ' + getCategory(status) : ''));
  }

  await pg.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
