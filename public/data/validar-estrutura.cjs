/**
 * Script para validar estrutura dos dados sincronizados
 * Verifica se todos os campos esperados estão presentes
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validando estrutura dos dados...\n');

// Carregar primeira parte dos dados
const part1Path = path.join(__dirname, 'fat_manutencao_unificado_part1of4.json');
const data = JSON.parse(fs.readFileSync(part1Path, 'utf8'));

console.log(`📦 ${data.length} registros carregados\n`);

// Pegar primeiro registro como amostra
const sample = data[0];

// Campos essenciais esperados
const camposEsperados = [
  'IdOcorrencia',
  'Placa',
  'IdTipo',
  'Tipo',
  'SituacaoOcorrencia',
  'StatusSimplificado',
  'DataCriacao',
  'DataEntrada',
  'DiasAberta',
  'Fornecedor',
  'Cliente',
  'ContratoLocacao'
];

console.log('✅ CAMPOS PRESENTES:');
camposEsperados.forEach(campo => {
  const presente = campo in sample;
  const valor = presente ? sample[campo] : 'N/A';
  console.log(`   ${presente ? '✓' : '✗'} ${campo}: ${valor}`);
});

console.log('\n📊 AMOSTRA COMPLETA (primeiros 5 campos):');
const primeirosCampos = Object.keys(sample).slice(0, 5);
primeirosCampos.forEach(campo => {
  console.log(`   ${campo}: ${sample[campo]}`);
});

console.log(`\n💡 Total de campos: ${Object.keys(sample).length}`);

// Validar tipos
console.log('\n🔍 VALIDANDO TIPOS:');
const tiposUnicos = new Set(data.map(d => d.Tipo).filter(Boolean));
console.log(`   Tipos únicos: ${Array.from(tiposUnicos).join(', ')}`);

const idTiposUnicos = new Set(data.map(d => d.IdTipo).filter(Boolean));
console.log(`   IdTipo únicos: ${Array.from(idTiposUnicos).join(', ')}`);

const statusUnicos = new Set(data.slice(0, 100).map(d => d.SituacaoOcorrencia).filter(Boolean));
console.log(`   Status únicos (amostra): ${Array.from(statusUnicos).join(', ')}`);

console.log('\n✅ Validação concluída!');
