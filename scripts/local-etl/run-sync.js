require('dotenv').config();
const sql = require('mssql');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Configuração do SQL Server
const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE,
    connectionTimeout: 120000,
    requestTimeout: 120000,
    options: { encrypt: false, trustServerCertificate: true }
};

// --- BLOCO 1: RELATÓRIOS LEVES (Arquivo Único) ---
const SIMPLE_REPORTS = [
    // 1. FROTA ATIVA
    {
        filename: 'frota.json',
        query: `
            SELECT 
                v.IdVeiculo, v.Placa, v.Modelo, v.Montadora, v.AnoFabricacao, 
                v.SituacaoVeiculo, v.Filial, v.Cor,
                COALESCE(v.OdometroInformado, 0) as KM,
                COALESCE(v.IdadeEmMeses, 0) as IdadeMeses,
                CAST(v.ValorCompra AS FLOAT) as ValorCompra, 
                CAST(v.ValorAtualFIPE AS FLOAT) as ValorFipe
            FROM Veiculos v
            WHERE v.SituacaoVeiculo <> 'Vendido'
            ORDER BY v.Modelo
        `
    },

    // 2. COMPRAS (Com FIPE ATUAL e FIPE HISTÓRICA)
    {
        filename: 'compras_full.json',
        query: `
            SELECT DISTINCT
                vc.IdVeiculo,
                vc.Placa,
                v.Modelo,
                v.Montadora,
                v.AnoFabricacao,
                v.Cor,
                v.SituacaoVeiculo,
                
                -- KM
                COALESCE(v.OdometroInformado, 0) as KM,
                
                -- Datas
                FORMAT(vc.DataCompra, 'yyyy-MM-dd') as DataCompra,
                
                -- Valores
                CAST(vc.ValorCompra AS FLOAT) as ValorCompra,
                CAST(vc.ValorAcessorios AS FLOAT) as ValorAcessorios,
                
                -- FIPES (As duas, para você escolher)
                CAST(v.ValorAtualFIPE AS FLOAT) as ValorFipeAtual,       -- Valor HOJE
                CAST(COALESCE(FipeData.PrecoFIPE, 0) AS FLOAT) as ValorFipeNaCompra, -- Valor na época
                
                -- Funding e Fornecedor
                COALESCE(FundingData.Instituicao, vc.Instituicao, 'Recurso Próprio') AS Banco,
                CAST(COALESCE(FundingData.ValorAlienado, vc.ValorAlienado, 0) AS FLOAT) as ValorFinanciado,
                CAST(COALESCE(FundingData.ValorParcela, vc.ValorPrimeiraParcela, 0) AS FLOAT) as ValorParcela,
                COALESCE(Forn.NomeFantasia, Forn.Nome, vc.NomeFornecedorNotaFiscal, 'Fornecedor N/D') as Fornecedor

            FROM VeiculosComprados vc
            INNER JOIN Veiculos v ON vc.IdVeiculo = v.IdVeiculo
            
            -- APPLYS (Mantém igual para evitar duplicação)
            OUTER APPLY (SELECT TOP 1 Nome, NomeFantasia FROM Fornecedores f WHERE f.IdFornecedor = vc.IdFornecedorNotaFiscal) Forn
            OUTER APPLY (SELECT TOP 1 Instituicao, ValorAlienado, ValorParcela FROM Alienacoes ali WHERE ali.IdAlienacao = vc.IdAlienacao) FundingData
            OUTER APPLY (SELECT TOP 1 PrecoFIPE FROM PrecosFIPE pf WHERE pf.CodigoFIPE = v.CodigoFIPE AND pf.AnoModelo = v.AnoModelo AND YEAR(pf.DataMesFIPE) = YEAR(vc.DataCompra) AND MONTH(pf.DataMesFIPE) = MONTH(vc.DataCompra)) FipeData

            WHERE vc.DataCompra >= DATEADD(year, -5, GETDATE())
        `
    },

    // 10. FUNDING & ALIENAÇÕES (Gestão de Dívida)
    {
        filename: 'alienacoes.json',
        query: `
            SELECT 
                a.IdAlienacao,
                a.Instituicao as Banco,
                a.NumeroContrato,
                a.Placa,
                a.Modelo,
                a.SituacaoFinanceiraVeiculo as Situacao,
                
                -- Valores
                CAST(a.ValorContratoVeiculo AS FLOAT) as ValorOriginal,
                CAST(a.ValorParcelaVeiculo AS FLOAT) as ValorParcela,
                CAST(a.SaldoRemanescente AS FLOAT) as SaldoDevedor,
                
                -- Prazos
                a.QuantidadeParcelas as PrazoTotal,
                a.QuantidadeParcelasRemanescentes as PrazoRestante,
                
                -- Datas
                FORMAT(a.Inicio, 'yyyy-MM-dd') as DataInicio,
                FORMAT(a.Termino, 'yyyy-MM-dd') as DataFim,
                FORMAT(a.VencimentoPrimeiraParcela, 'yyyy-MM-dd') as DataPrimeiroVencimento

            FROM Alienacoes a
            WHERE a.SaldoRemanescente > 0 -- Traz apenas dívida ativa
            ORDER BY a.SaldoRemanescente DESC
        `
    },
    // 3. AUDITORIA DE VENDAS
    {
        filename: 'auditoria_vendas.json',
        query: `
            SELECT 
                vv.IdVeiculo, vv.Placa, vv.Modelo,
                FORMAT(vv.DataCompra, 'yyyy-MM-dd') as DataCompra,
                FORMAT(vv.DataVenda, 'yyyy-MM-dd') as DataVenda,
                DATEDIFF(day, vv.DataCompra, vv.DataVenda) as DiasEmFrota,
                CAST(vv.ValorCompra AS FLOAT) as ValorCompra,
                CAST(vv.ValorVenda AS FLOAT) as ValorVenda,
                CAST(vv.ValorTotal AS FLOAT) as ValorTotalRecebido,
                -- Resultado Financeiro
                (CAST(vv.ValorVenda AS FLOAT) - CAST(vv.ValorCompra AS FLOAT)) as ResultadoBruto,
                vv.Comprador
            FROM VeiculosVendidos vv
            WHERE vv.DataVenda IS NOT NULL
            ORDER BY vv.DataVenda DESC
        `
    },

    // 4. VENDAS (Histórico Simples de Saída)
    {
        filename: 'vendas.json',
        query: `
            SELECT 
                vv.IdVeiculo, vv.Placa, vv.Modelo, vv.Montadora, vv.Comprador,
                FORMAT(vv.DataVenda, 'yyyy-MM-dd') as DataVenda,
                CAST(vv.ValorVenda AS FLOAT) as ValorVenda,
                CAST(vv.ValorCompra AS FLOAT) as ValorCompra, 
                CAST(vv.ValorTotal AS FLOAT) as ValorTotalVenda,
                DATEDIFF(month, vv.DataCompra, vv.DataVenda) as MesesDeUso
            FROM VeiculosVendidos vv
            WHERE vv.DataVenda IS NOT NULL
        `
    },

    // 5. CONTRATOS E PREÇOS (Base para Gap Analysis)
    {
        filename: 'contratos_ativos.json',
        query: `
            SELECT 
                cl.IdContratoLocacao,
                COALESCE(cc.NomeRequisitante, 'Cliente ' + CAST(cc.IdCliente as VARCHAR)) as Cliente,
                cl.PlacaPrincipal as Placa, cl.SituacaoContratoLocacao as Status,
                FORMAT(cl.DataInicial, 'yyyy-MM-dd') as InicioContrato,
                FORMAT(cl.DataEncerramento, 'yyyy-MM-dd') as FimContrato,
                -- Dados do Preço
                FORMAT(cp.DataInicial, 'yyyy-MM-dd') as InicioVigenciaPreco,
                FORMAT(cp.DataFinal, 'yyyy-MM-dd') as FimVigenciaPreco,
                CAST(cp.PrecoUnitario AS FLOAT) as ValorVigente
            FROM ContratosLocacao cl
            INNER JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
            INNER JOIN ContratosLocacaoPrecos cp ON cl.IdContratoLocacao = cp.IdContratoLocacao
            WHERE (cl.DataEncerramento IS NULL OR cl.DataEncerramento >= DATEADD(year, -3, GETDATE()))
        `
    },

    // 6. CHURN (Eventos de Entrada e Saída)
    {
        filename: 'churn_contratos.json',
        query: `
            -- Entradas
            SELECT cl.IdContratoLocacao, cl.PlacaPrincipal as Placa, 
                   FORMAT(cl.DataInicial, 'yyyy-MM-dd') as DataEvento, 'Iniciado' as TipoEvento,
                   CAST(cl.CustoAtual AS FLOAT) as Valor
            FROM ContratosLocacao cl WHERE cl.DataInicial >= DATEADD(year, -3, GETDATE())
            UNION ALL
            -- Saídas
            SELECT cl.IdContratoLocacao, cl.PlacaPrincipal as Placa, 
                   FORMAT(cl.DataEncerramento, 'yyyy-MM-dd') as DataEvento, 'Encerrado' as TipoEvento,
                   CAST(cl.CustoAtual AS FLOAT) as Valor
            FROM ContratosLocacao cl WHERE cl.DataEncerramento >= DATEADD(year, -3, GETDATE())
        `
    }
];

