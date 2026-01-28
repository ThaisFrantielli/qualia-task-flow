require('dotenv').config();
const sql = require('mssql');

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || '200.219.192.34',
  port: parseInt(process.env.SQL_PORT || '3494', 10),
  database: process.env.SQL_DATABASE || 'blufleet-dw',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 0,
};

async function listCols(table) {
  const pool = await sql.connect(sqlConfig);
  try {
    const res = await pool.request().input('t', sql.VarChar(128), table)
      .query(`SELECT COLUMN_NAME, DATA_TYPE
              FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_NAME = @t
              ORDER BY ORDINAL_POSITION`);
    return res.recordset.map(r => r.COLUMN_NAME);
  } finally {
    await pool.close();
  }
}

(async function main() {
  const tables = process.argv.slice(2);
  if (tables.length === 0) {
    console.error('Usage: node print_dw_columns.js <TableName> [TableName...]');
    process.exit(2);
  }
  for (const t of tables) {
    const cols = await listCols(t);
    console.log(`\n${t} (${cols.length})`);
    console.log(cols.join(','));
  }
})().catch(e => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});
