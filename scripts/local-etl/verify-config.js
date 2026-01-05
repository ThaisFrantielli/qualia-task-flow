require('dotenv').config();
const sql = require('mssql');
const { Client } = require('pg');

console.log('\n' + '='.repeat(80));
console.log('🔍 VERIFICAÇÃO DE CONFIGURAÇÃO - ETL BluConecta DW');
console.log('='.repeat(80) + '\n');

const checks = [];
let hasErrors = false;

// ============================================================================
// 1. VERIFICAR VARIÁVEIS DE AMBIENTE
// ============================================================================
console.log('📋 Verificando Variáveis de Ambiente...\n');

const envVars = [
    { name: 'SQL_USER', value: process.env.SQL_USER, critical: true },
    { name: 'SQL_PASSWORD', value: process.env.SQL_PASSWORD, critical: true },
    { name: 'SQL_DATABASE', value: process.env.SQL_DATABASE, critical: true },
    { name: 'PG_HOST', value: process.env.PG_HOST, critical: true },
    { name: 'PG_PORT', value: process.env.PG_PORT, critical: true },
    { name: 'PG_USER', value: process.env.PG_USER, critical: true },
    { name: 'PG_PASSWORD', value: process.env.PG_PASSWORD, critical: true },
    { name: 'PG_DATABASE', value: process.env.PG_DATABASE, critical: true },
    { name: 'VITE_SUPABASE_URL', value: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, critical: false },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY, critical: false }
];

envVars.forEach(({ name, value, critical }) => {
    if (!value) {
        const status = critical ? '❌ CRÍTICO' : '⚠️  AVISO';
        console.log(`   ${status} - ${name}: NÃO CONFIGURADO`);
        if (critical) hasErrors = true;
        checks.push({ section: 'ENV', name, status: 'FAIL', critical });
    } else {
        const masked = name.includes('PASSWORD') || name.includes('KEY') 
            ? value.substring(0, 5) + '***' + value.substring(value.length - 3)
            : value;
        console.log(`   ✅ ${name}: ${masked}`);
        checks.push({ section: 'ENV', name, status: 'OK' });
    }
});

// ============================================================================
// 2. TESTAR CONEXÃO SQL SERVER
// ============================================================================
console.log('\n🔌 Testando Conexão SQL Server (Origem)...\n');

