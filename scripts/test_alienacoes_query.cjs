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

async function testQuery() {
    try {
        const pool = await sql.connect(sqlConfig);

        console.log('\n🔍 Testando query simplificada...\n');

        // Query simples para contar
        const countResult = await pool.request().query(`
            SELECT COUNT(*) as Total FROM Alienacoes WITH (NOLOCK)
        `);
        console.log('Total na tabela Alienacoes:', countResult.recordset[0].Total);

        // Query do ETL atual (simplificada)
        const etlResult = await pool.request().query(`
            SELECT COUNT(*) as Total
            FROM Alienacoes av WITH (NOLOCK)
        `);
        console.log('Total com query ETL:', etlResult.recordset[0].Total);

        // Verificar se existem registros sem Placa
        const semPlacaResult = await pool.request().query(`
            SELECT COUNT(*) as Total FROM Alienacoes WHERE Placa IS NULL OR Placa = ''
        `);
        console.log('Registros sem Placa:', semPlacaResult.recordset[0].Total);

        // Verificar se é VIEW ou TABLE
        const typeResult = await pool.request().query(`
            SELECT TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Alienacoes'
        `);
        console.log('Tipo de objeto:', typeResult.recordset[0]?.TABLE_TYPE);

        await pool.close();
    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

testQuery();
