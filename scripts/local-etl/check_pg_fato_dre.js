require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: process.env.PG_PORT || 5432,
  user: (process.env.PG_USER || '').toLowerCase().trim(),
  password: (process.env.PG_PASSWORD || '').trim(),
  database: (process.env.PG_DATABASE || 'bluconecta_dw').toLowerCase().trim(),
});

async function run(){
  const client = await pool.connect();
  try{
    console.log('Conectado ao Postgres:', client.database);
    const total = await client.query('SELECT COUNT(*) as cnt FROM fato_financeiro_dre');
    console.log('Total linhas fato_financeiro_dre:', total.rows[0].cnt);

    // List columns to handle case/quoting
    const colsRes = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'fato_financeiro_dre'
      ORDER BY ordinal_position
    `);
    const cols = colsRes.rows.map(r=>r.column_name);
    console.log('Colunas em fato_financeiro_dre:', cols.join(', '));

    const wanted = ['nomecliente','placa','contratocomercial','contratolocacao'];
    const found = {};
    wanted.forEach(w => {
      const f = cols.find(c => c.toLowerCase() === w);
      if (f) found[w] = f;
    });

    console.log('Colunas encontradas:', found);

    for (const w of wanted){
      if (!found[w]){
        console.log(`Coluna esperada '${w}' não encontrada na tabela.`);
      }
    }

    if (Object.keys(found).length > 0){
      const cntQ = `SELECT\n        ${found['nomecliente'] ? `COUNT(*) FILTER (WHERE "${found['nomecliente']}" IS NOT NULL AND "${found['nomecliente']}" <> '') AS nome_nonnull,` : 'NULL AS nome_nonnull,'}\n        ${found['placa'] ? `COUNT(*) FILTER (WHERE "${found['placa']}" IS NOT NULL AND "${found['placa']}" <> '') AS placa_nonnull,` : 'NULL AS placa_nonnull,'}\n        ${found['contratocomercial'] ? `COUNT(*) FILTER (WHERE "${found['contratocomercial']}" IS NOT NULL AND "${found['contratocomercial']}" <> '') AS contrato_com_nonnull,` : 'NULL AS contrato_com_nonnull,'}\n        ${found['contratolocacao'] ? `COUNT(*) FILTER (WHERE "${found['contratolocacao']}" IS NOT NULL AND "${found['contratolocacao']}" <> '') AS contrato_loc_nonnull` : 'NULL AS contrato_loc_nonnull'}\n      FROM fato_financeiro_dre`;

      const counts = await client.query(cntQ);
      console.log('Contagens de colunas preenchidas:', counts.rows[0]);

      console.log('\nAmostra (10 linhas):');
      const idCol = cols.find(c=>c.toLowerCase()==='idlancamentonatureza') || 'IdLancamentoNatureza';
      const numCol = cols.find(c=>c.toLowerCase()==='numerolancamento') || 'NumeroLancamento';
      const descCol = cols.find(c=>c.toLowerCase()==='descricaolancamento') || 'DescricaoLancamento';
      const numDocCol = cols.find(c=>c.toLowerCase()==='numerodocumento') || 'NumeroDocumento';

      const sampleQ = `SELECT "${idCol}" AS IdLancamentoNatureza, "${numCol}" AS NumeroLancamento, ${found['nomecliente'] ? `"${found['nomecliente']}"` : 'NULL AS NomeCliente'}, ${found['placa'] ? `"${found['placa']}"` : 'NULL AS Placa'}, ${found['contratocomercial'] ? `"${found['contratocomercial']}"` : 'NULL AS ContratoComercial'}, ${found['contratolocacao'] ? `"${found['contratolocacao']}"` : 'NULL AS ContratoLocacao'}, "${descCol}" AS DescricaoLancamento, "${numDocCol}" AS NumeroDocumento FROM fato_financeiro_dre LIMIT 10`;
      const sample = await client.query(sampleQ);
      console.log(JSON.stringify(sample.rows, null, 2));
    }
  }catch(err){
    console.error('Erro no Postgres:', err.message);
  }finally{
    client.release();
    await pool.end();
  }
}

run().catch(e=>{ console.error(e); process.exit(1)});
