require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const sql = require('mssql');

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  port: parseInt(process.env.SQL_PORT),
  database: process.env.SQL_DATABASE,
  options: { encrypt: false, trustServerCertificate: true }
};

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
  await sql.connect(sqlConfig);
  console.log('Conectado ao SQL Server (ERP).');

  const checkDate = '2026-01-31';

  // frota do ERP (FinalidadeUso != 'TERCEIRO' - exclui NULL como SQL semantics)
  const frotaRes = await sql.query(
    'SELECT Placa, SituacaoVeiculo, FinalidadeUso, DataCompra FROM Veiculos WITH (NOLOCK) ' +
    'WHERE Placa IS NOT NULL AND LEN(TRIM(Placa)) > 0 ' +
    'AND (FinalidadeUso IS NULL OR FinalidadeUso != \'TERCEIRO\')'
  );
  console.log('Total frota ERP (SQL filter, inclui NULL FinUso):', frotaRes.recordset.length);

  // Ultimo evento com status nao nulo por placa ate 31/01
  const histRes = await sql.query(
    'SELECT Placa, SituacaoVeiculo ' +
    'FROM (SELECT Placa, SituacaoVeiculo, UltimaAtualizacao, ' +
    '  ROW_NUMBER() OVER (PARTITION BY Placa ORDER BY UltimaAtualizacao DESC) as rn ' +
    '  FROM HistoricoSituacaoVeiculos WITH (NOLOCK) ' +
    '  WHERE SituacaoVeiculo IS NOT NULL AND SituacaoVeiculo != \'\' ' +
    "  AND UltimaAtualizacao <= '" + checkDate + " 23:59:59') t " +
    'WHERE rn = 1'
  );
  console.log('Eventos com status ate 31/01 (ERP):', histRes.recordset.length);

  // Qualquer evento com status (para CASO 4)
  const qualquerRes = await sql.query(
    'SELECT DISTINCT Placa FROM HistoricoSituacaoVeiculos WITH (NOLOCK) ' +
    'WHERE SituacaoVeiculo IS NOT NULL AND SituacaoVeiculo != \'\''
  );
  const temEventoAlgumDia = new Set(qualquerRes.recordset.map(r => (r.Placa || '').toUpperCase().trim()));

  const eventoMap = {};
  for (const e of histRes.recordset) {
    const k = (e.Placa || '').toUpperCase().trim();
    eventoMap[k] = e.SituacaoVeiculo;
  }

  let produtiva = 0, improdutiva = 0, inativa = 0, semStatus = 0, casoDataCompra = 0;
  const statusCounts = {};
  const checkDateObj = new Date(checkDate + 'T23:59:59');

  for (const v of frotaRes.recordset) {
    const placa = (v.Placa || '').toUpperCase().trim();
    let status = eventoMap[placa];

    if (!status) {
      if (temEventoAlgumDia.has(placa)) { semStatus++; continue; }
      if (v.DataCompra) {
        const dc = new Date(v.DataCompra);
        if (dc.getTime() > checkDateObj.getTime()) { casoDataCompra++; continue; }
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
  console.log('\n=== RESULTADO ERP 31/01/2026 ===');
  console.log('Produtiva:', produtiva);
  console.log('Improdutiva:', improdutiva);
  console.log('Total ativo:', active, '| %:', active > 0 ? ((improdutiva / active) * 100).toFixed(1) + '%' : '-');
  console.log('Excluido DataCompra apos 31/01:', casoDataCompra);
  console.log('Sem status / CASO4:', semStatus);

  console.log('\nTop status ERP:');
  Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .forEach(([s, c]) => console.log('  ' + s + ' [' + getCategory(s) + ']:', c));

  await sql.close();
}
run().catch(e => { console.error('ERRO:', e.message); sql.close(); });
