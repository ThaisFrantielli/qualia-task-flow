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

async function checkDuplicates() {
    try {
        const pool = await sql.connect(sqlConfig);

        console.log('\n🔍 Verificando duplicatas de IdAlienacao...\n');

        const countResult = await pool.request().query(`
            SELECT COUNT(*) as Total, COUNT(DISTINCT IdAlienacao) as DistinctIDs
            FROM Alienacoes WITH (NOLOCK)
        `);
        console.log('Total de linhas:', countResult.recordset[0].Total);
        console.log('IDs Distintos:', countResult.recordset[0].DistinctIDs);

        if (countResult.recordset[0].Total > countResult.recordset[0].DistinctIDs) {
            const dupResult = await pool.request().query(`
                SELECT TOP 5 IdAlienacao, COUNT(*) as Qtd
                FROM Alienacoes WITH (NOLOCK)
                GROUP BY IdAlienacao
                HAVING COUNT(*) > 1
            `);
            console.log('\nExemplos de duplicatas:');
            console.log(JSON.stringify(dupResult.recordset, null, 2));
        } else {
            console.log('✅ IdAlienacao é único na origem.');
        }

        await pool.close();
    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

checkDuplicates();
