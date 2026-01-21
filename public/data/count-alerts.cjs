const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('fat_manutencao_unificado_manifest.json'));

console.log('📊 Simulando geração de alertas...\n');

let totalManutencoes = 0;
let totalAlerts = 0;
let totalCriticos = 0;
let totalAtencao = 0;

// Parâmetros do useMaintenanceAlerts
const DIAS_CRITICO = 10;
const DIAS_ATENCAO = 5;

for (let i = 1; i <= manifest.totalParts; i++) {
    const chunk = JSON.parse(fs.readFileSync(`fat_manutencao_unificado_part${i}of${manifest.totalParts}.json`));
    
    chunk.forEach(m => {
        totalManutencoes++;
        
        // Filtrar apenas abertas (mesma lógica do useMaintenanceAlerts)
        const status = (m.StatusOS || m.SituacaoOS || '').toLowerCase();
        const isAberta = status.includes('aberta') || status.includes('em andamento') || status.includes('aguardando');
        
        if (!isAberta) return;
        
        // Calcular dias desde entrada
        const dataEntrada = m.DataEntrada ? new Date(m.DataEntrada) : null;
        if (!dataEntrada) return;
        
        const hoje = new Date();
        const diffTime = hoje - dataEntrada;
        const diasNaOficina = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diasNaOficina >= DIAS_CRITICO) {
            totalAlerts++;
            totalCriticos++;
        } else if (diasNaOficina >= DIAS_ATENCAO) {
            totalAlerts++;
            totalAtencao++;
        }
    });
}

console.log(`✅ Total de manutenções: ${totalManutencoes.toLocaleString('pt-BR')}`);
console.log(`\n📋 Alertas gerados:`);
console.log(`   🔴 Críticos (>= ${DIAS_CRITICO} dias): ${totalCriticos.toLocaleString('pt-BR')}`);
console.log(`   🟡 Atenção (>= ${DIAS_ATENCAO} dias): ${totalAtencao.toLocaleString('pt-BR')}`);
console.log(`   📊 Total de alertas: ${totalAlerts.toLocaleString('pt-BR')}`);

const reducao = ((1 - totalAlerts / 3981) * 100).toFixed(1);
console.log(`\n🎯 Redução de alertas: ${reducao}% (de 3.981 para ${totalAlerts})`);
