import 'dotenv/config';
import sql from 'mssql';
import pkg from 'pg';
const { Pool } = pkg;
import { performance } from 'perf_hooks';

// --- CONFIGURAÇÃO ---
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
    { table: 'dim_frota', query: `SELECT * FROM Veiculos WITH (NOLOCK)` },
    {
        table: 'dim_contratos_locacao',
        query: `SELECT cl.*, cli.NomeFantasia as NomeCliente, v.ValorAtualFipe as ValorAtualFipe FROM ContratosLocacao cl WITH (NOLOCK)
            LEFT JOIN ContratosComerciais cc WITH (NOLOCK) ON cl.IdContrato = cc.IdContratoComercial
            LEFT JOIN Clientes cli WITH (NOLOCK) ON cc.IdCliente = cli.IdCliente
            LEFT JOIN Veiculos v WITH (NOLOCK) ON (
                (cl.Placa IS NOT NULL AND v.Placa IS NOT NULL AND cl.Placa = v.Placa) OR
                (cl.PlacaPrincipal IS NOT NULL AND v.Placa IS NOT NULL AND cl.PlacaPrincipal = v.Placa) OR
                (cl.PlacaReserva IS NOT NULL AND v.Placa IS NOT NULL AND cl.PlacaReserva = v.Placa)
            )`
    },
    { table: 'fat_precos_locacao', query: `SELECT * FROM ContratosLocacaoPrecos WITH (NOLOCK)` },
    { table: 'dim_movimentacao_patios', query: `SELECT * FROM MovimentacaoPatios WITH (NOLOCK)` },
    { table: 'dim_movimentacao_veiculos', query: `SELECT * FROM MovimentacaoVeiculos WITH (NOLOCK)` },
    { table: 'fat_carro_reserva', query: `SELECT * FROM OcorrenciasVeiculoTemporario WITH (NOLOCK)` },
    { table: 'fat_manutencao_unificado', query: `SELECT * FROM OcorrenciasManutencao WITH (NOLOCK) WHERE DataCriacao >= '2024-01-01'` },
    { table: 'fat_movimentacao_ocorrencias', query: `SELECT * FROM MovimentacaoOcorrencias WITH (NOLOCK)` },
    { table: 'fat_multas', query: `SELECT * FROM OcorrenciasInfracoes WITH (NOLOCK) WHERE DataInfracao >= '2024-01-01'` },
    { table: 'fat_sinistros', query: `SELECT * FROM OcorrenciasSinistro WITH (NOLOCK)` },
    { table: 'historico_situacao_veiculos', query: `SELECT * FROM HistoricoSituacaoVeiculos WITH (NOLOCK)` },
    {
        table: 'hist_vida_veiculo_timeline',
        query: `SELECT v.Placa, v.IdVeiculo, v.Modelo, 'MANUTENCAO' as TipoEvento, om.DataCriacao as DataEvento FROM OcorrenciasManutencao om WITH (NOLOCK) JOIN Veiculos v ON om.IdVeiculo = v.IdVeiculo UNION ALL SELECT v.Placa, v.IdVeiculo, v.Modelo, 'SINISTRO', os.DataSinistro FROM OcorrenciasSinistro os WITH (NOLOCK) JOIN Veiculos v ON os.IdVeiculo = v.IdVeiculo`
    },
    {
        table: 'fat_financeiro_universal',
        // Query que busca o financeiro completo (Entradas e Saídas) desde 2023
        query: `
            SELECT 
                L.NumeroLancamento, 
                L.Natureza, 
                L.TipoLancamento,
                L.ValorPagoRecebido as Valor, 
                L.DataCompetencia as Data, 
                L.PagarReceberDe as Entidade,
                COALESCE(OS.Placa, VV.Placa) AS Placa
            FROM dbo.LancamentosComNaturezas L WITH (NOLOCK)
            LEFT JOIN dbo.OrdensServico OS WITH (NOLOCK) ON L.OrdemCompra = OS.OrdemCompra AND OS.SituacaoOrdemServico <> 'Cancelada'
            LEFT JOIN dbo.VeiculosVendidos VV WITH (NOLOCK) ON L.NumeroDocumento = VV.FaturaVenda
            WHERE L.DataCompetencia >= '2023-01-01'
        `
    }
];

async function runSync() {
    let onlyTable = null;
    const args = process.argv;
    const idx = args.indexOf('--only');
    if (idx !== -1 && args[idx + 1]) onlyTable = args[idx + 1];

    console.log('🚀 SINCRONIZAÇÃO INICIADA...');
    const sqlPool = await sql.connect(sqlConfig);
    const pgClient = new Pool(pgConfig);

    const tablesToRun = onlyTable ? TABLES.filter(t => t.table === onlyTable) : TABLES;

    for (const item of tablesToRun) {
        const start = performance.now();
        console.log(`⏳ Processando: ${item.table}`);
        const result = await sqlPool.request().query(item.query);
        
        if (result.recordset.length > 0) {
            await pgClient.query(`DROP TABLE IF EXISTS public.${item.table} CASCADE`);
            const columns = Object.keys(result.recordset[0]).map(key => `"${key}" TEXT`).join(', ');
            await pgClient.query(`CREATE TABLE public.${item.table} (${columns})`);
            
            const colNames = Object.keys(result.recordset[0]).map(c => `"${c}"`).join(',');
            const BATCH_SIZE = 500;
            for (let i = 0; i < result.recordset.length; i += BATCH_SIZE) {
                const chunk = result.recordset.slice(i, i + BATCH_SIZE);
                for (const row of chunk) {
                    const values = Object.values(row);
                    const placeholders = values.map((_, idx) => `$${idx + 1}`).join(',');
                    await pgClient.query(`INSERT INTO public.${item.table} (${colNames}) VALUES (${placeholders})`, values);
                }
            }
            console.log(`✅ ${item.table} finalizada com ${result.recordset.length} linhas`);
        }
    }
    await sqlPool.close(); await pgClient.end();
    console.log('🏁 CONCLUÍDO!');
}
runSync().catch(e => console.error(e));