#!/usr/bin/env node
/**
 * Diagnóstico: Por que Qual estão sem itens vinculados na timeline
 * Verifica incompatibilidades de matching entre fat_manutencao_unificado e fat_itens_ordem_servico
 */
const fs = require('fs');
const path = require('path');

// ======================
// CONFIGURAÇÃO
// ======================
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

// ======================
// HELPER FUNCTIONS (MATCH LOGIC DO FLEETDASHBOARD)
// ======================
function normalizePlate(v) {
  return String(v ?? '').trim().toUpperCase();
}

function normalizeOccurrence(v) {
  const s = String(v ?? '').trim().toUpperCase();
  if (!s) return '';
  const noPrefix = s.replace(/^QUAL-?/, '').trim();
  const decimalLike = noPrefix.match(/^(\d+)\.0+$/);
  if (decimalLike) return decimalLike[1];
  const digits = noPrefix.replace(/[^0-9]/g, '');
  return digits || noPrefix;
}

// ======================
// MAIN ANALYSIS
// ======================
(async () => {
  console.log('\n📊 DIAGNÓSTICO: Validação de Vinculação QUAL - fat_itens_ordem_servico\n');
  console.log('='.repeat(100) + '\n');

  // Load data
  console.log('📥 Carregando dados...');
  const manutencao = assembleParts('fat_manutencao_unificado') || [];
  const itens = assembleParts('fat_itens_ordem_servico') || [];

  console.log(`   ✅ fat_manutencao_unificado: ${manutencao.length.toLocaleString('pt-BR')} registros`);
  console.log(`   ✅ fat_itens_ordem_servico: ${itens.length.toLocaleString('pt-BR')} registros\n`);

  // Build itens map (simulating FleetDashboard logic)
  const itensMap = new Map();
  const keyCounts = {};
  for (const r of itens) {
    const idKey = String(r?.IdOrdemServico ?? r?.idordemservico ?? '').trim();
    const osKey = String(r?.OrdemServico ?? r?.ordemservico ?? r?.OS ?? r?.os ?? '').trim();
    const occIdKey = normalizeOccurrence(r?.IdOcorrencia ?? r?.idocorrencia);
    const occCodeKey = normalizeOccurrence(r?.Ocorrencia ?? r?.ocorrencia);
    const plateKey = normalizePlate(r?.Placa ?? r?.placa);

    const keys = [];
    if (idKey) keys.push(idKey);
    if (osKey) keys.push(osKey);
    if (occIdKey) keys.push(`occ:${occIdKey}`);
    if (occCodeKey) keys.push(`occ:${occCodeKey}`);
    if (plateKey) keys.push(`placa:${plateKey}`);
    if (occIdKey && plateKey) keys.push(`occplaca:${occIdKey}:${plateKey}`);
    if (occCodeKey && plateKey) keys.push(`occplaca:${occCodeKey}:${plateKey}`);

    for (const k of keys) {
      itensMap.set(k, r);
      keyCounts[k] = (keyCounts[k] || 0) + 1;
    }
  }

  // Analyze manutencao matching
  const withValues = [];
  const without = [];
  const missingKeyTypes = {};

  console.log('🔍 Analisando matching entre OS e itens...\n');

  for (const m of manutencao) {
    const idKey = String(m?.IdOrdemServico ?? m?.idordemservico ?? '').trim();
    const osKey = String(m?.OrdemServico ?? m?.ordemservico ?? m?.OS ?? m?.os ?? '').trim();
    const occId = normalizeOccurrence(m?.IdOcorrencia ?? m?.idocorrencia);
    const occCode = normalizeOccurrence(m?.Ocorrencia ?? m?.ocorrencia);
    const placa = normalizePlate(m?.Placa ?? m?.placa);

    // Detect which keys are empty
    const emptyKeys = [];
    if (!idKey) emptyKeys.push('IdOrdemServico');
    if (!osKey) emptyKeys.push('OrdemServico/OS');
    if (!occId) emptyKeys.push('IdOcorrencia');
    if (!occCode) emptyKeys.push('Ocorrencia');
    if (!placa) emptyKeys.push('Placa');

    // Try all matching strategies (same order as FleetDashboard)
    const matched =
      itensMap.get(idKey) ||
      itensMap.get(osKey) ||
      itensMap.get(`occplaca:${occId}:${placa}`) ||
      itensMap.get(`occplaca:${occCode}:${placa}`) ||
      itensMap.get(`occ:${occId}`) ||
      itensMap.get(`occ:${occCode}`) ||
      itensMap.get(`placa:${placa}`) ||
      null;

    if (matched) {
      withValues.push({
        placa,
        osId: idKey,
        osNum: osKey,
        occId,
        occCode,
        matchedKey: 'found'
      });
    } else {
      without.push({
        placa,
        osId: idKey || '[VAZIO]',
        osNum: osKey || '[VAZIO]',
        occId: occId || '[VAZIO]',
        occCode: occCode || '[VAZIO]',
        emptyKeys: emptyKeys.length > 0 ? emptyKeys : ['nenhum (todos com valor)']
      });
    }
  }

  // ======================
  // RESULTS
  // ======================
  console.log(`\n✅ OS COM ITENS VINCULADOS: ${withValues.length.toLocaleString('pt-BR')} / ${manutencao.length.toLocaleString('pt-BR')}`);
  console.log(`❌ OS SEM ITEMS VINCULADOS: ${without.length.toLocaleString('pt-BR')} / ${manutencao.length.toLocaleString('pt-BR')}`);
  console.log(`📊 COBERTURA: ${((withValues.length / manutencao.length) * 100).toFixed(2)}%\n`);

  // Show why records are missing
  if (without.length > 0) {
    console.log('='.repeat(100));
    console.log('\n🔴 ANÁLISE - Por QUÊ registros NÃO têm itens vinculados?\n');

    // Group by reason
    const reasons = {};
    for (const item of without) {
      const reason = item.emptyKeys.join(', ');
      if (!reasons[reason]) reasons[reason] = [];
      reasons[reason].push(item);
    }

    for (const [reason, items] of Object.entries(reasons)) {
      console.log(`\n   ${reason}: ${items.length.toLocaleString('pt-BR')} registros`);
      console.log('   ' + '-'.repeat(90));

      // Show first 3 examples
      for (let i = 0; i < Math.min(3, items.length); i++) {
        const m = items[i];
        console.log(`      Exemplo ${i + 1}:`);
        console.log(`        - Placa: ${m.placa || '[VAZIO]'}`);
        console.log(`        - IdOrdemServico: ${m.osId}`);
        console.log(`        - OrdemServico: ${m.osNum}`);
        console.log(`        - IdOcorrencia: ${m.occId}`);
        console.log(`        - Ocorrencia: ${m.occCode}`);
      }
    }
  }

  // Show keys distribution
  console.log('\n' + '='.repeat(100));
  console.log('\n📈 DISTRIBUIÇÃO DE CHAVES EM fat_itens_ordem_servico\n');
  
  const sortedKeys = Object.entries(keyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  for (const [key, count] of sortedKeys) {
    const pct = ((count / itens.length) * 100).toFixed(1);
    console.log(`   • ${key.substring(0, 60).padEnd(60)}: ${count.toLocaleString('pt-BR').padStart(7)} (${pct.padStart(5)}%)`);
  }

  // Recommendations
  console.log('\n' + '='.repeat(100));
  console.log('\n💡 RECOMENDAÇÕES:\n');

  if (without.length / manutencao.length > 0.1) {
    console.log('   ⚠️  Mais de 10% das OS não têm itens: há incompatibilidade significativa');
    console.log('   📍 AÇÕES:');
    console.log('      1. Verificar se fat_itens_ordem_servico tem dados recentes (sincronização completa?)');
    console.log('      2. Verificar campos de chave (IdOrdemServico, OrdemServico, IdOcorrencia, Ocorrencia)');
    console.log('      3. Verificar se há filtros/limites no carregamento de itens (fat_itens_ordem_servico está truncado?)');
    console.log('      4. Rodar: node scripts/local-etl/run-sync-v2.js ou version mais recente\n');
  } else {
    console.log('   ✅ Cobertura aceitável - maioria das OS têm itens vinculados');
    console.log('   📍 Para melhorar:');
    console.log('      1. Verificar OS sem itens (lista acima) - investigar dados origem');
    console.log('      2. Garantir sincronização regular (3x/dia via workflow)\n');
  }

  console.log('='.repeat(100) + '\n');
})();
