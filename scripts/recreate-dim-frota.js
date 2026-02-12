require('dotenv').config();
const sql = require('mssql');
const { Pool } = require('pg');

// SQL Server (ORIGEM - Tabela Veiculos)
const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER || '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE || 'blufleet-dw',
    connectionTimeout: 180000,
    requestTimeout: 720000,
    pool: { max: 10, min: 2, idleTimeoutMillis: 30000 },
    options: { encrypt: false, trustServerCertificate: true }
};

// PostgreSQL (DESTINO)
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

const QUERY_DIM_FROTA = `SELECT 
    v.IdVeiculo, 
    v.Placa, 
    v.Chassi, 
    v.Renavam, 
    v.Modelo, 
    v.Montadora, 
    v.AnoFabricacao, 
    v.AnoModelo, 
    v.Cor, 
    v.Filial, 
    g.GrupoVeiculo as Categoria, 
    g.TaxaDeDepreciacaoAnual, 
    v.SituacaoVeiculo as Status, 
    v.SituacaoFinanceira,
    v.DiasSituacao,
    COALESCE(p.Patio, NULLIF(v.LocalizacaoVeiculo, ''), 'Em Cliente') AS Localizacao, 
    v.LocalizacaoVeiculo,
    v.DiasLocalizacao,
    v.ObservacaoLocalizacao,
    COALESCE(v.OdometroConfirmado, v.OdometroInformado, 0) as KM, 
    CAST(ISNULL(v.OdometroInformado, 0) AS INT) as KmInformado,
    CAST(ISNULL(v.OdometroConfirmado, 0) AS INT) as KmConfirmado,
    CAST(ISNULL(v.ValorCompra, 0) AS FLOAT) as ValorCompra, 
    CAST(ISNULL(v.ValorAtualFIPE, 0) AS FLOAT) as ValorFipeAtual,
    CAST(COALESCE(v.ValorAtualFIPE, FipeLatest.PrecoFIPE, 0) AS FLOAT) as ValorFipe,
    CAST(ISNULL(FipeData.PrecoFIPE, 0) AS FLOAT) as ValorFipeNaCompra,
    CAST(ISNULL(FipeZeroKm.PrecoFIPE, 0) AS FLOAT) as ValorFipeZeroKmAtual,
    v.DataCompra as DataCompra,
    DATEDIFF(MONTH, v.DataCompra, GETDATE()) as IdadeVeiculo,
    v.Proprietario,
    v.EstadoLicenciamento as UF_Lic,
    v.CidadeLicenciamento,
    v.NumeroMotor,
    CAST(ISNULL(v.TanqueLitros, 0) AS INT) as Tanque,
    v.UltimaManutencao as UltimaManutencao,
    v.UltimaManutencaoPreventiva as UltimaManutencaoPreventiva,
    CAST(ISNULL(v.KmUltimaManutencaoPreventiva, 0) AS INT) as KmUltimaManutencaoPreventiva,
    v.ProvedorTelemetria,
    v.UltimaAtualizacaoTelemetria as UltimaAtualizacaoTelemetria,
    CAST(v.Latitude AS FLOAT) as Latitude,
    CAST(v.Longitude AS FLOAT) as Longitude,
    v.UltimoEnderecoTelemetria,
    v.FinalidadeUso,
    v.ComSeguroVigente,
    CAST(ISNULL(v.CustoTotalPorKmRodado, 0) AS DECIMAL(15,2)) as CustoTotalPorKmRodado,
    v.IdCondutor,
    c.Nome as NomeCondutor,
    c.CPF as CPFCondutor,
    c.Telefone1 as TelefoneCondutor,
    v.SituacaoFinanceiraContratoLocacao,
    al.Instituicao as BancoFinanciador, 
    al.Termino as Quitacao, 
    al.VencimentoPrimeiraParcela as DataPrimParcela,
    ContratoAtivo.NomeCliente,
    ContratoAtivo.TipoLocacao,
    CAST(ISNULL(ContratoAtivo.ValorLocacao, 0) AS DECIMAL(15,2)) as ValorLocacao,
    ContratoAtivo.IdContratoLocacao,
    ContratoAtivo.ContratoLocacao as NumeroContratoLocacao,
    vv.DataVenda as DataVenda
FROM Veiculos v 
LEFT JOIN GruposVeiculos g ON v.IdGrupoVeiculo = g.IdGrupoVeiculo 
LEFT JOIN Patios p ON v.IdPatio = p.IdPatio 
LEFT JOIN Condutores c ON v.IdCondutor = c.IdCondutor
LEFT JOIN VeiculosVendidos vv ON vv.Placa = v.Placa
OUTER APPLY (
    SELECT TOP 1 pf.PrecoFIPE as PrecoFIPE
    FROM PrecosFIPE pf
    WHERE pf.CodigoFIPE = v.CodigoFIPE
        AND pf.AnoModelo = v.AnoModelo
        AND v.DataCompra IS NOT NULL
    ORDER BY ABS(DATEDIFF(MONTH, pf.DataMesFIPE, v.DataCompra)) ASC
) FipeData
OUTER APPLY (
    SELECT TOP 1 pf2.PrecoFIPE as PrecoFIPE
    FROM PrecosFIPE pf2
    WHERE pf2.CodigoFIPE = v.CodigoFIPE
      AND pf2.AnoModelo = v.AnoModelo
    ORDER BY pf2.DataMesFIPE DESC
) FipeLatest
OUTER APPLY (
    SELECT TOP 1 pf3.PrecoFIPE as PrecoFIPE
    FROM PrecosFIPE pf3
    WHERE pf3.CodigoFIPE = v.CodigoFIPE
    ORDER BY 
        CASE WHEN pf3.AnoModelo = 32000 THEN 1 ELSE 0 END DESC,
        pf3.AnoModelo DESC,
        pf3.DataMesFIPE DESC
) FipeZeroKm
OUTER APPLY (
    SELECT TOP 1 Instituicao, Termino, VencimentoPrimeiraParcela 
    FROM Alienacoes 
    WHERE Placa = v.Placa 
    ORDER BY Inicio DESC
) al 
OUTER APPLY (
    SELECT TOP 1
        cli2.NomeFantasia as NomeCliente,
        cc2.TipoLocacao,
        clp.PrecoUnitario as ValorLocacao,
        cl2.IdContratoLocacao,
        cl2.ContratoLocacao
    FROM ContratosLocacao cl2
    JOIN ContratosComerciais cc2 ON cl2.IdContrato = cc2.IdContratoComercial
    LEFT JOIN Clientes cli2 ON cc2.IdCliente = cli2.IdCliente
    OUTER APPLY (
        SELECT TOP 1 PrecoUnitario
        FROM ContratosLocacaoPrecos
        WHERE IdContratoLocacao = cl2.IdContratoLocacao
        ORDER BY DataInicial DESC
    ) clp
    WHERE cl2.PlacaPrincipal = v.Placa
      AND cl2.SituacaoContratoLocacao NOT IN ('Encerrado', 'Cancelado')
    ORDER BY cl2.DataInicial DESC
) ContratoAtivo`;

