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
  const checkDateStr = '2026-01-31';
  const checkDateObj = new Date(checkDateStr + 'T23:59:59');

  // 1. Frota candidata (filtro JS: inclui NULL FinalidadeUso)
  const frotaRes = await pg.query(
    'SELECT "Placa", "SituacaoVeiculo", "FinalidadeUso", "DataCompra" FROM dim_frota ' +
    'WHERE "Placa" IS NOT NULL AND TRIM("Placa") != \'\' AND ("FinalidadeUso" IS NULL OR "FinalidadeUso" != \'TERCEIRO\')'
  );
  console.log('Total frota candidata:', frotaRes.rows.length);

  // 2. Historico completo
  const histRes = await pg.query(
    'SELECT "Placa", "SituacaoVeiculo", "UltimaAtualizacao" FROM historico_situacao_veiculos ' +
    'WHERE "Placa" IS NOT NULL ORDER BY "Placa", "UltimaAtualizacao" ASC'
  );
  console.log('Total registros historico:', histRes.rows.length);

  // Monta historicoMap
  const historicoMap = new Map();
  for (const h of histRes.rows) {
    const k = (h.Placa || '').toUpperCase().trim();
    if (!k) continue;
    if (!historicoMap.has(k)) historicoMap.set(k, []);
    historicoMap.get(k).push(h);
  }

  // Monta veiculoAtualMap
  const veiculoAtualMap = new Map();
  for (const v of frotaRes.rows) {
    const k = (v.Placa || '').toUpperCase().trim();
    veiculoAtualMap.set(k, v);
  }

  // 3. Calcula inactivationDateMap (logica exata do commit 384f8cb6)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const inactivationDateMap = new Map();

  for (const v of frotaRes.rows) {
    const placa = (v.Placa || '').toUpperCase().trim();
    if (!placa) continue;
    const currentStatus = v.SituacaoVeiculo;
    if (!currentStatus || getCategory(currentStatus) !== 'Inativa') {
      inactivationDateMap.set(placa, null);
      continue;
    }

    const events = historicoMap.get(placa) || [];
    let inactiveSince = new Date(todayStart);

    for (let i = events.length - 1; i >= 0; i--) {
      const evStatus = events[i].SituacaoVeiculo;
      if (!evStatus) continue;
      if (getCategory(evStatus) !== 'Inativa') {
        // Encontrou evento não-Inativa → próximo evento Inativa é o início
        for (let j = i + 1; j < events.length; j++) {
          const sj = events[j].SituacaoVeiculo;
          if (sj && getCategory(sj) === 'Inativa') {
            const d = new Date(events[j].UltimaAtualizacao);
            d.setHours(0, 0, 0, 0);
            inactiveSince = d;
            break;
          }
        }
        break;
      }
      // evento é Inativa → recua inactiveSince
      const d = new Date(events[i].UltimaAtualizacao);
      if (!isNaN(d.getTime()) && d.getTime() > 0) {
        d.setHours(0, 0, 0, 0);
        inactiveSince = d;
      }
    }
    inactivationDateMap.set(placa, inactiveSince);
  }

  // 4. Simula o loop do dailyIdleHistory para 31/01
  // Placas candidatas (mesmo filtro do frontend)
  const placas = frotaRes.rows.map(v => (v.Placa || '').toUpperCase().trim()).filter(Boolean);

  let improdutivaCount = 0, activeCount = 0;

  // Monta eventoMap: último evento com status não nulo ≤ 31/01
  const eventoMap = new Map();
  for (const [placa, events] of historicoMap.entries()) {
    for (let j = events.length - 1; j >= 0; j--) {
      const evDate = new Date(events[j].UltimaAtualizacao);
      if (evDate.getTime() <= checkDateObj.getTime()) {
        const evStatus = events[j].SituacaoVeiculo;
        if (!evStatus) continue;
        eventoMap.set(placa, evStatus);
        break;
      }
    }
  }

  // Monta "temEventoComStatus" para CASO 4
  const temQualquerEventoComStatus = new Set();
  for (const [placa, events] of historicoMap.entries()) {
    for (const ev of events) {
      if (ev.SituacaoVeiculo) { temQualquerEventoComStatus.add(placa); break; }
    }
  }

  const excluidos_inact = [];
  const contados = [];

  for (const placa of placas) {
    // inactivationDateMap check
    const inactDate = inactivationDateMap.get(placa) || null;
    if (inactDate) {
      const inactEnd = new Date(inactDate);
      inactEnd.setHours(23, 59, 59, 999);
      if (checkDateObj.getTime() >= inactEnd.getTime()) {
        excluidos_inact.push({ placa, inactDate: inactDate.toISOString().substr(0,10) });
        continue;
      }
    }

    // resolveStatusForDate
    let status = eventoMap.get(placa);
    if (!status) {
      if (temQualquerEventoComStatus.has(placa)) continue; // CASO 4
      // CASO 3: fallback dim_frota
      const v = veiculoAtualMap.get(placa);
      const dataCompraRaw = v?.DataCompra;
      if (dataCompraRaw) {
        const dc = new Date(dataCompraRaw);
        dc.setHours(0,0,0,0);
        if (dc.getTime() > checkDateObj.getTime()) continue;
      }
      status = v?.SituacaoVeiculo;
    }

    if (!status) continue;
    const cat = getCategory(status);
    if (cat === 'Inativa') continue;
    activeCount++;
    if (cat === 'Improdutiva') { improdutivaCount++; contados.push({ placa, status, cat }); }
  }

  console.log('\n=== COM inactivationDateMap (lógica do screenshot) ===');
  console.log('Total ativo:', activeCount, '| Improdutiva:', improdutivaCount);
  console.log('% Improdutiva:', activeCount > 0 ? ((improdutivaCount/activeCount)*100).toFixed(1)+'%' : '-');
  console.log('Excluidos pelo inactivationDateMap:', excluidos_inact.length);

  // Detalhes dos excluídos
  const excByDate = {};
  excluidos_inact.forEach(x => { excByDate[x.inactDate] = (excByDate[x.inactDate]||0)+1; });
  console.log('\nDistribuição dos excluídos por inactDate (top 10):');
  Object.entries(excByDate).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([d,c])=>console.log('  '+d+':',c));

  // Mostra os excluídos com inactDate <= 31/01 (os que fazem a diferença)
  const excAte3101 = excluidos_inact.filter(x => x.inactDate <= '2026-01-31');
  console.log('\nExcluídos com inactDate <= 31/01 (causam diferença):', excAte3101.length);
  excAte3101.slice(0,20).forEach(x => console.log(' ', x.placa, x.inactDate));

  await pg.end();
}
run().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
