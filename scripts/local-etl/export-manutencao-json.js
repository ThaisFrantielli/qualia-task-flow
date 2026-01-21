const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'alyson123',
        database: 'bluconecta_dw'
    });

    try {
        console.log('🔌 Conectando ao PostgreSQL...');
        const result = await pool.query('SELECT * FROM fat_manutencao_unificado ORDER BY "IdOrdemServico"');
        console.log(`✅ Loaded ${result.rows.length} rows`);

        const outDir = path.join(process.cwd(), '..', '..', 'public', 'data');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        const MAX_CHUNK_SIZE = 10000;

        if (result.rows.length > MAX_CHUNK_SIZE) {
            const totalChunks = Math.ceil(result.rows.length / MAX_CHUNK_SIZE);
            console.log(`📦 Dividindo em ${totalChunks} partes...`);

            const manifest = {
                totalParts: totalChunks,
                total_chunks: totalChunks,
                totalRecords: result.rows.length,
                chunkSize: MAX_CHUNK_SIZE,
                baseFileName: 'fat_manutencao_unificado',
                generated_at: new Date().toISOString()
            };

            fs.writeFileSync(path.join(outDir, 'fat_manutencao_unificado_manifest.json'), JSON.stringify(manifest));
            console.log('💾 Gravado: fat_manutencao_unificado_manifest.json');

            for (let i = 0; i < totalChunks; i++) {
                const chunk = result.rows.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE);
                const fileName = `fat_manutencao_unificado_part${i + 1}of${totalChunks}.json`;
                fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(chunk));
                console.log(`💾 Gravado: ${fileName} (${chunk.length} registros)`);
            }
        } else {
            fs.writeFileSync(path.join(outDir, 'fat_manutencao_unificado.json'), JSON.stringify(result.rows));
            console.log('💾 Gravado: fat_manutencao_unificado.json');
        }

        console.log('✅ Concluído!');
    } catch (err) {
        console.error('❌ Erro:', err.message);
        console.error(err.stack);
    } finally {
        await pool.end();
    }
}

run();
