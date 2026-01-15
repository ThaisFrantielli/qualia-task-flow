import pg from 'pg';

const p = new pg.Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_y7XEQfUwOVW2@ep-restless-dream-acblgckm-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' 
});

async function main() {
  try {
    // Verificar eventos do veículo SGN-8G42
    const eventosVeiculo = await p.query(`
      SELECT "TipoEvento", "DataEvento", "Cliente", "Situacao", "Fornecedor"
      FROM hist_vida_veiculo_timeline
      WHERE "Placa" = 'SGN-8G42'
      ORDER BY "DataEvento" DESC
    `);
    console.log("=== EVENTOS DO VEÍCULO SGN-8G42 ===");
    console.log(JSON.stringify(eventosVeiculo.rows, null, 2));
    
    // Contar por tipo
    const contagemTipos = await p.query(`
      SELECT "TipoEvento", COUNT(*) as total
      FROM hist_vida_veiculo_timeline
      WHERE "Placa" = 'SGN-8G42'
      GROUP BY "TipoEvento"
    `);
    console.log("\n=== CONTAGEM POR TIPO ===");
    console.log(JSON.stringify(contagemTipos.rows, null, 2));
    
  } catch (e) {
    console.error("Erro:", e.message);
  } finally {
    await p.end();
  }
}

main();
