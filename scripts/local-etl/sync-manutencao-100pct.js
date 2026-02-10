require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const sql = require('mssql');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: '200.219.192.34',
    port: 3494,
    database: 'blufleet-dw',
    connectionTimeout: 180000,
    requestTimeout: 720000,
    options: { encrypt: false, trustServerCertificate: true }
};

const pgConfig = {
    host: process.env.PG_HOST || '137.131.163.167',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'F4tu5xy3',
    database: process.env.PG_DATABASE || 'bluconecta_dw',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};

const query = `
WITH OSAgregado AS (
    SELECT 
        IdOcorrencia,
        MAX(ModeloVeiculo) as Modelo,
        MAX(Cliente) as ClienteContrato,
        MAX(TipoLocacao) as TipoLocacao,
        MAX(Categoria) as TipoManutencao,
        MAX(Fornecedor) as FornecedorOcorrencia,
        SUM(ISNULL(ValorTotal, 0)) as ValorTotal,
        SUM(ISNULL(ValorNaoReembolsavel, 0)) as ValorNaoReembolsavel,
        SUM(ISNULL(ValorReembolsavel, 0)) as ValorReembolsavel,
        MIN(DataInicioServico) as DataInicioServico,
        MAX(SituacaoOrdemServico) as StatusOS,
        COUNT(*) as QuantidadeOS
    FROM OrdensServico WITH (NOLOCK)
    GROUP BY IdOcorrencia
)
SELECT 
    -- Campos diretos de OcorrenciasManutencao
    FORMAT(GETDATE(), 'yyyy-MM-dd HH:mm:ss.fff') as DataAtualizacaoDados,
    om.IdOcorrencia,
    om.Ocorrencia,
    om.IdContratoLocacao,
    om.ContratoLocacao,
    om.IdContratoComercial,
    om.ContratoComercial,
    om.IdClassificacaoContrato,
    om.ClassificacaoContrato,
    FORMAT(om.DataCriacao, 'yyyy-MM-dd HH:mm:ss') as DataCriacao,
    om.IdSituacaoOcorrencia,
    om.SituacaoOcorrencia,
                    om.IdEtapa,
                    om.Etapa,
                    om.IdCliente,
                    om.NomeCliente,
                    om.IdCondutor,
                    om.NomeCondutor,
                    om.IdVeiculo,
                    om.Placa,
                    om.IdTipo,
                    om.Tipo,
                    om.IdMotivo,
                    om.Motivo,
                    om.IdUsuarioCriacao,
                    om.IdFornecedor,
                    om.Fornecedor,
                    om.Origem,
                    FORMAT(om.DataConclusaoOcorrencia, 'yyyy-MM-dd HH:mm:ss') as DataConclusaoOcorrencia,
                    FORMAT(om.SugestaoAgendamento1, 'yyyy-MM-dd HH:mm:ss') as SugestaoAgendamento1,
                    FORMAT(om.SugestaoAgendamento2, 'yyyy-MM-dd HH:mm:ss') as SugestaoAgendamento2,
                    FORMAT(om.SugestaoAgendamento3, 'yyyy-MM-dd HH:mm:ss') as SugestaoAgendamento3,
                    om.Endereco,
                    om.Numero,
                    om.Complemento,
                    om.Bairro,
                    om.Cidade,
                    om.Estado,
                    om.Pais,
                    om.CEP,
                    om.Latitude,
                    om.Longitude,
                    FORMAT(om.DataAgendamento, 'yyyy-MM-dd HH:mm:ss') as DataAgendamento,
                    om.Descricao,
                    om.Observacoes,
                    CAST(ISNULL(om.OdometroAtual, 0) AS INT) as OdometroAtual,
                    om.NomeRequisitante,
                    om.EmailRequisitante,
                    om.TelefoneRequisitante,
                    om.CanceladoPor,
                    FORMAT(om.CanceladoEm, 'yyyy-MM-dd HH:mm:ss') as CanceladoEm,
                    om.MotivoCancelamento,
                    FORMAT(om.DataPrevisaoConclusaoServico, 'yyyy-MM-dd') as DataPrevisaoConclusaoServico,
                    FORMAT(om.DataConclusaoServico, 'yyyy-MM-dd HH:mm:ss') as DataConclusaoServico,
                    FORMAT(om.DataConfirmacaoSaida, 'yyyy-MM-dd') as DataConfirmacaoSaida,
                    FORMAT(om.DataRetiradaVeiculo, 'yyyy-MM-dd HH:mm:ss') as DataRetiradaVeiculo,
                    om.IdJustificativa,
                    om.IdFilialOperacional,
                    
                    -- Campos de OrdensServico (agregados quando múltiplas OS)
                    osa.Modelo,
                    ISNULL(osa.ClienteContrato, om.NomeCliente) as ClienteContrato,
                    osa.TipoLocacao,
                    osa.TipoManutencao,
                    ISNULL(osa.FornecedorOcorrencia, om.Fornecedor) as FornecedorOcorrencia,
                    osa.ValorTotal,
                    osa.ValorNaoReembolsavel,
                    osa.ValorReembolsavel,
                    FORMAT(osa.DataInicioServico, 'yyyy-MM-dd HH:mm:ss') as DataInicioServico,
                    osa.StatusOS,
                    ISNULL(osa.QuantidadeOS, 0) as QuantidadeOS,
                    
                    -- Campos calculados úteis para o dashboard
                    FORMAT(om.DataCriacao, 'yyyy-MM-dd') as DataEntrada,
                    DATEDIFF(DAY, om.DataCriacao, ISNULL(om.DataConclusaoOcorrencia, GETDATE())) as DiasAberta,
                    CASE 
                        WHEN om.DataConclusaoOcorrencia IS NOT NULL THEN 'Fechada'
                        WHEN om.SituacaoOcorrencia = 'Cancelada' THEN 'Cancelada'
                        ELSE 'Aberta'
                    END as StatusSimplificado,
                    CASE 
                        WHEN osa.DataInicioServico IS NOT NULL THEN 
                            DATEDIFF(DAY, osa.DataInicioServico, ISNULL(om.DataConclusaoOcorrencia, GETDATE()))
                        ELSE 
                            DATEDIFF(DAY, om.DataCriacao, ISNULL(om.DataConclusaoOcorrencia, GETDATE()))
                    END as LeadTimeTotalDias
                    
                FROM OcorrenciasManutencao om WITH (NOLOCK)
                LEFT JOIN OSAgregado osa ON om.IdOcorrencia = osa.IdOcorrencia
                WHERE om.DataCriacao >= '2024-01-01'
                ORDER BY om.IdOcorrencia DESC`;

