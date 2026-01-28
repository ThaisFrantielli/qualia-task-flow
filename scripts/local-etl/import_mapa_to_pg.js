require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

const IN_PATH = process.env.IN_PATH || process.argv[2] || 'public/data/mapa_universal_full.ndjson';
const BATCH = 1000;

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: process.env.PG_PORT || 5432,
  user: (process.env.PG_USER || '').toLowerCase().trim(),
  password: (process.env.PG_PASSWORD || '').trim(),
  database: (process.env.PG_DATABASE || 'bluconecta_dw').toLowerCase().trim(),
});

async function ensureTable(client) {
    await client.query(`
    CREATE TABLE IF NOT EXISTS stg_mapa_universal (
      numerolancamento text PRIMARY KEY,
      natureza text,
      placa text,
      fonte_placa text,
      contratolocacao text,
      fonte_contratolocacao text,
      contratocomercial text,
      fonte_contratocomercial text,
      cliente text,
      fonte_cliente text,
      fonte_descricao text
    );
  `);
  // Ensure columns exist if table pre-existed with older schema
  await client.query("ALTER TABLE stg_mapa_universal ADD COLUMN IF NOT EXISTS fonte_placa text");
  await client.query("ALTER TABLE stg_mapa_universal ADD COLUMN IF NOT EXISTS fonte_contratolocacao text");
  await client.query("ALTER TABLE stg_mapa_universal ADD COLUMN IF NOT EXISTS fonte_contratocomercial text");
  await client.query("ALTER TABLE stg_mapa_universal ADD COLUMN IF NOT EXISTS fonte_cliente text");
  await client.query("ALTER TABLE stg_mapa_universal ADD COLUMN IF NOT EXISTS fonte_descricao text");
  await client.query('CREATE INDEX IF NOT EXISTS idx_stg_mapa_numero ON stg_mapa_universal(numerolancamento)');
}

(async function main(){
  if (!fs.existsSync(IN_PATH)){
    console.error('Arquivo NDJSON não encontrado:', IN_PATH);
    process.exit(2);
  }

  const client = await pool.connect();
  try{
    console.log('Criando tabela staging se necessário...');
    await ensureTable(client);

    const stream = fs.createReadStream(IN_PATH, { encoding: 'utf8' });
    const rl = require('readline').createInterface({ input: stream, crlfDelay: Infinity });

    let batch = [];
    let total = 0;
    for await (const line of rl) {
      if (!line.trim()) continue;
      const r = JSON.parse(line);
      batch.push([
        r.NumeroLancamento ? String(r.NumeroLancamento) : null,
        r.Natureza || null,
        r.Placa || null,
        r.FontePlaca || null,
        r.ContratoLocacao || null,
        r.FonteContratoLocacao || null,
        r.ContratoComercial || null,
        r.FonteContratoComercial || null,
        r.Cliente || null,
        r.FonteCliente || null,
        r.FonteDescricao || null
      ]);

      if (batch.length >= BATCH) {
        const values = batch.map((_,i) => `($${i*11+1},$${i*11+2},$${i*11+3},$${i*11+4},$${i*11+5},$${i*11+6},$${i*11+7},$${i*11+8},$${i*11+9},$${i*11+10},$${i*11+11})`).join(',');
        const flat = batch.flat();
        const q = `INSERT INTO stg_mapa_universal(numerolancamento,natureza,placa,fonte_placa,contratolocacao,fonte_contratolocacao,contratocomercial,fonte_contratocomercial,cliente,fonte_cliente,fonte_descricao) VALUES ${values}
                   ON CONFLICT (numerolancamento) DO UPDATE SET
                     natureza = EXCLUDED.natureza,
                     placa = EXCLUDED.placa,
                     fonte_placa = EXCLUDED.fonte_placa,
                     contratolocacao = EXCLUDED.contratolocacao,
                     fonte_contratolocacao = EXCLUDED.fonte_contratolocacao,
                     contratocomercial = EXCLUDED.contratocomercial,
                     fonte_contratocomercial = EXCLUDED.fonte_contratocomercial,
                     cliente = EXCLUDED.cliente,
                     fonte_cliente = EXCLUDED.fonte_cliente,
                     fonte_descricao = EXCLUDED.fonte_descricao`;
        await client.query(q, flat);
        total += batch.length;
        console.log('Inserted', total);
        batch = [];
      }
    }
    if (batch.length) {
      const values = batch.map((_,i) => `($${i*11+1},$${i*11+2},$${i*11+3},$${i*11+4},$${i*11+5},$${i*11+6},$${i*11+7},$${i*11+8},$${i*11+9},$${i*11+10},$${i*11+11})`).join(',');
      const flat = batch.flat();
      const q = `INSERT INTO stg_mapa_universal(numerolancamento,natureza,placa,fonte_placa,contratolocacao,fonte_contratolocacao,contratocomercial,fonte_contratocomercial,cliente,fonte_cliente,fonte_descricao) VALUES ${values}
                 ON CONFLICT (numerolancamento) DO UPDATE SET
                   natureza = EXCLUDED.natureza,
                   placa = EXCLUDED.placa,
                   fonte_placa = EXCLUDED.fonte_placa,
                   contratolocacao = EXCLUDED.contratolocacao,
                   fonte_contratolocacao = EXCLUDED.fonte_contratolocacao,
                   contratocomercial = EXCLUDED.contratocomercial,
                   fonte_contratocomercial = EXCLUDED.fonte_contratocomercial,
                   cliente = EXCLUDED.cliente,
                   fonte_cliente = EXCLUDED.fonte_cliente,
                   fonte_descricao = EXCLUDED.fonte_descricao`;
      await client.query(q, flat);
      total += batch.length;
      console.log('Inserted', total);
    }

    console.log('Import concluído. Linhas importadas:', total);
  }catch(err){
    console.error('Erro import:', err && err.message ? err.message : err);
    process.exit(2);
  }finally{
    client.release();
    await pool.end();
  }
})();
