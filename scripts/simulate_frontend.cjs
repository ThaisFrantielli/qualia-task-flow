const { Pool } = require('pg');
const pg = new Pool({ host: '137.131.163.167', port: 5432, user: 'postgres', password: 'F4tu5xy3', database: 'bluconecta_dw' });

// Simula a logica do frontend para 31/01/2026:
// CASO 1: ultimo evento <= 31/01 → usa status do evento
// CASO 3: sem evento <= 31/01 → usa dim_frota ATUAL (SituacaoVeiculo)
// Exclui: FinalidadeUso = 'TERCEIRO', Placa null/vazia
// JS inclui NULL FinalidadeUso (ao contrario do SQL)

async function run() {
  const checkDate = '2026-01-31';

  // Pega todos os veiculos que o frontend consideraria (sem filtro TERCEIRO SQL-style)
  const frota = await pg.query(
    'SELECT "Placa", "SituacaoVeiculo", "FinalidadeUso", "DataCompra" FROM dim_frota ' +
    'WHERE "Placa" IS NOT NULL AND TRIM("Placa") != \'\' AND ("FinalidadeUso" IS NULL OR "FinalidadeUso" != \'TERCEIRO\')'
  );
  console.log('Total frota candidata (JS filter):', frota.rows.length);

  // Pega o ultimo evento de cada placa ate 31/01
  const eventos = await pg.query(
    'SELECT DISTINCT ON ("Placa") "Placa", "SituacaoVeiculo" as status_evento, "UltimaAtualizacao" ' +
    'FROM historico_situacao_veiculos ' +
    'WHERE "UltimaAtualizacao"::text <= $1 || \'T23:59:59\' ' +
    'ORDER BY "Placa", "UltimaAtualizacao" DESC',
    [checkDate]
  );
  console.log('Veiculos com evento ate 31/01:', eventos.rows.length);

  const eventoMap = {};
  for (const e of eventos.rows) eventoMap[e.Placa?.toUpperCase()?.trim()] = e.status_evento;

  // Classifica cada veiculo como o frontend faz
  const produtivos = [];
  const improdutivos = [];
  const excluidos = [];

  const statusImprodutivos = new Set(['Improdutivo', 'Manutenção', 'Aguardando Manutenção', 'Sinistro', 'Para Venda', 'Devolvido', 'Vendido', 'Roubo / Furto', 'Bloqueado', 'Inadimplente']);

  for (const v of frota.rows) {
    const placaNorm = v.Placa?.toUpperCase()?.trim();
    const eventoStatus = eventoMap[placaNorm];

    let status;
    if (eventoStatus) {
      // CASO 1: tem evento <= 31/01
      status = eventoStatus;
    } else {
      // CASO 3: sem evento <= 31/01 → usa dim_frota atual
      // Verifica DataCompra
      if (v.DataCompra) {
        const dc = new Date(v.DataCompra);
        const cd = new Date(checkDate + 'T23:59:59');
        if (dc > cd) {
          excluidos.push({ placa: v.Placa, motivo: 'DataCompra_apos', dc: v.DataCompra, situ: v.SituacaoVeiculo });
          continue;
        }
      }
      status = v.SituacaoVeiculo;
    }

    // Classifica o status final
    const statusUpper = (status || '').toLowerCase();
    const isLocado = statusUpper.includes('locado') || statusUpper.includes('produtiv');

    if (statusImprodutivos.has(status)) {
      improdutivos.push({ placa: v.Placa, status });
    } else if (status === 'Locado' || status === 'Disponível' || status === 'Reservado') {
      produtivos.push({ placa: v.Placa, status });
    } else {
      // status desconhecido
      excluidos.push({ placa: v.Placa, motivo: 'status_desconhecido', status });
    }
  }

  console.log('\nAtivos (produtivos+improdutivos):', produtivos.length + improdutivos.length);
  console.log('Produtivos:', produtivos.length);
  console.log('Improdutivos:', improdutivos.length, '→ %:', ((improdutivos.length / (produtivos.length + improdutivos.length)) * 100).toFixed(1) + '%');
  console.log('Excluidos (DataCompra/status):', excluidos.length);

  // Distribuicao de status improdutivos
  const impCounts = {};
  improdutivos.forEach(x => { impCounts[x.status] = (impCounts[x.status] || 0) + 1; });
  console.log('\nStatus improdutivos:', impCounts);

  // Status distribuicao geral dos excluidos
  const excCounts = {};
  excluidos.forEach(x => { const k = x.motivo + ':' + x.status; excCounts[k] = (excCounts[k] || 0) + 1; });
  console.log('Status excluidos:', excCounts);

  await pg.end();
}
run().catch(e => { console.error(e.message); process.exit(1); pg.end(); });
