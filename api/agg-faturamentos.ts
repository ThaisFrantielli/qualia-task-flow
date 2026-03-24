import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PG_POOLER_HOST || 'localhost',
  port: parseInt(process.env.PG_POOLER_PORT || '5432'),
  user: process.env.PG_POOLER_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  database: process.env.PG_DATABASE || 'postgres',
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const year = String(req.query.year || '').slice(0,4) || null;
    if (!year) return res.status(400).json({ error: 'year query param required, e.g. ?year=2026' });

    // Aggregation: SUM by YYYY-MM (DataCompetencia left 7) and by TipoFaturamento (fallbacks)
    const sql = `
      SELECT LEFT("DataCompetencia",7) AS ym,
             COALESCE(NULLIF("TipoFaturamento",''), NULLIF("TipoNota",''), NULLIF("Tipo",''), NULLIF("Natureza",''), 'Outros') AS tipo,
             SUM(
               CASE
                 WHEN lower(COALESCE(NULLIF("TipoFaturamento",''), NULLIF("TipoNota",''), '')) LIKE '%loca%' THEN COALESCE("ValorLocacao",0)
                 WHEN lower(COALESCE(NULLIF("TipoFaturamento",''), NULLIF("TipoNota",''), '')) LIKE '%reemb%' THEN COALESCE("ValorReembolsaveis",0)
                 WHEN lower(COALESCE(NULLIF("TipoFaturamento",''), NULLIF("TipoNota",''), '')) LIKE '%multa%' THEN COALESCE("ValorMultas",0)
                 ELSE COALESCE("ValorTotal",0)
               END
             ) AS total
      FROM public."fat_faturamentos"
      WHERE LEFT("DataCompetencia",4) = $1
        AND NOT (
          lower(COALESCE("SituacaoNota"::text, '')) LIKE '%cancel%'
          OR lower(COALESCE("Situacao"::text, '')) LIKE '%cancel%'
          OR lower(COALESCE("Status"::text, '')) LIKE '%cancel%'
          OR lower(COALESCE("SituacaoFaturamento"::text, '')) LIKE '%cancel%'
        )
      GROUP BY ym, tipo
      ORDER BY tipo, ym;
    `;

    const client = await pool.connect();
    try {
      const r = await client.query(sql, [year]);
      return res.status(200).json({ year, rows: r.rows });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('agg-faturamentos error', err);
    return res.status(500).json({ error: String(err) });
  }
}
