require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: process.env.PG_PORT || 5432,
  user: (process.env.PG_USER || '').toLowerCase().trim(),
  password: (process.env.PG_PASSWORD || '').trim(),
  database: (process.env.PG_DATABASE || 'bluconecta_dw').toLowerCase().trim(),
});

(async function main(){
  const client = await pool.connect();
  try{
    console.log('Conectado ao Postgres. Fazendo checagens iniciais...');
    // check staging exists
    const stg = await client.query(`SELECT to_regclass('public.stg_mapa_universal') as t`);
    if (!stg.rows[0].t) {
      console.error('Tabela stg_mapa_universal não encontrada. Rode import_mapa_to_pg.js primeiro.');
      process.exit(2);
    }

    // detect exact column names (preserve casing) or create PascalCase columns if missing
    const colsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'fato_financeiro_dre'`);
    const cols = colsRes.rows.map(r=>r.column_name);
    const wanted = { NomeCliente: null, Placa: null, ContratoComercial: null, ContratoLocacao: null,
      FontePlaca: null, FonteContratoComercial: null, FonteContratoLocacao: null, FonteCliente: null, FonteDescricao: null };
    for (const c of cols) {
      const lower = c.toLowerCase();
      if (lower === 'nomecliente') wanted.NomeCliente = c;
      if (lower === 'placa') wanted.Placa = c;
      if (lower === 'contratocomercial') wanted.ContratoComercial = c;
      if (lower === 'contratolocacao') wanted.ContratoLocacao = c;
      if (lower === 'fonteplaca') wanted.FontePlaca = c;
      if (lower === 'fontecontratocomercial') wanted.FonteContratoComercial = c;
      if (lower === 'fontecontratolocacao') wanted.FonteContratoLocacao = c;
      if (lower === 'fontecliente') wanted.FonteCliente = c;
      if (lower === 'fontedescricao') wanted.FonteDescricao = c;
    }

    for (const k of Object.keys(wanted)) {
      if (!wanted[k]) {
        console.log(`Coluna ${k} não encontrada. Criando coluna "${k}" text.`);
        await client.query(`ALTER TABLE fato_financeiro_dre ADD COLUMN IF NOT EXISTS "${k}" text`);
        wanted[k] = k;
      }
    }

    // report before
    const before = await client.query(`SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE "${wanted.Placa}" IS NOT NULL AND "${wanted.Placa}" <> '') as placa_nonnull,
      COUNT(*) FILTER (WHERE "${wanted.ContratoComercial}" IS NOT NULL AND "${wanted.ContratoComercial}" <> '') as contrato_com_nonnull,
      COUNT(*) FILTER (WHERE "${wanted.ContratoLocacao}" IS NOT NULL AND "${wanted.ContratoLocacao}" <> '') as contrato_loc_nonnull,
      COUNT(*) FILTER (WHERE "${wanted.NomeCliente}" IS NOT NULL AND "${wanted.NomeCliente}" <> '') as nome_nonnull
      FROM fato_financeiro_dre`);
    console.log('Antes -', before.rows[0]);

    // perform update in batches using JOIN on NumeroLancamento
    console.log('Iniciando UPDATE em lote (por numerolancamento) ...');
    const batchSize = 5000;
    const countStg = await client.query('SELECT COUNT(*) as cnt FROM stg_mapa_universal');
    const totalStg = parseInt(countStg.rows[0].cnt,10);
    console.log('Registros em staging:', totalStg);

    let offset = 0;
    while (offset < totalStg) {
      const res = await client.query(`SELECT numerolancamento FROM stg_mapa_universal ORDER BY numerolancamento LIMIT ${batchSize} OFFSET ${offset}`);
      const keys = res.rows.map(r => r.numerolancamento);
      if (keys.length === 0) break;
      // update using WHERE numerolancamento IN (...)
      const q = `UPDATE fato_financeiro_dre f
                  SET "${wanted.Placa}" = coalesce(s.placa, f."${wanted.Placa}"),
                      "${wanted.ContratoComercial}" = coalesce(s.contratocomercial, f."${wanted.ContratoComercial}"),
                      "${wanted.ContratoLocacao}" = coalesce(s.contratolocacao, f."${wanted.ContratoLocacao}"),
                      "${wanted.NomeCliente}" = coalesce(s.cliente, f."${wanted.NomeCliente}"),
                      "${wanted.FontePlaca}" = CASE WHEN s.placa IS NOT NULL AND s.placa <> '' THEN s.fonte_placa ELSE f."${wanted.FontePlaca}" END,
                      "${wanted.FonteContratoComercial}" = CASE WHEN s.contratocomercial IS NOT NULL AND s.contratocomercial <> '' THEN s.fonte_contratocomercial ELSE f."${wanted.FonteContratoComercial}" END,
                      "${wanted.FonteContratoLocacao}" = CASE WHEN s.contratolocacao IS NOT NULL AND s.contratolocacao <> '' THEN s.fonte_contratolocacao ELSE f."${wanted.FonteContratoLocacao}" END,
                      "${wanted.FonteCliente}" = CASE WHEN s.cliente IS NOT NULL AND s.cliente <> '' THEN s.fonte_cliente ELSE f."${wanted.FonteCliente}" END,
                      "${wanted.FonteDescricao}" = CASE WHEN (s.fonte_descricao IS NOT NULL AND s.fonte_descricao <> '') THEN s.fonte_descricao ELSE f."${wanted.FonteDescricao}" END
                  FROM stg_mapa_universal s
                  WHERE f."NumeroLancamento" = s.numerolancamento
                    AND s.numerolancamento = ANY($1::text[])`;
      await client.query(q, [keys]);
      offset += keys.length;
      console.log('Updated offset', offset);
    }

    // report after
    const after = await client.query(`SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE "${wanted.Placa}" IS NOT NULL AND "${wanted.Placa}" <> '') as placa_nonnull,
      COUNT(*) FILTER (WHERE "${wanted.ContratoComercial}" IS NOT NULL AND "${wanted.ContratoComercial}" <> '') as contrato_com_nonnull,
      COUNT(*) FILTER (WHERE "${wanted.ContratoLocacao}" IS NOT NULL AND "${wanted.ContratoLocacao}" <> '') as contrato_loc_nonnull,
      COUNT(*) FILTER (WHERE "${wanted.NomeCliente}" IS NOT NULL AND "${wanted.NomeCliente}" <> '') as nome_nonnull
      FROM fato_financeiro_dre`);
    console.log('Depois -', after.rows[0]);

    console.log('Atualização concluída.');
  }catch(err){
    console.error('Erro apply:', err && err.message ? err.message : err);
    process.exit(2);
  }finally{
    client.release();
    await pool.end();
  }
})();
