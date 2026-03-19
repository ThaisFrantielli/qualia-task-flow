#!/usr/bin/env node
/**
 * Diagnóstico Profundo: Verificar estrutura de dados
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'public', 'data');

function safeReadJSON(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
}

function assembleParts(base) {
  const manifest = safeReadJSON(path.join(dataDir, `${base}_manifest.json`));
  if (!manifest || !manifest.totalParts) return [];
  const parts = [];
  for (let i = 1; i <= manifest.totalParts; i++) {
    const part = safeReadJSON(path.join(dataDir, `${base}_part${i}of${manifest.totalParts}.json`));
    if (part) parts.push(...(Array.isArray(part) ? part : []));
  }
  return parts;
}

function getFieldStats(records, sampleSize = 100) {
  if (records.length === 0) return null;
  
  const sample = records.slice(0, Math.min(sampleSize, records.length));
  const allFields = new Set();
  sample.forEach(r => Object.keys(r).forEach(k => allFields.add(k)));
  
  const stats = {};
  for (const field of allFields) {
    const filled = sample.filter(r => r[field] != null && String(r[field]).trim() !== '').length;
    stats[field] = {
      count: filled,
      percent: ((filled / sample.length) * 100).toFixed(1)
    };
  }
  
  return Object.entries(stats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
}

(async () => {
  console.log('\n🔬 DIAGNÓSTICO PROFUNDO - Estrutura de Dados\n');
  console.log('='.repeat(100) + '\n');

  // Check what files exist
  console.log('📂 Arquivos em public/data/:\n');
  const files = fs.readdirSync(dataDir).filter(f => f.includes('manifest'));
  for (const f of files) {
    const size = fs.statSync(path.join(dataDir, f)).size;
    console.log(`   ${f} (${(size / 1024).toFixed(2)} KB)`);
  }

  console.log('\n' + '='.repeat(100) + '\n');

  // Load and analyze
  console.log('📊 ANÁLISE POR TABELA:\n');

  const tables = [
    'fat_manutencao_unificado',
    'fat_itens_ordem_servico',
    'hist_vida_veiculo_timeline'
  ];

  for (const table of tables) {
    const manifest = safeReadJSON(path.join(dataDir, `${table}_manifest.json`));
    if (!manifest) {
      console.log(`⚠️  ${table}: MANIFEST NÃO ENCONTRADO\n`);
      continue;
    }

    console.log(`✅ ${table}`);
    console.log(`   📦 Total de partes: ${manifest.totalParts}`);
    console.log(`   📋 Total de registros: ${(manifest.totalRecords || manifest.total_records || 0).toLocaleString('pt-BR')}`);
    
    const data = assembleParts(table);
    console.log(`   ✓ Carregados: ${data.length.toLocaleString('pt-BR')} registros`);

    if (data.length > 0) {
      console.log(`   📋 Primeiros campos (amostra de 100):`);
      const stats = getFieldStats(data, 100);
      
      let count = 0;
      for (const [field, stat] of Object.entries(stats)) {
        if (count++ >= 10) break;
        console.log(`      • ${field}: ${stat.count}/100 preenchidos (${stat.percent}%)`);
      }
    }

    console.log('');
  }

  // Specific check for linking fields
  console.log('\n' + '='.repeat(100) + '\n');
  console.log('🔗 VERIFICAÇÃO DE CAMPOS DE VINCULAÇÃO\n');

  const manutencao = assembleParts('fat_manutencao_unificado');
  if (manutencao.length > 0) {
    const sample = manutencao.slice(0, 100);
    const linkFields = [
      'IdOrdemServico', 'idordemservico',
      'OrdemServico', 'ordemservico', 'OS', 'os',
      'IdOcorrencia', 'idocorrencia',
      'Ocorrencia', 'ocorrencia',
      'Placa', 'placa'
    ];

    console.log('fat_manutencao_unificado (amostra 100):\n');
    for (const field of linkFields) {
      const filled = sample.filter(r => r[field] != null && String(r[field]).trim() !== '').length;
      if (filled > 0) {
        const firstVal = sample.find(r => r[field])?.[(field)];
        console.log(`   ✓ ${field.padEnd(20)}: ${filled} / 100 (ex: ${String(firstVal).substring(0, 40)})`);
      }
    }
  }

  const itens = assembleParts('fat_itens_ordem_servico');
  console.log(`\nfat_itens_ordem_servico: ${itens.length} registros\n`);
  if (itens.length === 0) {
    console.log('   🔴 TABELA VAZIA! Nenhum registro carregado.\n');
    console.log('   💡 Possíveis causas:');
    console.log('      1. Sincronização nunca foi executada');
    console.log('      2. Limite de carregamento é zero na API');
    console.log('      3. Tabela foi truncada no banco');
    console.log('      4. Arquivo JSON está corrompido\n');
  } else {
    const sample = itens.slice(0, 100);
    const linkFields = [
      'IdOrdemServico', 'idordemservico',
      'OrdemServico', 'ordemservico', 'OS', 'os',
      'IdOcorrencia', 'idocorrencia',
      'Ocorrencia', 'ocorrencia',
      'Placa', 'placa'
    ];

    console.log('fat_itens_ordem_servico (amostra 100):\n');
    for (const field of linkFields) {
      const filled = sample.filter(r => r[field] != null && String(r[field]).trim() !== '').length;
      if (filled > 0) {
        const firstVal = sample.find(r => r[field])?.[field];
        console.log(`   ✓ ${field.padEnd(20)}: ${filled} / 100 (ex: ${String(firstVal).substring(0, 40)})`);
      }
    }
  }

  console.log('\n' + '='.repeat(100) + '\n');
})();
