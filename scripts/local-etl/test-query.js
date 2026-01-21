/**
 * Teste rápido de campos disponíveis
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const sql = require('mssql');

const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: '200.219.192.34',
    port: 3494,
    database: 'blufleet-dw',
    connectionTimeout: 30000,
    requestTimeout: 60000,
    options: { encrypt: false, trustServerCertificate: true }
};

async function test() {
    try {
        console.log('🔌 Conectando...');
        await sql.connect(sqlConfig);
        
        const query = `
            SELECT TOP 5
                om.IdOcorrencia,
                om.Placa,
                om.Tipo,
                os.ModeloVeiculo,
                os.Cliente,
                os.ValorTotal,
                os.Categoria
            FROM OcorrenciasManutencao om WITH (NOLOCK)
            LEFT JOIN OrdensServico os WITH (NOLOCK) ON om.IdOcorrencia = os.IdOcorrencia
            WHERE om.DataCriacao >= '2024-01-01'
            ORDER BY om.IdOcorrencia DESC
        `;
        
        console.log('📥 Testando query...\n');
        const result = await sql.query(query);
        
        console.log(`✅ ${result.recordset.length} registros retornados\n`);
        
        result.recordset.forEach((r, i) => {
            console.log(`Registro ${i + 1}:`);
            console.log(`  IdOcorrencia: ${r.IdOcorrencia}`);
            console.log(`  Placa: ${r.Placa}`);
            console.log(`  Tipo: ${r.Tipo}`);
            console.log(`  Modelo: ${r.ModeloVeiculo || 'NULL'}`);
            console.log(`  Cliente: ${r.Cliente || 'NULL'}`);
            console.log(`  Valor: ${r.ValorTotal || 'NULL'}`);
            console.log(`  Categoria: ${r.Categoria || 'NULL'}\n`);
        });
        
        await sql.close();
        console.log('✅ Teste concluído!');
        
    } catch (err) {
        console.error('❌ ERRO:', err.message);
        process.exit(1);
    }
}

test();
