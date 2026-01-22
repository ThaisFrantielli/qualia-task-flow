/**
 * ANÁLISE DE ORIGEM - MANUTENÇÃO
 * 
 * Objetivo: Comparar dados de OcorrenciasManutencao vs OrdensServico
 * para verificar se há dados perdidos ou inconsistências
 * 
 * Análises:
 * 1. OcorrenciasManutencao (IdTipo 1,2,3)
 * 2. OrdensServico com Motivo LIKE '%manuten%'
 * 3. OrdensServico sem IdOcorrencia
 * 4. Comparação de volumes
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
        console.log('🔍 ANÁLISE DE ORIGEM - DADOS DE MANUTENÇÃO');
        console.log('='.repeat(80) + '\n');
        
        sqlPool = await sql.connect(sqlConfig);
        console.log(`✅ Conectado: ${sqlConfig.server}:${sqlConfig.port} / ${sqlConfig.database}\n`);
        
        // ========================================================================
        // 1. ANÁLISE: OcorrenciasManutencao (Base Atual)
        // ========================================================================
        console.log('📊 [1/6] Analisando OcorrenciasManutencao...\n');
        
        const query1 = `
            SELECT 
                IdTipo,
                Tipo,
                COUNT(*) as Total,
                COUNT(DISTINCT Placa) as PlacasUnicas,
                SUM(CASE WHEN DataConclusaoOcorrencia IS NULL AND SituacaoOcorrencia <> 'Cancelada' THEN 1 ELSE 0 END) as Abertas,
                SUM(CASE WHEN DataConclusaoOcorrencia IS NOT NULL THEN 1 ELSE 0 END) as Fechadas,
                SUM(CASE WHEN SituacaoOcorrencia = 'Cancelada' THEN 1 ELSE 0 END) as Canceladas
            FROM OcorrenciasManutencao WITH (NOLOCK)
            WHERE DataCriacao >= '2024-01-01'
            GROUP BY IdTipo, Tipo
            ORDER BY IdTipo
        `;
        
        const result1 = await sqlPool.request().query(query1);
        console.log('📋 Distribuição por Tipo de Ocorrência:\n');
        console.log('┌─────────┬──────────────────────────┬─────────┬──────────┬─────────┬──────────┬────────────┐');
        console.log('│ IdTipo  │ Tipo                     │ Total   │ Placas   │ Abertas │ Fechadas │ Canceladas │');
        console.log('├─────────┼──────────────────────────┼─────────┼──────────┼─────────┼──────────┼────────────┤');
        
        let totalOcorrencias = 0;
        result1.recordset.forEach(row => {
            totalOcorrencias += row.Total;
            const tipo = (row.Tipo || 'NULL').padEnd(24).substring(0, 24);
            const idTipo = (row.IdTipo || 'NULL').toString().padEnd(7);
            const total = row.Total.toString().padStart(7);
            const placas = row.PlacasUnicas.toString().padStart(8);
            const abertas = row.Abertas.toString().padStart(7);
            const fechadas = row.Fechadas.toString().padStart(8);
            const canceladas = row.Canceladas.toString().padStart(10);
            console.log(`│ ${idTipo} │ ${tipo} │ ${total} │ ${placas} │ ${abertas} │ ${fechadas} │ ${canceladas} │`);
        });
        
        console.log('└─────────┴──────────────────────────┴─────────┴──────────┴─────────┴──────────┴────────────┘');
        console.log(`\n✅ Total de OcorrenciasManutencao (2024+): ${totalOcorrencias.toLocaleString('pt-BR')}\n`);
        
        // ========================================================================
        // 2. ANÁLISE: OcorrenciasManutencao COM OrdensServico vinculadas
        // ========================================================================
        console.log('📊 [2/6] Analisando OcorrenciasManutencao COM OrdensServico vinculadas...\n');
        
        const query2 = `
            SELECT 
                COUNT(DISTINCT om.IdOcorrencia) as TotalOcorrencias,
                COUNT(DISTINCT om.Placa) as PlacasUnicas,
                COUNT(os.IdOrdemServico) as TotalOS,
                SUM(ISNULL(os.ValorTotal, 0)) as ValorTotal
            FROM OcorrenciasManutencao om WITH (NOLOCK)
            LEFT JOIN OrdensServico os WITH (NOLOCK) ON om.IdOcorrencia = os.IdOcorrencia
            WHERE om.DataCriacao >= '2024-01-01'
                AND os.IdOrdemServico IS NOT NULL
        `;
        
        const result2 = await sqlPool.request().query(query2);
        const r2 = result2.recordset[0];
        console.log(`   Ocorrências com OS vinculadas: ${r2.TotalOcorrencias.toLocaleString('pt-BR')}`);
        console.log(`   Placas únicas: ${r2.PlacasUnicas.toLocaleString('pt-BR')}`);
        console.log(`   Total de Ordens de Serviço: ${r2.TotalOS.toLocaleString('pt-BR')}`);
        console.log(`   Valor Total: R$ ${r2.ValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`);
        
        // ========================================================================
        // 3. ANÁLISE: OrdensServico com Motivo LIKE '%manuten%'
        // ========================================================================
        console.log('📊 [3/6] Analisando OrdensServico com Motivo contendo "manuten"...\n');
        
        const query3 = `
            SELECT 
                ISNULL(COUNT(*), 0) as Total,
                ISNULL(COUNT(DISTINCT Placa), 0) as PlacasUnicas,
                ISNULL(COUNT(DISTINCT IdOcorrencia), 0) as OcorrenciasVinculadas,
                ISNULL(SUM(CASE WHEN IdOcorrencia IS NULL THEN 1 ELSE 0 END), 0) as SemOcorrencia,
                ISNULL(SUM(CASE WHEN IdOcorrencia IS NOT NULL THEN 1 ELSE 0 END), 0) as ComOcorrencia,
                ISNULL(SUM(CASE WHEN SituacaoOrdemServico <> 'Cancelada' THEN 1 ELSE 0 END), 0) as Ativas,
                ISNULL(SUM(CASE WHEN SituacaoOrdemServico = 'Cancelada' THEN 1 ELSE 0 END), 0) as Canceladas,
                ISNULL(SUM(ISNULL(ValorTotal, 0)), 0) as ValorTotal
            FROM OrdensServico WITH (NOLOCK)
            WHERE DataInicioServico >= '2024-01-01'
                AND (
                    Motivo LIKE '%manuten%' 
                    OR Motivo LIKE '%Manuten%'
                    OR Motivo LIKE '%MANUTEN%'
                )
        `;
        
        const result3 = await sqlPool.request().query(query3);
        const r3 = result3.recordset && result3.recordset[0] ? result3.recordset[0] : { 
            Total: 0, 
            PlacasUnicas: 0, 
            OcorrenciasVinculadas: 0,
            ComOcorrencia: 0, 
            SemOcorrencia: 0, 
            Ativas: 0, 
            Canceladas: 0, 
            ValorTotal: 0 
        };
        console.log(`   ✅ Total de OSs com "manuten" no Motivo: ${r3.Total.toLocaleString('pt-BR')}`);
        console.log(`   📍 Placas únicas: ${r3.PlacasUnicas.toLocaleString('pt-BR')}`);
        console.log(`   🔗 Vinculadas a ocorrências: ${r3.ComOcorrencia.toLocaleString('pt-BR')}`);
        console.log(`   ⚠️  SEM ocorrência vinculada: ${r3.SemOcorrencia.toLocaleString('pt-BR')}`);
        console.log(`   ✅ Ativas: ${r3.Ativas.toLocaleString('pt-BR')}`);
        console.log(`   ❌ Canceladas: ${r3.Canceladas.toLocaleString('pt-BR')}`);
        console.log(`   💰 Valor Total: R$ ${r3.ValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`);
        
        // ========================================================================
        // 4. ANÁLISE: OrdensServico SEM IdOcorrencia
        // ========================================================================
        console.log('📊 [4/6] Analisando OrdensServico SEM IdOcorrencia (órfãs)...\n');
        
        const query4 = `
            SELECT 
                Tipo,
                Motivo,
                COUNT(*) as Total,
                SUM(ISNULL(ValorTotal, 0)) as ValorTotal
            FROM OrdensServico WITH (NOLOCK)
            WHERE DataInicioServico >= '2024-01-01'
                AND IdOcorrencia IS NULL
                AND SituacaoOrdemServico <> 'Cancelada'
                AND (
                    Motivo LIKE '%manuten%' 
                    OR Motivo LIKE '%Manuten%'
                    OR Motivo LIKE '%MANUTEN%'
                    OR Tipo LIKE '%manuten%'
                    OR Tipo LIKE '%Manuten%'
                    OR Tipo LIKE '%MANUTEN%'
                )
            GROUP BY Tipo, Motivo
            ORDER BY COUNT(*) DESC
        `;
        
        const result4 = await sqlPool.request().query(query4);
        
        if (result4.recordset.length > 0) {
            console.log('⚠️  OSs ÓRFÃS encontradas (sem IdOcorrencia) com "manuten":\n');
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
            console.log(`\n⚠️  TOTAL DE OSs ÓRFÃS: ${totalOrfas.toLocaleString('pt-BR')} (R$ ${valorOrfas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n`);
        } else {
            console.log('✅ Nenhuma OS órfã encontrada com "manuten" no Tipo ou Motivo.\n');
        }
        
        // ========================================================================
        // 5. ANÁLISE: Amostra de Tipos e Motivos em OrdensServico
        // ========================================================================
        console.log('📊 [5/6] Analisando TOP 20 combinações Tipo + Motivo em OrdensServico...\n');
        
        const query5 = `
            SELECT TOP 20
                Tipo,
                Motivo,
                COUNT(*) as Total,
                SUM(CASE WHEN IdOcorrencia IS NULL THEN 1 ELSE 0 END) as SemOcorrencia,
                SUM(ISNULL(ValorTotal, 0)) as ValorTotal
            FROM OrdensServico WITH (NOLOCK)
            WHERE DataInicioServico >= '2024-01-01'
                AND SituacaoOrdemServico <> 'Cancelada'
            GROUP BY Tipo, Motivo
            ORDER BY COUNT(*) DESC
        `;
        
        const result5 = await sqlPool.request().query(query5);
        console.log('┌──────────────────────────────────┬──────────────────────────────────┬─────────┬──────────┬────────────────┐');
        console.log('│ Tipo                             │ Motivo                           │ Total   │ Órfãs    │ Valor Total    │');
        console.log('├──────────────────────────────────┼──────────────────────────────────┼─────────┼──────────┼────────────────┤');
        
        result5.recordset.forEach(row => {
            const tipo = (row.Tipo || 'NULL').padEnd(32).substring(0, 32);
            const motivo = (row.Motivo || 'NULL').padEnd(32).substring(0, 32);
            const total = row.Total.toString().padStart(7);
            const orfas = row.SemOcorrencia.toString().padStart(8);
            const valor = `R$ ${row.ValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`.padStart(14);
            console.log(`│ ${tipo} │ ${motivo} │ ${total} │ ${orfas} │ ${valor} │`);
        });
        
        console.log('└──────────────────────────────────┴──────────────────────────────────┴─────────┴──────────┴────────────────┘\n');
        
        // ========================================================================
        // 6. ANÁLISE: Comparação de volumes
        // ========================================================================
        console.log('📊 [6/6] Comparação de Volumes:\n');
        
        console.log('┌────────────────────────────────────────────────────────┬─────────────┐');
        console.log('│ Fonte                                                  │ Total       │');
        console.log('├────────────────────────────────────────────────────────┼─────────────┤');
        console.log(`│ OcorrenciasManutencao (2024+)                          │ ${totalOcorrencias.toString().padStart(11)} │`);
        console.log(`│ OcorrenciasManutencao COM OSs vinculadas               │ ${r2.TotalOcorrencias.toString().padStart(11)} │`);
        console.log(`│ OrdensServico com Motivo "manuten"                     │ ${r3.Total.toString().padStart(11)} │`);
        console.log(`│ OrdensServico com Motivo "manuten" SEM Ocorrência      │ ${r3.SemOcorrencia.toString().padStart(11)} │`);
        console.log('└────────────────────────────────────────────────────────┴─────────────┘\n');
        
        // ========================================================================
        // 7. RECOMENDAÇÕES
        // ========================================================================
        console.log('=' .repeat(80));
        console.log('💡 RECOMENDAÇÕES E CONCLUSÕES');
        console.log('='.repeat(80) + '\n');
        
        if (r3.SemOcorrencia > 0) {
            console.log(`⚠️  ATENÇÃO: Existem ${r3.SemOcorrencia.toLocaleString('pt-BR')} Ordens de Serviço com "manuten" no motivo`);
            console.log('   que NÃO estão vinculadas a nenhuma Ocorrência.\n');
            console.log('   Possíveis ações:');
            console.log('   1. ✅ RECOMENDADO: Manter abordagem atual (OcorrenciasManutencao)');
            console.log('      - Dados mais estruturados e confiáveis');
            console.log('      - Possui workflow completo (etapas, status, datas)');
            console.log('      - Já captura OSs por meio do JOIN\n');
            console.log('   2. ⚠️  COMPLEMENTAR: Criar CTE adicional para OSs órfãs');
            console.log('      - Adicionar UNION ALL com OSs sem IdOcorrencia');
            console.log('      - Marcar origem (Ocorrencia vs OS Órfã)');
            console.log('      - Pode gerar duplicatas se houver inconsistências\n');
            console.log('   3. ❌ NÃO RECOMENDADO: Usar apenas OrdensServico');
            console.log('      - Perde informações de workflow (etapas, agendamentos)');
            console.log('      - Menos estruturado para análise de processo\n');
        } else {
            console.log('✅ Todos as OSs com "manuten" estão vinculadas a OcorrenciasManutencao.');
            console.log('   Abordagem atual está COMPLETA e ADEQUADA.\n');
        }
        
        const percentualVinculadas = ((r2.TotalOcorrencias / totalOcorrencias) * 100).toFixed(1);
        console.log(`📊 Taxa de vinculação: ${percentualVinculadas}% das OcorrenciasManutencao têm OSs vinculadas\n`);
        
        if (parseFloat(percentualVinculadas) < 80) {
            console.log('⚠️  Taxa de vinculação baixa. Considerar investigar ocorrências sem OS.\n');
        }
        
        console.log('='.repeat(80));
        console.log('✅ ANÁLISE CONCLUÍDA!');
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
