/**
 * Análise de campos vazios/null nos dados sincronizados
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Analisando campos vazios...\n');

// Carregar primeira parte
const part1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fat_manutencao_unificado_part1of4.json'), 'utf8'));

console.log(`📦 Analisando ${part1.length} registros\n`);

// Campos importantes para o dashboard
const camposImportantes = [
  'Placa',
  'Tipo',
  'IdTipo',
  'SituacaoOcorrencia',
  'StatusSimplificado',
  'DataCriacao',
  'DataEntrada',
  'DiasAberta',
  'Fornecedor',
  'ClienteContrato',
  'NomeCliente',
  'Modelo',
  'CategoriaVeiculo',
  'ValorOrcamento',
  'ValorPrevisto',
  'ValorRealizado',
  'Odometro',
  'Cidade',
  'Estado'
];

// Contar campos vazios
const estatisticas = {};

camposImportantes.forEach(campo => {
  const vazios = part1.filter(d => !d[campo] || d[campo] === null || d[campo] === '').length;
  const percentual = (vazios / part1.length * 100).toFixed(1);
  estatisticas[campo] = {
    vazios,
    preenchidos: part1.length - vazios,
    percentual
  };
});

// Mostrar resultados
console.log('📊 CAMPOS COM DADOS VAZIOS:\n');
Object.entries(estatisticas)
  .sort((a, b) => b[1].vazios - a[1].vazios)
  .forEach(([campo, stats]) => {
    const emoji = stats.percentual > 50 ? '❌' : stats.percentual > 20 ? '⚠️' : '✅';
    console.log(`   ${emoji} ${campo.padEnd(25)} → ${stats.vazios.toString().padStart(6)} vazios (${stats.percentual}%)`);
  });

// Mostrar amostras de registros
console.log('\n📋 AMOSTRA DE DADOS (3 registros):');
part1.slice(0, 3).forEach((reg, idx) => {
  console.log(`\n   Registro ${idx + 1}:`);
  console.log(`   - IdOcorrencia: ${reg.IdOcorrencia}`);
  console.log(`   - Placa: ${reg.Placa}`);
  console.log(`   - Tipo: ${reg.Tipo}`);
  console.log(`   - Status: ${reg.SituacaoOcorrencia}`);
  console.log(`   - Fornecedor: ${reg.Fornecedor || 'VAZIO'}`);
  console.log(`   - Cliente: ${reg.ClienteContrato || reg.NomeCliente || 'VAZIO'}`);
  console.log(`   - Modelo: ${reg.Modelo || 'VAZIO'}`);
  console.log(`   - Categoria: ${reg.CategoriaVeiculo || 'VAZIO'}`);
  console.log(`   - Valor: ${reg.ValorRealizado || reg.ValorPrevisto || reg.ValorOrcamento || 'VAZIO'}`);
});

console.log('\n✅ Análise concluída!');
