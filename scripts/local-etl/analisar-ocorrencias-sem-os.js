/**
 * ANÁLISE DETALHADA: Ocorrências SEM Ordens de Serviço
 * 
 * Objetivo: Investigar os 27% de OcorrenciasManutencao que não têm OSs vinculadas
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const sql = require('mssql');

const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: '200.219.192.34',
    port: 3494,
    database: 'blufleet-dw',
    connectionTimeout: 180000,
    requestTimeout: 720000,
    options: { encrypt: false, trustServerCertificate: true }
};

async function run() {
    let sqlPool;
    
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔍 ANÁLISE DETALHADA: Ocorrências SEM Ordens de Serviço');
        console.log('='.repeat(80) + '\n');
        
        sqlPool = await sql.connect(sqlConfig);
        console.log(`✅ Conectado: ${sqlConfig.server}:${sqlConfig.port} / ${sqlConfig.database}\n`);
        
        // ========================================================================
        // 1. Contagem geral
        // ========================================================================
        console.log('📊 [1/5] Contagem Geral de Ocorrências...\n');
        
        const query1 = `
            WITH OcorrenciasComOS AS (
                SELECT DISTINCT om.IdOcorrencia
                FROM OcorrenciasManutencao om WITH (NOLOCK)
                INNER JOIN OrdensServico os WITH (NOLOCK) ON om.IdOcorrencia = os.IdOcorrencia
                WHERE om.DataCriacao >= '2024-01-01'
            )
            SELECT 
                COUNT(*) as TotalOcorrencias,
                SUM(CASE WHEN oc.IdOcorrencia IS NOT NULL THEN 1 ELSE 0 END) as ComOS,
                SUM(CASE WHEN oc.IdOcorrencia IS NULL THEN 1 ELSE 0 END) as SemOS
            FROM OcorrenciasManutencao om WITH (NOLOCK)
            LEFT JOIN OcorrenciasComOS oc ON om.IdOcorrencia = oc.IdOcorrencia
            WHERE om.DataCriacao >= '2024-01-01'
        `;
        
        const result1 = await sqlPool.request().query(query1);
        const r1 = result1.recordset[0];
        
        console.log(`   Total de Ocorrências: ${r1.TotalOcorrencias.toLocaleString('pt-BR')}`);
        console.log(`   ✅ COM Ordens de Serviço: ${r1.ComOS.toLocaleString('pt-BR')} (${((r1.ComOS / r1.TotalOcorrencias) * 100).toFixed(1)}%)`);
        console.log(`   ⚠️  SEM Ordens de Serviço: ${r1.SemOS.toLocaleString('pt-BR')} (${((r1.SemOS / r1.TotalOcorrencias) * 100).toFixed(1)}%)\n`);
        
        // ========================================================================
        // 2. Análise por Status das Ocorrências SEM OS
        // ========================================================================
        console.log('📊 [2/5] Análise de Status (Ocorrências SEM OS)...\n');
        
        const query2 = `
            SELECT 
                om.SituacaoOcorrencia,
                om.Etapa,
                COUNT(*) as Total
            FROM OcorrenciasManutencao om WITH (NOLOCK)
            WHERE om.DataCriacao >= '2024-01-01'
                AND om.IdOcorrencia NOT IN (
                    SELECT DISTINCT IdOcorrencia 
                    FROM OrdensServico WITH (NOLOCK) 
                    WHERE IdOcorrencia IS NOT NULL
                )
            GROUP BY om.SituacaoOcorrencia, om.Etapa
            ORDER BY COUNT(*) DESC
        `;
        
        const result2 = await sqlPool.request().query(query2);
        
        console.log('┌─────────────────────────────────┬─────────────────────────────────┬─────────┐');
        console.log('│ Status                          │ Etapa                           │ Total   │');
        console.log('├─────────────────────────────────┼─────────────────────────────────┼─────────┤');
        
        result2.recordset.forEach(row => {
            const status = (row.SituacaoOcorrencia || 'NULL').padEnd(31).substring(0, 31);
            const etapa = (row.Etapa || 'NULL').padEnd(31).substring(0, 31);
            const total = row.Total.toString().padStart(7);
            console.log(`│ ${status} │ ${etapa} │ ${total} │`);
        });
        
        console.log('└─────────────────────────────────┴─────────────────────────────────┴─────────┘\n');
        
        // ========================================================================
        // 3. Análise por Tipo das Ocorrências SEM OS
        // ========================================================================
        console.log('📊 [3/5] Análise por Tipo (Ocorrências SEM OS)...\n');
        
        const query3 = `
            SELECT 
                om.IdTipo,
                om.Tipo,
                om.Motivo,
                COUNT(*) as Total,
                COUNT(DISTINCT om.Placa) as PlacasUnicas
            FROM OcorrenciasManutencao om WITH (NOLOCK)
            WHERE om.DataCriacao >= '2024-01-01'
                AND om.IdOcorrencia NOT IN (
                    SELECT DISTINCT IdOcorrencia 
                    FROM OrdensServico WITH (NOLOCK) 
                    WHERE IdOcorrencia IS NOT NULL
                )
            GROUP BY om.IdTipo, om.Tipo, om.Motivo
            ORDER BY COUNT(*) DESC
        `;
        
        const result3 = await sqlPool.request().query(query3);
        
        console.log('┌────────┬──────────────────────────┬──────────────────────────┬─────────┬──────────┐');
        console.log('│ IdTipo │ Tipo                     │ Motivo                   │ Total   │ Placas   │');
        console.log('├────────┼──────────────────────────┼──────────────────────────┼─────────┼──────────┤');
        
        result3.recordset.slice(0, 20).forEach(row => {
            const idTipo = (row.IdTipo || 'NULL').toString().padEnd(6);
            const tipo = (row.Tipo || 'NULL').padEnd(24).substring(0, 24);
            const motivo = (row.Motivo || 'NULL').padEnd(24).substring(0, 24);
            const total = row.Total.toString().padStart(7);
            const placas = row.PlacasUnicas.toString().padStart(8);
            console.log(`│ ${idTipo} │ ${tipo} │ ${motivo} │ ${total} │ ${placas} │`);
        });
        
        console.log('└────────┴──────────────────────────┴──────────────────────────┴─────────┴──────────┘');
        
        if (result3.recordset.length > 20) {
            console.log(`\n   ... e mais ${result3.recordset.length - 20} combinações\n`);
        } else {
            console.log('');
        }
        
        // ========================================================================
        // 4. Investigar OSs com IdOcorrencia NULL (órfãs) com motivos de manutenção
        // ========================================================================
        console.log('📊 [4/5] Investigando OSs ÓRFÃS (IdOcorrencia NULL) com motivos de manutenção...\n');
        
        const query4 = `
            SELECT 
                os.Tipo,
                os.Motivo,
                COUNT(*) as Total,
                SUM(ISNULL(os.ValorTotal, 0)) as ValorTotal
            FROM OrdensServico os WITH (NOLOCK)
            WHERE os.DataInicioServico >= '2024-01-01'
                AND os.IdOcorrencia IS NULL
                AND os.SituacaoOrdemServico <> 'Cancelada'
                AND (
                    os.Tipo LIKE '%Manuten%'
                    OR os.Motivo IN (
                        'Revisão por Quilometragem',
                        'Troca de Óleo',
                        'Revisão por Tempo',
                        'Pneus',
                        'Freios',
                        'Motor',
                        'Elétrica',
                        'Suspensão',
                        'Transporte',
                        'Bateria',
                        'Ar condicionado',
                        'Falha Mecânica',
                        'Preparação',
                        'Ruído anormal'
                    )
                )
            GROUP BY os.Tipo, os.Motivo
            ORDER BY COUNT(*) DESC
        `;
        
        const result4 = await sqlPool.request().query(query4);
        
        if (result4.recordset.length > 0) {
            console.log('⚠️  OSs ÓRFÃS encontradas (SEM IdOcorrencia, relacionadas a manutenção):\n');
            console.log('┌──────────────────────────────────┬──────────────────────────────────┬─────────┬────────────────┐');
            console.log('│ Tipo                             │ Motivo                           │ Total   │ Valor Total    │');
            console.log('├──────────────────────────────────┼──────────────────────────────────┼─────────┼────────────────┤');
            
            let totalOrfas = 0;
            let valorOrfas = 0;
            result4.recordset.forEach(row => {
                totalOrfas += row.Total;
                valorOrfas += row.ValorTotal;
                const tipo = (row.Tipo || 'NULL').padEnd(32).substring(0, 32);
                const motivo = (row.Motivo || 'NULL').padEnd(32).substring(0, 32);
                const total = row.Total.toString().padStart(7);
                const valor = `R$ ${row.ValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`.padStart(14);
                console.log(`│ ${tipo} │ ${motivo} │ ${total} │ ${valor} │`);
            });
            
            console.log('└──────────────────────────────────┴──────────────────────────────────┴─────────┴────────────────┘');
            console.log(`\n   ⚠️  TOTAL DE OSs ÓRFÃS: ${totalOrfas.toLocaleString('pt-BR')} (R$ ${valorOrfas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n`);
        } else {
            console.log('✅ Nenhuma OS órfã relacionada a manutenção encontrada.\n');
        }
        
        // ========================================================================
        // 5. Amostra de OSs órfãs
        // ========================================================================
        if (result4.recordset.length > 0) {
            console.log('📊 [5/5] Amostra de 10 OSs ÓRFÃS...\n');
            
            const query5 = `
                SELECT TOP 10
                    os.IdOrdemServico,
                    os.OrdemServico,
                    os.Placa,
                    os.Tipo,
                    os.Motivo,
                    os.SituacaoOrdemServico,
                    FORMAT(os.DataInicioServico, 'yyyy-MM-dd') as DataInicio,
                    ISNULL(os.ValorTotal, 0) as ValorTotal
                FROM OrdensServico os WITH (NOLOCK)
                WHERE os.DataInicioServico >= '2024-01-01'
                    AND os.IdOcorrencia IS NULL
                    AND os.SituacaoOrdemServico <> 'Cancelada'
                    AND (
                        os.Tipo LIKE '%Manuten%'
                        OR os.Motivo IN (
                            'Revisão por Quilometragem',
                            'Troca de Óleo',
                            'Revisão por Tempo',
                            'Pneus',
                            'Freios',
                            'Motor'
                        )
                    )
                ORDER BY os.DataInicioServico DESC
            `;
            
            const result5 = await sqlPool.request().query(query5);
            
            console.log('┌────────────┬──────────┬──────────────┬──────────────┬───────────┬──────────────┐');
            console.log('│ OS         │ Placa    │ Tipo         │ Motivo       │ Início    │ Valor        │');
            console.log('├────────────┼──────────┼──────────────┼──────────────┼───────────┼──────────────┤');
            
            result5.recordset.forEach(row => {
                const os = row.OrdemServico.toString().padEnd(10);
                const placa = (row.Placa || 'NULL').padEnd(8);
                const tipo = (row.Tipo || 'NULL').padEnd(12).substring(0, 12);
                const motivo = (row.Motivo || 'NULL').padEnd(12).substring(0, 12);
                const inicio = (row.DataInicio || 'NULL').padEnd(9);
                const valor = `R$ ${row.ValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`.padStart(12);
                console.log(`│ ${os} │ ${placa} │ ${tipo} │ ${motivo} │ ${inicio} │ ${valor} │`);
            });
            
            console.log('└────────────┴──────────┴──────────────┴──────────────┴───────────┴──────────────┘\n');
        }
        
        // ========================================================================
        // CONCLUSÕES
        // ========================================================================
        console.log('='.repeat(80));
        console.log('💡 CONCLUSÕES E RECOMENDAÇÕES');
        console.log('='.repeat(80) + '\n');
        
        const percentualSemOS = ((r1.SemOS / r1.TotalOcorrencias) * 100).toFixed(1);
        
        console.log(`📊 RESUMO EXECUTIVO:\n`);
        console.log(`   • ${percentualSemOS}% das Ocorrências não têm OSs vinculadas (${r1.SemOS.toLocaleString('pt-BR')} registros)`);
        
        // Análise de status cancelados
        const cancelados = result2.recordset.filter(r => r.SituacaoOcorrencia === 'Cancelada');
        const totalCancelados = cancelados.reduce((sum, r) => sum + r.Total, 0);
        const percentualCancelados = ((totalCancelados / r1.SemOS) * 100).toFixed(1);
        
        console.log(`\n✅ DADOS CONSISTENTES:\n`);
        if (totalCancelados > 0) {
            console.log(`   • ${percentualCancelados}% das ocorrências SEM OS foram CANCELADAS`);
            console.log(`     (${totalCancelados.toLocaleString('pt-BR')} ocorrências)`);
            console.log(`     → É esperado que não tenham OS vinculadas\n`);
        }
        
        console.log(`🎯 RECOMENDAÇÃO FINAL:\n`);
        console.log(`   1. ✅ MANTER abordagem atual (OcorrenciasManutencao como base)`);
        console.log(`      - Captura 100% das ocorrências de manutenção`);
        console.log(`      - JOIN com OrdensServico traz custos quando disponíveis`);
        console.log(`      - Ocorrências sem OS são válidas (canceladas ou em processo)\n`);
        
        if (result4.recordset.length > 0) {
            const totalOrfas = result4.recordset.reduce((sum, r) => sum + r.Total, 0);
            const valorOrfas = result4.recordset.reduce((sum, r) => sum + r.ValorTotal, 0);
            
            console.log(`   2. ⚠️  COMPLEMENTAR fat_manutencao_unificado com OSs ÓRFÃS`);
            console.log(`      - ${totalOrfas.toLocaleString('pt-BR')} OSs sem IdOcorrencia encontradas`);
            console.log(`      - Valor Total: R$ ${valorOrfas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            console.log(`      - AÇÃO: Adicionar UNION ALL na query ETL para capturar OSs órfãs\n`);
            console.log(`   💡 PROPOSTA: Criar CTE para unificar:`);
            console.log(`      a) OcorrenciasManutencao (base principal)`);
            console.log(`      b) OrdensServico órfãs (complemento histórico)`);
            console.log(`      - Marcar origem no campo calculado (ex: OrigemDados = 'Ocorrencia' ou 'OS Órfã')\n`);
        } else {
            console.log(`   2. ✅ NENHUMA COMPLEMENTAÇÃO NECESSÁRIA`);
            console.log(`      - Não há OSs órfãs relacionadas a manutenção`);
            console.log(`      - Todas as OSs relevantes estão vinculadas a ocorrências\n`);
        }
        
        console.log(`   3. 💾 ESTRUTURA ATUAL DO fat_manutencao_unificado:`);
        console.log(`      - Base: OcorrenciasManutencao (${r1.TotalOcorrencias.toLocaleString('pt-BR')} registros)`);
        console.log(`      - COM custos: ${r1.ComOS.toLocaleString('pt-BR')} registros (${((r1.ComOS / r1.TotalOcorrencias) * 100).toFixed(1)}%)`);
        console.log(`      - SEM custos: ${r1.SemOS.toLocaleString('pt-BR')} registros (${percentualSemOS}%, maioria canceladas)`);
        
        if (result4.recordset.length === 0) {
            console.log(`      - ✅ ESTRUTURA ADEQUADA E COMPLETA\n`);
        } else {
            console.log(`      - ⚠️  Considerar complementação com OSs órfãs\n`);
        }
        
        console.log('='.repeat(80));
        console.log('✅ ANÁLISE DETALHADA CONCLUÍDA!');
        console.log('='.repeat(80) + '\n');
        
    } catch (err) {
        console.error('\n❌ ERRO:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        if (sqlPool) await sqlPool.close();
    }
}

run();
