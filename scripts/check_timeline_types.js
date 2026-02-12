import pg from 'pg';

// Use ORACLE_PG_* environment variables (fallback to DATABASE_URL)
const buildConn = () => {
  if (process.env.ORACLE_PG_CONNECTION_STRING) return process.env.ORACLE_PG_CONNECTION_STRING;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.ORACLE_PG_HOST || process.env.PG_HOST || '127.0.0.1';
  const port = process.env.ORACLE_PG_PORT || process.env.PG_PORT || '5432';
  const user = process.env.ORACLE_PG_USER || process.env.PG_USER || 'postgres';
  const pass = process.env.ORACLE_PG_PASSWORD || process.env.PG_PASSWORD || '';
  const db = process.env.ORACLE_PG_DATABASE || process.env.PG_DATABASE || 'bluconecta_dw';
  // No SSL by default; respect ORACLE_PG_SSL if set to 'true'
  const sslParam = process.env.ORACLE_PG_SSL === 'true' ? '?sslmode=require' : '';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}${sslParam}`;
};

const p = new pg.Pool({ connectionString: buildConn() });

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