async function recreateDimFrota() {
    console.log('🔄 Iniciando recriação de dim_frota com todas as colunas...\n');

    let sqlPool;
    let pgPool;

    try {
        // 1. Conectar SQL Server
        console.log('📡 Conectando ao SQL Server...');
        sqlPool = await sql.connect(sqlConfig);
        console.log('✅ SQL Server conectado\n');

        // 2. Conectar PostgreSQL
        console.log('📡 Conectando ao PostgreSQL...');
        pgPool = new Pool(pgConfig);
        const pgClient = await pgPool.connect();
        console.log('✅ PostgreSQL conectado\n');

        // 3. Buscar dados do SQL Server
        console.log('🔍 Buscando dados de Veiculos...');
        const result = await sqlPool.request().query(QUERY_DIM_FROTA);
        const recordset = result.recordset;
        console.log(`✅ ${recordset.length} veículos encontrados\n`);

        if (recordset.length === 0) {
            console.log('⚠️  Nenhum veículo encontrado. Abortando.');
            return;
        }

        // 4. Mostrar estrutura
        const columns = Object.keys(recordset[0]);
        console.log(`📋 Total de colunas: ${columns.length}`);
        console.log(`📋 Colunas: ${columns.join(', ')}\n`);

        // 5. Dropar tabela existente
        console.log('🗑️  Dropando tabela dim_frota antiga...');
        await pgClient.query('DROP TABLE IF EXISTS public.dim_frota CASCADE;');
        console.log('✅ Tabela removida\n');

        // 6. Criar nova estrutura
        console.log('🏗️  Criando nova estrutura com todas as colunas...');
        const getPgType = (val) => {
            const type = typeof val;
            if (type === 'number') return 'NUMERIC(18, 4)';
            if (type === 'boolean') return 'BOOLEAN';
            if (val instanceof Date) return 'TIMESTAMP';
            return 'TEXT';
        };

        const columnDefs = columns.map(key => {
            const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "");
            return `"${safeKey}" ${getPgType(recordset[0][key])}`;
        }).join(',\n  ');

        const createTableSQL = `CREATE TABLE public.dim_frota (
  ${columnDefs},
  PRIMARY KEY ("IdVeiculo")
);`;

        await pgClient.query(createTableSQL);
        console.log('✅ Tabela criada com sucesso\n');

        // 7. Preparar dados para inserção
        console.log('📥 Preparando dados...');
        for (let r = 0; r < recordset.length; r++) {
            const row = recordset[r];
            for (const col of columns) {
                const val = row[col];
                if (val === undefined) row[col] = null;
                else if (val instanceof Date) row[col] = val.toISOString();
                else if (typeof val === 'string' && val.trim() === '') row[col] = null;
            }
        }

        // 8. Inserir dados em batches
        console.log('💾 Inserindo dados...');
        const BATCH_SIZE = 500;
        const columnNames = columns.map(col => `"${col.replace(/[^a-zA-Z0-9_]/g, "")}"`).join(', ');
        const rowLength = columns.length;

        await pgClient.query('BEGIN');
        try {
            for (let i = 0; i < recordset.length; i += BATCH_SIZE) {
                const end = Math.min(i + BATCH_SIZE, recordset.length);
                const chunkSize = end - i;
                const placeholders = [];
                const flatValues = [];

                for (let rowIdx = 0; rowIdx < chunkSize; rowIdx++) {
                    const rowPlaceholders = [];
                    const row = recordset[i + rowIdx];
                    for (let colIdx = 0; colIdx < rowLength; colIdx++) {
                        rowPlaceholders.push(`$${rowIdx * rowLength + colIdx + 1}`);
                        flatValues.push(row[columns[colIdx]]);
                    }
                    placeholders.push(`(${rowPlaceholders.join(', ')})`);
                }

                const insertQuery = `INSERT INTO public.dim_frota (${columnNames}) VALUES ${placeholders.join(', ')};`;
                await pgClient.query(insertQuery, flatValues);

                console.log(`   ✓ Inseridos ${end}/${recordset.length} registros`);
            }

            await pgClient.query('COMMIT');
            console.log('\n✅ Todos os dados inseridos com sucesso!\n');
        } catch (err) {
            await pgClient.query('ROLLBACK');
            throw err;
        }

        // 9. Verificar resultado
        const countResult = await pgClient.query('SELECT COUNT(*) FROM public.dim_frota');
        const count = countResult.rows[0].count;
        console.log(`📊 Total de registros em dim_frota: ${count}`);

        const sampleResult = await pgClient.query('SELECT * FROM public.dim_frota LIMIT 1');
        const sampleColumns = Object.keys(sampleResult.rows[0]);
        console.log(`📋 Colunas confirmadas: ${sampleColumns.length}`);
        console.log(`📋 Amostra: ${sampleColumns.join(', ')}\n`);

        pgClient.release();
        console.log('✅ dim_frota recriada com sucesso com todas as 59 colunas!');

    } catch (err) {
        console.error('❌ Erro:', err.message);
        console.error(err);
    } finally {
        if (sqlPool) await sqlPool.close();
        if (pgPool) await pgPool.end();
    }
}

recreateDimFrota();
