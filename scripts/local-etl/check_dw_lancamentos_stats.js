require('dotenv').config();
const sql = require('mssql');

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || '200.219.192.34',
  port: parseInt(process.env.SQL_PORT || '3494', 10),
  database: process.env.SQL_DATABASE || 'blufleet-dw',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 0
};

(async function main() {
  const pool = await sql.connect(sqlConfig);
  try {
    const q = `SELECT
      COUNT(*) AS total,
      MIN(DataCompetencia) AS min_data,
      MAX(DataCompetencia) AS max_data,
      COUNT(DISTINCT FORMAT(DataCompetencia,'yyyy-MM')) AS meses
    FROM LancamentosComNaturezas WITH (NOLOCK, INDEX(0));`;
    const res = await pool.request().query(q);
    console.log(res.recordset[0]);

    const q2 = `SELECT TOP 12 FORMAT(DataCompetencia,'yyyy-MM') AS mes, COUNT(*) AS cnt
               FROM LancamentosComNaturezas WITH (NOLOCK, INDEX(0))
               GROUP BY FORMAT(DataCompetencia,'yyyy-MM')
               ORDER BY mes DESC;`;
    const res2 = await pool.request().query(q2);
    console.log('Ultimos 12 meses (rows):');
    res2.recordset.forEach(r => console.log(`${r.mes}: ${r.cnt}`));
  } finally {
    await pool.close();
  }
})().catch(e => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});