async function runSync() {
    console.log(`[${new Date().toISOString()}] 🚀 Iniciando ETL Definitivo...`);

    try {
        await sql.connect(sqlConfig);
        console.log("✅ Conectado ao SQL Server (Base: " + process.env.SQL_DATABASE + ")");

        // === FASE 1: Relatórios Leves ===
        for (const report of SIMPLE_REPORTS) {
            await processReport(report.filename, report.query);
        }

        // === FASE 2: Relatórios Pesados (Fatiados por Ano) ===
        const years = [2021, 2022, 2023, 2024, 2025];

        for (const year of years) {
            console.log(`\n✂️  Processando Ano Base: ${year}...`);

            // 1. FINANCEIRO (FaturamentoItems é a tabela pesada)
            await processReport(`financeiro_completo_${year}.json`, `
                SELECT 
                    f.IdNota, f.Cliente, f.SituacaoNota,
                    FORMAT(f.DataEmissao, 'yyyy-MM-dd') as DataEmissao,
                    FORMAT(f.DataCompetencia, 'yyyy-MM-dd') as DataCompetencia,
                    CAST(f.ValorLocacao AS FLOAT) as ValorLocacao,
                    CAST(f.ValorTotal AS FLOAT) as ValorTotal,
                    fi.IdVeiculo, fi.Descricao as ItemDescricao,
                    CAST(fi.ValorTotal AS FLOAT) as ValorFaturadoItem
                FROM Faturamentos f
                LEFT JOIN FaturamentoItems fi ON f.IdNota = fi.IdNota
                WHERE YEAR(f.DataEmissao) = ${year}
                AND f.SituacaoNota <> 'Cancelada'
            `);

            // 2. MANUTENÇÃO - HEADER (OrdensServico)
            await processReport(`manutencao_os_${year}.json`, `
                SELECT 
                    os.IdOrdemServico, os.Placa, os.ModeloVeiculo, os.Fornecedor,
                    os.SituacaoOrdemServico, os.Tipo as TipoManutencao, os.Motivo,
                    FORMAT(os.DataInicioServico, 'yyyy-MM-dd') as DataEntrada,
                    FORMAT(os.DataConclusaoOcorrencia, 'yyyy-MM-dd') as DataSaida,
                    CAST(os.ValorTotal AS FLOAT) as ValorTotal,
                    os.OdometroConfirmado as KM,
                    DATEDIFF(day, os.DataInicioServico, os.DataConclusaoOcorrencia) as DiasParado
                FROM OrdensServico os
                WHERE YEAR(os.DataInicioServico) = ${year}
                AND os.SituacaoOrdemServico <> 'Cancelada'
            `);

            // 3. MANUTENÇÃO - ITENS (ItensOrdemServico - A mais pesada!)
            await processReport(`manutencao_itens_${year}.json`, `
                SELECT 
                    ios.IdItemOrdemServico, ios.IdOrdemServico, 
                    ios.GrupoDespesa, ios.DescricaoItem, ios.TipoItem,
                    ios.Quantidade, CAST(ios.ValorTotal AS FLOAT) as ValorItem
                FROM ItensOrdemServico ios
                INNER JOIN OrdensServico os ON ios.IdOrdemServico = os.IdOrdemServico
                WHERE YEAR(os.DataInicioServico) = ${year}
                AND os.SituacaoOrdemServico <> 'Cancelada'
            `);
        }

        console.log("\n🏁 Sincronização Finalizada com Sucesso!");

    } catch (err) {
        console.error("❌ Erro Fatal:", err.message);
    } finally {
        if (sql) await sql.close();
    }
}

// Função de Upload Genérica
async function processReport(filename, query) {
    console.log(`   ⏳ Querying: ${filename}...`);
    try {
        const result = await sql.query(query);
        const data = result.recordset;

        if (!data || data.length === 0) {
            console.log(`      ⚠️  Sem dados para ${filename}, pulando.`);
            return;
        }

        const jsonContent = {
            generated_at: new Date().toISOString(),
            row_count: data.length,
            data: data
        };

        const sizeMB = (JSON.stringify(jsonContent).length / 1024 / 1024).toFixed(2);
        console.log(`      📦 Uploading ${sizeMB} MB...`);

        const { error } = await supabase.storage
            .from('bi-reports')
            .upload(filename, JSON.stringify(jsonContent), {
                contentType: 'application/json',
                upsert: true
            });

        if (error) throw error;
        console.log(`      ✅ Sucesso: ${filename} (${data.length} rows)`);
    } catch (err) {
        console.error(`      ❌ Erro em ${filename}:`, err.message);
    }
}

runSync();