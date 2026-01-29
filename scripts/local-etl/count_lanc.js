require('dotenv').config();
const sql = require('mssql');

(async () => {
  try {
    const config = {
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      server: process.env.SQL_SERVER || '200.219.192.34',
      port: parseInt(process.env.SQL_PORT || '3494'),
      database: process.env.SQL_DATABASE || 'blufleet-dw',
      options: { encrypt: false, trustServerCertificate: true },
      requestTimeout: 0
    };

    await sql.connect(config);
    const res = await sql.query('SELECT COUNT(*) as cnt FROM LancamentosComNaturezas');
    console.log('origin_count', res.recordset[0].cnt);
    await sql.close();
  } catch (e) {
    console.error('erro', e.message);
    process.exit(1);
  }
})();
