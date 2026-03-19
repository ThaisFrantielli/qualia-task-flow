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
const pgPrimaryConfig = {
    host: process.env.PG_POOLER_HOST || 'aws-0-us-east-2.pooler.supabase.com',
    port: parseInt(process.env.PG_POOLER_PORT || '5432'),
    user: process.env.PG_POOLER_USER || 'postgres.qcptedntbdsvqplrrqpi',
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE || 'postgres',
    ssl: { rejectUnauthorized: false },
    max: 15,  // ↑ Aumentado de 5 para melhor paralelização
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
};

const pgHeavyConfig = {
    host: process.env.HEAVY_PG_POOLER_HOST || process.env.HEAVY_PG_HOST,
    port: parseInt(process.env.HEAVY_PG_POOLER_PORT || process.env.HEAVY_PG_PORT || '5432'),
    user: process.env.HEAVY_PG_POOLER_USER || process.env.HEAVY_PG_USER || 'postgres',
    password: process.env.HEAVY_PG_PASSWORD,
    database: process.env.HEAVY_PG_DATABASE || 'postgres',
    ssl: { rejectUnauthorized: false },
    max: 15,  // ↑ Aumentado de 5 para melhor paralelização
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
};

const PRIMARY_TABLES = new Set([
    'dim_frota',
    'dim_contratos_locacao',
    'dim_contratos_metadata'
]);

const HEAVY_TABLES = new Set([
    'fat_faturamentos',
    'fat_faturamento_itens',
    'fat_itens_ordem_servico',
    'fat_movimentacao_ocorrencias'
]);

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
    { table: 'fat_manutencao_unificado', query: `SELECT * FROM OcorrenciasManutencao WITH (NOLOCK)` },
    { table: 'fat_movimentacao_ocorrencias', query: `SELECT * FROM MovimentacaoOcorrencias WITH (NOLOCK)` },
    { table: 'fat_multas', query: `SELECT * FROM OcorrenciasInfracoes WITH (NOLOCK)` },
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
    return s
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