const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER || '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE || 'blufleet-dw',
    connectionTimeout: 30000,
    requestTimeout: 30000,
    options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
    try {
        console.log(`   Conectando a ${sqlConfig.server}:${sqlConfig.port}/${sqlConfig.database}...`);
        const pool = await sql.connect(sqlConfig);
        console.log('   ✅ Conexão estabelecida com sucesso!');
        
        // Testar query simples
        const result = await pool.request().query('SELECT @@VERSION as Version');
        console.log(`   ✅ Query executada: ${result.recordset[0].Version.substring(0, 50)}...`);
        
        checks.push({ section: 'SQL_SERVER', name: 'Conexão', status: 'OK' });
        checks.push({ section: 'SQL_SERVER', name: 'Query', status: 'OK' });
        
        await pool.close();
    } catch (err) {
        console.error('   ❌ ERRO:', err.message);
        hasErrors = true;
        checks.push({ section: 'SQL_SERVER', name: 'Conexão', status: 'FAIL', error: err.message });
    }

    // ============================================================================
    // 3. TESTAR CONEXÃO POSTGRESQL
    // ============================================================================
    console.log('\n🔌 Testando Conexão PostgreSQL (Destino)...\n');

    const pgConfig = {
        host: process.env.PG_HOST || '127.0.0.1',
        port: process.env.PG_PORT || 5432,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: (process.env.PG_DATABASE || 'bluconecta_dw').toLowerCase().trim(),
    };

    try {
        console.log(`   Conectando a ${pgConfig.host}:${pgConfig.port}/${pgConfig.database}...`);
        const client = new Client(pgConfig);
        await client.connect();
        console.log('   ✅ Conexão estabelecida com sucesso!');
        
        // Testar query simples
        const result = await client.query('SELECT version()');
        console.log(`   ✅ Query executada: ${result.rows[0].version.substring(0, 50)}...`);
        
        // Verificar permissões
        const permCheck = await client.query(`
            SELECT has_schema_privilege('public', 'CREATE') as can_create,
                   has_database_privilege(current_database(), 'CREATE') as can_create_db
        `);
        
        if (permCheck.rows[0].can_create) {
            console.log('   ✅ Usuário tem permissões de CREATE no schema public');
        } else {
            console.log('   ⚠️  Usuário NÃO tem permissões de CREATE no schema public');
        }
        
        checks.push({ section: 'POSTGRESQL', name: 'Conexão', status: 'OK' });
        checks.push({ section: 'POSTGRESQL', name: 'Query', status: 'OK' });
        checks.push({ section: 'POSTGRESQL', name: 'Permissões', status: permCheck.rows[0].can_create ? 'OK' : 'WARN' });
        
        await client.end();
    } catch (err) {
        console.error('   ❌ ERRO:', err.message);
        hasErrors = true;
        checks.push({ section: 'POSTGRESQL', name: 'Conexão', status: 'FAIL', error: err.message });
    }

    // ============================================================================
    // 4. TESTAR EDGE FUNCTION (se configurada)
    // ============================================================================
    console.log('\n📤 Testando Edge Function Supabase...\n');

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.log('   ⚠️  Supabase não configurado - Upload de JSON será desabilitado');
        console.log('   ℹ️  Para habilitar, configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
        checks.push({ section: 'SUPABASE', name: 'Configuração', status: 'SKIP' });
    } else {
        try {
            console.log(`   Testando endpoint: ${SUPABASE_URL}/functions/v1/sync-dw-to-storage`);
            
            const testData = {
                fileName: 'test_connection.json',
                data: [{ test: true, timestamp: new Date().toISOString() }]
            };

            const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-dw-to-storage`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('   ✅ Edge Function respondeu com sucesso!');
                console.log(`   ✅ Arquivo de teste criado: ${result.path}`);
                checks.push({ section: 'SUPABASE', name: 'Edge Function', status: 'OK' });
            } else {
                const errorText = await response.text();
                console.error('   ❌ Erro na Edge Function:', response.status, errorText);
                checks.push({ section: 'SUPABASE', name: 'Edge Function', status: 'FAIL', error: `HTTP ${response.status}` });
            }
        } catch (err) {
            console.error('   ❌ Erro ao testar Edge Function:', err.message);
            checks.push({ section: 'SUPABASE', name: 'Edge Function', status: 'FAIL', error: err.message });
        }
    }

    // ============================================================================
    // 5. RELATÓRIO FINAL
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 RELATÓRIO DE VERIFICAÇÃO');
    console.log('='.repeat(80) + '\n');

    const grouped = checks.reduce((acc, check) => {
        if (!acc[check.section]) acc[check.section] = [];
        acc[check.section].push(check);
        return acc;
    }, {});

    Object.entries(grouped).forEach(([section, items]) => {
        console.log(`\n📦 ${section}:`);
        items.forEach(item => {
            const icon = item.status === 'OK' ? '✅' : item.status === 'WARN' ? '⚠️ ' : item.status === 'SKIP' ? 'ℹ️ ' : '❌';
            console.log(`   ${icon} ${item.name}: ${item.status}${item.error ? ` (${item.error})` : ''}`);
        });
    });

    console.log('\n' + '='.repeat(80));
    
    if (hasErrors) {
        console.log('❌ VERIFICAÇÃO FALHOU - Corrija os erros críticos antes de executar o ETL');
        console.log('='.repeat(80) + '\n');
        process.exit(1);
    } else {
        const warnings = checks.filter(c => c.status === 'WARN').length;
        const skipped = checks.filter(c => c.status === 'SKIP').length;
        
        console.log('✅ VERIFICAÇÃO CONCLUÍDA COM SUCESSO!');
        if (warnings > 0) console.log(`⚠️  ${warnings} aviso(s) encontrado(s)`);
        if (skipped > 0) console.log(`ℹ️  ${skipped} verificação(ões) pulada(s)`);
        console.log('\n🚀 Você pode executar o ETL com: node run-sync-v2.js');
        console.log('='.repeat(80) + '\n');
        process.exit(0);
    }
})();
