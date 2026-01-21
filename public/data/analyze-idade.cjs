const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('fat_manutencao_unificado_manifest.json'));

console.log('📊 Analisando manutenções abertas por idade...\n');

const idades = {
    '0-5 dias': 0,
    '5-10 dias': 0,
    '10-30 dias': 0,
    '30-60 dias': 0,
    '60-90 dias': 0,
    '90-180 dias': 0,
    '>180 dias': 0
};

let totalAbertas = 0;
let totalFechadas = 0;

for (let i = 1; i <= manifest.totalParts; i++) {
    const chunk = JSON.parse(fs.readFileSync(`fat_manutencao_unificado_part${i}of${manifest.totalParts}.json`));
    
    chunk.forEach(m => {
        const status = (m.StatusOS || m.SituacaoOS || '').toLowerCase();
        const isAberta = status.includes('aberta') || status.includes('em andamento') || status.includes('aguardando');
        
        if (!isAberta) {
            totalFechadas++;
            return;
        }
        
        totalAbertas++;
        
        const dataEntrada = m.DataEntrada ? new Date(m.DataEntrada) : null;
        if (!dataEntrada) return;
        
        const hoje = new Date();
        const diffTime = hoje - dataEntrada;
        const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (dias < 5) idades['0-5 dias']++;
        else if (dias < 10) idades['5-10 dias']++;
        else if (dias < 30) idades['10-30 dias']++;
        else if (dias < 60) idades['30-60 dias']++;
        else if (dias < 90) idades['60-90 dias']++;
        else if (dias < 180) idades['90-180 dias']++;
        else idades['>180 dias']++;
    });
}

console.log(`📋 Status das manutenções:`);
console.log(`   🟢 Fechadas: ${totalFechadas.toLocaleString('pt-BR')}`);
console.log(`   🔴 Abertas: ${totalAbertas.toLocaleString('pt-BR')}\n`);

console.log(`📊 Distribuição das ${totalAbertas.toLocaleString('pt-BR')} manutenções abertas por idade:\n`);
Object.entries(idades).forEach(([faixa, count]) => {
    const pct = totalAbertas > 0 ? ((count / totalAbertas) * 100).toFixed(1) : '0.0';
    console.log(`   ${faixa.padEnd(20)} → ${count.toString().padStart(6)} (${pct}%)`);
});
