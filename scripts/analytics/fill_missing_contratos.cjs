#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.PG_HOST || process.env.PG_POOLER_HOST,
  port: Number(process.env.PG_PORT || process.env.PG_POOLER_PORT || 5432),
  user: process.env.PG_USER || process.env.PG_POOLER_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.resolve(__dirname, '../../tmp');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    console.log('Criando backups (tabelas com sufixo timestamp)...');
    const safeTs = ts.replace(/[^a-zA-Z0-9_]/g,'');
    const backupContratos = `public.backup_dim_contratos_locacao_${safeTs}`;
    const backupFrota = `public.backup_dim_frota_${safeTs}`;

    await client.query(`CREATE TABLE ${backupContratos} AS SELECT * FROM public.dim_contratos_locacao;`);
    await client.query(`CREATE TABLE ${backupFrota} AS SELECT * FROM public.dim_frota;`);
    console.log('Backups criados:', backupContratos, backupFrota);

    // Contagens antes
    console.log('Executando contagens iniciais (missing)...');
    const countsSql = `
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE COALESCE(TRIM("PlacaPrincipal"),'') = '') AS missing_placa,
  count(*) FILTER (WHERE COALESCE(TRIM("NomeCliente"),'') = '') AS missing_cliente,
  count(*) FILTER (WHERE COALESCE(TRIM("TipoDeContrato"),'') = '') AS missing_tipo,
  count(*) FILTER (WHERE "DataFinal" IS NULL AND "DataEncerramento" IS NULL) AS missing_datas_fim,
  count(*) FILTER (WHERE "UltimoValorLocacao" IS NULL OR "UltimoValorLocacao" = 0) AS missing_valor_locacao,
  count(*) FILTER (WHERE "ValorCompra" IS NULL OR "ValorCompra" = 0) AS missing_valor_compra,
  count(*) FILTER (WHERE "ValorAtualFIPE" IS NULL OR "ValorAtualFIPE" = 0) AS missing_valor_fipe,
  count(*) FILTER (WHERE COALESCE("KmConfirmado"::text,'') = '') AS missing_km
FROM public.dim_contratos_locacao;`;

    const resCountsBefore = await client.query(countsSql);
    const before = resCountsBefore.rows[0];
    fs.writeFileSync(path.join(backupDir, `counts_before_${safeTs}.json`), JSON.stringify(before, null, 2));
    console.log('Contagens antes salvas em', path.join('tmp', `counts_before_${safeTs}.json`));
    console.log(before);

    // Amostras de registros faltantes (placa vazia, datas fim vazias)
    const samplePlacSql = `SELECT * FROM public.dim_contratos_locacao WHERE COALESCE(TRIM("PlacaPrincipal"),'') = '' LIMIT 50;`;
    const sampleDatasSql = `SELECT * FROM public.dim_contratos_locacao WHERE ("DataFinal" IS NULL AND "DataEncerramento" IS NULL) LIMIT 50;`;
    const samplePl = await client.query(samplePlacSql);
    const sampleDs = await client.query(sampleDatasSql);
    fs.writeFileSync(path.join(backupDir, `sample_missing_placa_${safeTs}.json`), JSON.stringify(samplePl.rows, null, 2));
    fs.writeFileSync(path.join(backupDir, `sample_missing_datas_${safeTs}.json`), JSON.stringify(sampleDs.rows, null, 2));
    console.log('Amostras salvas em tmp/');

    // Atualizacoes seguras: preencher Modelo, ValorAtualFIPE, KmConfirmado em dim_contratos_locacao a partir de dim_frota quando a placa casar
    console.log('Realizando updates: preenchendo Modelo, ValorAtualFIPE, KmConfirmado em dim_contratos_locacao a partir de dim_frota quando placa casar...');

    const updateModeloSql = `
UPDATE public.dim_contratos_locacao c
SET "Modelo" = f."Modelo"
FROM public.dim_frota f
WHERE (COALESCE(c."Modelo",'') = '' OR c."Modelo" IS NULL)
  AND regexp_replace(upper(coalesce(c."PlacaPrincipal",'')), '[^A-Z0-9]', 'g') = regexp_replace(upper(coalesce(f."Placa",'')), '[^A-Z0-9]', 'g')
  AND f."Modelo" IS NOT NULL
RETURNING c."ContratoLocacao" AS contrato, c."PlacaPrincipal" AS placa, f."Modelo" AS novo_modelo;`;

    const upd1 = await client.query(updateModeloSql);
    console.log('Modelos atualizados:', upd1.rowCount);
    fs.writeFileSync(path.join(backupDir, `updated_modelo_${safeTs}.json`), JSON.stringify(upd1.rows, null, 2));

    const updateFipeSql = `
UPDATE public.dim_contratos_locacao c
SET "ValorAtualFIPE" = f."ValorAtualFIPE"
FROM public.dim_frota f
WHERE (c."ValorAtualFIPE" IS NULL OR c."ValorAtualFIPE" = 0)
  AND regexp_replace(upper(coalesce(c."PlacaPrincipal",'')), '[^A-Z0-9]', 'g') = regexp_replace(upper(coalesce(f."Placa",'')), '[^A-Z0-9]', 'g')
  AND (f."ValorAtualFIPE" IS NOT NULL AND f."ValorAtualFIPE" <> 0)
RETURNING c."ContratoLocacao" AS contrato, c."PlacaPrincipal" AS placa, f."ValorAtualFIPE" AS novo_valor_fipe;`;

    const upd2 = await client.query(updateFipeSql);
    console.log('Valor FIPE atualizados:', upd2.rowCount);
    fs.writeFileSync(path.join(backupDir, `updated_fipe_${safeTs}.json`), JSON.stringify(upd2.rows, null, 2));

    const updateKmSql = `
UPDATE public.dim_contratos_locacao c
SET "KmConfirmado" = f."kminformado"
FROM public.dim_frota f
WHERE (COALESCE(c."KmConfirmado"::text,'') = '' OR c."KmConfirmado" IS NULL)
  AND regexp_replace(upper(coalesce(c."PlacaPrincipal",'')), '[^A-Z0-9]', 'g') = regexp_replace(upper(coalesce(f."Placa",'')), '[^A-Z0-9]', 'g')
  AND (f."kminformado" IS NOT NULL)
RETURNING c."ContratoLocacao" AS contrato, c."PlacaPrincipal" AS placa, f."kminformado" AS novo_km;`;

    const upd3 = await client.query(updateKmSql);
    console.log('KM atualizados:', upd3.rowCount);
    fs.writeFileSync(path.join(backupDir, `updated_km_${safeTs}.json`), JSON.stringify(upd3.rows, null, 2));

      // Preencher DataCompra em contratos a partir de dim_frota quando disponível
      console.log('Preenchendo DataCompra em dim_contratos_locacao a partir de dim_frota...');
      const updateDataCompraSql = `
  UPDATE public.dim_contratos_locacao c
  SET "DataCompra" = f."DataCompra"
  FROM public.dim_frota f
  WHERE (COALESCE(c."DataCompra"::text,'') = '' OR c."DataCompra" IS NULL)
    AND regexp_replace(upper(coalesce(c."PlacaPrincipal",'')), '[^A-Z0-9]', 'g') = regexp_replace(upper(coalesce(f."Placa",'')), '[^A-Z0-9]', 'g')
    AND f."DataCompra" IS NOT NULL
  RETURNING c."ContratoLocacao" AS contrato, c."PlacaPrincipal" AS placa, f."DataCompra" AS novo_data_compra;`;

      const updDataCompra = await client.query(updateDataCompraSql);
      console.log('DataCompra atualizados:', updDataCompra.rowCount);
      fs.writeFileSync(path.join(backupDir, `updated_datacompra_${safeTs}.json`), JSON.stringify(updDataCompra.rows, null, 2));

      // Inferir DataFinal para contratos sem DataFinal/DataEncerramento usando média por TipoDeContrato
      console.log('Inferindo DataFinal para contratos sem data com base em média por TipoDeContrato...');
      const inferFinalSql = `
  WITH avg_durations AS (
    SELECT COALESCE("TipoDeContrato", 'Não Definido') AS tipo,
           ROUND(AVG(EXTRACT(EPOCH FROM ("DataFinal" - "DataInicial"))/86400))::int AS avg_days
    FROM public.dim_contratos_locacao
    WHERE "DataInicial" IS NOT NULL AND "DataFinal" IS NOT NULL
    GROUP BY 1
  )
  UPDATE public.dim_contratos_locacao c
  SET "DataFinal" = (c."DataInicial"::date + (a.avg_days || ' days')::interval)
  FROM avg_durations a
  WHERE (c."DataFinal" IS NULL AND c."DataEncerramento" IS NULL)
    AND c."DataInicial" IS NOT NULL
    AND COALESCE(c."TipoDeContrato", 'Não Definido') = a.tipo
  RETURNING c."ContratoLocacao" AS contrato, c."PlacaPrincipal" AS placa, c."DataInicial" AS data_inicio, c."DataFinal" AS novo_data_final, a.avg_days;
  `;

      const updInferFinal = await client.query(inferFinalSql);
      console.log('DataFinal inferidos:', updInferFinal.rowCount);
      fs.writeFileSync(path.join(backupDir, `inferred_datafinal_${safeTs}.json`), JSON.stringify(updInferFinal.rows, null, 2));

    // Atualizar dim_frota com ValorAtualFIPE a partir de contratos quando faltante
    console.log('Atualizando dim_frota com ValorAtualFIPE a partir de contratos quando faltante...');
    const updateFrotaFipeSql = `
UPDATE public.dim_frota f
SET "ValorAtualFIPE" = c."ValorAtualFIPE"
FROM public.dim_contratos_locacao c
WHERE (f."ValorAtualFIPE" IS NULL OR f."ValorAtualFIPE" = 0)
  AND regexp_replace(upper(coalesce(f."Placa",'')), '[^A-Z0-9]', 'g') = regexp_replace(upper(coalesce(c."PlacaPrincipal",'')), '[^A-Z0-9]', 'g')
  AND (c."ValorAtualFIPE" IS NOT NULL AND c."ValorAtualFIPE" <> 0)
RETURNING f."Placa" AS placa, f."Id" AS frota_id, c."ValorAtualFIPE" AS novo_valor_fipe;`;

    const upd4 = await client.query(updateFrotaFipeSql);
    console.log('dim_frota Valor FIPE atualizados:', upd4.rowCount);
    fs.writeFileSync(path.join(backupDir, `updated_frota_fipe_${safeTs}.json`), JSON.stringify(upd4.rows, null, 2));

    // Contagens depois
    const resCountsAfter = await client.query(countsSql);
    const after = resCountsAfter.rows[0];
    fs.writeFileSync(path.join(backupDir, `counts_after_${safeTs}.json`), JSON.stringify(after, null, 2));
    console.log('Contagens depois salvas em', path.join('tmp', `counts_after_${safeTs}.json`));
    console.log('Before:', before);
    console.log('After :', after);

    console.log('Operação concluída. Arquivos de log e amostras em tmp/');
  } catch (err) {
    console.error('Erro durante execução:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
