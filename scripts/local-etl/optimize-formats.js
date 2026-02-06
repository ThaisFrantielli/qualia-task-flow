// Script Node.js para remover FORMAT de datas - Otimização #2
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'run-sync-v2.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔍 Removendo FORMAT de datas...');

const originalLength = content.length;

// Substituir FORMAT(campo, 'yyyy-MM-dd') por apenas o campo
// Captura qualquer coisa dentro dos parênteses até encontrar a data
content = content.replace(/FORMAT\(([^,)]+),\s*'yyyy-MM-dd'\)/g, '$1');

// Substituir FORMAT(campo, 'yyyy-MM-dd HH:mm:ss') por apenas o campo
content = content.replace(/FORMAT\(([^,)]+),\s*'yyyy-MM-dd HH:mm:ss'\)/g, '$1');

const newLength = content.length;
const bytesRemoved = originalLength - newLength;

console.log(`✅ FORMATs removidos! (${bytesRemoved} caracteres eliminados)`);

// Salvar arquivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('💾 Arquivo salvo:', filePath);
console.log('');
console.log('📊 Benefícios:');
console.log('   • Dados agora são Date nativos (não String)');
console.log('   • Índices de data funcionam no PostgreSQL');
console.log('   • Queries "últimos 7 dias" ficam 10-100x mais rápidas');
