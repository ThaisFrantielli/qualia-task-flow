// Script para implementar Otimizações #3 e #4
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'run-sync-v2.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Aplicando Otimização #3: Zero-Downtime Transactions...');

// OTIMIZAÇÃO #3: Mover DELETE para dentro da transação
// Substituir o padrão:
//   if (!shouldDedup) {
//       await pgClient.query(`DELETE FROM public.${tableName}`);
//   }
//   ...
//   await client.query('BEGIN');
// 
// Por:
//   await client.query('BEGIN');
//   if (!shouldDedup) {
//       await client.query(`TRUNCATE TABLE public.${tableName}`);
//   }

// Encontrar o bloco problemático (DELETE antes da transação)
const deletePattern = /\/\/ Para tabelas históricas sem deduplicação automática\s+if \(!shouldDedup\) {\s+await pgClient\.query\(`DELETE FROM public\.\$\{tableName\}`\);\s+}/;
const transactionPattern = /(\/\/ Usar transação única para todos os batches da tabela\s+const client = await pgClient\.connect\(\);\s+try {\s+await client\.query\('BEGIN'\);)/;

// Remover o DELETE que está fora da transação
content = content.replace(deletePattern, '// DELETE movido para dentro da transação (Otimização #3)');

// Adicionar TRUNCATE logo após BEGIN
content = content.replace(
    transactionPattern,
    `$1

            // TRUNCATE para tabelas históricas (dentro da transação - Zero Downtime)
            if (!shouldDedup) {
                await client.query(\`TRUNCATE TABLE public.\${tableName}\`);
            }`
);

console.log('✅ Transações Zero-Downtime implementadas!');
console.log('');
console.log('🗑️ Aplicando Otimização #4: Remover Deduplicação JavaScript...');

// OTIMIZAÇÃO #4: Remover todas as lógicas de deduplicação JS
// Vamos comentar/simplificar os blocos de deduplicação

// 1. Remover deduplicação no modo JSON_ONLY (linha ~1638)
content = content.replace(
    /\/\/ Não deduplicar para o fato do DRE — queremos todas as linhas por natureza\s+if \(hasIdColumn && tableName !== 'fato_financeiro_dre'\) {\s+const seen = new Map\(\);\s+sanitizedData\.forEach\(row => seen\.set\(row\[pkRaw\], row\)\);\s+finalData = Array\.from\(seen\.values\(\)\);\s+}/,
    `// OTIMIZAÇÃO: Deduplicação removida - PostgreSQL ON CONFLICT cuida disso
            // (Modo JSON_ONLY simplificado)`
);

// 2. Remover deduplicação principal (linha ~1704-1714)
content = content.replace(
    /if \(shouldDedup\) {\s+const seen = new Map\(\);\s+sanitizedData\.forEach\(row => {\s+seen\.set\(row\[pkRaw\], row\); \/\/ Última ocorrência sobrescreve\s+}\);\s+finalData = Array\.from\(seen\.values\(\)\);\s+if \(finalData\.length < sanitizedData\.length\) {\s+console\.log\(`\s+⚠️  Removidas \$\{sanitizedData\.length - finalData\.length\} duplicatas de \$\{tableName\}`\);\s+}\s+}/,
    `// OTIMIZAÇÃO: Deduplicação JS removida - ON CONFLICT DO UPDATE cuida de duplicatas
        // PostgreSQL gerencia isso de forma nativa e mais eficiente`
);

// 3. Remover deduplicação JavaScript adicional (linha ~1738-1752)
content = content.replace(
    /\/\/ Deduplicação JavaScript apenas para tabelas específicas com PK incorreta\s+if \(needsJSDedup\.includes\(tableName\)\) \{[^}]+const seen = new Set\(\);[^}]+finalData = finalData\.filter\(row => \{[^}]+const pkValue = row\[columns\[0\]\];[^}]+if \(seen\.has\(pkValue\)\) \{[^}]+return false;[^}]+\}[^}]+seen\.add\(pkValue\);[^}]+return true;[^}]+}\);[^}]+const removedCount = originalCount - finalData\.length;[^}]+if \(removedCount > 0\) \{[^}]+console\.log\(`\s+🔄 Removidas \$\{removedCount\} duplicatas JS de \$\{tableName\}`\);[^}]+\}[^}]+}/,
    `// OTIMIZAÇÃO: Deduplicação JS removida - needsJSDedup não necessário
        // PostgreSQL ON CONFLICT gerencia duplicatas automaticamente`
);

console.log('✅ Deduplicação JavaScript removida!');

// Salvar arquivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('💾 Arquivo salvo:', filePath);
console.log('');
console.log('📊 Resumo das Otimizações:');
console.log('   #3 ✅ Zero-Downtime: TRUNCATE dentro da transação');
console.log('   #4 ✅ Sem deduplicação JS: PostgreSQL ON CONFLICT cuida disso');
console.log('');
console.log('🚀 Benefícios:');
console.log('   • Dashboard nunca vê tabelas vazias ou parciais');
console.log('   • Processamento de milhões de registros sem Heap Out of Memory');
console.log('   • Código mais simples e confiável');
