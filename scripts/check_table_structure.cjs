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

async function checkTableStructure() {
    try {
        const pool = await sql.connect(sqlConfig);

        // Verificar colunas da tabela LancamentosComNaturezas
        console.log('\n📋 Verificando estrutura de LancamentosComNaturezas...\n');
        const columnsResult = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'LancamentosComNaturezas'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('Colunas disponíveis:');
        columnsResult.recordset.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
        });

        // Pegar amostra de dados
        console.log('\n📊 Amostra de dados (5 registros):\n');
        const sampleResult = await pool.request().query(`
            SELECT TOP 5 *
            FROM LancamentosComNaturezas
            WHERE ValorPagoRecebido IS NOT NULL
            ORDER BY DataCompetencia DESC
        `);

        console.log(JSON.stringify(sampleResult.recordset, null, 2));

        await pool.close();
    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

checkTableStructure();
