/**
 * Script para deletar arquivos antigos do Supabase Storage
 */
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurado!');
    process.exit(1);
}

async function deleteFile(fileName) {
    console.log(`🗑️  Deletando ${fileName}...`);
    
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/bi-reports/${fileName}`, {
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

async function run() {
    const filesToDelete = [
        'fat_manutencao_unificado.json',
        // Antigas partes de 2 (se existirem)
        'fat_manutencao_unificado_part1of2.json',
        'fat_manutencao_unificado_part2of2.json',
    ];

    console.log('\n🧹 Limpando arquivos antigos do Supabase Storage...\n');

    for (const file of filesToDelete) {
        await deleteFile(file);
    }

    console.log('\n✅ Limpeza concluída! Recarregue a página do dashboard.\n');
}

run();
