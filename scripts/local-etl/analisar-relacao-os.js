/**
 * Análise da relação entre OcorrenciasManutencao e OrdensServico
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const sql = require('mssql');

const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: '200.219.192.34',
    port: 3494,
    database: 'blufleet-dw',
    connectionTimeout: 30000,
    requestTimeout: 120000,
    options: { encrypt: false, trustServerCertificate: true }
};

async function analyze() {
    try {
        console.log('🔌 Conectando ao SQL Server...\n');
        await sql.connect(sqlConfig);
        
        // 1. Contar total de OcorrenciasManutencao (últimos 2 anos)
        console.log('📊 1. Total de Ocorrências de Manutenção (2024-2026):');
        const occurrences = await sql.query(`
            SELECT COUNT(*) as Total
            FROM OcorrenciasManutencao WITH (NOLOCK)
            WHERE DataCriacao >= '2024-01-01'
            AND IdTipo IN (1, 2, 3)
        `);
        console.log(`   ✅ ${occurrences.recordset[0].Total.toLocaleString('pt-BR')} ocorrências\n`);
        
        // 2. Contar OrdensServico relacionadas
        console.log('📊 2. Ordens de Serviço relacionadas:');
        const orders = await sql.query(`
            SELECT COUNT(*) as Total
            FROM OrdensServico os WITH (NOLOCK)
            INNER JOIN OcorrenciasManutencao om WITH (NOLOCK) ON os.IdOcorrencia = om.IdOcorrencia
            WHERE om.DataCriacao >= '2024-01-01'
            AND om.IdTipo IN (1, 2, 3)
        `);
        console.log(`   ✅ ${orders.recordset[0].Total.toLocaleString('pt-BR')} ordens de serviço\n`);
        
        // 3. Verificar ocorrências com múltiplas OS
        console.log('📊 3. Ocorrências com múltiplas Ordens de Serviço:');
        const multipleOS = await sql.query(`
            SELECT 
                COUNT(DISTINCT om.IdOcorrencia) as OcorrenciasComOS,
                COUNT(*) as TotalOS,
                COUNT(*) - COUNT(DISTINCT om.IdOcorrencia) as OSAdicionais
            FROM OrdensServico os WITH (NOLOCK)
            INNER JOIN OcorrenciasManutencao om WITH (NOLOCK) ON os.IdOcorrencia = om.IdOcorrencia
            WHERE om.DataCriacao >= '2024-01-01'
            AND om.IdTipo IN (1, 2, 3)
        `);
        const multi = multipleOS.recordset[0];
        console.log(`   - Ocorrências com OS: ${multi.OcorrenciasComOS.toLocaleString('pt-BR')}`);
        console.log(`   - Total de OS: ${multi.TotalOS.toLocaleString('pt-BR')}`);
        console.log(`   - OS Adicionais (duplicadas): ${multi.OSAdicionais.toLocaleString('pt-BR')}\n`);
        
        // 4. Amostra de ocorrência com múltiplas OS
        console.log('📊 4. Exemplo de Ocorrência com múltiplas OS:');
        const sample = await sql.query(`
            SELECT TOP 1 om.IdOcorrencia, om.Ocorrencia, om.Placa, om.Tipo
            FROM OcorrenciasManutencao om WITH (NOLOCK)
            WHERE om.DataCriacao >= '2024-01-01'
            AND om.IdTipo IN (1, 2)
            AND EXISTS (
                SELECT 1 FROM OrdensServico os 
                WHERE os.IdOcorrencia = om.IdOcorrencia 
                GROUP BY os.IdOcorrencia 
                HAVING COUNT(*) > 1
            )
        `);
        
        if (sample.recordset.length > 0) {
            const occ = sample.recordset[0];
            console.log(`   Ocorrência: ${occ.Ocorrencia} (${occ.Placa}) - ${occ.Tipo}`);
            
            const osDetails = await sql.query(`
                SELECT 
                    IdOrdemServico,
                    OrdemServico,
                    SituacaoOrdemServico,
                    Fornecedor,
                    ValorTotal,
                    ValorNaoReembolsavel,
                    ValorReembolsavel,
                    Categoria
                FROM OrdensServico WITH (NOLOCK)
                WHERE IdOcorrencia = ${occ.IdOcorrencia}
                ORDER BY IdOrdemServico
            `);
            
            console.log(`   Ordens de Serviço (${osDetails.recordset.length}):`);
            osDetails.recordset.forEach((os, i) => {
                console.log(`\n   ${i+1}. ${os.OrdemServico} - ${os.SituacaoOrdemServico}`);
                console.log(`      Fornecedor: ${os.Fornecedor || 'N/A'}`);
                console.log(`      Categoria: ${os.Categoria || 'N/A'}`);
                console.log(`      Valor Total: R$ ${(os.ValorTotal || 0).toFixed(2)}`);
                console.log(`      Não Reembolsável: R$ ${(os.ValorNaoReembolsavel || 0).toFixed(2)}`);
                console.log(`      Reembolsável: R$ ${(os.ValorReembolsavel || 0).toFixed(2)}`);
            });
        }
        
        // 5. Estatísticas de valores
        console.log('\n\n📊 5. Estatísticas de Valores nas OS:');
        const valueStats = await sql.query(`
            SELECT 
                COUNT(*) as TotalOS,
                COUNT(CASE WHEN ValorTotal > 0 THEN 1 END) as OSComValor,
                SUM(ValorTotal) as SomaTotal,
                AVG(ValorTotal) as MediaValor
            FROM OrdensServico os WITH (NOLOCK)
            INNER JOIN OcorrenciasManutencao om WITH (NOLOCK) ON os.IdOcorrencia = om.IdOcorrencia
            WHERE om.DataCriacao >= '2024-01-01'
            AND om.IdTipo IN (1, 2, 3)
        `);
        const stats = valueStats.recordset[0];
        console.log(`   - Total de OS: ${stats.TotalOS.toLocaleString('pt-BR')}`);
        console.log(`   - OS com valor > 0: ${stats.OSComValor.toLocaleString('pt-BR')}`);
        console.log(`   - Soma total: R$ ${(stats.SomaTotal || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
        console.log(`   - Valor médio: R$ ${(stats.MediaValor || 0).toFixed(2)}`);
        
        await sql.close();
        console.log('\n✅ Análise concluída!');
        
    } catch (err) {
        console.error('❌ ERRO:', err.message);
        process.exit(1);
    }
}

analyze();
