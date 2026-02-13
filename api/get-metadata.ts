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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const id = typeof req.query.id === 'string' ? req.query.id : String(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'Missing id query parameter' });

  try {
    const client = await pool.connect();
    try {
      // Normalize id for lookup (remove non-alphanumerics and uppercase)
      const norm = id.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const q = `SELECT * FROM public.dim_contratos_metadata WHERE regexp_replace(UPPER(TRIM(id_referencia::text)), '[^A-Z0-9]', '', 'g') = $1 LIMIT 1`;
      const r = await client.query(q, [norm]);
      if (!r.rows || r.rows.length === 0) return res.status(200).json({ found: false });
      return res.status(200).json({ found: true, row: r.rows[0] });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[get-metadata] Error:', message);
    return res.status(500).json({ error: 'Internal error', details: message });
  }
}
