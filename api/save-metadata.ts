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
    const { id_referencia, estrategia, valor_aquisicao_zero, observacoes } = body || {};

    if (!id_referencia || typeof id_referencia !== 'string') {
      return res.status(400).json({ error: 'Missing id_referencia (string)' });
    }

    const client = await pool.connect();
    try {
      const q = `
        INSERT INTO public.dim_contratos_metadata (id_referencia, estrategia, valor_aquisicao_zero, observacoes, updated_at)
        VALUES ($1, $2, $3, $4, now())
        ON CONFLICT (id_referencia) DO UPDATE SET
          estrategia = EXCLUDED.estrategia,
          valor_aquisicao_zero = EXCLUDED.valor_aquisicao_zero,
          observacoes = EXCLUDED.observacoes,
          updated_at = now()
        RETURNING *;
      `;

      const vals = [id_referencia, estrategia ?? null, valor_aquisicao_zero === true, observacoes ?? null];
      const result = await client.query(q, vals);
      return res.status(200).json({ success: true, updated: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[save-metadata] Error:', message);
    return res.status(500).json({ error: 'Internal error', details: message });
  }
}
