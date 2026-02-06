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

async function checkRealCount() {
    let pool;
    try {
        console.log('🔌 Conectando ao SQL Server DW (ORIGEM)...\n');
        pool = await sql.connect(sqlConfig);
        
        // 1. Total GERAL de veículos
        const totalGeral = await pool.request().query(`
            SELECT COUNT(*) as Total FROM Veiculos
        `);
        console.log(`📊 TOTAL GERAL DE VEÍCULOS: ${totalGeral.recordset[0].Total}\n`);
        
        // 2. Contagem por SituacaoVeiculo (TODOS os veículos)
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('CONTAGEM COMPLETA - TODOS OS VEÍCULOS (incluindo Terceiros)');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');
        
        const todasSituacoes = await pool.request().query(`
            SELECT 
                ISNULL(SituacaoVeiculo, 'NULL') as Situacao,
                COUNT(*) as Quantidade
            FROM Veiculos
            GROUP BY SituacaoVeiculo
            ORDER BY COUNT(*) DESC
        `);
        
        let totalContado = 0;
        todasSituacoes.recordset.forEach(row => {
            totalContado += row.Quantidade;
            console.log(`${row.Situacao.padEnd(35)} │ ${String(row.Quantidade).padStart(6)}`);
        });
        
        console.log('─────────────────────────────────────────────────────────────────────────');
        console.log(`TOTAL CONTADO                      │ ${String(totalContado).padStart(6)}\n`);
        
        // 3. Situações que contêm "mobi" (como no filtro da imagem)
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('SITUAÇÕES COM "MOBI" (como no seu filtro)');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');
        
        const comMobi = await pool.request().query(`
            SELECT 
                SituacaoVeiculo,
                Placa,
                Modelo,
                FinalidadeUso,
                IdVeiculo
            FROM Veiculos
            WHERE SituacaoVeiculo LIKE '%mobi%'
            ORDER BY SituacaoVeiculo, Placa
        `);
        
        const agrupado = {};
        comMobi.recordset.forEach(v => {
            const sit = v.SituacaoVeiculo || 'NULL';
            if (!agrupado[sit]) {
                agrupado[sit] = [];
            }
            agrupado[sit].push(v);
        });
        
        Object.keys(agrupado).sort().forEach(situacao => {
            const veiculos = agrupado[situacao];
            console.log(`\n📌 ${situacao} (${veiculos.length} veículos):`);
            
            veiculos.forEach(v => {
                const finalidade = v.FinalidadeUso ? ` [${v.FinalidadeUso}]` : '';
                console.log(`   ${v.Placa} - ${v.Modelo}${finalidade}`);
            });
        });
        
        // 4. Verificar se existe diferença entre com/sem filtro de Terceiro
        console.log('\n\n═══════════════════════════════════════════════════════════════════════════');
        console.log('COMPARAÇÃO: COM vs SEM filtro de Terceiros');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');
        
        const semTerceiro = await pool.request().query(`
            SELECT 
                ISNULL(SituacaoVeiculo, 'NULL') as Situacao,
                COUNT(*) as Quantidade
            FROM Veiculos
            WHERE COALESCE(FinalidadeUso, '') <> 'Terceiro'
            GROUP BY SituacaoVeiculo
            ORDER BY SituacaoVeiculo
        `);
        
        const comTerceiro = await pool.request().query(`
            SELECT 
                ISNULL(SituacaoVeiculo, 'NULL') as Situacao,
                COUNT(*) as Quantidade
            FROM Veiculos
            GROUP BY SituacaoVeiculo
            ORDER BY SituacaoVeiculo
        `);
        
        // Criar maps
        const mapSem = new Map();
        semTerceiro.recordset.forEach(r => mapSem.set(r.Situacao, r.Quantidade));
        
        const mapCom = new Map();
        comTerceiro.recordset.forEach(r => mapCom.set(r.Situacao, r.Quantidade));
        
        // Todas situações
        const todasSit = new Set([...mapSem.keys(), ...mapCom.keys()]);
        
        console.log('Situação                            │ Sem Terceiro │ Com Terceiro │ Diferença');
        console.log('─────────────────────────────────────────────────────────────────────────');
        
        let totalSem = 0;
        let totalCom = 0;
        
        Array.from(todasSit).sort().forEach(sit => {
            const qtdSem = mapSem.get(sit) || 0;
            const qtdCom = mapCom.get(sit) || 0;
            const diff = qtdCom - qtdSem;
            
            totalSem += qtdSem;
            totalCom += qtdCom;
            
            const diffStr = diff === 0 ? '    -' : `  ${diff > 0 ? '+' : ''}${diff}`;
            console.log(`${sit.padEnd(35)} │ ${String(qtdSem).padStart(12)} │ ${String(qtdCom).padStart(12)} │ ${diffStr}`);
        });
        
        console.log('─────────────────────────────────────────────────────────────────────────');
        console.log(`TOTAL                               │ ${String(totalSem).padStart(12)} │ ${String(totalCom).padStart(12)} │   ${totalCom - totalSem > 0 ? '+' : ''}${totalCom - totalSem}`);
        
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

checkRealCount();
