const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('fat_manutencao_unificado_manifest.json'));
const tipos = {};

console.log('🔍 Analisando tipos de ocorrência...\n');

for (let i = 1; i <= manifest.totalParts; i++) {
    console.log(`   📦 Carregando parte ${i}/${manifest.totalParts}...`);
    const chunk = JSON.parse(fs.readFileSync(`fat_manutencao_unificado_part${i}of${manifest.totalParts}.json`));
    
    chunk.forEach(d => {
        const tipo = d.Tipo || 'SEM_TIPO';
        const idTipo = d.IdTipo || 'SEM_ID';
        const key = `${idTipo} | ${tipo}`;
        tipos[key] = (tipos[key] || 0) + 1;
    });
}

console.log('\n📊 DISTRIBUIÇÃO POR TIPO:\n');
Object.entries(tipos).sort((a, b) => b[1] - a[1]).forEach(([tipo, count]) => {
    console.log(`   ${tipo.padEnd(70)} → ${count.toLocaleString('pt-BR')} registros`);
});

console.log(`\n✅ Total: ${manifest.totalRecords.toLocaleString('pt-BR')} registros`);
