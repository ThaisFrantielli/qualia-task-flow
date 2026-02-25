const { Pool } = require('pg');
const pg = new Pool({ host: '137.131.163.167', port: 5432, user: 'postgres', password: 'F4tu5xy3', database: 'bluconecta_dw' });

function normalizeStatus(v) { return (v||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }
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
  const placa = 'QSG-2617';
  const checkDate = '2026-01-31';

  // Historico da placa em ordem
  const hist = await pg.query(
    'SELECT "UltimaAtualizacao", "SituacaoVeiculo", "SituacaoAnteriorVeiculo", "Informacoes" ' +
    'FROM historico_situacao_veiculos WHERE UPPER(TRIM("Placa")) = $1 ' +
    'ORDER BY "UltimaAtualizacao" ASC',
    [placa]
  );

  console.log('=== Histórico de', placa, '(', hist.rows.length, 'eventos) ===\n');
  hist.rows.forEach((r,i) => {
    const dt = r.UltimaAtualizacao ? new Date(r.UltimaAtualizacao).toISOString().substr(0,19) : '?';
    const status = r.SituacaoVeiculo || '(sem status)';
    const cat = r.SituacaoVeiculo ? '[' + getCategory(r.SituacaoVeiculo) + ']' : '';
    console.log(String(i+1).padStart(2) + '. ' + dt + ' | ' + status.padEnd(28) + cat);
  });

  // Qual seria o status em 31/01 via "evento mais recente com status <= 31/01"
  const checkObj = new Date(checkDate + 'T23:59:59');
  let statusVia1 = null;
  for (let i = hist.rows.length - 1; i >= 0; i--) {
    const evDate = new Date(hist.rows[i].UltimaAtualizacao);
    if (evDate.getTime() <= checkObj.getTime()) {
      const s = hist.rows[i].SituacaoVeiculo;
      if (!s) continue;
      statusVia1 = s;
      console.log('\nCAMINHO 1 (evento mais recente <= 31/01):');
      console.log('  Data:', new Date(hist.rows[i].UltimaAtualizacao).toISOString().substr(0,10));
      console.log('  Status:', s, '→ categoria:', getCategory(s));
      break;
    }
  }

  // dim_frota atual
  const frota = await pg.query('SELECT "SituacaoVeiculo", "FinalidadeUso" FROM dim_frota WHERE UPPER(TRIM("Placa")) = $1', [placa]);
  if (frota.rows[0]) {
    console.log('\nDim_frota ATUAL:', frota.rows[0].SituacaoVeiculo, '→', getCategory(frota.rows[0].SituacaoVeiculo));
  }

  // inactivationDateMap: percorre do mais recente para o mais antigo
  const events = [...hist.rows].reverse();
  let inactiveSince = new Date(); inactiveSince.setHours(0,0,0,0);
  let foundInactDate = false;
  for (let i = 0; i < events.length; i++) {
    const s = events[i].SituacaoVeiculo;
    if (!s) continue;
    if (getCategory(s) !== 'Inativa') {
      // Encontrou não-Inativa → próximo para frente que é Inativa
      for (let j = i - 1; j >= 0; j--) {
        const sj = events[j].SituacaoVeiculo;
        if (sj && getCategory(sj) === 'Inativa') {
          const d = new Date(events[j].UltimaAtualizacao);
          d.setHours(0,0,0,0);
          inactiveSince = d;
          foundInactDate = true;
          break;
        }
      }
      break;
    }
    const d = new Date(events[i].UltimaAtualizacao);
    if (!isNaN(d.getTime())) { d.setHours(0,0,0,0); inactiveSince = d; foundInactDate = true; }
  }

  console.log('\ninactivationDateMap para', placa + ':',
    foundInactDate ? inactiveSince.toISOString().substr(0,10) : 'null (status atual nao é Inativa)');

  if (foundInactDate) {
    const excluido31jan = checkObj.getTime() >= new Date(inactiveSince).setHours(23,59,59,999);
    console.log('Excluído pelo inactivationDateMap em 31/01?', excluido31jan);
  }

  // Resultado final: seria contado em 31/01?
  const catFinal = statusVia1 ? getCategory(statusVia1) : null;
  console.log('\nRESULTADO EM 31/01/2026:');
  console.log('  Status determinado:', statusVia1 || 'null (excluído CASO4/CASO3)');
  console.log('  Categoria:', catFinal || '-');
  console.log('  Contado como ativo?', catFinal === 'Produtiva' || catFinal === 'Improdutiva' ? 'SIM' : 'NÃO');

  await pg.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
