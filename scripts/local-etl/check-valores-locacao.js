require('dotenv').config();
const { Pool } = require('pg');

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) {
  console.error('NEON_DATABASE_URL não encontrado no .env');
  process.exit(1);
}

(async () => {
  const pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  try {
    await pool.connect();
    console.log('Conectado ao Neon (verificação de valores monetários)');

    // Buscar amostras de LOCACAO para placas mencionadas
    const placas = ['SGN-8G42', 'SGN8G42', 'GED-7C63', 'GED7C63'];
    
    for (const placa of placas) {
      console.log(`\n=== Placa: ${placa} ===`);
      
      const query = `
        SELECT 
          "Placa",
          "TipoEvento",
          "DataEvento",
          "Cliente",
          "ValorMensal",
          "ContratoLocacao",
          "Situacao"
        FROM hist_vida_veiculo_timeline
        WHERE "Placa" = $1 AND "TipoEvento" IN ('LOCACAO', 'Locação')
        ORDER BY "DataEvento" DESC
        LIMIT 3
      `;
      
      try {
        const res = await pool.query(query, [placa]);
        if (res.rows.length === 0) {
          console.log(`  Nenhuma locação encontrada para ${placa}`);
        } else {
          res.rows.forEach((row, idx) => {
            console.log(`  [${idx + 1}] ${row.DataEvento} | Cliente: ${row.Cliente} | Valor: R$ ${row.ValorMensal} | Contrato: ${row.ContratoLocacao}`);
          });
        }
      } catch (err) {
        console.error(`  Erro ao buscar ${placa}:`, err.message);
      }
    }

    // Buscar estatísticas gerais de ValorMensal
    console.log('\n=== Estatísticas de ValorMensal (LOCACAO) ===');
    const statsQuery = `
      SELECT 
        COUNT(*) as total_locacoes,
        COUNT("ValorMensal") as com_valor,
        MIN("ValorMensal") as valor_min,
        MAX("ValorMensal") as valor_max,
        AVG("ValorMensal") as valor_medio,
        COUNT(CASE WHEN "ValorMensal" < 1 THEN 1 END) as menor_que_1,
        COUNT(CASE WHEN "ValorMensal" >= 1 AND "ValorMensal" < 100 THEN 1 END) as entre_1_100,
        COUNT(CASE WHEN "ValorMensal" >= 100 AND "ValorMensal" < 10000 THEN 1 END) as entre_100_10k,
        COUNT(CASE WHEN "ValorMensal" >= 10000 THEN 1 END) as maior_10k
      FROM hist_vida_veiculo_timeline
      WHERE "TipoEvento" IN ('LOCACAO', 'Locação')
    `;
    
    const statsRes = await pool.query(statsQuery);
    if (statsRes.rows.length > 0) {
      const stats = statsRes.rows[0];
      console.log(`Total de locações: ${stats.total_locacoes}`);
      console.log(`Com valor informado: ${stats.com_valor}`);
      console.log(`Valor mínimo: R$ ${stats.valor_min}`);
      console.log(`Valor máximo: R$ ${stats.valor_max}`);
      console.log(`Valor médio: R$ ${parseFloat(stats.valor_medio).toFixed(2)}`);
      console.log(`\nDistribuição:`);
      console.log(`  < R$ 1,00: ${stats.menor_que_1}`);
      console.log(`  R$ 1 - R$ 100: ${stats.entre_1_100}`);
      console.log(`  R$ 100 - R$ 10.000: ${stats.entre_100_10k}`);
      console.log(`  >= R$ 10.000: ${stats.maior_10k}`);
    }

    await pool.end();
  } catch (err) {
    console.error('Erro:', err.message || err);
    process.exit(2);
  }
})();
