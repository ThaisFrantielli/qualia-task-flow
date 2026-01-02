/**
 * Script para popular/atualizar modelos de veículos a partir do cadastro analítico
 * 
 * Critérios:
 * - Somente veículos com Status = "LOCADO" ou "DISPONÍVEL"
 * - Gera código único para cada modelo (montadora-modelo-ano)
 * - Não duplica modelos existentes
 * - Define categoria e valor KM adicional baseado no tipo de veículo
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mapear categorias baseado em palavras-chave no modelo
function detectarCategoria(modelo) {
  const m = (modelo || '').toUpperCase();
  if (m.includes('GOL') || m.includes('ONIX') || m.includes('HB20') || m.includes('UNO') || m.includes('MOBI')) return 'Hatch';
  if (m.includes('COROLLA') || m.includes('CIVIC') || m.includes('JETTA') || m.includes('VIRTUS') || m.includes('LOGAN')) return 'Sedan';
  if (m.includes('TIGUAN') || m.includes('COMPASS') || m.includes('CRETA') || m.includes('T-CROSS') || m.includes('KICKS')) return 'SUV';
  if (m.includes('HILUX') || m.includes('RANGER') || m.includes('S10') || m.includes('TORO') || m.includes('STRADA')) return 'Pickup';
  if (m.includes('MASTER') || m.includes('DUCATO') || m.includes('SPRINTER') || m.includes('BOXER')) return 'Van';
  if (m.includes('TRANSIT') || m.includes('DAILY') || m.includes('CARGO') || m.includes('FIORINO')) return 'Utilitário';
  if (m.includes('AZERA') || m.includes('EQUUS') || m.includes('MAYBACH')) return 'Executivo';
  return 'Compacto'; // Default
}

// Definir valor KM adicional baseado na categoria
function getValorKmAdicional(categoria) {
  const valores = {
    'Hatch': 0.80,
    'Compacto': 0.80,
    'Sedan': 0.70,
    'SUV': 0.70,
    'Pickup': 0.60,
    'Van': 0.60,
    'Utilitário': 0.60,
    'Executivo': 0.50
  };
  return valores[categoria] || 0.75;
}

// Gerar código único para o modelo
function gerarCodigo(montadora, modelo, ano) {
  const montadoraLimpa = (montadora || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const modeloLimpo = (modelo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const anoStr = String(ano || new Date().getFullYear());
  return `${montadoraLimpa.substring(0, 4)}-${modeloLimpo.substring(0, 10)}-${anoStr}`;
}

// Extrair montadora e modelo do campo Modelo
function parseModelo(modeloCompleto) {
  // Exemplos: "VOLKSWAGEN GOL", "FIAT UNO", "TOYOTA COROLLA"
  const partes = (modeloCompleto || '').trim().split(/\s+/);
  if (partes.length >= 2) {
    return {
      montadora: partes[0],
      modelo: partes.slice(1).join(' ')
    };
  }
  return {
    montadora: 'N/I',
    modelo: modeloCompleto || 'N/I'
  };
}

// Extrair ano do modelo (pode vir de campos diferentes)
function extrairAno(veiculo) {
  // Tentar pegar ano do modelo, se não existir, usar ano atual + 1
  const ano = veiculo.AnoModelo || veiculo.Ano || veiculo.AnoFabricacao;
  return ano ? parseInt(ano) : new Date().getFullYear() + 1;
}

async function carregarVeiculosAnaliticos() {
  try {
    console.log('📊 Carregando veículos do sistema analítico...\n');
    
    // Carregar JSON do Supabase Storage
    const { data: files, error: listError } = await supabase.storage
      .from('bi-data')
      .list('', { limit: 100 });
    
    if (listError) throw listError;
    
    const frotaFile = files?.find(f => f.name === 'dim_frota.json');
    if (!frotaFile) {
      console.error('❌ Arquivo dim_frota.json não encontrado no storage');
      return [];
    }
    
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('bi-data')
      .download('dim_frota.json');
    
    if (downloadError) throw downloadError;
    
    const text = await fileData.text();
    const veiculos = JSON.parse(text);
    
    console.log(`✅ Carregados ${veiculos.length} veículos do sistema analítico\n`);
    return veiculos;
    
  } catch (error) {
    console.error('❌ Erro ao carregar veículos:', error.message);
    return [];
  }
}

async function sincronizarModelos() {
  console.log('🚀 Iniciando sincronização de modelos de veículos\n');
  console.log('=' .repeat(60));
  
  // 1. Carregar veículos do sistema analítico
  const veiculos = await carregarVeiculosAnaliticos();
  if (veiculos.length === 0) {
    console.log('⚠️  Nenhum veículo encontrado para sincronizar');
    return;
  }
  
  // 2. Filtrar apenas veículos com status válido
  const statusValidos = ['LOCADO', 'DISPONÍVEL', 'DISPONIVEL', 'EM MOBILIZAÇÃO', 'EM MOBILIZACAO'];
  const veiculosFiltrados = veiculos.filter(v => {
    const status = (v.Status || '').toUpperCase();
    return statusValidos.includes(status);
  });
  
  console.log(`🔍 Filtrados ${veiculosFiltrados.length} veículos com status válido (${statusValidos.join(', ')})\n`);
  
  // 3. Agrupar veículos por modelo único (montadora + modelo + ano)
  const modelosUnicos = new Map();
  
  veiculosFiltrados.forEach(veiculo => {
    const { montadora, modelo } = parseModelo(veiculo.Modelo);
    const ano = extrairAno(veiculo);
    const codigo = gerarCodigo(montadora, modelo, ano);
    
    if (!modelosUnicos.has(codigo)) {
      const categoria = detectarCategoria(modelo);
      modelosUnicos.set(codigo, {
        codigo,
        montadora,
        nome: modelo,
        ano_modelo: ano,
        categoria,
        valor_km_adicional: getValorKmAdicional(categoria),
        preco_publico: veiculo.ValorCompra || 0,
        percentual_desconto: 0,
        ativo: true
      });
    }
  });
  
  console.log(`📦 Identificados ${modelosUnicos.size} modelos únicos\n`);
  
  // 4. Buscar modelos já existentes no banco
  const { data: modelosExistentes, error: fetchError } = await supabase
    .from('modelos_veiculos')
    .select('codigo');
  
  if (fetchError) {
    console.error('❌ Erro ao buscar modelos existentes:', fetchError.message);
    return;
  }
  
  const codigosExistentes = new Set(modelosExistentes?.map(m => m.codigo) || []);
  console.log(`💾 Encontrados ${codigosExistentes.size} modelos já cadastrados no banco\n`);
  
  // 5. Inserir apenas modelos novos
  const modelosNovos = Array.from(modelosUnicos.values()).filter(m => !codigosExistentes.has(m.codigo));
  
  if (modelosNovos.length === 0) {
    console.log('✅ Todos os modelos já estão cadastrados. Nenhuma atualização necessária.\n');
    return;
  }
  
  console.log(`➕ Inserindo ${modelosNovos.length} novos modelos...\n`);
  
  // 6. Inserir em lotes de 50
  const batchSize = 50;
  let inseridos = 0;
  let erros = 0;
  
  for (let i = 0; i < modelosNovos.length; i += batchSize) {
    const batch = modelosNovos.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('modelos_veiculos')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Erro ao inserir lote ${Math.floor(i / batchSize) + 1}:`, error.message);
      erros += batch.length;
    } else {
      inseridos += data?.length || 0;
      console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}: ${data?.length} modelos inseridos`);
    }
  }
  
  // 7. Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA SINCRONIZAÇÃO\n');
  console.log(`   Total de veículos analisados: ${veiculos.length}`);
  console.log(`   Veículos filtrados (status válido): ${veiculosFiltrados.length}`);
  console.log(`   Modelos únicos identificados: ${modelosUnicos.size}`);
  console.log(`   Modelos já existentes: ${codigosExistentes.size}`);
  console.log(`   ✅ Novos modelos inseridos: ${inseridos}`);
  if (erros > 0) {
    console.log(`   ❌ Erros: ${erros}`);
  }
  console.log('='.repeat(60));
}

// Executar
sincronizarModelos()
  .then(() => {
    console.log('\n✅ Sincronização concluída com sucesso!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
