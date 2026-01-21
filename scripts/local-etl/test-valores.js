/**
 * Teste: buscar ocorrências COM valores
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
    requestTimeout: 180000,
    options: { encrypt: false, trustServerCertificate: true }
};

async function test() {
    try {
        console.log('🔌 Conectando...\n');
        await sql.connect(sqlConfig);
        
        const query = `
WITH OSAgregado AS (
    SELECT 
        IdOcorrencia,
        MAX(ModeloVeiculo) as Modelo,
        MAX(Cliente) as ClienteContrato,
        MAX(Categoria) as TipoManutencao,
        MAX(Fornecedor) as FornecedorOcorrencia,
        SUM(ISNULL(ValorTotal, 0)) as ValorTotal,
        SUM(ISNULL(ValorNaoReembolsavel, 0)) as ValorNaoReembolsavel,
        SUM(ISNULL(ValorReembolsavel, 0)) as ValorReembolsavel,
        COUNT(*) as QuantidadeOS
    FROM OrdensServico WITH (NOLOCK)
    GROUP BY IdOcorrencia
)
SELECT TOP 10
    om.IdOcorrencia,
    om.Placa,
    om.Tipo,
    om.SituacaoOcorrencia,
    om.NomeCliente,
    om.Fornecedor as FornecedorOM,
    osa.Modelo,
    osa.ClienteContrato,
    osa.TipoManutencao,
    osa.FornecedorOcorrencia,
    osa.ValorTotal,
    osa.ValorNaoReembolsavel,
    osa.ValorReembolsavel,
    osa.QuantidadeOS
FROM OcorrenciasManutencao om WITH (NOLOCK)
INNER JOIN OSAgregado osa ON om.IdOcorrencia = osa.IdOcorrencia
WHERE om.DataCriacao >= '2024-01-01'
AND om.IdTipo IN (1, 2)
AND osa.ValorTotal > 0
ORDER BY om.IdOcorrencia DESC
        `;
        
        console.log('📥 Buscando ocorrências COM valores...\n');
        const start = Date.now();
        const result = await sql.query(query);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        
        console.log(`✅ ${result.recordset.length} registros em ${elapsed}s\n`);
        
        result.recordset.forEach((r, i) => {
            console.log(`${i+1}. ${r.Placa} - ${r.Tipo}`);
            console.log(`   Cliente OM: ${r.NomeCliente || 'N/A'}`);
            console.log(`   Cliente OS: ${r.ClienteContrato || 'N/A'}`);
            console.log(`   Modelo: ${r.Modelo || 'N/A'}`);
            console.log(`   Categoria: ${r.TipoManutencao || 'N/A'}`);
            console.log(`   Fornecedor OM: ${r.FornecedorOM || 'N/A'}`);
            console.log(`   Fornecedor OS: ${r.FornecedorOcorrencia || 'N/A'}`);
            console.log(`   Valor Total: R$ ${(r.ValorTotal || 0).toFixed(2)}`);
            console.log(`   Não Reembolsável: R$ ${(r.ValorNaoReembolsavel || 0).toFixed(2)}`);
            console.log(`   Reembolsável: R$ ${(r.ValorReembolsavel || 0).toFixed(2)}`);
            console.log(`   Quantidade OS: ${r.QuantidadeOS || 0}`);
            console.log('');
        });
        
        await sql.close();
        console.log('✅ Teste concluído!');
        
    } catch (err) {
        console.error('❌ ERRO:', err.message);
        process.exit(1);
    }
}

test();
