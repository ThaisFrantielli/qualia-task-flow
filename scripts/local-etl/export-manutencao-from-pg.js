require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pgConfig = {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    user: (process.env.PG_USER || '').toLowerCase().trim(),
    password: (process.env.PG_PASSWORD || '').trim(),
    database: (process.env.PG_DATABASE || 'bluconecta_dw').toLowerCase().trim()
};

async function run() {
    const pool = new Pool(pgConfig);
    
    try {
        console.log('\n================================================================================');
        console.log('📊 GERANDO JSON DE fat_manutencao_unificado DO POSTGRESQL');
        console.log('================================================================================\n');
        
        console.log('🔌 Conectando ao PostgreSQL...');
        await pool.query('SELECT 1');
        console.log(`   ✅ Conectado: ${pgConfig.host}:${pgConfig.port} / ${pgConfig.database}\n`);
        
        console.log('📥 Consultando fat_manutencao_unificado...');
        const result = await pool.query('SELECT * FROM fat_manutencao_unificado ORDER BY "IdOrdemServico"');
        console.log(`   ✅ ${result.rows.length.toLocaleString('pt-BR')} registros carregados\n`);
        
        // Gerar arquivos JSON
        console.log('📝 Gerando arquivos JSON...');
        const outDir = path.join(__dirname, '..', '..', 'public', 'data');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        
        const MAX_CHUNK_SIZE = 10000;
        
        if (result.rows.length > MAX_CHUNK_SIZE) {
            const totalChunks = Math.ceil(result.rows.length / MAX_CHUNK_SIZE);
            console.log(`   📦 Dividindo em ${totalChunks} partes...\n`);
            
            const manifest = {
                totalParts: totalChunks,
                total_chunks: totalChunks,
                totalRecords: result.rows.length,
                chunkSize: MAX_CHUNK_SIZE,
                baseFileName: 'fat_manutencao_unificado',
                generated_at: new Date().toISOString(),
                etl_version: '2.0-idtipo-filter',
                source: 'PostgreSQL Local'
            };
            
            fs.writeFileSync(path.join(outDir, 'fat_manutencao_unificado_manifest.json'), JSON.stringify(manifest));
            console.log('   💾 fat_manutencao_unificado_manifest.json');
            
            for (let i = 0; i < totalChunks; i++) {
                const chunk = result.rows.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE);
                const fileName = `fat_manutencao_unificado_part${i + 1}of${totalChunks}.json`;
                fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(chunk));
                console.log(`   💾 ${fileName} (${chunk.length.toLocaleString('pt-BR')} registros)`);
            }
        } else {
            fs.writeFileSync(path.join(outDir, 'fat_manutencao_unificado.json'), JSON.stringify(result.rows));
            console.log('   💾 fat_manutencao_unificado.json');
        }
        
        console.log('\n================================================================================');
        console.log('✅ ARQUIVOS JSON GERADOS COM SUCESSO!');
        console.log('================================================================================\n');
        
        // Análise rápida dos dados
        console.log('📊 ANÁLISE DOS DADOS:\n');
        
        const tipos = {};
        result.rows.forEach(d => {
            const tipo = d.TipoOcorrencia || 'SEM_TIPO';
            const idTipo = d.IdTipoOcorrencia || d.IdTipo || 'SEM_ID';
            const key = `${idTipo} | ${tipo}`;
            tipos[key] = (tipos[key] || 0) + 1;
        });
        
        console.log('   Tipos de Ocorrência:');
        Object.entries(tipos).sort((a, b) => b[1] - a[1]).forEach(([tipo, count]) => {
            console.log(`   - ${tipo.padEnd(50)} → ${count.toLocaleString('pt-BR')}`);
        });
        
        console.log(`\n   ✅ Total: ${result.rows.length.toLocaleString('pt-BR')} registros\n`);
        
    } catch (err) {
        console.error('\n❌ ERRO:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
