/**
 * Script para popular tabela modelos_veiculos a partir do DW BluFleet
 * 
 * Este script:
 * 1. Conecta no DW BluFleet (SQL Server)
 * 2. Busca veículos com status 'Disponível' ou 'Em Andamento'
 * 3. Extrai modelos únicos (Montadora + Modelo)
 * 4. Insere na tabela modelos_veiculos no Supabase
 * 5. Gera ID único baseado em hash (evita duplicação)
 */

const sql = require('mssql');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

// Configurações SQL Server (DW)
const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

// Configurações Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Gera ID único baseado em hash de montadora + modelo + ano
 * Garante que o mesmo modelo não seja duplicado
 */
function generateUniqueModelId(montadora, modelo, ano) {
  const input = `${montadora.toLowerCase().trim()}-${modelo.toLowerCase().trim()}-${ano}`;
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
}

/**
 * Normaliza nome de montadora (padroniza)
 */
function normalizeMontadora(montadora) {
  if (!montadora) return 'Não Informado';
  
  const normalize = {
    'VW': 'Volkswagen',
    'GM': 'Chevrolet',
    'FIAT': 'Fiat',
    'FORD': 'Ford',
    'RENAULT': 'Renault',
    'TOYOTA': 'Toyota',
    'HYUNDAI': 'Hyundai',
    'HONDA': 'Honda',
    'NISSAN': 'Nissan',
    'JEEP': 'Jeep',
    'CITROEN': 'Citroën',
    'PEUGEOT': 'Peugeot',
  };
  
  const upper = montadora.toUpperCase().trim();
  return normalize[upper] || montadora.trim();
}

/**
 * Categoriza veículo baseado no modelo/tipo
 */
function categorizeVehicle(modelo, tipo) {
  const modeloLower = (modelo || '').toLowerCase();
  const tipoLower = (tipo || '').toLowerCase();
  
  if (tipoLower.includes('pick') || modeloLower.includes('pick')) return 'pickup';
  if (tipoLower.includes('suv') || modeloLower.includes('suv')) return 'suv';
  if (tipoLower.includes('van') || modeloLower.includes('van')) return 'van';
  if (tipoLower.includes('utilitário') || modeloLower.includes('utilitário')) return 'utilitario';
  if (tipoLower.includes('sedan') || modeloLower.includes('sedan')) return 'sedan';
  
  return 'hatch'; // default
}

async function main() {
  console.log('🚀 Iniciando importação de modelos do DW...\n');
  
  let pool;
  
  try {
    // 1. Conectar no SQL Server
    console.log('📡 Conectando ao DW BluFleet...');
    pool = await sql.connect(sqlConfig);
    console.log('✅ Conectado ao DW\n');
    
    // 2. Buscar veículos disponíveis ou em andamento
    console.log('🔍 Buscando veículos no DW...');
    const result = await pool.request().query(`
      SELECT DISTINCT
        MARCA as montadora,
        MODELO as modelo,
        ANO_MODELO as ano_modelo,
        TIPO as tipo,
        COUNT(*) as quantidade
      FROM dbo.Veiculos
      WHERE STATUS IN ('Disponível', 'Em Andamento')
        AND MARCA IS NOT NULL
        AND MODELO IS NOT NULL
        AND ANO_MODELO IS NOT NULL
      GROUP BY MARCA, MODELO, ANO_MODELO, TIPO
      ORDER BY MARCA, MODELO, ANO_MODELO DESC
    `);
    
    console.log(`✅ Encontrados ${result.recordset.length} modelos únicos\n`);
    
    // 3. Processar e inserir modelos
    console.log('💾 Processando modelos...\n');
    
    const modelosToInsert = [];
    const existingModels = new Set();
    
    // Buscar modelos já existentes no Supabase
    const { data: existingData } = await supabase
      .from('modelos_veiculos')
      .select('montadora, nome, ano_modelo');
    
    if (existingData) {
      existingData.forEach(m => {
        const key = `${m.montadora}-${m.nome}-${m.ano_modelo}`;
        existingModels.add(key.toLowerCase());
      });
    }
    
    for (const row of result.recordset) {
      const montadora = normalizeMontadora(row.montadora);
      const modelo = row.modelo.trim();
      const anoModelo = row.ano_modelo;
      const categoria = categorizeVehicle(modelo, row.tipo);
      
      // Verificar se já existe
      const key = `${montadora}-${modelo}-${anoModelo}`.toLowerCase();
      if (existingModels.has(key)) {
        console.log(`⏭️  Pulando (já existe): ${montadora} ${modelo} ${anoModelo}`);
        continue;
      }
      
      // Valores default para campos não disponíveis no DW
      const modeloData = {
        montadora: montadora,
        nome: modelo,
        ano_modelo: anoModelo,
        categoria: categoria,
        preco_publico: 0, // Deve ser preenchido manualmente
        percentual_desconto: 0,
        valor_final: 0,
        valor_km_adicional: 0.70, // Valor default
        consumo_medio: 12.0, // Valor default
        ativo: true,
      };
      
      modelosToInsert.push(modeloData);
      console.log(`✅ Preparado: ${montadora} ${modelo} ${anoModelo} (${row.quantidade} unidades no DW)`);
    }
    
    // 4. Inserir no Supabase em lote
    if (modelosToInsert.length > 0) {
      console.log(`\n💾 Inserindo ${modelosToInsert.length} novos modelos no Supabase...\n`);
      
      const { data, error } = await supabase
        .from('modelos_veiculos')
        .insert(modelosToInsert)
        .select();
      
      if (error) {
        console.error('❌ Erro ao inserir modelos:', error);
        throw error;
      }
      
      console.log(`✅ ${data.length} modelos inseridos com sucesso!\n`);
      
      // Mostrar resumo
      console.log('📊 RESUMO:');
      console.log(`   Total de modelos únicos no DW: ${result.recordset.length}`);
      console.log(`   Modelos já existentes: ${result.recordset.length - modelosToInsert.length}`);
      console.log(`   Novos modelos inseridos: ${data.length}`);
      
    } else {
      console.log('\n✅ Nenhum modelo novo para inserir (todos já existem)\n');
    }
    
  } catch (error) {
    console.error('❌ Erro durante importação:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Desconectado do DW');
    }
  }
  
  console.log('\n✅ Importação concluída!');
  process.exit(0);
}

// Executar
main();
