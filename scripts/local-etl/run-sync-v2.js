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

const castM = (col) => `(CASE WHEN CHARINDEX(',', ISNULL(CAST(${col} AS VARCHAR), '')) > 0 THEN TRY_CAST(REPLACE(REPLACE(ISNULL(CAST(${col} AS VARCHAR), '0'), '.', ''), ',', '.') AS DECIMAL(15,2)) ELSE TRY_CAST(ISNULL(${col}, 0) AS DECIMAL(15,2)) END)`;

// --- TABELAS (CONFORME SEU ORIGINAL) ---
const TABLES = [
    {
        table: 'dim_frota',
        query: `SELECT v.*, g.GrupoVeiculo as Categoria, DATEDIFF(MONTH, v.DataCompra, GETDATE()) as IdadeVeiculo,
                CAST(ISNULL(v.ValorAtualFIPE, 0) AS FLOAT) as ValorFipe,
                ContratoAtivo.NomeCliente, ContratoAtivo.TipoLocacao, CAST(ISNULL(ContratoAtivo.ValorLocacao, 0) AS DECIMAL(15,2)) as ValorLocacao
                FROM Veiculos v 
                LEFT JOIN GruposVeiculos g ON v.IdGrupoVeiculo = g.IdGrupoVeiculo 
                OUTER APPLY (
                    SELECT TOP 1 cli2.NomeFantasia as NomeCliente, cc2.TipoLocacao, clp.PrecoUnitario as ValorLocacao
                    FROM ContratosLocacao cl2
                    JOIN ContratosComerciais cc2 ON cl2.IdContrato = cc2.IdContratoComercial
                    LEFT JOIN Clientes cli2 ON cc2.IdCliente = cli2.IdCliente
                    OUTER APPLY (SELECT TOP 1 PrecoUnitario FROM ContratosLocacaoPrecos WHERE IdContratoLocacao = cl2.IdContratoLocacao ORDER BY DataInicial DESC) clp
                    WHERE cl2.PlacaPrincipal = v.Placa AND cl2.SituacaoContratoLocacao NOT IN ('Encerrado', 'Cancelado')
                ) ContratoAtivo`
    },
    {
        table: 'dim_contratos_locacao',
        query: `SELECT cl.*, cc.IdContratoComercial, cc.NumeroDocumentoPersonalizado as RefContratoCliente, cli.NomeFantasia as NomeCliente, cc.SituacaoContrato, 
                CAST(ISNULL(preco.PrecoUnitario, 0) AS FLOAT) as ValorMensalAtual
                FROM ContratosLocacao cl 
                JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
                LEFT JOIN Clientes cli ON cc.IdCliente = cli.IdCliente
                OUTER APPLY (SELECT TOP 1 PrecoUnitario FROM ContratosLocacaoPrecos WHERE IdContratoLocacao = cl.IdContratoLocacao AND DataInicial <= GETDATE() ORDER BY DataInicial DESC) preco`
    },
    {
        table: 'fat_precos_locacao',
        query: `SELECT * FROM ContratosLocacaoPrecos WITH (NOLOCK)`
    }
];

// --- LÓGICA DE PROCESSO ---
async function runSync() {
    console.log('🚀 Iniciando Sincronização MASTER (Recuperando Dashboards)...');
    const sqlPool = await sql.connect(sqlConfig);
    const pgClient = new Pool(pgConfig);

    for (const item of TABLES) {
        const start = performance.now();
        console.log(`⏳ Atualizando: ${item.table}`);
        try {
            const result = await sqlPool.request().query(item.query);
            if (result.recordset.length > 0) {
                await pgClient.query(`DROP TABLE IF EXISTS public.${item.table} CASCADE`);
                const sample = result.recordset[0];
                const columns = Object.keys(sample).map(key => `"${key}" TEXT`).join(', ');
                await pgClient.query(`CREATE TABLE public.${item.table} (${columns})`);
                
                const colNames = Object.keys(sample).map(c => `"${c}"`).join(',');
                const BATCH_SIZE = 500;
                for (let i = 0; i < result.recordset.length; i += BATCH_SIZE) {
                    const chunk = result.recordset.slice(i, i + BATCH_SIZE);
                    for (const row of chunk) {
                        const values = Object.values(row);
                        const placeholders = values.map((_, idx) => `$${idx + 1}`).join(',');
                        await pgClient.query(`INSERT INTO public.${item.table} (${colNames}) VALUES (${placeholders})`, values);
                    }
                }
                console.log(`✅ ${item.table} (${result.recordset.length} linhas) - ${((performance.now() - start)/1000).toFixed(2)}s`);
            }
        } catch (err) { console.error(`❌ Erro em ${item.table}:`, err.message); }
    }
    console.log('🏁 DATA WAREHOUSE RESTAURADO E ATUALIZADO!');
    await sqlPool.close(); await pgClient.end();
}

runSync();