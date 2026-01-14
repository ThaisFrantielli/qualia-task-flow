/**
 * Script para limpar TODOS os arquivos do bucket 'bi-reports' no Supabase Storage
 * 
 * Uso: node scripts/cleanup-bi-reports-bucket.js
 */
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://apqrjkobktjcyrxhqwtm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.includes('COLE_AQUI')) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurado corretamente!');
    console.error('   Configure a variável no arquivo .env');
    process.exit(1);
}

const BUCKET_NAME = 'bi-reports';

async function listAllFiles() {
    console.log(`📂 Listando arquivos no bucket "${BUCKET_NAME}"...`);
    
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET_NAME}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prefix: '',
            limit: 1000,
            offset: 0
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro ao listar arquivos: ${response.status} - ${text}`);
    }

    const files = await response.json();
    return files.filter(f => f.name); // Filtra apenas arquivos (não pastas vazias)
}

async function deleteFile(fileName) {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${fileName}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
    });

    if (response.ok) {
        console.log(`   ✅ Deletado: ${fileName}`);
        return true;
    } else {
        const text = await response.text();
        console.error(`   ❌ Erro ao deletar ${fileName}: ${response.status} - ${text}`);
        return false;
    }
}

async function deleteMultipleFiles(fileNames) {
    // API de delete em batch
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prefixes: fileNames
        })
    });

    return response.ok;
}

async function run() {
    console.log('\n🧹 ========================================');
    console.log('   LIMPEZA DO BUCKET BI-REPORTS');
    console.log('   ========================================\n');

    try {
        // 1. Listar todos os arquivos
        const files = await listAllFiles();
        
        if (files.length === 0) {
            console.log('✨ O bucket já está vazio! Nenhum arquivo para deletar.');
            return;
        }

        console.log(`\n📋 Encontrados ${files.length} arquivo(s):`);
        files.forEach(f => console.log(`   - ${f.name} (${(f.metadata?.size / 1024 / 1024).toFixed(2) || '?'} MB)`));

        // 2. Calcular tamanho total
        const totalSize = files.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);
        console.log(`\n📊 Tamanho total: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

        // 3. Deletar arquivos um por um (mais confiável)
        console.log('\n🗑️  Deletando arquivos...\n');
        
        let deleted = 0;
        let failed = 0;

        for (const file of files) {
            const success = await deleteFile(file.name);
            if (success) deleted++;
            else failed++;
        }

        // 4. Resumo
        console.log('\n========================================');
        console.log(`✅ Deletados: ${deleted} arquivo(s)`);
        if (failed > 0) {
            console.log(`❌ Falhas: ${failed} arquivo(s)`);
        }
        console.log(`💾 Espaço liberado: ~${(totalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log('========================================\n');

    } catch (error) {
        console.error('\n❌ Erro durante a limpeza:', error.message);
        process.exit(1);
    }
}

run();
