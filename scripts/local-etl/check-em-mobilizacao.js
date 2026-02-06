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

async function checkEmMobilizacao() {
    let pool;
    try {
        console.log('🔌 Conectando ao SQL Server DW (ORIGEM)...\n');
        pool = await sql.connect(sqlConfig);
        
        // Todos os veículos "Em Mobilização"
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('VEÍCULOS COM SITUAÇÃO "Em Mobilização"');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');
        
        const result = await pool.request().query(`
            SELECT 
                IdVeiculo,
                Placa,
                Chassi,
                Modelo,
                SituacaoVeiculo,
                FinalidadeUso,
                DataAtualizacaoDados
            FROM Veiculos
            WHERE SituacaoVeiculo = 'Em Mobilização'
            ORDER BY IdVeiculo
        `);
        
        console.log(`Total encontrado: ${result.recordset.length} veículos\n`);
        
        result.recordset.forEach((v, idx) => {
            console.log(`${idx + 1}. ID: ${v.IdVeiculo}`);
            console.log(`   Placa: ${v.Placa || '(Null)'}`);
            console.log(`   Chassi: ${v.Chassi || '(Null)'}`);
            console.log(`   Modelo: ${v.Modelo || '(Null)'}`);
            console.log(`   Situação: ${v.SituacaoVeiculo}`);
            console.log(`   FinalidadeUso: ${v.FinalidadeUso || '(Null)'}`);
            console.log(`   DataAtualização: ${v.DataAtualizacaoDados}`);
            console.log('');
        });
        
        // Verificar se algum tem FinalidadeUso = 'Terceiro'
        const comTerceiro = result.recordset.filter(v => v.FinalidadeUso === 'Terceiro');
        const semTerceiro = result.recordset.filter(v => v.FinalidadeUso !== 'Terceiro');
        
        console.log('─────────────────────────────────────────────────────────────────────────');
        console.log(`Total "Em Mobilização": ${result.recordset.length}`);
        console.log(`  - Com FinalidadeUso='Terceiro': ${comTerceiro.length}`);
        console.log(`  - Sem FinalidadeUso='Terceiro': ${semTerceiro.length}`);
        console.log('─────────────────────────────────────────────────────────────────────────\n');
        
        // Comparar com o filtro aplicado no ETL
        const etlResult = await pool.request().query(`
            SELECT 
                IdVeiculo,
                Placa,
                Chassi,
                Modelo,
                SituacaoVeiculo,
                FinalidadeUso
            FROM Veiculos
            WHERE SituacaoVeiculo = 'Em Mobilização'
              AND COALESCE(FinalidadeUso, '') <> 'Terceiro'
            ORDER BY IdVeiculo
        `);
        
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('VEÍCULOS QUE SERÃO SINCRONIZADOS (sem Terceiro)');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');
        
        console.log(`Total que vai para o DW Destino: ${etlResult.recordset.length} veículos\n`);
        
        etlResult.recordset.forEach((v, idx) => {
            console.log(`${idx + 1}. ID: ${v.IdVeiculo} | Placa: ${v.Placa || '(Null)'} | Modelo: ${v.Modelo || '(Null)'}`);
        });
        
        console.log('\n✅ Análise concluída!\n');
        
    } catch (err) {
        console.error('❌ Erro:', err.message);
        console.error(err);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

checkEmMobilizacao();
