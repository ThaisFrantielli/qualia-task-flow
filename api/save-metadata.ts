import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.ORACLE_PG_HOST || '137.131.163.167',
  port: parseInt(process.env.ORACLE_PG_PORT || '5432'),
  user: process.env.ORACLE_PG_USER || 'postgres',
  password: process.env.ORACLE_PG_PASSWORD || '',
  database: process.env.ORACLE_PG_DATABASE || 'bluconecta_dw',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: false,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    let { id_referencia, estrategia, acao_usuario, valor_aquisicao, observacoes, modelo_aquisicao } = body || {};
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
    observacoes = typeof observacoes === 'string' ? observacoes.trim() : observacoes;
    console.debug('[save-metadata] incoming payload', { id_referencia, estrategia, acao_usuario, valor_aquisicao, modelo_aquisicao });

    if (!id_referencia || typeof id_referencia !== 'string') {
      return res.status(400).json({ error: 'Missing id_referencia (string)' });
    }

    const client = await pool.connect();
    try {
      const start = Date.now();

      // Normalize incoming id for lookup (remove non-alphanumerics and uppercase)
      const norm = String(id_referencia).toUpperCase().replace(/[^A-Z0-9]/g, '');

      // Try to find an existing row whose normalized id_referencia matches
      const findQ = `SELECT id_referencia FROM public.dim_contratos_metadata WHERE regexp_replace(UPPER(TRIM(id_referencia::text)), '[^A-Z0-9]', '', 'g') = $1 LIMIT 1`;
      const found = await client.query(findQ, [norm]);

      if (found && found.rows && found.rows.length > 0) {
        // Update the canonical existing id_referencia row
        const existingId = found.rows[0].id_referencia;
        const uQ = `
          UPDATE public.dim_contratos_metadata SET
            acao_usuario = COALESCE($2, acao_usuario),
            estrategia = COALESCE($3, estrategia),
            modelo_aquisicao = COALESCE($4, modelo_aquisicao),
            valor_aquisicao = COALESCE($5, valor_aquisicao),
            observacoes = COALESCE($6, observacoes),
            atualizado_em = CURRENT_TIMESTAMP
          WHERE id_referencia = $1
          RETURNING *;
        `;
        const uVals = [
          existingId,
          acao_usuario ?? null,
          estrategia ?? null,
          modelo_aquisicao ?? null,
          (typeof valor_aquisicao === 'number') ? valor_aquisicao : (valor_aquisicao ? Number(valor_aquisicao) : null),
          observacoes ?? null,
        ];
        const result = await client.query(uQ, uVals);
        const dur = Date.now() - start;
        console.debug('[save-metadata] query finished (update existing)', { duration_ms: dur, rows: result.rowCount });
        return res.status(200).json({ success: true, updated: result.rows[0], duration_ms: dur });
      }

      // No matching normalized row — insert new
      const q = `
        INSERT INTO public.dim_contratos_metadata (id_referencia, acao_usuario, estrategia, modelo_aquisicao, valor_aquisicao, observacoes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;

      const vals = [
        id_referencia,
        acao_usuario ?? null,
        estrategia ?? null,
        modelo_aquisicao ?? null,
        (typeof valor_aquisicao === 'number') ? valor_aquisicao : (valor_aquisicao ? Number(valor_aquisicao) : null),
        observacoes ?? null,
      ];

      const result = await client.query(q, vals);
      const dur = Date.now() - start;
      console.debug('[save-metadata] query finished (insert)', { duration_ms: dur, rows: result.rowCount });
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
