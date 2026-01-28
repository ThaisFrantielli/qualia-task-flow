require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: process.env.PG_PORT || 5432,
  user: (process.env.PG_USER || '').toLowerCase().trim(),
  password: (process.env.PG_PASSWORD || '').trim(),
  database: (process.env.PG_DATABASE || 'bluconecta_dw').toLowerCase().trim(),
});

(async function(){
  const client = await pool.connect();
  try{
    const q = `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE "FontePlaca" IS NOT NULL AND "FontePlaca" <>'') as fonte_placa_nonnull,
      COUNT(*) FILTER (WHERE "FonteContratoComercial" IS NOT NULL AND "FonteContratoComercial" <>'') as fonte_contrato_com_nonnull,
      COUNT(*) FILTER (WHERE "FonteContratoLocacao" IS NOT NULL AND "FonteContratoLocacao" <>'') as fonte_contrato_loc_nonnull,
      COUNT(*) FILTER (WHERE "FonteCliente" IS NOT NULL AND "FonteCliente" <>'') as fonte_cliente_nonnull,
      COUNT(*) FILTER (WHERE "FonteDescricao" IS NOT NULL AND "FonteDescricao" <>'') as fonte_descricao_nonnull
      FROM fato_financeiro_dre`;
    const res = await client.query(q);
    console.log('Fonte columns report:', res.rows[0]);
  }catch(e){
    console.error('Erro:', e && e.message ? e.message : e);
  }finally{
    client.release();
    await pool.end();
  }
})();
