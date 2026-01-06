
require('dotenv').config({ path: 'c:/Users/frant/Documents/qualia-task-flow/scripts/local-etl/.env' });
const sql = require('mssql');

const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE,
    options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 30000
};

async function checkAddresses() {
    try {
        await sql.connect(sqlConfig);
        const result = await sql.query(`
            SELECT TOP 50 
                ProvedorTelemetria,
                Latitude, 
                Longitude, 
                UltimoEnderecoTelemetria 
            FROM Veiculos 
            WHERE Latitude IS NOT NULL AND Latitude <> 0
        `);
        console.log(JSON.stringify(result.recordset, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

checkAddresses();
