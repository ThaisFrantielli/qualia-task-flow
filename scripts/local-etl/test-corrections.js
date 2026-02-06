require('dotenv').config();
const sql = require('mssql');
const { performance } = require('perf_hooks');

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

async function testCorrections() {
    let pool;
    try {
        console.log('🔌 Conectando ao SQL Server DW...\n');
        pool = await sql.connect(sqlConfig);
        
        // 1. Testar contagem dim_frota SEM filtro de terceiro
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('TESTE 1: dim_frota - Todos os veículos (incluindo Terceiros)');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');
        
        const start1 = performance.now();
        const dimFrotaResult = await pool.request().query(`
            SELECT COUNT(*) as Total
            FROM Veiculos v WITH (NOLOCK)
        `);
        const end1 = performance.now();
        
        console.log(`✅ Total de veículos que DEVEM ser sincronizados: ${dimFrotaResult.recordset[0].Total}`);
        console.log(`⏱️  Tempo: ${(end1 - start1).toFixed(2)}ms\n`);
        
        // 2. Verificar "Em Mobilização"
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('TESTE 2: Veículos "Em Mobilização" - TODOS');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');
        
        const mobilResult = await pool.request().query(`
            SELECT 
                IdVeiculo,
                Placa,
                Modelo,
                FinalidadeUso,
                SituacaoVeiculo
            FROM Veiculos WITH (NOLOCK)
            WHERE SituacaoVeiculo = 'Em Mobilização'
            ORDER BY IdVeiculo
        `);
        
        console.log(`Total "Em Mobilização": ${mobilResult.recordset.length} veículos\n`);
        
        mobilResult.recordset.forEach((v, idx) => {
            const terceiro = v.FinalidadeUso === 'Terceiro' ? ' [TERCEIRO]' : '';
            console.log(`${idx + 1}. ID: ${v.IdVeiculo} | Placa: ${v.Placa || '(Null)'} | ${v.Modelo}${terceiro}`);
        });
        
        // 3. Testar performance do fat_carro_reserva
        console.log('\n═══════════════════════════════════════════════════════════════════════════');
        console.log('TESTE 3: Performance fat_carro_reserva (com NOLOCK)');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');
        
        const start3 = performance.now();
        const carroReservaResult = await pool.request().query(`
            SELECT COUNT(*) as Total
            FROM OcorrenciasVeiculoTemporario ovt WITH (NOLOCK)
        `);
        const end3 = performance.now();
        
        console.log(`✅ Total de ocorrências de carro reserva: ${carroReservaResult.recordset[0].Total}`);
        console.log(`⏱️  Tempo de contagem: ${(end3 - start3).toFixed(2)}ms\n`);
        
        // Teste de performance da query completa (limitado)
        console.log('Testando query completa (limitado a 100 registros)...\n');
        
        const start4 = performance.now();
        const carroReservaFullResult = await pool.request().query(`
            SELECT TOP 100
                ovt.IdOcorrencia,
                ovt.Placa,
                ovt.PlacaReserva,
                ovt.ModeloVeiculoReserva,
                ovt.SituacaoOcorrencia,
                cli.NomeFantasia as Cliente
            FROM OcorrenciasVeiculoTemporario ovt WITH (NOLOCK)
            LEFT JOIN ContratosLocacao cl WITH (NOLOCK) ON (ovt.IdContratoLocacao IS NOT NULL AND ovt.IdContratoLocacao = cl.IdContratoLocacao)
            LEFT JOIN ContratosComerciais cc WITH (NOLOCK) ON cl.IdContrato = cc.IdContratoComercial
            LEFT JOIN Clientes cli WITH (NOLOCK) ON cc.IdCliente = cli.IdCliente
        `);
        const end4 = performance.now();
        
        console.log(`✅ Query completa (100 registros) executada com sucesso`);
        console.log(`⏱️  Tempo: ${(end4 - start4).toFixed(2)}ms\n`);
        
        // Summary
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('RESUMO DOS TESTES');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');
        console.log(`✅ dim_frota: ${dimFrotaResult.recordset[0].Total} veículos (esperado: 5822)`);
        console.log(`✅ "Em Mobilização": ${mobilResult.recordset.length} veículos (esperado: 6)`);
        console.log(`✅ fat_carro_reserva: ${carroReservaResult.recordset[0].Total} ocorrências`);
        console.log(`✅ Query com JOINs: ${(end4 - start4).toFixed(2)}ms para 100 registros\n`);
        
        if (dimFrotaResult.recordset[0].Total === 5822) {
            console.log('🎉 CORREÇÃO BEM SUCEDIDA! Todos os veículos serão sincronizados.\n');
        } else {
            console.log(`⚠️  Atenção: Total diferente do esperado (5822)\n`);
        }
        
    } catch (err) {
        console.error('❌ Erro:', err.message);
        console.error(err);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

testCorrections();
