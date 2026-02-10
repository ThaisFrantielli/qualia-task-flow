require('dotenv').config();
const sql = require('mssql');
const { Pool } = require('pg');

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

// PostgreSQL (DESTINO - Oracle Cloud)
const pgConfig = {
    host: process.env.PG_HOST || '137.131.163.167',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'F4tu5xy3',
    database: process.env.PG_DATABASE || 'bluconecta_dw',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};

async function compareSituacaoVeiculos() {
    let sqlPool, pgPool;
    try {
        console.log('🔌 Conectando ao SQL Server DW (ORIGEM)...');
        sqlPool = await sql.connect(sqlConfig);
        
        console.log('🔌 Conectando ao PostgreSQL DW (DESTINO)...');
        pgPool = new Pool(pgConfig);
        
        // Contagem por SituacaoVeiculo no DW Origem (sem Terceiros)
        console.log('\n📊 Consultando DW ORIGEM (Veiculos.SituacaoVeiculo)...');
        const origemResult = await sqlPool.request().query(`
            SELECT 
                ISNULL(SituacaoVeiculo, 'NULL') as Situacao,
                COUNT(*) as Quantidade
            FROM Veiculos
            WHERE COALESCE(FinalidadeUso, '') <> 'Terceiro'
            GROUP BY SituacaoVeiculo
            ORDER BY COUNT(*) DESC
        `);
        
        // Contagem por Status no DW Destino
        console.log('📊 Consultando DW DESTINO (dim_frota.Status)...');
        const destinoResult = await pgPool.query(`
            SELECT 
                COALESCE("Status", 'NULL') as situacao,
                COUNT(*) as quantidade
            FROM dim_frota
            GROUP BY "Status"
            ORDER BY COUNT(*) DESC
        `);
        
        // Criar map para facilitar comparação
        const origemMap = new Map();
        origemResult.recordset.forEach(row => {
            origemMap.set(row.Situacao, row.Quantidade);
        });
        
        const destinoMap = new Map();
        destinoResult.rows.forEach(row => {
            destinoMap.set(row.situacao, parseInt(row.quantidade));
        });
        
        // Todas as situações únicas
        const todasSituacoes = new Set([...origemMap.keys(), ...destinoMap.keys()]);
        
        console.log('\n📋 COMPARAÇÃO DE SITUAÇÕES/STATUS:\n');
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('Situação/Status              │ Origem (SQL)  │ Destino (PG)  │ Diferença');
        console.log('═══════════════════════════════════════════════════════════════════════════');
        
        let totalOrigem = 0;
        let totalDestino = 0;
        let diferencasEncontradas = false;
        
        // Ordenar por quantidade na origem (decrescente)
        const situacoesOrdenadas = Array.from(todasSituacoes).sort((a, b) => {
            return (origemMap.get(b) || 0) - (origemMap.get(a) || 0);
        });
        
        situacoesOrdenadas.forEach(situacao => {
            const qtdOrigem = origemMap.get(situacao) || 0;
            const qtdDestino = destinoMap.get(situacao) || 0;
            const diferenca = qtdDestino - qtdOrigem;
            
            totalOrigem += qtdOrigem;
            totalDestino += qtdDestino;
            
            const status = diferenca === 0 ? '✅' : '❌';
            const diferencaStr = diferenca === 0 ? '  OK' : `${diferenca > 0 ? '+' : ''}${diferenca}`;
            
            if (diferenca !== 0) {
                diferencasEncontradas = true;
            }
            
            console.log(
                `${situacao.padEnd(28)} │ ${String(qtdOrigem).padStart(13)} │ ${String(qtdDestino).padStart(13)} │ ${status} ${diferencaStr.padStart(8)}`
            );
        });
        
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(
            `TOTAL                        │ ${String(totalOrigem).padStart(13)} │ ${String(totalDestino).padStart(13)} │ ${totalOrigem === totalDestino ? '✅ OK' : `❌ ${totalDestino - totalOrigem > 0 ? '+' : ''}${totalDestino - totalOrigem}`}`
        );
        console.log('═══════════════════════════════════════════════════════════════════════════\n');
        
        if (!diferencasEncontradas && totalOrigem === totalDestino) {
            console.log('✅ PERFEITO! As bases estão 100% idênticas em relação às situações/status!\n');
        } else {
            console.log('⚠️  ATENÇÃO! Foram encontradas diferenças entre as bases.\n');
            
            // Identificar situações apenas na origem
            const apenasOrigem = Array.from(origemMap.keys()).filter(s => !destinoMap.has(s));
            if (apenasOrigem.length > 0) {
                console.log('🔴 Situações presentes apenas na ORIGEM:');
                apenasOrigem.forEach(s => {
                    console.log(`   - ${s}: ${origemMap.get(s)} veículos`);
                });
                console.log('');
            }
            
            // Identificar situações apenas no destino
            const apenasDestino = Array.from(destinoMap.keys()).filter(s => !origemMap.has(s));
            if (apenasDestino.length > 0) {
                console.log('🔴 Situações presentes apenas no DESTINO:');
                apenasDestino.forEach(s => {
                    console.log(`   - ${s}: ${destinoMap.get(s)} veículos`);
                });
                console.log('');
            }
            
            // Situações com quantidades diferentes
            const quantidadesDiferentes = Array.from(todasSituacoes).filter(s => {
                return origemMap.has(s) && destinoMap.has(s) && origemMap.get(s) !== destinoMap.get(s);
            });
            
            if (quantidadesDiferentes.length > 0) {
                console.log('🔴 Situações com QUANTIDADES DIFERENTES:');
                quantidadesDiferentes.forEach(s => {
                    const diff = destinoMap.get(s) - origemMap.get(s);
                    console.log(`   - ${s}: Origem=${origemMap.get(s)}, Destino=${destinoMap.get(s)} (${diff > 0 ? '+' : ''}${diff})`);
                });
                console.log('');
            }
        }
        
        // Exemplos de registros com diferenças
        if (diferencasEncontradas) {
            console.log('🔍 Investigando diferenças específicas...\n');
            
            for (const situacao of todasSituacoes) {
                const qtdOrigem = origemMap.get(situacao) || 0;
                const qtdDestino = destinoMap.get(situacao) || 0;
                
                if (qtdOrigem !== qtdDestino) {
                    console.log(`\n📌 Situação "${situacao}":`);
                    
                    // Placas na origem
                    const placasOrigemResult = await sqlPool.request().query(`
                        SELECT TOP 10 Placa, IdVeiculo, Modelo
                        FROM Veiculos
                        WHERE COALESCE(SituacaoVeiculo, 'NULL') = '${situacao === 'NULL' ? '' : situacao}'
                          AND COALESCE(FinalidadeUso, '') <> 'Terceiro'
                        ORDER BY Placa
                    `);
                    
                    console.log(`   Origem (${qtdOrigem} veículos) - Amostra:`);
                    placasOrigemResult.recordset.slice(0, 5).forEach(v => {
                        console.log(`   - ${v.Placa} (ID: ${v.IdVeiculo}) - ${v.Modelo}`);
                    });
                    
                    // Placas no destino
                    const placasDestinoResult = await pgPool.query(`
                        SELECT "Placa" as placa, "IdVeiculo" as idveiculo, "Modelo" as modelo
                        FROM dim_frota
                        WHERE COALESCE("Status", 'NULL') = $1
                        ORDER BY "Placa"
                        LIMIT 10
                    `, [situacao === 'NULL' ? null : situacao]);
                    
                    console.log(`   Destino (${qtdDestino} veículos) - Amostra:`);
                    placasDestinoResult.rows.slice(0, 5).forEach(v => {
                        console.log(`   - ${v.placa} (ID: ${v.idveiculo}) - ${v.modelo}`);
                    });
                }
            }
        }
        
    } catch (err) {
        console.error('❌ Erro:', err.message);
        console.error(err);
    } finally {
        if (sqlPool) {
            await sqlPool.close();
        }
        if (pgPool) {
            await pgPool.end();
        }
    }
}

compareSituacaoVeiculos();
