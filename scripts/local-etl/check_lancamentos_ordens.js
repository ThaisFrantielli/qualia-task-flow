require('dotenv').config();
const sql = require('mssql');

const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER || '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE || 'blufleet-dw',
    connectionTimeout: 30000,
    requestTimeout: 30000,
    options: { encrypt: false, trustServerCertificate: true }
};

async function run() {
    const pool = await sql.connect(sqlConfig);

    console.log('\n📋 Colunas de Lancamentos:\n');
    const cols1 = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Lancamentos'
        ORDER BY ORDINAL_POSITION
    `);
    cols1.recordset.forEach(c=>console.log('  -', c.COLUMN_NAME, '(', c.DATA_TYPE, ')'));

    console.log('\n📊 Amostra Lancamentos (5 registros):\n');
    const samp1 = await pool.request().query(`SELECT TOP 5 * FROM Lancamentos ORDER BY DataCompetencia DESC`);
    console.log(JSON.stringify(samp1.recordset, null, 2));

    console.log('\n📋 Colunas de OrdensServico:\n');
    const cols2 = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'OrdensServico'
        ORDER BY ORDINAL_POSITION
    `);
    cols2.recordset.forEach(c=>console.log('  -', c.COLUMN_NAME, '(', c.DATA_TYPE, ')'));

    console.log('\n📊 Amostra OrdensServico (5 registros):\n');
    const samp2 = await pool.request().query(`SELECT TOP 5 * FROM OrdensServico ORDER BY DataAbertura DESC`);
    console.log(JSON.stringify(samp2.recordset, null, 2));

    await pool.close();
}

run().catch(e=>{ console.error('Erro:', e.message); process.exit(1)});
