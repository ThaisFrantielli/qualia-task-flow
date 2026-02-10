// Patch cirúrgico: Restaurar deduplicação APENAS para tabelas com duplicatas reais
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'run-sync-v2.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Aplicando patch: Deduplicação seletiva...');

// Encontrar e substituir o bloco de deduplicação comentado
const dedupPattern = /\/\/ OTIMIZA├ç├âO: Deduplica├º├úo JS removida - ON CONFLICT DO UPDATE cuida de duplicatas\s+\/\/ PostgreSQL gerencia isso de forma nativa e mais eficiente/;

const newDedupCode = `// OTIMIZAÇÃO AJUSTADA: Deduplicação seletiva para tabelas com duplicatas reais
        // Estas tabelas TÊM duplicatas nos dados de origem que causam erro "ON CONFLICT cannot affect row a second time"
        const tablesWithRealDuplicates = [
            'dim_movimentacao_veiculos',
            'dim_veiculos_acessorios', 
            'dim_movimentacao_patios',
            'fat_faturamentos',
            'fat_detalhe_itens_os'
        ];

        if (shouldDedup && tablesWithRealDuplicates.includes(tableName)) {
            const seen = new Map();
            sanitizedData.forEach(row => {
                seen.set(row[pkRaw], row); // Última ocorrência sobrescreve
            });
            finalData = Array.from(seen.values());

            if (finalData.length < sanitizedData.length) {
                console.log(\`         ⚠️  Removidas \${sanitizedData.length - finalData.length} duplicatas de \${tableName}\`);
            }
        }`;

content = content.replace(dedupPattern, newDedupCode);

// Salvar
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Patch aplicado!');
console.log('');
console.log('📋 Deduplicação ativa APENAS para:');
console.log('   • dim_movimentacao_veiculos');
console.log('   • dim_veiculos_acessorios');
console.log('   • dim_movimentacao_patios');
console.log('   • fat_faturamentos');
console.log('   • fat_detalhe_itens_os');
console.log('');
console.log('🎯 Outras tabelas: PostgreSQL ON CONFLICT gerencia (sem overhead JS)');