function parsePgNumber(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const s = String(v).trim();
    if (!s) return null;
    const normalized = s
        .replace(/\s+/g, '')
        .replace(/R\$|r\$/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
}

function parsePgDate(v) {
    if (v === null || v === undefined) return null;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
    const s = String(v).trim();
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

function inferHeavyColumnType(colName, rows) {
    const values = rows
        .map(r => r[colName])
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '');

    if (values.length === 0) return 'TEXT';

    const looksDate = /(data|date|hora|timestamp|competencia|vencimento|emissao|criacao|atualizacao)/i.test(colName);
    if (looksDate) {
        const allDates = values.every(v => parsePgDate(v) !== null);
        if (allDates) return 'TIMESTAMP';
    }

    const looksMoney = /(valor|total|preco|preço|custo|reembols|desconto|tarifa|imposto|juros|multa|km|odometro|quantidade|qtd)/i.test(colName);
    if (looksMoney) {
        const allNumbers = values.every(v => parsePgNumber(v) !== null);
        if (allNumbers) return 'NUMERIC(18,2)';
    }

    return 'TEXT';
}

function buildColumnDefinitions(colKeys, rows, isHeavyTable) {
    return colKeys.map((k) => {
        const type = isHeavyTable ? inferHeavyColumnType(k, rows) : 'TEXT';
        return { key: k, type };
    });
}

// Converte rows para Readable stream no formato COPY TEXT (tab-delimited)
function rowsToStream(rows, columns, now) {
    let i = 0;
    return new Readable({
        read() {
            const end = Math.min(i + 2000, rows.length);
            let chunk = '';
            while (i < end) {
                const row = rows[i++];
                const fields = columns.map(({ key, type }) => {
                    const raw = key === 'DataAtualizacaoDados' ? now : row[key];
                    if (raw === null || raw === undefined || String(raw).trim() === '') return '\\N';

                    if (type === 'NUMERIC(18,2)') {
                        const n = parsePgNumber(raw);
                        return n == null ? '\\N' : String(n);
                    }

                    if (type === 'TIMESTAMP') {
                        const d = parsePgDate(raw);
                        return d == null ? '\\N' : d.toISOString();
                    }

                    return toCopyField(raw);
                });
                chunk += fields.join('\t') + '\n';
            }
            if (chunk) this.push(chunk);
            if (i >= rows.length) this.push(null);
        }
    });
}

async function syncTable(item, sqlPool, pgPool, options = {}) {
    const isHeavyDestination = Boolean(options.isHeavyDestination);
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
    const columnDefs = buildColumnDefinitions(colKeys, rows, isHeavyDestination);
    const now = new Date().toISOString();

    process.stdout.write(` ${rows.length.toLocaleString()} linhas. Enviando via COPY para ${isHeavyDestination ? 'HEAVY' : 'PRIMARY'}...`);

    const client = await pgPool.connect();
    try {
        const colDefs = columnDefs.map(c => `"${c.key}" ${c.type}`).join(', ');
        await client.query(`DROP TABLE IF EXISTS public.${item.table} CASCADE`);
        await client.query(`CREATE TABLE public.${item.table} (${colDefs})`);
        await client.query(`GRANT ALL ON public.${item.table} TO anon, authenticated, service_role`);

        // COPY é o método mais rápido do Postgres
        const copyStream = client.query(copyStreamFrom(`COPY public.${item.table} (${colNames}) FROM STDIN`));
        const dataStream = rowsToStream(rows, columnDefs, now);

        await new Promise((resolve, reject) => {
            dataStream.on('error', reject);
            copyStream.on('error', reject);
            copyStream.on('finish', resolve);
            dataStream.pipe(copyStream);
        });

        // ✨ NOVO: ANALYZE após insert para otimizar query planner
        await client.query(`ANALYZE public.${item.table}`);
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

    console.log('🚀 SINCRONIZADOR TURBO v3 (PARALLELIZED COPY PROTOCOL) INICIADO...');
    if (targetTable) console.log(`🎯 MODO RESTRITO: "${targetTable}"`);

    const sqlPool = await sql.connect(sqlConfig);
    const pgPoolPrimary = new Pool(pgPrimaryConfig);
    const pgPoolHeavy = new Pool(pgHeavyConfig);

    const tablesToRun = targetTable ? TABLES.filter(t => t.table === targetTable) : TABLES;

    const needsHeavySync = tablesToRun.some(t => HEAVY_TABLES.has(t.table));
    if (needsHeavySync) {
        const missing = [
            !(process.env.HEAVY_PG_POOLER_HOST || process.env.HEAVY_PG_HOST) && 'HEAVY_PG_POOLER_HOST/HEAVY_PG_HOST',
            !(process.env.HEAVY_PG_POOLER_USER || process.env.HEAVY_PG_USER) && 'HEAVY_PG_POOLER_USER/HEAVY_PG_USER',
            !process.env.HEAVY_PG_PASSWORD && 'HEAVY_PG_PASSWORD',
            !process.env.HEAVY_PG_DATABASE && 'HEAVY_PG_DATABASE'
        ].filter(Boolean);

        if (missing.length > 0) {
            console.error(`❌ Variáveis do banco HEAVY ausentes: ${missing.join(', ')}`);
            await sqlPool.close();
            process.exit(1);
        }
    }

    if (tablesToRun.length === 0 && targetTable) {
        console.error(`❌ Tabela "${targetTable}" não encontrada!`);
        await sqlPool.close();
        await pgPoolPrimary.end();
        await pgPoolHeavy.end();
        process.exit(1);
    }

    const globalT0 = Date.now();
    try {
        // ✨ ESTRATÉGIA: Paralelizar em batches de 4 para evitar timeout de conexão
        // Tabelas HEAVY ao final (sequencialmente)
        const heavyTables = tablesToRun.filter(t => HEAVY_TABLES.has(t.table));
        const lightTables = tablesToRun.filter(t => !HEAVY_TABLES.has(t.table));

        const BATCH_SIZE = 4; // Máximo de sincronizações paralelas simultâneas

        // Primeira fase: tabelas leves em batches paralelos
        if (lightTables.length > 0) {
            console.log(`\n📊 Fase 1: Sincronizando ${lightTables.length} tabelas leves em ${Math.ceil(lightTables.length / BATCH_SIZE)} batch(es)...`);
            for (let i = 0; i < lightTables.length; i += BATCH_SIZE) {
                const batch = lightTables.slice(i, i + BATCH_SIZE);
                console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(lightTables.length / BATCH_SIZE)} (${batch.map(t => t.table).join(', ')})`);
                await Promise.all(
                    batch.map(item => {
                        const isHeavy = HEAVY_TABLES.has(item.table);
                        const destinationPool = isHeavy ? pgPoolHeavy : pgPoolPrimary;
                        if (!isHeavy && !PRIMARY_TABLES.has(item.table)) {
                            console.log(`ℹ️  [${item.table}] não está mapeada explicitamente; destino padrão: PRIMARY.`);
                        }
                        return syncTable(item, sqlPool, destinationPool, { isHeavyDestination: isHeavy });
                    })
                );
            }
        }

        // Segunda fase: tabelas HEAVY sequencialmente (maior consumo de conexões/memória)
        if (heavyTables.length > 0) {
            console.log(`\n📦 Fase 2: Sincronizando ${heavyTables.length} tabelas pesadas sequencialmente...`);
            for (const item of heavyTables) {
                const isHeavy = HEAVY_TABLES.has(item.table);
                const destinationPool = isHeavy ? pgPoolHeavy : pgPoolPrimary;
                await syncTable(item, sqlPool, destinationPool, { isHeavyDestination: isHeavy });
            }
        }
    } catch (err) {
        console.error('\n❌ ERRO:', err.message);
        process.exitCode = 1;
    } finally {
        await sqlPool.close();
        await pgPoolPrimary.end();
        await pgPoolHeavy.end();
        const total = ((Date.now() - globalT0) / 1000).toFixed(1);
        console.log(`\n🏁 PROCESSO FINALIZADO em ${total}s!`);
    }
}

runSync();
