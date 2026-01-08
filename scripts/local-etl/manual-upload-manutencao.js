/**
 * Script para fazer upload manual de um arquivo grande para Supabase Storage
 * Usa o mesmo endpoint Edge Function que o ETL principal
 */
require('dotenv').config();
const { Pool } = require('pg');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurado!');
    process.exit(1);
}

const MAX_CHUNK_SIZE = 10000; // Reduzido de 30K para 10K para evitar HTTP 546

const pool = new Pool({ 
    host: process.env.PG_HOST, 
    port: process.env.PG_PORT, 
    user: process.env.PG_USER, 
    password: process.env.PG_PASSWORD, 
    database: process.env.PG_DATABASE 
});

async function uploadChunk(fileName, data, metadata, retryCount = 0) {
    const MAX_RETRIES = 5;
    
    try {
        console.log(`   📤 Uploading ${fileName} (${data.length} registros)...`);
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-dw-to-storage`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileName, data, metadata })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log(`   ✅ Upload concluído: ${fileName} (${result.recordCount} registros)`);
        return true;
    } catch (err) {
        console.error(`   ❌ Erro: ${err.message}`);
        
        if (retryCount < MAX_RETRIES) {
            const delay = 2000 * Math.pow(2, retryCount);
            console.log(`   🔄 Retry ${retryCount + 1}/${MAX_RETRIES} em ${delay/1000}s...`);
            await new Promise(r => setTimeout(r, delay));
            return uploadChunk(fileName, data, metadata, retryCount + 1);
        }
        
        return false;
    }
}

async function run() {
    const tableName = 'fat_manutencao_unificado';
    
    try {
        console.log(`\n🚀 Fazendo upload de ${tableName} para Supabase...\n`);
        
        // Buscar dados do PostgreSQL
        console.log('📊 Buscando dados do PostgreSQL...');
        const result = await pool.query(`SELECT * FROM ${tableName}`);
        const data = result.rows;
        console.log(`   ✅ ${data.length} registros encontrados\n`);
        
        const metadata = {
            generated_at: new Date().toISOString(),
            table: tableName,
            record_count: data.length,
            etl_version: '2.0-manual'
        };
        
        // Dividir em chunks
        const totalChunks = Math.ceil(data.length / MAX_CHUNK_SIZE);
        console.log(`📦 Dividindo em ${totalChunks} partes de até ${MAX_CHUNK_SIZE} registros\n`);
        
        // Upload do manifest
        const manifestFileName = `${tableName}_manifest.json`;
        const manifestData = {
            totalParts: totalChunks,
            total_chunks: totalChunks,
            totalRecords: data.length,
            chunkSize: MAX_CHUNK_SIZE,
            baseFileName: tableName,
        };
        const manifestMetadata = {
            ...metadata,
            kind: 'manifest',
            total_chunks: totalChunks,
            chunk_size: MAX_CHUNK_SIZE,
        };
        
        console.log('📝 Fazendo upload do manifest...');
        await uploadChunk(manifestFileName, manifestData, manifestMetadata);
        
        // Upload de cada chunk
        let allSuccess = true;
        for (let i = 0; i < totalChunks; i++) {
            const chunk = data.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE);
            const chunkFileName = `${tableName}_part${i + 1}of${totalChunks}.json`;
            const chunkMetadata = { 
                ...metadata, 
                chunk: i + 1, 
                total_chunks: totalChunks, 
                record_count: chunk.length 
            };
            
            const success = await uploadChunk(chunkFileName, chunk, chunkMetadata);
            if (!success) allSuccess = false;
        }
        
        if (allSuccess) {
            console.log(`\n✅ Upload completo de ${tableName}!`);
        } else {
            console.log(`\n⚠️ Upload de ${tableName} concluído com erros`);
        }
        
    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

run();
