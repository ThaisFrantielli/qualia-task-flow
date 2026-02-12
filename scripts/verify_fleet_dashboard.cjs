/**
 * Script para verificar a estrutura dos dados de frota
 * e validar se o dashboard está usando todos os campos disponíveis
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Conexão com o banco bluconecta_dw
const pool = new Pool({
  host: process.env.ORACLE_PG_HOST || '137.131.163.167',
  port: parseInt(process.env.ORACLE_PG_PORT || '5432'),
  user: process.env.ORACLE_PG_USER || 'postgres',
  password: process.env.ORACLE_PG_PASSWORD || '',
  database: process.env.ORACLE_PG_DATABASE || 'bluconecta_dw',
  ssl: false,
});

async function verifyFleetData() {
  console.log('🔍 VERIFICAÇÃO DO DASHBOARD DE FROTA\n');
  console.log('Banco: bluconecta_dw');
  console.log('=' . repeat(80));
  
  try {
    // 1. Obter estrutura da tabela dim_frota
    console.log('\n📊 Estrutura da tabela dim_frota:');
    const columnsQuery = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'dim_frota' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    const columns = columnsQuery.rows;
    console.log(`\nTotal de colunas: ${columns.length}`);
    console.log('\nColunas disponíveis:');
    columns.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col.column_name} (${col.data_type})`);
    });
    
    // 2. Obter amostra de dados
    console.log('\n📈 Amostra de dados (primeiras 3 linhas):');
    const dataQuery = await pool.query('SELECT * FROM public."dim_frota" LIMIT 3');
    console.log(`Total de registros na tabela: ${dataQuery.rowCount}`);
    
    if (dataQuery.rows.length > 0) {
      console.log('\nPrimeiro registro (keys):');
      console.log(Object.keys(dataQuery.rows[0]).join(', '));
      
      // Verificar campos específicos importantes
      console.log('\n🔎 Verificação de campos chave:');
      const firstRow = dataQuery.rows[0];
      
      const keyFields = [
        'Placa', 'Modelo', 'Status', 'SituacaoVeiculo', 
        'ProvedorTelemetria', 'Latitude', 'Longitude',
        'ComSeguroVigente', 'FinalidadeUso', 'Proprietario',
        'NomeCondutor', 'CPFCondutor', 'NomeCliente',
        'DiasNoStatus', 'DataInicioStatus', 'Patio'
      ];
      
      keyFields.forEach(field => {
        const exists = field in firstRow;
        const value = exists ? firstRow[field] : 'N/A';
        console.log(`  ${exists ? '✅' : '❌'} ${field}: ${value}`);
      });
    }
    
    // 3. Contar registros por Status
    console.log('\n📊 Distribuição por Status:');
    const statusQuery = await pool.query(`
      SELECT 
        COALESCE("Status", "SituacaoVeiculo", 'Não definido') as status,
        COUNT(*) as total
      FROM public."dim_frota"
      GROUP BY status
      ORDER BY total DESC
      LIMIT 10
    `);
    statusQuery.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.total} veículos`);
    });
    
    // 4. Verificar telemetria
    console.log('\n📡 Análise de Telemetria:');
    const telemetriaQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_veiculos,
        COUNT("ProvedorTelemetria") as com_provedor,
        COUNT("Latitude") as com_latitude,
        COUNT("Longitude") as com_longitude,
        COUNT(CASE WHEN "ComSeguroVigente" = true THEN 1 END) as com_seguro
      FROM public."dim_frota"
    `);
    const telStats = telemetriaQuery.rows[0];
    console.log(`  Total de veículos: ${telStats.total_veiculos}`);
    console.log(`  Com provedor de telemetria: ${telStats.com_provedor} (${((telStats.com_provedor/telStats.total_veiculos)*100).toFixed(1)}%)`);
    console.log(`  Com coordenadas GPS: ${telStats.com_latitude} (${((telStats.com_latitude/telStats.total_veiculos)*100).toFixed(1)}%)`);
    console.log(`  Com seguro vigente: ${telStats.com_seguro} (${((telStats.com_seguro/telStats.total_veiculos)*100).toFixed(1)}%)`);
    
    // 5. Verificar provedores de telemetria
    console.log('\n🛰️ Provedores de Telemetria:');
    const provedoresQuery = await pool.query(`
      SELECT 
        COALESCE("ProvedorTelemetria", 'Não definido') as provedor,
        COUNT(*) as total
      FROM public."dim_frota"
      GROUP BY provedor
      ORDER BY total DESC
    `);
    provedoresQuery.rows.forEach(row => {
      console.log(`  ${row.provedor}: ${row.total} veículos`);
    });
    
    // 6. Salvar relatório
    const report = {
      generated_at: new Date().toISOString(),
      database: 'bluconecta_dw',
      table: 'dim_frota',
      summary: {
        total_columns: columns.length,
        total_records: dataQuery.rowCount,
        telemetry_coverage: {
          with_provider: telStats.com_provedor,
          with_gps: telStats.com_latitude,
          with_insurance: telStats.com_seguro,
          percentage_gps: ((telStats.com_latitude/telStats.total_veiculos)*100).toFixed(1)
        }
      },
      columns: columns,
      status_distribution: statusQuery.rows,
      telemetry_providers: provedoresQuery.rows
    };
    
    const reportPath = path.join(__dirname, 'fleet_verification_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Relatório salvo em: ${reportPath}`);
    
    // 7. Ler o FleetDashboard.tsx e verificar campos usados
    console.log('\n📄 Analisando FleetDashboard.tsx...');
    const dashboardPath = path.join(__dirname, '..', 'src', 'pages', 'analytics', 'FleetDashboard.tsx');
    
    if (fs.existsSync(dashboardPath)) {
      const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');
      
      // Verificar se os campos novos estão sendo usados
      const newFields = [
        'ProvedorTelemetria',
        'UltimaAtualizacaoTelemetria',
        'UltimoEnderecoTelemetria',
        'ComSeguroVigente',
        'Proprietario',
        'FinalidadeUso',
        'NomeCondutor',
        'CPFCondutor',
        'TelefoneCondutor'
      ];
      
      console.log('\n🔍 Campos novos no dashboard:');
      newFields.forEach(field => {
        const used = dashboardContent.includes(field);
        console.log(`  ${used ? '✅' : '⚠️'} ${field}: ${used ? 'USADO' : 'NÃO ENCONTRADO'}`);
      });
    }
    
    console.log('\n✅ Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar
verifyFleetData().catch(console.error);
