import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.ORACLE_PG_POOLER_HOST || process.env.PG_POOLER_HOST || process.env.ORACLE_PG_HOST || 'db.qcptedntbdsvqplrrqpi.supabase.co',
  port: parseInt(process.env.ORACLE_PG_POOLER_PORT || process.env.PG_POOLER_PORT || process.env.ORACLE_PG_PORT || '5432'),
  user: process.env.ORACLE_PG_POOLER_USER || process.env.PG_POOLER_USER || process.env.ORACLE_PG_USER || 'postgres',
  password: process.env.ORACLE_PG_PASSWORD || process.env.PG_PASSWORD || '',
  database: process.env.ORACLE_PG_DATABASE || process.env.PG_DATABASE || 'postgres',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    let { id_referencia, contrato_comercial, estrategia, acao_usuario, valor_aquisicao, observacoes, modelo_aquisicao } = body || {};
    const norm = (v: any) => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'string') {
        const s = v.trim();
        if (!s || s.toLowerCase() === 'undefined') return null;
        return s;
      }
      return v;
    };
    estrategia = norm(estrategia);
    acao_usuario = norm(acao_usuario);
    modelo_aquisicao = norm(modelo_aquisicao);
    contrato_comercial = norm(contrato_comercial);
    observacoes = typeof observacoes === 'string' ? observacoes.trim() : observacoes;
    const parseNumericVal = (v: any) =>
      typeof v === 'number' ? v : (v ? Number(String(v).replace(/[^0-9,\.]/g, '').replace(/\./g, '').replace(/,/, '.')) : null);
    const valorAquisicaoNum = parseNumericVal(valor_aquisicao);
    console.debug('[save-metadata] payload recebido', { id_referencia, contrato_comercial, estrategia, acao_usuario, valor_aquisicao: valorAquisicaoNum, modelo_aquisicao });

    if (!id_referencia || typeof id_referencia !== 'string') {
      return res.status(400).json({ error: 'Missing id_referencia (string)' });
    }

    const client = await pool.connect();
    try {
      const start = Date.now();

      // id_referencia usa ContratoLocacao (ex: "LOC-2407-74/30") — match exato case-insensitive
      const normalizedId = String(id_referencia).trim().toUpperCase();

      // Busca exata por id_referencia (case-insensitive)
      const findQ = `SELECT id_referencia FROM public.dim_contratos_metadata WHERE UPPER(TRIM(id_referencia::text)) = $1 LIMIT 1`;
      const found = await client.query(findQ, [normalizedId]);

      if (found && found.rows && found.rows.length > 0) {
        // Update the canonical existing id_referencia row
        // Use explicit value when provided (not null), otherwise keep existing via COALESCE
        const existingId = found.rows[0].id_referencia;
        const uQ = `
          UPDATE public.dim_contratos_metadata SET
            contrato_comercial = COALESCE($2, contrato_comercial),
            acao_usuario       = CASE WHEN $3::text IS NOT NULL THEN $3::text ELSE acao_usuario END,
            estrategia         = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE estrategia END,
            modelo_aquisicao   = CASE WHEN $5::text IS NOT NULL THEN $5::text ELSE modelo_aquisicao END,
            valor_aquisicao    = CASE WHEN $6::numeric IS NOT NULL THEN $6::numeric ELSE valor_aquisicao END,
            observacoes        = CASE WHEN $7::text IS NOT NULL THEN $7::text ELSE observacoes END,
            atualizado_em      = CURRENT_TIMESTAMP
          WHERE id_referencia = $1
          RETURNING *;
        `;
        const uVals = [
          existingId,
          contrato_comercial ?? null,
          acao_usuario ?? null,
          estrategia ?? null,
          modelo_aquisicao ?? null,
          valorAquisicaoNum,
          observacoes ?? null,
        ];
        const result = await client.query(uQ, uVals);
        const dur = Date.now() - start;
        console.debug('[save-metadata] query finished (update existing)', { duration_ms: dur, rows: result.rowCount, id: existingId });
        return res.status(200).json({ success: true, updated: result.rows[0], duration_ms: dur, op: 'update' });
      }

      // No matching normalized row — insert new (upsert via ON CONFLICT to avoid race conditions)
      const q = `
        INSERT INTO public.dim_contratos_metadata
          (id_referencia, contrato_comercial, acao_usuario, estrategia, modelo_aquisicao, valor_aquisicao, observacoes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id_referencia) DO UPDATE SET
          contrato_comercial = COALESCE(EXCLUDED.contrato_comercial, dim_contratos_metadata.contrato_comercial),
          acao_usuario       = COALESCE(EXCLUDED.acao_usuario,       dim_contratos_metadata.acao_usuario),
          estrategia         = COALESCE(EXCLUDED.estrategia,         dim_contratos_metadata.estrategia),
          modelo_aquisicao   = COALESCE(EXCLUDED.modelo_aquisicao,   dim_contratos_metadata.modelo_aquisicao),
          valor_aquisicao    = COALESCE(EXCLUDED.valor_aquisicao,    dim_contratos_metadata.valor_aquisicao),
          observacoes        = COALESCE(EXCLUDED.observacoes,        dim_contratos_metadata.observacoes),
          atualizado_em      = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const vals = [
        id_referencia,
        contrato_comercial ?? null,
        acao_usuario ?? null,
        estrategia ?? null,
        modelo_aquisicao ?? null,
        valorAquisicaoNum,
        observacoes ?? null,
      ];

      const result = await client.query(q, vals);
      const dur = Date.now() - start;
      console.debug('[save-metadata] query finished (insert/upsert)', { duration_ms: dur, rows: result.rowCount });
      if (!result || !result.rows || result.rows.length === 0) {
        return res.status(200).json({ success: true, updated: null, note: 'no rows returned' });
      }

      return res.status(200).json({ success: true, updated: result.rows[0], duration_ms: dur });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[save-metadata] Error:', message);
    return res.status(500).json({ error: 'Internal error', details: message });
  }
}
