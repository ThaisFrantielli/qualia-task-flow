require('dotenv').config();
const { Pool } = require('pg');

// Build connection from ORACLE_PG_* env vars or fallback to DATABASE_URL
const conn = process.env.ORACLE_PG_CONNECTION_STRING || process.env.DATABASE_URL || (() => {
  const host = process.env.ORACLE_PG_HOST || process.env.PG_HOST;
  const port = process.env.ORACLE_PG_PORT || process.env.PG_PORT || '5432';
  const user = process.env.ORACLE_PG_USER || process.env.PG_USER || 'postgres';
  const pass = process.env.ORACLE_PG_PASSWORD || process.env.PG_PASSWORD || '';
  const db = process.env.ORACLE_PG_DATABASE || process.env.PG_DATABASE || 'bluconecta_dw';
  if (!host) return null;
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
})();

if (!conn) {
  console.error('Conexão não encontrada no .env (defina ORACLE_PG_HOST ou DATABASE_URL)');
  process.exit(1);
}

(async () => {
  const pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  try {
    await pool.connect();
    console.log('Conectado ao banco de destino (diagnóstico)');

    // Contagens básicas
    const q1 = await pool.query('SELECT COUNT(*) AS cnt FROM dim_frota');
    console.log(`dim_frota_total: ${q1.rows[0].cnt}`);
    const q2 = await pool.query('SELECT COUNT(*) AS cnt FROM hist_vida_veiculo_timeline');
    console.log(`timeline_total_rows: ${q2.rows[0].cnt}`);

    // Detectar nome de coluna que representa a placa (pode ter case sensível)
    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'hist_vida_veiculo_timeline'");
    const colNames = cols.rows.map(r => r.column_name);
    console.log('timeline_columns:', colNames.join(', '));

    const placaCol = colNames.find(c => c.toLowerCase() === 'placa');
    const tipoCol = colNames.find(c => c.toLowerCase() === 'tipoevento' || c.toLowerCase() === 'tipo_evento' || c.toLowerCase() === 'tipo');

    if (!placaCol) {
      console.warn('Coluna de placa não encontrada na timeline; abortando contagens por tipo.');
    } else {
      // Usar identificador corretamente (se contiver letras maiúsculas, precisa ser citado)
      const placaIdent = placaCol.match(/[A-Z]/) ? '"' + placaCol + '"' : placaCol;
      const tipoIdent = tipoCol ? (tipoCol.match(/[A-Z]/) ? '"' + tipoCol + '"' : tipoCol) : 'tipoevento';

      const q3 = await pool.query(`SELECT COUNT(DISTINCT ${placaIdent}) AS cnt FROM hist_vida_veiculo_timeline`);
      console.log(`timeline_unique_plates: ${q3.rows[0].cnt}`);

      const q4 = await pool.query(`SELECT COUNT(*) AS cnt FROM hist_vida_veiculo_timeline WHERE ${tipoIdent} = 'COMPRA'`);
      console.log(`timeline_compra_rows: ${q4.rows[0].cnt}`);

      const q5 = await pool.query(`SELECT COUNT(*) AS cnt FROM hist_vida_veiculo_timeline WHERE ${tipoIdent} = 'LOCACAO'`);
      console.log(`timeline_locacao_rows: ${q5.rows[0].cnt}`);
    }

    // Amostra rápida para placas conhecidas (verificar valores monetários)
    const samplePlates = ['SGN-8G42', 'GED-7C63'];
    for (const sp of samplePlates) {
      try {
        const res = await pool.query(`SELECT "Placa", "TipoEvento", "DataEvento", "ValorMensal", "ValorAquisicao", "CustoTotal", "Observacao" FROM hist_vida_veiculo_timeline WHERE "Placa" = $1 ORDER BY "DataEvento" DESC LIMIT 20`, [sp]);
        console.log(`\nAmostra para ${sp}: ${res.rows.length} registros`);
        res.rows.forEach(r => console.log(r));
      } catch (e) {
        console.warn('Erro na amostra para', sp, e.message || e);
      }
    }

    await pool.end();
  } catch (err) {
    console.error('Erro ao consultar o banco de destino:', err.message || err);
    process.exit(2);
  }
})();
