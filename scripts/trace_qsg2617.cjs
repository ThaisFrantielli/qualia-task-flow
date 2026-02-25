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
  const placa = 'QSG-2617';
  const checkDate = new Date('2026-01-31T23:59:59');

  // Eventos na ordem ASC (exatamente como o historicoMap os armazena após sort)
  const r = await pg.query(
    'SELECT "UltimaAtualizacao", "SituacaoVeiculo" FROM historico_situacao_veiculos ' +
    'WHERE UPPER(TRIM("Placa")) = $1 ORDER BY "UltimaAtualizacao" ASC',
    [placa]
  );

  console.log('Eventos para ' + placa + ' ordenados ASC (como historicoMap):\n');
  r.rows.forEach((e, i) => {
    const dt = new Date(e.UltimaAtualizacao);
    const ahead = dt > checkDate;
    const marker = ahead ? '> 31/01' : (e.SituacaoVeiculo ? '<= 31/01 COM STATUS' : '<= 31/01 sem status');
    const cat = e.SituacaoVeiculo ? '[' + getCategory(e.SituacaoVeiculo) + ']' : '';
    console.log(
      String(i).padStart(3) + ' | ' +
      dt.toISOString().substr(0, 19) + ' | ' +
      (e.SituacaoVeiculo || '(null)').padEnd(26) +
      cat.padEnd(14) + ' | ' + marker
    );
  });

  // Simula resolveStatusForDate: itera do fim para o início
  console.log('\n--- Frontend: resolveStatusForDate("' + placa + '", 2026-01-31) ---');
  console.log('Itera de trás (idx ' + (r.rows.length - 1) + ') para frente (idx 0):\n');

  let found = false;
  for (let j = r.rows.length - 1; j >= 0; j--) {
    const evDate = new Date(r.rows[j].UltimaAtualizacao);
    const s = r.rows[j].SituacaoVeiculo;

    if (evDate.getTime() > checkDate.getTime()) {
      console.log('  idx ' + j + ': ' + evDate.toISOString().substr(0, 10) + ' > 31/01 → SKIP (posterior)');
      continue;
    }
    if (!s) {
      console.log('  idx ' + j + ': ' + evDate.toISOString().substr(0, 10) + ' status=null → SKIP (BUG FIX 2: sem status)');
      continue;
    }
    console.log('  idx ' + j + ': ' + evDate.toISOString().substr(0, 10) + ' ✓ STATUS ENCONTRADO = "' + s + '"');
    console.log('\nResultado final em 31/01: status="' + s + '" categoria=' + getCategory(s) + ' → ' + (getCategory(s) === 'Inativa' ? 'NÃO contado (Inativa)' : 'CONTADO (' + getCategory(s) + ')'));
    found = true;
    break;
  }

  if (!found) {
    console.log('\nNenhum evento com status <= 31/01 encontrado.');
    // verifica se tem qualquer evento com status (para CASO 4)
    const temStatus = r.rows.some(e => e.SituacaoVeiculo);
    console.log('Tem algum evento com status (CASO 4)?', temStatus ? 'SIM → status=null, excluído' : 'NÃO → CASO 3, usa dim_frota');
  }

  await pg.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
