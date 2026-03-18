import 'dotenv/config';
import sql from 'mssql';
import pkg from 'pg';
import copyFrom from 'pg-copy-streams';
import { Readable } from 'stream';
const { Pool } = pkg;
const { from: copyStreamFrom } = copyFrom;

const sqlConfig = {
    user: process.env.SQL_USER || 'qualidade',
    password: process.env.SQL_PASSWORD || 'AWJ5A95cD5fW',
    server: process.env.SQL_SERVER || '200.219.192.34',
    port: parseInt(process.env.SQL_PORT || '3494'),
    database: process.env.SQL_DATABASE || 'blufleet-dw',
    connectionTimeout: 300000,
    requestTimeout: 300000,
    options: { encrypt: false, trustServerCertificate: true }
};

// Pooler Session mode (IPv4, porta 5432) — necessário para COPY protocol
// Host direto (db.*) é IPv6-only; pooler tem IPv4.
const pgConfig = {
    host: process.env.PG_POOLER_HOST || 'aws-0-us-east-2.pooler.supabase.com',
    port: parseInt(process.env.PG_POOLER_PORT || '5432'),
    user: process.env.PG_POOLER_USER || 'postgres.qcptedntbdsvqplrrqpi',
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE || 'postgres',
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
};

const TABLES = [
    { table: 'dim_frota', query: `SELECT * FROM Veiculos WITH (NOLOCK)` },
    { table: 'dim_compras', query: `SELECT * FROM VeiculosComprados WITH (NOLOCK)` },
    { table: 'fat_faturamentos', query: `SELECT * FROM Faturamentos WITH (NOLOCK)` },
    { table: 'fat_faturamento_itens', query: `SELECT * FROM FaturamentoItems WITH (NOLOCK)` },
    {
        table: 'dim_contratos_locacao',
        query: `
            SELECT
                cl.*,
                cli.NomeFantasia as NomeCliente,
                ult_preco.PrecoUnitario as UltimoValorLocacao,
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
    { table: 'fat_itens_ordem_servico', query: `SELECT * FROM ItensOrdemServico WITH (NOLOCK)` },
    { table: 'fat_manutencao_unificado', query: `SELECT * FROM OcorrenciasManutencao WITH (NOLOCK) WHERE DataCriacao >= '2024-01-01'` },
    { table: 'fat_movimentacao_ocorrencias', query: `SELECT * FROM MovimentacaoOcorrencias WITH (NOLOCK)` },
    { table: 'fat_multas', query: `SELECT * FROM OcorrenciasInfracoes WITH (NOLOCK) WHERE DataInfracao >= '2024-01-01'` },
    { table: 'fat_sinistros', query: `SELECT * FROM OcorrenciasSinistro WITH (NOLOCK)` },
    { table: 'historico_situacao_veiculos', query: `SELECT * FROM HistoricoSituacaoVeiculos WITH (NOLOCK)` }
];

// Escapa um valor para o formato COPY TEXT (tab-delimited) do Postgres
function toCopyField(v) {
    if (v === null || v === undefined) return '\\N';
    let s;
    if (v instanceof Date) {
        s = isNaN(v.getTime()) ? '' : v.toISOString();
    } else if (Buffer.isBuffer(v)) {
        s = v.toString('hex');
    } else {
        s = String(v);
    }
    // Escapa caracteres especiais do protocolo COPY TEXT
    return s
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

// Converte rows para Readable stream no formato COPY TEXT (tab-delimited)
function rowsToStream(rows, colKeys, now) {
    let i = 0;
    return new Readable({
        read() {
            const end = Math.min(i + 2000, rows.length);
            let chunk = '';
            while (i < end) {
                const row = rows[i++];
                const fields = colKeys.map(k =>
                    k === 'DataAtualizacaoDados' ? now : toCopyField(row[k])
                );
                chunk += fields.join('\t') + '\n';
            }
            if (chunk) this.push(chunk);
            if (i >= rows.length) this.push(null);
        }
    });
}

async function syncTable(item, sqlPool, pgPool) {
    const t0 = Date.now();
    process.stdout.write(`\n⏳ [${item.table}] Baixando do SQL Server...`);

    const result = await sqlPool.request().query(item.query);
    const rows = result.recordset;

    if (rows.length === 0) {
        console.log(` ⏭️  vazia, pulando.`);
        return;
    }

    const baseKeys = Object.keys(rows[0]);
    const hasDataAtualizacaoDados = baseKeys.some(
        k => String(k).toLowerCase() === 'dataatualizacaodados'
    );
    const colKeys = hasDataAtualizacaoDados
        ? baseKeys
        : [...baseKeys, 'DataAtualizacaoDados'];
    const colNames = colKeys.map(c => `"${c}"`).join(', ');
    const now = new Date().toISOString();

    process.stdout.write(` ${rows.length.toLocaleString()} linhas. Enviando via COPY...`);

    const client = await pgPool.connect();
    try {
        const colDefs = colKeys.map(k => `"${k}" TEXT`).join(', ');
        await client.query(`DROP TABLE IF EXISTS public.${item.table} CASCADE`);
        await client.query(`CREATE TABLE public.${item.table} (${colDefs})`);
        await client.query(`GRANT ALL ON public.${item.table} TO anon, authenticated, service_role`);

        // COPY é o método mais rápido do Postgres: envia dados como stream diretamente nos blocos
        const copyStream = client.query(copyStreamFrom(`COPY public.${item.table} (${colNames}) FROM STDIN`));
        const dataStream = rowsToStream(rows, colKeys, now);

        await new Promise((resolve, reject) => {
            dataStream.on('error', reject);
            copyStream.on('error', reject);
            copyStream.on('finish', resolve);
            dataStream.pipe(copyStream);
        });
    } finally {
        client.release();
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(` ✅ concluída em ${elapsed}s`);
}

async function runSync() {
    const args = process.argv.slice(2);
    const onlyArg = args.find(a => a.startsWith('--only='));
    const targetTable = onlyArg ? onlyArg.split('=')[1] : null;

    console.log('🚀 SINCRONIZADOR TURBO (COPY PROTOCOL) INICIADO...');
    if (targetTable) console.log(`🎯 MODO RESTRITO: "${targetTable}"`);

    const sqlPool = await sql.connect(sqlConfig);
    const pgPool = new Pool(pgConfig);

    const tablesToRun = targetTable ? TABLES.filter(t => t.table === targetTable) : TABLES;

    if (tablesToRun.length === 0 && targetTable) {
        console.error(`❌ Tabela "${targetTable}" não encontrada!`);
        await sqlPool.close();
        await pgPool.end();
        process.exit(1);
    }

    const globalT0 = Date.now();
    try {
        for (const item of tablesToRun) {
            await syncTable(item, sqlPool, pgPool);
        }
    } catch (err) {
        console.error('\n❌ ERRO:', err.message);
        process.exitCode = 1;
    } finally {
        await sqlPool.close();
        await pgPool.end();
        const total = ((Date.now() - globalT0) / 1000).toFixed(1);
        console.log(`\n🏁 PROCESSO FINALIZADO em ${total}s!`);
    }
}

runSync();