async function run() {
    let sqlPool, pgPool;
    
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔄 SINCRONIZANDO fat_manutencao_unificado - 100% DA BASE');
        console.log('='.repeat(80) + '\n');
        
        console.log('🔌 Conectando ao SQL Server...');
        sqlPool = await sql.connect(sqlConfig);
        console.log(`   ✅ ${sqlConfig.server}:${sqlConfig.port} / ${sqlConfig.database}\n`);
        
        console.log('🔌 Conectando ao PostgreSQL...');
        pgPool = new Pool(pgConfig);
        await pgPool.query('SELECT 1');
        console.log(`   ✅ ${pgConfig.host}:${pgConfig.port} / ${pgConfig.database}\n`);
        
        console.log('📥 Buscando TODOS os dados de OcorrenciasManutencao...');
        const result = await sqlPool.request().query(query);
        console.log(`   ✅ ${result.recordset.length.toLocaleString('pt-BR')} registros\n`);
        
        console.log('🗑️  Limpando tabela fat_manutencao_unificado...');
        await pgPool.query('DROP TABLE IF EXISTS public.fat_manutencao_unificado;');
        console.log('   ✅ Tabela removida\n');
        
        console.log('🔨 Criando estrutura...');
        const columns = Object.keys(result.recordset[0]);
        const columnDefs = columns.map(col => `"${col.replace(/[^a-zA-Z0-9_]/g, "")}" TEXT`).join(', ');
        await pgPool.query(`CREATE TABLE public.fat_manutencao_unificado (${columnDefs});`);
        console.log('   ✅ Estrutura criada\n');
        
        console.log('💾 Inserindo dados (100% da base, SEM deduplicação)...');
        const BATCH_SIZE = 500;
        const totalRows = result.recordset.length;
        const columnNames = columns.map(col => `"${col.replace(/[^a-zA-Z0-9_]/g, "")}"`).join(', ');
        
        for (let i = 0; i < totalRows; i += BATCH_SIZE) {
            const chunk = result.recordset.slice(i, i + BATCH_SIZE);
            const placeholders = [];
            const values = [];
            
            chunk.forEach((row, rowIdx) => {
                const rowPlaceholders = [];
                columns.forEach((col, colIdx) => {
                    const paramIndex = rowIdx * columns.length + colIdx + 1;
                    rowPlaceholders.push(`$${paramIndex}`);
                    const val = row[col];
                    values.push(val === undefined || val === '' ? null : val instanceof Date ? val.toISOString() : val);
                });
                placeholders.push(`(${rowPlaceholders.join(', ')})`);
            });
            
            await pgPool.query(`INSERT INTO public.fat_manutencao_unificado (${columnNames}) VALUES ${placeholders.join(', ')};`, values);
            
            const progress = Math.min(((i + BATCH_SIZE) / totalRows) * 100, 100).toFixed(1);
            process.stdout.write(`   📊 ${progress}%\r`);
        }
        console.log(`   ✅ ${totalRows.toLocaleString('pt-BR')} registros inseridos\n`);
        
        console.log('📝 Gerando arquivos JSON...');
        const outDir = path.join(__dirname, '..', '..', 'public', 'data');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        
        const MAX_CHUNK_SIZE = 10000;
        const totalChunks = Math.ceil(result.recordset.length / MAX_CHUNK_SIZE);
        console.log(`   📦 ${totalChunks} partes de ${MAX_CHUNK_SIZE} registros\n`);
        
        const manifest = {
            totalParts: totalChunks,
            total_chunks: totalChunks,
            totalRecords: result.recordset.length,
            chunkSize: MAX_CHUNK_SIZE,
            baseFileName: 'fat_manutencao_unificado',
            generated_at: new Date().toISOString(),
            etl_version: '3.0-ocorrencias-manutencao-100pct',
            source: 'OcorrenciasManutencao (100% da base)'
        };
        
        fs.writeFileSync(path.join(outDir, 'fat_manutencao_unificado_manifest.json'), JSON.stringify(manifest));
        console.log('   💾 fat_manutencao_unificado_manifest.json');
        
        for (let i = 0; i < totalChunks; i++) {
            const chunk = result.recordset.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE);
            const fileName = `fat_manutencao_unificado_part${i + 1}of${totalChunks}.json`;
            fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(chunk));
            console.log(`   💾 ${fileName}`);
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ SINCRONIZAÇÃO CONCLUÍDA!');
        console.log('='.repeat(80) + '\n');
        
    } catch (err) {
        console.error('\n❌ ERRO:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        if (sqlPool) await sqlPool.close();
        if (pgPool) await pgPool.end();
    }
}

run();
