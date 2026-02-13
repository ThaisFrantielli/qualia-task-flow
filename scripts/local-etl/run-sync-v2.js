import 'dotenv/config';
import sql from 'mssql';
import pkg from 'pg';
const { Pool } = pkg;

const sqlConfig = {
    user: process.env.SQL_USER || 'qualidade',
    password: process.env.SQL_PASSWORD || 'AWJ5A95cD5fW',
    server: process.env.SQL_SERVER || '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE || 'blufleet-dw',
    connectionTimeout: 180000,
    options: { encrypt: false, trustServerCertificate: true }
};

const pgConfig = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'F4tu5xy3',
    database: 'bluconecta_dw'
};

const TABLES = [
    {
        table: 'dim_frota',
        query: `SELECT * FROM Veiculos WITH (NOLOCK)`
    },
        {
        table: 'dim_contratos_locacao',
        query: `
            SELECT 
                cl.*, 
                cli.NomeFantasia as NomeCliente,
                -- Busca o último preço unitário baseado na DataInicial mais recente
                ult_preco.PrecoUnitario as UltimoValorLocacao,
                -- Lógica de classificação que já tínhamos
                CASE 
                    WHEN cli.Tipo = 'Pessoa Física' THEN 'Assinatura'
                    WHEN cli.Tipo = 'Pessoa Jurídica' AND cli.NaturezaCliente = 'Privado' THEN 'Terceirização de Frota'
                    WHEN cli.Tipo = 'Pessoa Jurídica' AND cli.NaturezaCliente = 'Público' THEN 'Contrato Público'
                    ELSE 'Outros'
                END as TipoDeContrato
            FROM ContratosLocacao cl WITH (NOLOCK)
            LEFT JOIN ContratosComerciais cc WITH (NOLOCK) ON cl.IdContrato = cc.IdContratoComercial 
            LEFT JOIN Clientes cli WITH (NOLOCK) ON cc.IdCliente = cli.IdCliente
            OUTER APPLY (
                SELECT TOP 1 p.PrecoUnitario
                FROM ContratosLocacaoPrecos p
                WHERE p.IdContratoLocacao = cl.IdContratoLocacao
                ORDER BY p.DataInicial DESC, p.IdPrecoContratoLocacao DESC
            ) ult_preco
        `
    },
    { table: 'fat_precos_locacao', query: `SELECT * FROM ContratosLocacaoPrecos WITH (NOLOCK)` },
    { table: 'dim_movimentacao_patios', query: `SELECT * FROM MovimentacaoPatios WITH (NOLOCK)` },
    { table: 'dim_movimentacao_veiculos', query: `SELECT * FROM MovimentacaoVeiculos WITH (NOLOCK)` },
    { table: 'fat_carro_reserva', query: `SELECT * FROM OcorrenciasVeiculoTemporario WITH (NOLOCK)` },
    { table: 'fat_manutencao_unificado', query: `SELECT * FROM OcorrenciasManutencao WITH (NOLOCK) WHERE DataCriacao >= '2024-01-01'` },
    { table: 'fat_movimentacao_ocorrencias', query: `SELECT * FROM MovimentacaoOcorrencias WITH (NOLOCK)` },
    { table: 'fat_multas', query: `SELECT * FROM OcorrenciasInfracoes WITH (NOLOCK) WHERE DataInfracao >= '2024-01-01'` },
    { table: 'fat_sinistros', query: `SELECT * FROM OcorrenciasSinistro WITH (NOLOCK)` },
    { table: 'historico_situacao_veiculos', query: `SELECT * FROM HistoricoSituacaoVeiculos WITH (NOLOCK)` }
];

async function runSync() {
    // FILTRO RIGOROSO DE ARGUMENTOS
    const args = process.argv.slice(2);
    const onlyArg = args.find(a => a.startsWith('--only='));
    const targetTable = onlyArg ? onlyArg.split('=')[1] : null;

    console.log('🚀 INICIANDO SINCRONIZADOR...');
    if (targetTable) console.log(`🎯 MODO RESTRITO: Apenas tabela "${targetTable}"`);

    const sqlPool = await sql.connect(sqlConfig);
    const pgClient = new Pool(pgConfig);

    // Filtra o array de tabelas antes de começar o loop
    const tablesToRun = targetTable ? TABLES.filter(t => t.table === targetTable) : TABLES;

    if (tablesToRun.length === 0 && targetTable) {
        console.error(`❌ Tabela "${targetTable}" não encontrada na lista de sincronização!`);
        process.exit(1);
    }

    for (const item of tablesToRun) {
        console.log(`⏳ Processando: ${item.table}`);
        const result = await sqlPool.request().query(item.query);
        
        if (result.recordset.length > 0) {
            await pgClient.query(`DROP TABLE IF EXISTS public.${item.table} CASCADE`);
            const columns = Object.keys(result.recordset[0]).map(key => `"${key}" TEXT`).join(', ');
            await pgClient.query(`CREATE TABLE public.${item.table} (${columns})`);
            
            const colNames = Object.keys(result.recordset[0]).map(c => `"${c}"`).join(',');
            const BATCH_SIZE = 200; // Lote menor para economizar RAM
            
            for (let i = 0; i < result.recordset.length; i += BATCH_SIZE) {
                const chunk = result.recordset.slice(i, i + BATCH_SIZE);
                for (const row of chunk) {
                    const values = Object.values(row);
                    const placeholders = values.map((_, idx) => `$${idx + 1}`).join(',');
                    await pgClient.query(`INSERT INTO public.${item.table} (${colNames}) VALUES (${placeholders})`, values);
                }
            }
            console.log(`✅ ${item.table} concluída (${result.recordset.length} linhas)`);
        }
        // Limpeza de memória manual após cada tabela
        result.recordset = null; 
    }

    await sqlPool.close();
    await pgClient.end();
    console.log('🏁 PROCESSO FINALIZADO!');
}

runSync().catch(e => console.error('❌ ERRO:', e));