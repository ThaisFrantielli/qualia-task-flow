require('dotenv').config();
const sql = require('mssql');

// SQL Server (ORIGEM)
const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER || '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE || 'blufleet-dw',
    connectionTimeout: 180000,
    requestTimeout: 720000,
    pool: {
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000
    },
    options: { encrypt: false, trustServerCertificate: true }
};

async function checkVeiculosDiff() {
    let pool;
    try {
        console.log('🔌 Conectando ao SQL Server DW...');
        pool = await sql.connect(sqlConfig);
        
        // Total de veículos
        const totalResult = await pool.request().query(`
            SELECT COUNT(*) as Total FROM Veiculos
        `);
        const total = totalResult.recordset[0].Total;
        console.log(`\n📊 Total de Veículos no DW Origem: ${total}`);
        
        // Veículos com FinalidadeUso = 'Terceiro'
        const terceiroResult = await pool.request().query(`
            SELECT 
                COUNT(*) as Total,
                STRING_AGG(Placa, ', ') as Placas
            FROM Veiculos 
            WHERE FinalidadeUso = 'Terceiro'
        `);
        const totalTerceiro = terceiroResult.recordset[0].Total;
        const placasTerceiro = terceiroResult.recordset[0].Placas;
        
        console.log(`\n🚫 Veículos com FinalidadeUso = 'Terceiro': ${totalTerceiro}`);
        if (placasTerceiro) {
            console.log(`   Placas: ${placasTerceiro}`);
        }
        
        // Veículos com FinalidadeUso nulo
        const nuloResult = await pool.request().query(`
            SELECT 
                COUNT(*) as Total,
                STRING_AGG(Placa, ', ') as Placas
            FROM Veiculos 
            WHERE FinalidadeUso IS NULL
        `);
        const totalNulo = nuloResult.recordset[0].Total;
        const placasNulo = nuloResult.recordset[0].Placas;
        
        console.log(`\n❓ Veículos com FinalidadeUso = NULL: ${totalNulo}`);
        if (placasNulo) {
            console.log(`   Placas: ${placasNulo}`);
        }
        
        // Veículos que SERÃO sincronizados (sem 'Terceiro')
        const sincronizadosResult = await pool.request().query(`
            SELECT COUNT(*) as Total
            FROM Veiculos 
            WHERE COALESCE(FinalidadeUso, '') <> 'Terceiro'
        `);
        const totalSincronizados = sincronizadosResult.recordset[0].Total;
        
        console.log(`\n✅ Veículos que DEVEM ser sincronizados (sem 'Terceiro'): ${totalSincronizados}`);
        
        // Distribuição por FinalidadeUso
        const distribuicaoResult = await pool.request().query(`
            SELECT 
                ISNULL(FinalidadeUso, 'NULL') as FinalidadeUso,
                COUNT(*) as Quantidade
            FROM Veiculos
            GROUP BY FinalidadeUso
            ORDER BY Quantidade DESC
        `);
        
        console.log(`\n📈 Distribuição por FinalidadeUso:`);
        distribuicaoResult.recordset.forEach(row => {
            console.log(`   ${row.FinalidadeUso}: ${row.Quantidade} veículos`);
        });
        
        console.log(`\n🧮 Resumo:`);
        console.log(`   Total no DW Origem: ${total}`);
        console.log(`   Veículos 'Terceiro': ${totalTerceiro}`);
        console.log(`   Esperado no Destino: ${totalSincronizados}`);
        console.log(`   Atualmente no Destino: 5783`);
        console.log(`   Diferença: ${totalSincronizados - 5783}`);
        
    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

checkVeiculosDiff();
