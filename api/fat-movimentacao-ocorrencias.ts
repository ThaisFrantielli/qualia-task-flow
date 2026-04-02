import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// PostgreSQL connection (reuse same env vars pattern as other API handlers)
const pool = new Pool({
  host: process.env.HEAVY_PG_POOLER_HOST || process.env.HEAVY_PG_HOST || process.env.PG_HOST || 'db.qcptedntbdsvqplrrqpi.supabase.co',
  port: parseInt(process.env.HEAVY_PG_POOLER_PORT || process.env.HEAVY_PG_PORT || process.env.PG_PORT || '5432'),
  user: process.env.HEAVY_PG_POOLER_USER || process.env.HEAVY_PG_USER || process.env.PG_USER || 'postgres',
  password: process.env.HEAVY_PG_PASSWORD || process.env.PG_PASSWORD || '',
  database: process.env.HEAVY_PG_DATABASE || process.env.PG_DATABASE || 'postgres',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 7000,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const limit = Math.min(100000, Number(req.query.limit || 50000));
    // Simple, safe query: return rows from fat_movimentacao_ocorrencias limited by `limit`.
    // Consumer can filter/join client-side or request a smaller slice for inspection.
    const sql = `SELECT * FROM fat_movimentacao_ocorrencias LIMIT $1`;
    const result = await pool.query(sql, [limit]);
    res.status(200).json({ count: result.rowCount, data: result.rows });
  } catch (err: any) {
    console.error('fat-movimentacao-ocorrencias error', err);
    res.status(500).json({ error: String(err?.message ?? err) });
  }
}
