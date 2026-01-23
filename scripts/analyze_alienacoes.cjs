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

async function analyzeAlienacoes() {
    try {
        const pool = await sql.connect(sqlConfig);

        console.log('\n📋 Estrutura da tabela Alienacoes...\n');
        const columnsResult = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Alienacoes'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('Colunas disponíveis:');
        columnsResult.recordset.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
        });

        console.log('\n📊 Amostra de dados (10 registros):\n');
        const sampleResult = await pool.request().query(`
            SELECT TOP 10 *
            FROM Alienacoes WITH (NOLOCK)
            ORDER BY DataEntrada DESC
        `);

        console.log(JSON.stringify(sampleResult.recordset, null, 2));

        console.log('\n📈 Estatísticas importantes:\n');
        const statsResult = await pool.request().query(`
            SELECT 
                COUNT(*) as TotalRegistros,
                COUNT(DISTINCT NumeroContrato) as TotalContratos,
                COUNT(DISTINCT Placa) as TotalVeiculos,
                SUM(CASE WHEN SaldoRemanescente > 0 THEN 1 ELSE 0 END) as ComSaldoRemanescente,
                SUM(CASE WHEN QuantidadeParcelasRemanescentes > 0 THEN 1 ELSE 0 END) as ComParcelasRemanescentes,
                AVG(CAST(SaldoRemanescente AS FLOAT)) as MediaSaldoRemanescente,
                AVG(CAST(ValorParcela AS FLOAT)) as MediaValorParcela,
                MAX(DataEntrada) as UltimaEntrada
            FROM Alienacoes WITH (NOLOCK)
        `);

        console.log(JSON.stringify(statsResult.recordset[0], null, 2));

        console.log('\n🔍 Contratos com saldo > 0:\n');
        const contratosSaldoResult = await pool.request().query(`
            SELECT TOP 20
                NumeroContrato,
                Instituicao,
                COUNT(*) as QtdVeiculos,
                SUM(CAST(ValorAlienado AS DECIMAL(15,2))) as TotalAlienado,
                SUM(CAST(ValorParcela AS DECIMAL(15,2))) as TotalParcela,
                SUM(CAST(SaldoRemanescente AS DECIMAL(15,2))) as TotalSaldoRemanescente,
                AVG(QuantidadeParcelas) as MediaParcelas,
                AVG(QuantidadeParcelasRemanescentes) as MediaParcelasRestantes
            FROM Alienacoes WITH (NOLOCK)
            WHERE SaldoRemanescente > 0
            GROUP BY NumeroContrato, Instituicao
            ORDER BY TotalSaldoRemanescente DESC
        `);

        console.log(JSON.stringify(contratosSaldoResult.recordset, null, 2));

        await pool.close();
    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

analyzeAlienacoes();
