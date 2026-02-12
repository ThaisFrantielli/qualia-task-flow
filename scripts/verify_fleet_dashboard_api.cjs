/**
 * Script para verificar o dashboard de frota usando a API do projeto
 * (não requer acesso direto ao banco de dados)
 */

const fs = require('fs');
const path = require('path');

// URL da API local ou production
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4321';

async function fetchAPI(table) {
  const url = `${API_BASE_URL}/api/bi-data?table=${table}`;
  console.log(`  Buscando ${table}...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`  ❌ Erro ao buscar ${table}:`, error.message);
    return null;
  }
}

async function verifyFleetDashboard() {
  console.log('🔍 VERIFICAÇÃO DO DASHBOARD DE FROTA\n');
  console.log('API Base URL:', API_BASE_URL);
  console.log('='.repeat(80));
  
  try {
    // 1. Buscar dados da dim_frota
    console.log('\n📊 Buscando dados de dim_frota...');
    const frotaResponse = await fetchAPI('dim_frota');
    
    if (!frotaResponse || !frotaResponse.data) {
      console.error('\n❌ Não foi possível obter dados da dim_frota');
      console.log('⚠️ Certifique-se de que o servidor está rodando em', API_BASE_URL);
      return;
    }
    
    const frotaData = frotaResponse.data;
    console.log(`✅ ${frotaData.length} registros carregados`);
    
    // 2. Analisar estrutura dos dados
    if (frotaData.length > 0) {
      const firstRecord = frotaData[0];
      const columns = Object.keys(firstRecord);
      
      console.log(`\n📋 Estrutura dos dados (${columns.length} campos):`);
      columns.forEach((col, idx) => {
        const value = firstRecord[col];
        const type = value === null ? 'null' : typeof value;
        console.log(`  ${idx + 1}. ${col} (${type})`);
      });
      
      // 3. Verificar campos importantes
      console.log('\n🔎 Verificação de campos chave:');
      const keyFields = [
        'Placa', 'Modelo', 'Status', 'SituacaoVeiculo',
        'ProvedorTelemetria', 'Latitude', 'Longitude',
        'ComSeguroVigente', 'FinalidadeUso', 'Proprietario',
        'NomeCondutor', 'CPFCondutor', 'NomeCliente',
        'DiasNoStatus', 'DataInicioStatus', 'Patio',
        'UltimaAtualizacaoTelemetria', 'UltimoEnderecoTelemetria',
        'TelefoneCondutor', 'ValorLocacao', 'TipoLocacao'
      ];
      
      keyFields.forEach(field => {
        const exists = field in firstRecord;
        const value = exists ? firstRecord[field] : 'N/A';
        const displayValue = value !== null && value !== undefined && value !== '' 
          ? (typeof value === 'string' && value.length > 50 ? value.substring(0, 47) + '...' : value)
          : '(vazio)';
        console.log(`  ${exists ? '✅' : '❌'} ${field}: ${displayValue}`);
      });
      
      // 4. Análise estatística
      console.log('\n📊 Análise Estatística:');
      
      // Status distribution
      const statusMap = {};
      frotaData.forEach(item => {
        const status = item.Status || item.SituacaoVeiculo || 'Não definido';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });
      
      console.log('\n  Distribuição por Status:');
      Object.entries(statusMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([status, count]) => {
          console.log(`    ${status}: ${count} veículos`);
        });
      
      // Telemetria analysis
      const totalVehicles = frotaData.length;
      const withProvider = frotaData.filter(v => v.ProvedorTelemetria).length;
      const withGPS = frotaData.filter(v => v.Latitude && v.Longitude).length;
      const withInsurance = frotaData.filter(v => v.ComSeguroVigente === true || v.ComSeguroVigente === 'true').length;
      
      console.log('\n  📡 Cobertura de Telemetria:');
      console.log(`    Total de veículos: ${totalVehicles}`);
      console.log(`    Com provedor: ${withProvider} (${((withProvider/totalVehicles)*100).toFixed(1)}%)`);
      console.log(`    Com GPS: ${withGPS} (${((withGPS/totalVehicles)*100).toFixed(1)}%)`);
      console.log(`    Com seguro: ${withInsurance} (${((withInsurance/totalVehicles)*100).toFixed(1)}%)`);
      
      // Providers distribution
      const providersMap = {};
      frotaData.forEach(item => {
        const provider = item.ProvedorTelemetria || 'Não definido';
        providersMap[provider] = (providersMap[provider] || 0) + 1;
      });
      
      console.log('\n  🛰️ Provedores de Telemetria:');
      Object.entries(providersMap)
        .sort((a, b) => b[1] - a[1])
        .forEach(([provider, count]) => {
          console.log(`    ${provider}: ${count} veículos`);
        });
      
      // Proprietarios
      const ownerMap = {};
      frotaData.forEach(item => {
        const owner = item.Proprietario || 'Não definido';
        ownerMap[owner] = (ownerMap[owner] || 0) + 1;
      });
      
      console.log('\n  👤 Proprietários:');
      Object.entries(ownerMap)
        .sort((a, b) => b[1] - a[1])
        .forEach(([owner, count]) => {
          console.log(`    ${owner}: ${count} veículos`);
        });
    }
    
    // 5. Verificar FleetDashboard.tsx
    console.log('\n📄 Analisando FleetDashboard.tsx...');
    const dashboardPath = path.join(__dirname, '..', 'src', 'pages', 'analytics', 'FleetDashboard.tsx');
    
    if (fs.existsSync(dashboardPath)) {
      const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');
      
      const fieldsToCheck = [
        'ProvedorTelemetria',
        'UltimaAtualizacaoTelemetria',
        'UltimoEnderecoTelemetria',
        'ComSeguroVigente',
        'Proprietario',
        'FinalidadeUso',
        'NomeCondutor',
        'CPFCondutor',
        'TelefoneCondutor',
        'ValorLocacao',
        'TipoLocacao'
      ];
      
      console.log('\n🔍 Uso de campos no dashboard:');
      const usedFields = [];
      const unusedFields = [];
      
      fieldsToCheck.forEach(field => {
        const used = dashboardContent.includes(field);
        if (used) {
          usedFields.push(field);
          console.log(`  ✅ ${field}: USADO`);
        } else {
          unusedFields.push(field);
          console.log(`  ⚠️  ${field}: NÃO ENCONTRADO`);
        }
      });
      
      console.log(`\n  Total: ${usedFields.length}/${fieldsToCheck.length} campos sendo usados`);
      
      if (unusedFields.length > 0) {
        console.log('\n🔔 Sugestões de melhorias:');
        console.log('  Os seguintes campos estão disponíveis mas não estão sendo exibidos:');
        unusedFields.forEach(field => {
          console.log(`    - ${field}`);
        });
      }
    } else {
      console.log('  ⚠️ Arquivo FleetDashboard.tsx não encontrado');
    }
    
    // 6. Gerar relatório
    const report = {
      generated_at: new Date().toISOString(),
      api_url: API_BASE_URL,
      summary: {
        total_records: frotaData.length,
        total_columns: Object.keys(frotaData[0] || {}).length,
        telemetry: {
          with_provider: withProvider,
          with_gps: withGPS,
          with_insurance: withInsurance
        }
      },
      available_columns: Object.keys(frotaData[0] || {}),
      sample_data: frotaData.slice(0, 2)
    };
    
    const reportPath = path.join(__dirname, 'fleet_verification_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Relatório detalhado salvo em: ${reportPath}`);
    
    console.log('\n✅ Verificação concluída!');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
  }
}

// Execute
verifyFleetDashboard().catch(console.error);
