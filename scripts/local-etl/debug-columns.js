
require('dotenv').config({ path: 'c:/Users/frant/Documents/qualia-task-flow/scripts/local-etl/.env' });
const sql = require('mssql');

const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE,
    connectionTimeout: 30000,
    requestTimeout: 30000,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function listColumns() {
    try {
        await sql.connect(sqlConfig);
        console.log('Connected to SQL Server');
        
        const result = await sql.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Veiculos'
            ORDER BY COLUMN_NAME
        `);
        
        console.log('Columns in Veiculos table:');
        result.recordset.forEach(row => console.log(row.COLUMN_NAME));
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

listColumns();
