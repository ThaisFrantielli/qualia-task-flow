require('dotenv').config();
const sql = require('mssql');

const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER || '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE || 'blufleet-dw',
    options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 0
};

async function run() {
    const pool = await sql.connect(sqlConfig);
    console.log('Iniciando COUNT(*) em LancamentosComNaturezas (base)');
    const start = Date.now();
    const res = await pool.request().query(`SELECT COUNT(*) as cnt FROM LancamentosComNaturezas`);
    const duration = (Date.now() - start) / 1000;
    console.log('COUNT base result:', res.recordset[0].cnt, 'duration(s):', duration);
    await pool.close();
}

run().catch(e=>{ console.error('Erro:', e.message); process.exit(1)});
