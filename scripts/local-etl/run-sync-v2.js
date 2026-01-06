require('dotenv').config();
const sql = require('mssql');
const { Pool } = require('pg');
const { performance } = require('perf_hooks');

// ******************************************************************************
// CONFIGURAÇÃO DE CONEXÃO
// ******************************************************************************

// SQL Server (ORIGEM)
const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER || '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE || 'blufleet-dw',
    connectionTimeout: 180000,
    requestTimeout: 720000,
    pool: {
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000
    },
    options: { encrypt: false, trustServerCertificate: true }
};

// PostgreSQL (DESTINO)
const pgConfig = {
    host: process.env.PG_HOST || '127.0.0.1',
    port: process.env.PG_PORT || 5432,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: (process.env.PG_DATABASE || 'bluconecta_dw').toLowerCase().trim(),
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};

// Supabase (para upload de JSON)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY não configurado. Upload para Storage será desabilitado.');
}

// HELPER (Para campos texto sujos - USAR APENAS EM CAMPOS VARCHAR)
const castM = (col) => `TRY_CAST(REPLACE(REPLACE(REPLACE(REPLACE(ISNULL(CAST(${col} AS VARCHAR), '0'), 'R$', ''), '.', ''), ',', '.'), ' ', '') AS FLOAT)`;

// Variável global para armazenar a data de atualização do DW
let dwLastUpdate = null;

/**
 * Busca a data mais recente de atualização dos dados no DW fonte
 */
async function getDWLastUpdateDate(pool) {
    try {
        const result = await pool.request().query(`
            SELECT MAX(DataAtualizacaoDados) as LastUpdate
            FROM (
                SELECT MAX(DataAtualizacaoDados) as DataAtualizacaoDados FROM Veiculos
                UNION ALL
                SELECT MAX(DataAtualizacaoDados) FROM Clientes
                UNION ALL
                SELECT MAX(DataAtualizacaoDados) FROM ContratosLocacao
                UNION ALL
                SELECT MAX(DataAtualizacaoDados) FROM OrdensServico
            ) AS AllDates
        `);
        
        if (result.recordset && result.recordset[0].LastUpdate) {
            dwLastUpdate = result.recordset[0].LastUpdate;
            console.log(`📅 Data de atualização do DW fonte: ${dwLastUpdate.toISOString()}`);
            return dwLastUpdate;
        }
        return null;
    } catch (err) {
        console.error('❌ Erro ao buscar data de atualização do DW:', err.message);
        return null;
    }
}

// ==============================================================================
// 1. DIMENSÕES GLOBAIS
// ==============================================================================
const DIMENSIONS = [
    { 
        table: 'dim_clientes', 
        query: `SELECT IdCliente, NomeFantasia as Nome, CNPJ, CPF, Tipo, NaturezaCliente, Cidade, Estado, Segmento, Situacao FROM Clientes WITH (NOLOCK)` 
    },
    { 
        table: 'dim_condutores', 
        query: `SELECT IdCondutor, Nome, CPF, NúmeroCnh as NumeroCnh, TipoCnh, FORMAT(VencimentoCnh, 'yyyy-MM-dd') as VencCnh, Email, Telefone1, Telefone2, Telefone3 FROM Condutores WITH (NOLOCK)` 
    },
    { 
        table: 'dim_fornecedores', 
        query: `SELECT IdFornecedor, NomeFantasia, CNPJ, CPF, Classificacao, Marca, Endereco, NumeroEndereco, Complemento, Bairro, Cidade, Estado, FORMAT(CriadoEm, 'yyyy-MM-dd') as CriadoEm FROM Fornecedores WITH (NOLOCK)` 
    },
    { 
        table: 'dim_frota', 
        query: `SELECT 
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
                    -- FORMAT(v.DataInicioStatus, 'yyyy-MM-dd') as DataInicioStatus,
                    COALESCE(p.Patio, NULLIF(v.LocalizacaoVeiculo, ''), 'Em Cliente') AS Localizacao, 
                    v.LocalizacaoVeiculo,
                    v.DiasLocalizacao,
                    v.ObservacaoLocalizacao,
                    COALESCE(v.OdometroConfirmado, v.OdometroInformado, 0) as KM, 
                    CAST(ISNULL(v.OdometroInformado, 0) AS INT) as KmInformado,
                    CAST(ISNULL(v.OdometroConfirmado, 0) AS INT) as KmConfirmado,
                    CAST(ISNULL(v.ValorCompra, 0) AS FLOAT) as ValorCompra, 
                    CAST(ISNULL(v.ValorAtualFIPE, 0) AS FLOAT) as ValorFipeAtual,
                    -- Normaliza Valor FIPE: usa ValorAtualFIPE quando disponível, senão último PrecoFIPE conhecido
                    CAST(COALESCE(v.ValorAtualFIPE, FipeLatest.PrecoFIPE, 0) AS FLOAT) as ValorFipe,
                    CAST(ISNULL(FipeData.PrecoFIPE, 0) AS FLOAT) as ValorFipeNaCompra,
                    FORMAT(v.DataCompra, 'yyyy-MM-dd') as DataCompra,
                    DATEDIFF(MONTH, v.DataCompra, GETDATE()) as IdadeVeiculo,
                    v.Proprietario,
                    v.EstadoLicenciamento as UF_Lic,
                    v.CidadeLicenciamento,
                    v.NumeroMotor,
                    CAST(ISNULL(v.TanqueLitros, 0) AS INT) as Tanque,
                    FORMAT(v.UltimaManutencao, 'yyyy-MM-dd') as UltimaManutencao,
                    FORMAT(v.UltimaManutencaoPreventiva, 'yyyy-MM-dd') as UltimaManutencaoPreventiva,
                    CAST(ISNULL(v.KmUltimaManutencaoPreventiva, 0) AS INT) as KmUltimaManutencaoPreventiva,
                    v.ProvedorTelemetria,
                    FORMAT(v.UltimaAtualizacaoTelemetria, 'yyyy-MM-dd HH:mm:ss') as UltimaAtualizacaoTelemetria,
                    CAST(v.Latitude AS FLOAT) as Latitude,
                    CAST(v.Longitude AS FLOAT) as Longitude,
                    v.UltimoEnderecoTelemetria,
                    v.FinalidadeUso,
                    v.ComSeguroVigente,
                    CAST(ISNULL(v.CustoTotalPorKmRodado, 0) AS FLOAT) as CustoTotalPorKmRodado,
                    v.IdCondutor,
                    c.Nome as NomeCondutor,
                    c.CPF as CPFCondutor,
                    c.Telefone1 as TelefoneCondutor,
                    v.SituacaoFinanceiraContratoLocacao,
                    al.Instituicao as BancoFinanciador, 
                    FORMAT(al.Termino, 'yyyy-MM-dd') as Quitacao, 
                    FORMAT(al.VencimentoPrimeiraParcela, 'yyyy-MM-dd') as DataPrimParcela 
                FROM Veiculos v 
                LEFT JOIN GruposVeiculos g ON v.IdGrupoVeiculo = g.IdGrupoVeiculo 
                LEFT JOIN Patios p ON v.IdPatio = p.IdPatio 
                LEFT JOIN Condutores c ON v.IdCondutor = c.IdCondutor
                -- Preco FIPE na época da compra (mes/ano) quando existe
                                OUTER APPLY (
                                        SELECT TOP 1 pf.PrecoFIPE as PrecoFIPE
                                        FROM PrecosFIPE pf
                                        WHERE pf.CodigoFIPE = v.CodigoFIPE
                                            AND pf.AnoModelo = v.AnoModelo
                                            AND v.DataCompra IS NOT NULL
                                            AND YEAR(pf.DataMesFIPE) = YEAR(v.DataCompra)
                                            AND MONTH(pf.DataMesFIPE) = MONTH(v.DataCompra)
                                ) FipeData
                -- Último PrecoFIPE disponível (fallback para ValorFipe)
                OUTER APPLY (
                    SELECT TOP 1 pf2.PrecoFIPE as PrecoFIPE
                    FROM PrecosFIPE pf2
                    WHERE pf2.CodigoFIPE = v.CodigoFIPE
                      AND pf2.AnoModelo = v.AnoModelo
                    ORDER BY pf2.DataMesFIPE DESC
                ) FipeLatest
                OUTER APPLY (
                    SELECT TOP 1 Instituicao, Termino, VencimentoPrimeiraParcela 
                    FROM Alienacoes 
                    WHERE Placa = v.Placa 
                    ORDER BY Inicio DESC
                ) al 
                WHERE COALESCE(v.FinalidadeUso, '') <> 'Terceiro'` 
    },
    { 
        table: 'dim_veiculos_acessorios', 
        query: `SELECT IdVeiculo, NomeAcessorio as Acessorio, TipoInstalacao as Origem FROM VeiculosAcessorios` 
    },
        { 
                table: 'dim_contratos_locacao', 
                query: `SELECT 
                                        cc.IdContratoComercial, 
                                        cl.ContratoComercial,           
                                        cl.ContratoLocacao,             
                                        cc.NumeroDocumentoPersonalizado as RefContratoCliente,
                                        cli.NomeFantasia as NomeCliente, 
                                        cc.SituacaoContrato, 
                                        -- Normaliza TipoLocacao:
                                        -- 1) Se 'Assinatura' mantém 'Assinatura'
                                        -- 2) Se indica terceirização, marca 'Terceirização de Frotas' exceto quando cliente é Público -> 'Público'
                                        CASE 
                                            WHEN UPPER(ISNULL(cc.TipoLocacao, '')) = 'ASSINATURA' THEN 'Assinatura'
                                            WHEN UPPER(ISNULL(cc.TipoLocacao, '')) LIKE '%TERCEIRIZ%' THEN 
                                                CASE WHEN UPPER(ISNULL(cli.NaturezaCliente, '')) = UPPER('Público') THEN 'Público' ELSE 'Terceirização de Frotas' END
                                            ELSE cc.TipoLocacao
                                        END as TipoLocacao,
                                        cc.NomePromotor, 
                                        cl.IdContratoLocacao, 
                                        cl.PlacaPrincipal, 
                                        cl.SituacaoContratoLocacao as StatusLocacao, 
                                        cl.SituacaoDoFaturamento,
                                        cl.NomeCondutor,
                                        CAST(ISNULL(preco.PrecoUnitario, 0) AS FLOAT) as ValorMensalAtual,
                                        FORMAT(cl.DataInicial, 'yyyy-MM-dd') as Inicio, 
                                        FORMAT(cl.DataFinal, 'yyyy-MM-dd') as Fim, 
                                        FORMAT(cl.DataEncerramento, 'yyyy-MM-dd') as DataEncerramento,
                                        cl.PeriodoEmMeses 
                                FROM ContratosLocacao cl 
                                JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
                                LEFT JOIN Clientes cli ON cc.IdCliente = cli.IdCliente
                                OUTER APPLY (
                                        SELECT TOP 1 PrecoUnitario
                                        FROM ContratosLocacaoPrecos clp
                                        WHERE clp.IdContratoLocacao = cl.IdContratoLocacao
                                            AND clp.DataInicial <= GETDATE() 
                                        ORDER BY clp.DataInicial DESC, clp.IdPrecoContratoLocacao DESC
                                ) preco` 
        },
    { 
        table: 'dim_itens_contrato', 
        query: `SELECT IdItemContrato, IdContrato, NomeModelo, Quantidade, ${castM('ValorUnitario')} as Valor, PeriodoLocacao FROM ItensContratos` 
    },
    { 
        table: 'dim_regras_contrato', 
        query: `SELECT cc.NumeroDocumento as Contrato, pc.TipoPerfilContrato as NomeRegra, COALESCE(CAST(pc.ValorPerfil AS VARCHAR(MAX)), pc.TextoPerfil) as ConteudoRegra, pol.NomeTipoPoliticaContrato as NomePolitica, pol.TextoPolitica as ConteudoPolitica FROM ContratosComerciais cc LEFT JOIN PerfisContrato pc ON cc.IdContratoComercial = pc.IdContratoComercial LEFT JOIN PoliticasContrato pol ON cc.IdContratoComercial = pol.IdContrato` 
    },
    { 
        table: 'dim_movimentacao_patios', 
        query: `SELECT 
                    IdVeiculo, Placa, IdPatio, Patio, 
                    FORMAT(DataMovimentacao, 'yyyy-MM-dd HH:mm:ss') as DataMovimentacao, 
                    Comentarios, IdUsuarioMovimentacao, UsuarioMovimentacao 
                FROM MovimentacaoPatios 
                WHERE DataMovimentacao IS NOT NULL
                ORDER BY Placa, DataMovimentacao` 
    },
    { 
        table: 'dim_movimentacao_veiculos', 
        query: `SELECT 
                    IdContratoLocacao, ContratoLocacao, IdContratoComercial, ContratoComercial, 
                    IdClassificacaoContrato, ClassificacaoContrato, 
                    FORMAT(DataEncerramento, 'yyyy-MM-dd HH:mm:ss') as DataEncerramento, 
                    IdSituacaoContratoLocacao, SituacaoContratoLocacao, 
                    NomeFantasia as Cliente, IdVeiculo, Placa, IdModelo, Modelo, 
                    FORMAT(DataRetirada, 'yyyy-MM-dd HH:mm:ss') as DataRetirada, 
                    OdometroRetirada, 
                    FORMAT(DataDevolucao, 'yyyy-MM-dd HH:mm:ss') as DataDevolucao, 
                    OdometroDevolucao, 
                    IdTipoLocacao, TipoLocacao, EnderecoEntrega, EnderecoDevolucao 
                FROM MovimentacaoVeiculos 
                ORDER BY Placa, DataRetirada` 
    }
];

// ==============================================================================
// 2. CONSOLIDADOS
// ==============================================================================
const CONSOLIDATED = [
    { 
        table: 'fat_historico_mobilizacao', 
        query: `SELECT Contrato, Fila, Situacao, Pedido, Placa, Modelo, TempoEmDias, UltimoComentarioMobilizacao FROM HistoricoMobilizacao` 
    },
    { 
        table: 'rentabilidade_360_geral', 
        query: `WITH Base AS ( SELECT v.IdVeiculo, v.Placa, v.Modelo, g.GrupoVeiculo as Grupo, v.DataCompra FROM Veiculos v LEFT JOIN GruposVeiculos g ON v.IdGrupoVeiculo = g.IdGrupoVeiculo WHERE COALESCE(v.FinalidadeUso, '') <> 'Terceiro' ), Ops AS ( SELECT Placa, SUM(${castM('ValorTotal')}) as CustoTotal, COUNT(IdOrdemServico) as Passagens FROM OrdensServico WHERE SituacaoOrdemServico <> 'Cancelada' GROUP BY Placa ), Fin AS ( SELECT fi.IdVeiculo, SUM(${castM('fi.ValorTotal')}) as FatTotal FROM FaturamentoItems fi JOIN Faturamentos f ON fi.IdNota = f.IdNota WHERE f.SituacaoNota <> 'Cancelada' GROUP BY fi.IdVeiculo ) SELECT B.*, CAST(O.CustoTotal AS FLOAT) as CustoOp, CAST(F.FatTotal AS FLOAT) as ReceitaLoc, O.Passagens FROM Base B LEFT JOIN Ops O ON B.Placa = O.Placa LEFT JOIN Fin F ON B.IdVeiculo = F.IdVeiculo` 
    },
    { 
        table: 'hist_vida_veiculo_timeline', 
        query: `SELECT * FROM ( SELECT Placa, DataCompra as Data, 'COMPRA' as Evento FROM Veiculos UNION ALL SELECT PlacaPrincipal, DataInicial, 'LOCAÇÃO' FROM ContratosLocacao UNION ALL SELECT Placa, DataInfracao, 'MULTA' FROM OcorrenciasInfracoes UNION ALL SELECT Placa, DataInicioServico, 'MANUTENÇÃO' FROM OrdensServico UNION ALL SELECT Placa, DataSinistro, 'SINISTRO' FROM OcorrenciasSinistro UNION ALL SELECT Placa, DataConclusaoOcorrencia, 'DEVOLUÇÃO' FROM OcorrenciasDevolucao ) as T WHERE Data IS NOT NULL ORDER BY Data DESC` 
    },
    { 
        table: 'fat_churn', 
        query: `SELECT 
                    cc.IdContratoComercial, 
                    cc.NumeroDocumento as Contrato, 
                    cc.NumeroDocumentoPersonalizado as RefCliente, 
                    cli.NomeFantasia as Cliente, 
                    cc.SituacaoContrato as Status, 
                    FORMAT(DataEnc.DataEncerramento, 'yyyy-MM-dd') as DataEncerramento, 
                    DataEnc.DuracaoMeses, 
                    CAST(ISNULL(Valores.SomaMensal, 0) AS FLOAT) as ValorMensal 
                FROM ContratosComerciais cc 
                LEFT JOIN Clientes cli ON cc.IdCliente = cli.IdCliente 
                OUTER APPLY (
                    SELECT TOP 1 
                        DataEncerramento,
                        DATEDIFF(MONTH, DataInicial, DataEncerramento) as DuracaoMeses
                    FROM ContratosLocacao
                    WHERE IdContrato = cc.IdContratoComercial
                      AND DataEncerramento IS NOT NULL
                    ORDER BY DataEncerramento DESC
                ) DataEnc
                OUTER APPLY (
                    SELECT SUM(ISNULL(p.PrecoUnitario, 0)) as SomaMensal
                    FROM ContratosLocacao cl
                    OUTER APPLY (
                        SELECT TOP 1 PrecoUnitario
                        FROM ContratosLocacaoPrecos clp
                        WHERE clp.IdContratoLocacao = cl.IdContratoLocacao
                          AND clp.DataInicial <= GETDATE()
                        ORDER BY clp.DataInicial DESC
                    ) p
                    WHERE cl.IdContrato = cc.IdContratoComercial
                      AND cl.SituacaoContratoLocacao NOT IN ('Cancelado')
                ) Valores
                WHERE cc.SituacaoContrato IN ('Encerrado', 'Cancelado', 'Finalizado')` 
    },
    { 
        table: 'fat_inadimplencia', 
        query: `SELECT f.IdNota, f.Cliente, f.Nota, ${castM('f.ValorTotal')} as SaldoDevedor, FORMAT(f.Vencimento, 'yyyy-MM-dd') as Vencimento, DATEDIFF(DAY, f.Vencimento, GETDATE()) as DiasAtraso, CASE WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 0 THEN 'A Vencer' WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 30 THEN '1-30 dias' WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 60 THEN '31-60 dias' WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 90 THEN '61-90 dias' ELSE '90+ dias' END as FaixaAging FROM Faturamentos f WHERE f.SituacaoNota = 'Pendente'` 
    },
    { 
        table: 'agg_dre_mensal', 
        query: `SELECT FORMAT(DataCompetencia, 'yyyy-MM') as Competencia, SUM(CASE WHEN Natureza LIKE '%Receita%' THEN ${castM('ValorPagoRecebido')} ELSE 0 END) as Receita, SUM(CASE WHEN Natureza LIKE '%Despesa%' OR Natureza LIKE '%Custo%' THEN ${castM('ValorPagoRecebido')} ELSE 0 END) as Despesa FROM LancamentosComNaturezas WHERE DataCompetencia >= DATEADD(YEAR, -2, GETDATE()) GROUP BY FORMAT(DataCompetencia, 'yyyy-MM')` 
    },
    { 
        table: 'auditoria_consolidada', 
        query: `SELECT 'Frota' as Area, v.Placa, v.Modelo, CASE WHEN CAST(ISNULL(v.ValorCompra, 0) AS FLOAT) = 0 THEN 'Valor de compra não informado' WHEN v.OdometroConfirmado IS NULL THEN 'Odômetro não confirmado' WHEN v.DataCompra IS NULL THEN 'Data de compra não informada' END as Erro, 'Alta' as Gravidade, 'Atualizar cadastro do veículo' as AcaoRecomendada FROM Veiculos v WHERE CAST(ISNULL(v.ValorCompra, 0) AS FLOAT) = 0 OR v.OdometroConfirmado IS NULL OR v.DataCompra IS NULL UNION ALL SELECT 'Comercial', cc.NumeroDocumento, cli.NomeFantasia, 'Contrato sem itens vinculados' as Erro, 'Média' as Gravidade, 'Verificar itens do contrato' as AcaoRecomendada FROM ContratosComerciais cc LEFT JOIN Clientes cli ON cc.IdCliente = cli.IdCliente LEFT JOIN ItensContratos ic ON cc.IdContratoComercial = ic.IdContrato WHERE ic.IdItemContrato IS NULL AND cc.SituacaoContrato = 'Ativo'` 
    },
    { 
        table: 'fat_carro_reserva', 
        query: `SELECT 
                    ovt.IdOcorrencia,
                    ovt.Ocorrencia,
                    ovt.IdVeiculo as IdVeiculoTitular,
                    ovt.Placa as PlacaTitular,
                    ovt.PlacaReserva,
                    ovt.ModeloVeiculoReserva,
                    ovt.GrupoVeiculoReserva,
                    ovt.FornecedorReserva,
                    FORMAT(ovt.DataRetiradaEfetiva, 'yyyy-MM-dd') as DataRetirada,
                    FORMAT(ovt.DataDevolucaoEfetiva, 'yyyy-MM-dd') as DataDevolucao,
                    CAST(ISNULL(ovt.DiariasEfetivas, 0) AS INT) as Diarias,
                    ovt.Motivo,
                    ovt.SituacaoOcorrencia
                FROM OcorrenciasVeiculoTemporario ovt` 
    },
    { 
        table: 'fat_manutencao_unificado', 
        query: `SELECT 'Chegada' as TipoEvento, os.OrdemServico, os.Placa, os.ModeloVeiculo as Modelo, os.Fornecedor, os.Tipo as TipoOcorrencia, FORMAT(os.DataInicioServico, 'yyyy-MM-dd') as DataEvento, 1 as Chegadas, 0 as Conclusoes, ${castM('os.ValorTotal')} as CustoTotalOS, 0 as CustoPecas, 0 as CustoServicos, DATEDIFF(DAY, os.DataInicioServico, ISNULL(os.DataConclusaoOcorrencia, GETDATE())) as LeadTimeTotalDias FROM OrdensServico os WHERE os.SituacaoOrdemServico <> 'Cancelada' UNION ALL SELECT 'Conclusao', os.OrdemServico, os.Placa, os.ModeloVeiculo, os.Fornecedor, os.Tipo, FORMAT(os.DataConclusaoOcorrencia, 'yyyy-MM-dd'), 0, 1, ${castM('os.ValorTotal')}, 0, 0, DATEDIFF(DAY, os.DataInicioServico, os.DataConclusaoOcorrencia) FROM OrdensServico os WHERE os.DataConclusaoOcorrencia IS NOT NULL AND os.SituacaoOrdemServico <> 'Cancelada'` 
    },
    { 
        table: 'fat_manutencao_completa', 
        query: `SELECT os.IdOrdemServico, os.OrdemServico, os.IdOcorrencia, os.Ocorrencia, os.IdVeiculo, os.Placa, os.IdModeloVeiculo, os.ModeloVeiculo as Modelo, os.IdContratoLocacao, os.ContratoLocacao, os.IdContratoComercial, os.ContratoComercial as ContratoOriginal, os.IdCliente, os.Cliente as ClienteOriginal, os.IdFornecedor, os.Fornecedor, os.IdTipo, os.Tipo, os.IdMotivo, os.Motivo, os.IdSituacaoOrdemServico, os.SituacaoOrdemServico, os.OrdemCompra, FORMAT(os.DataInicioServico, 'yyyy-MM-dd') as DataInicio, ${castM('os.ValorTotal')} as ValorTotal, g.GrupoVeiculo as Categoria, cli.NomeFantasia as Cliente, cc.NumeroDocumento as ContratoComercial FROM OrdensServico os LEFT JOIN Veiculos v ON os.Placa = v.Placa LEFT JOIN GruposVeiculos g ON v.IdGrupoVeiculo = g.IdGrupoVeiculo LEFT JOIN ContratosLocacao cl ON os.Placa = cl.PlacaPrincipal LEFT JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial LEFT JOIN Clientes cli ON cc.IdCliente = cli.IdCliente WHERE os.SituacaoOrdemServico <> 'Cancelada'` 
    }
];

// ==============================================================================
// FUNÇÕES AUXILIARES
// ==============================================================================

// Fila de uploads assíncronos para não bloquear PostgreSQL
const uploadQueue = [];

/**
 * Adiciona upload à fila (não-bloqueante) com suporte a chunking para arquivos grandes
 */
function queueUpload(tableName, data, year = null, month = null) {
    if (!SUPABASE_SERVICE_KEY) return;

    const MAX_CHUNK_SIZE = 30000; // Máximo 30K registros por upload (reduzido para evitar HTTP 546)
    const baseFileName = year 
        ? (month ? `${tableName}_${year}_${month.toString().padStart(2, '0')}` 
                  : `${tableName}_${year}`)
        : `${tableName}`;
    
    // Adicionar metadata de atualização
    const metadata = {
        generated_at: new Date().toISOString(),
        dw_last_update: dwLastUpdate ? dwLastUpdate.toISOString() : null,
        table: tableName,
        record_count: data.length,
        etl_version: '2.0'
    };
    
    // Se dados são muito grandes, dividir em chunks
    if (data.length > MAX_CHUNK_SIZE) {
        const totalChunks = Math.ceil(data.length / MAX_CHUNK_SIZE);
        console.log(`         📦 ${tableName}: Dividindo ${data.length} registros em ${totalChunks} partes`);

        // Upload de manifest para evitar detecção por tentativa no frontend
        const manifestFileName = `${baseFileName}_manifest.json`;
        const manifestData = {
            totalParts: totalChunks,
            total_chunks: totalChunks,
            totalRecords: data.length,
            chunkSize: MAX_CHUNK_SIZE,
            baseFileName,
            year,
            month,
        };
        const manifestMetadata = {
            ...metadata,
            kind: 'manifest',
            total_chunks: totalChunks,
            record_count: data.length,
            chunk_size: MAX_CHUNK_SIZE,
        };

        const manifestPromise = fetch(`${SUPABASE_URL}/functions/v1/sync-dw-to-storage`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileName: manifestFileName, data: manifestData, metadata: manifestMetadata })
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(() => {
            console.log(`         📤 Upload: ${manifestFileName} (manifest)`);
        })
        .catch(err => {
            console.error(`         ❌ Erro upload ${manifestFileName}:`, err.message);
        });

        uploadQueue.push(manifestPromise);
        
        for (let i = 0; i < totalChunks; i++) {
            const chunk = data.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE);
            const chunkFileName = `${baseFileName}_part${i + 1}of${totalChunks}.json`;
            
            const chunkMetadata = { ...metadata, chunk: i + 1, total_chunks: totalChunks, record_count: chunk.length };
            
            const uploadPromise = fetch(`${SUPABASE_URL}/functions/v1/sync-dw-to-storage`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileName: chunkFileName, data: chunk, metadata: chunkMetadata })
            })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(result => {
                console.log(`         📤 Upload: ${chunkFileName} (${result.recordCount} registros)`);
            })
            .catch(err => {
                console.error(`         ❌ Erro upload ${chunkFileName}:`, err.message);
            });

            uploadQueue.push(uploadPromise);
        }
    } else {
        // Upload normal para arquivos pequenos
        const fileName = `${baseFileName}.json`;
        
        const uploadPromise = fetch(`${SUPABASE_URL}/functions/v1/sync-dw-to-storage`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileName, data, metadata })
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(result => {
            console.log(`         📤 Upload: ${fileName} (${result.recordCount} registros)`);
        })
        .catch(err => {
            console.error(`         ❌ Erro upload ${fileName}:`, err.message);
        });

        uploadQueue.push(uploadPromise);
    }
}

/**
 * Aguarda todos os uploads pendentes
 */
async function flushUploads() {
    if (uploadQueue.length === 0) return;
    console.log(`\n⏳ Aguardando ${uploadQueue.length} uploads para Supabase...`);
    await Promise.allSettled(uploadQueue);
    uploadQueue.length = 0;
    console.log(`✅ Uploads concluídos\n`);
}

/**
 * Cria tabela no PostgreSQL baseado na estrutura do primeiro registro
 */
async function ensureTableExists(pgClient, tableName, sampleRow) {
    if (!sampleRow) return;

    const getPgType = (val) => {
        const type = typeof val;
        if (type === 'number') return 'NUMERIC(18, 4)';
        if (type === 'boolean') return 'BOOLEAN';
        if (val instanceof Date) return 'TIMESTAMP';
        return 'TEXT';
    };

    const columns = Object.keys(sampleRow).map(key => {
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, ""); 
        return `"${safeKey}" ${getPgType(sampleRow[key])}`;
    }).join(',\n');

    const createSql = `CREATE TABLE IF NOT EXISTS public.${tableName} (${columns});`;
    
    try {
        await pgClient.query(createSql);
    } catch (err) {
        console.error(`         ⚠️  Erro ao criar tabela ${tableName}:`, err.message);
    }
}

/**
 * Processa query: extrai dados, salva no PostgreSQL e faz upload para Supabase Storage
 */
async function processQuery(pgClient, sqlPool, tableName, query, appendMode = false, progressStr = '', year = null, month = null) {
    const start = performance.now();
    let recordset;

    try {
        const result = await sqlPool.request().query(query);
        recordset = result.recordset;
    } catch (err) {
        console.error(`      ❌ ${progressStr} Erro SQL Server (${tableName}):`, err.message);
        return;
    }

    if (!recordset || recordset.length === 0) {
        console.log(`      ⚠️  ${progressStr} ${tableName} (0 registros)`);
        return;
    }

    try {
        // ========== SALVAR NO POSTGRESQL ==========
        if (!appendMode) {
            await pgClient.query(`DROP TABLE IF EXISTS public.${tableName};`);
        }

        await ensureTableExists(pgClient, tableName, recordset[0]);

        const BATCH_SIZE = 500; // Reduzido para evitar overflow de placeholders
        const totalRows = recordset.length;
        const columns = Object.keys(recordset[0]);
        const columnNames = columns.map(col => `"${col.replace(/[^a-zA-Z0-9_]/g, "")}"`).join(', ');
        const rowLength = columns.length;

        // Validar e sanitizar dados (tratar NULL/undefined)
        const sanitizedData = recordset.map(row => {
            const sanitized = {};
            columns.forEach(col => {
                const val = row[col];
                if (val === undefined) {
                    sanitized[col] = null;
                } else if (val instanceof Date) {
                    sanitized[col] = val.toISOString();
                } else if (typeof val === 'string' && val.trim() === '') {
                    sanitized[col] = null;
                } else {
                    sanitized[col] = val;
                }
            });
            return sanitized;
        });

        // Usar transação única para todos os batches da tabela
        const client = await pgClient.connect();
        try {
            await client.query('BEGIN');
            
            for (let i = 0; i < totalRows; i += BATCH_SIZE) {
                const chunk = sanitizedData.slice(i, i + BATCH_SIZE);
                const chunkSize = chunk.length;
                
                // Construir placeholders dinamicamente
                const placeholders = [];
                const flatValues = [];
                
                for (let rowIdx = 0; rowIdx < chunkSize; rowIdx++) {
                    const rowPlaceholders = [];
                    const row = chunk[rowIdx];
                    
                    columns.forEach((col, colIdx) => {
                        const paramIndex = rowIdx * rowLength + colIdx + 1;
                        rowPlaceholders.push(`$${paramIndex}`);
                        flatValues.push(row[col]);
                    });
                    
                    placeholders.push(`(${rowPlaceholders.join(', ')})`);
                }

                const insertQuery = `INSERT INTO public.${tableName} (${columnNames}) VALUES ${placeholders.join(', ')};`;
                await client.query(insertQuery, flatValues);
            }
            
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        const duration = ((performance.now() - start) / 1000).toFixed(2);
        console.log(`      ✅ ${progressStr} ${tableName} (${recordset.length} linhas) - ${duration}s`);

        // ========== UPLOAD PARA SUPABASE STORAGE (ASSÍNCRONO) ==========
        queueUpload(tableName, recordset, year, month);

    } catch (err) {
        console.error(`      ❌ ${progressStr} Erro PostgreSQL (${tableName}):`, err.message);
    }
}

/**
 * Gera query para fato financeiro universal (por ano/mês) - OTIMIZADA
 */
const buildFinanceUniversalQuery = (year, month) => {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = month === 12 
        ? `${year + 1}-01-01` 
        : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    
    return `
        SELECT 
            L.NumeroLancamento, 
            L.Natureza, 
            COALESCE(
                OS.Placa, 
                VV.Placa, 
                CASE WHEN L.Descricao LIKE '%[A-Z][A-Z][A-Z]-[0-9]%' 
                     THEN SUBSTRING(L.Descricao, PATINDEX('%[A-Z][A-Z][A-Z]-[0-9]%', L.Descricao), 8) 
                     ELSE LEFT(L.NumeroDocumento, 8)
                END
            ) AS Placa, 
            ${castM('L.ValorPagoRecebido')} as Valor, 
            FORMAT(L.DataCompetencia, 'yyyy-MM-dd') as Data, 
            L.PagarReceberDe as Entidade
        FROM dbo.LancamentosComNaturezas L WITH (NOLOCK, INDEX(0))
        LEFT JOIN dbo.OrdensServico OS WITH (NOLOCK) 
            ON L.OrdemCompra = OS.OrdemCompra 
            AND OS.SituacaoOrdemServico <> 'Cancelada'
        LEFT JOIN dbo.VeiculosVendidos VV WITH (NOLOCK) 
            ON L.NumeroDocumento = VV.FaturaVenda
        WHERE L.DataCompetencia >= '${startDate}'
          AND L.DataCompetencia < '${endDate}'
        OPTION (MAXDOP 2, FAST 500, RECOMPILE)
    `;
};

// ==============================================================================
// EXECUÇÃO PRINCIPAL
// ==============================================================================
async function runMasterETL() {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 SINCRONIZAÇÃO MASTER ETL - BluConecta DW v2.0`);
    console.log(`📅 Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
    console.log(`${'='.repeat(80)}\n`);

    let sqlPool;
    let pgClient;

    try {
        // ========== CONECTAR AOS BANCOS ==========
        console.log('🔌 Conectando ao SQL Server (origem)...');
        sqlPool = await sql.connect(sqlConfig);
        console.log(`   ✅ Conectado: ${sqlConfig.server}:${sqlConfig.port} / ${sqlConfig.database}`);

        console.log('🔌 Conectando ao PostgreSQL (destino) - Pool de 10 conexões...');
        pgClient = new Pool(pgConfig);
        console.log(`   ✅ Conectado: ${pgConfig.host}:${pgConfig.port} / ${pgConfig.database}\n`);

        // ========== BUSCAR DATA DE ATUALIZAÇÃO DO DW ==========
        console.log('📅 Buscando data de última atualização do DW de origem...');
        await getDWLastUpdateDate(sqlPool);
        console.log('');

        // ========== CONFIGURAÇÃO DE DADOS ==========
        const years = [2022, 2023, 2024, 2025, 2026];
        const factDefs = [
            {
                table: 'fat_faturamentos',
                queryGen: (year) => `SELECT f.IdNota, f.Nota as NumeroNota, f.TipoNota, f.SituacaoNota, f.IdCliente, f.Cliente as NomeCliente, FORMAT(f.DataCompetencia, 'yyyy-MM-dd') as Competencia, FORMAT(f.Vencimento, 'yyyy-MM-dd') as Vencimento, ${castM('f.ValorLocacao')} as VlrLocacao, ${castM('f.ValorReembolsaveis')} as VlrReembolso, ${castM('f.ValorMultas')} as VlrMultas, ${castM('f.ValorTotal')} as VlrTotal, fi.IdVeiculo, fi.Descricao as DetalheItem, ${castM('fi.ValorTotal')} as VlrItem FROM Faturamentos f LEFT JOIN FaturamentoItems fi ON f.IdNota = fi.IdNota WHERE YEAR(f.DataCompetencia) = ${year}`
            },
            {
                table: 'fat_detalhe_itens_os',
                queryGen: (year) => `SELECT ios.IdItemOrdemServico, os.OrdemServico as OS, os.Placa, ios.GrupoDespesa, ios.DescricaoItem, ios.Quantidade, ${castM('ios.ValorTotal')} as Valor FROM ItensOrdemServico ios JOIN OrdensServico os ON ios.IdOrdemServico = os.IdOrdemServico WHERE YEAR(os.DataInicioServico) = ${year} AND os.SituacaoOrdemServico <> 'Cancelada'`
            },
            {
                table: 'fat_ocorrencias_master',
                queryGen: (year) => `SELECT 'Manutencao' as Classe, Ocorrencia, Placa, Tipo, Motivo, SituacaoOcorrencia as Status, FORMAT(DataCriacao, 'yyyy-MM-dd') as Data, ${castM('0')} as Valor FROM OcorrenciasManutencao WHERE YEAR(DataCriacao) = ${year} UNION ALL SELECT 'Sinistro', Ocorrencia, Placa, Descricao, 'Acidente', SituacaoOcorrencia, FORMAT(DataSinistro, 'yyyy-MM-dd'), ${castM('ValorOrcamento')} FROM OcorrenciasSinistro WHERE YEAR(DataSinistro) = ${year} UNION ALL SELECT 'Multa', Ocorrencia, Placa, DescricaoInfracao, OrgaoAutuador, SituacaoOcorrencia, FORMAT(DataInfracao, 'yyyy-MM-dd'), ${castM('ValorInfracao')} FROM OcorrenciasInfracoes WHERE YEAR(DataInfracao) = ${year} UNION ALL SELECT 'Devolucao', Ocorrencia, Placa, Tipo, Motivo, SituacaoOcorrencia, FORMAT(DataConclusaoOcorrencia, 'yyyy-MM-dd'), ${castM('ValorTotal')} FROM OcorrenciasDevolucao WHERE YEAR(DataConclusaoOcorrencia) = ${year} UNION ALL SELECT 'Reserva', Ocorrencia, Placa, ModeloVeiculoReserva, Motivo, SituacaoOcorrencia, FORMAT(DataRetiradaEfetiva, 'yyyy-MM-dd'), ${castM('DiariasEfetivas')} FROM OcorrenciasVeiculoTemporario WHERE YEAR(DataRetiradaEfetiva) = ${year}`
            },
            {
                table: 'fat_sinistros',
                queryGen: (year) => `SELECT 
                    os.IdOcorrencia, os.Ocorrencia, os.IdVeiculo, os.Placa, 
                    FORMAT(os.DataSinistro, 'yyyy-MM-dd') as DataSinistro, 
                    os.Descricao, os.SituacaoOcorrencia as Status,
                    ${castM('os.ValorOrcamento')} as ValorOrcado, 
                    os.BoletimOcorrencia, os.ApoliceSeguro,
                    os.NomeCondutor as Condutor, os.EmailRequisitante, os.TelefoneRequisitante,
                    os.MotoristaCulpado, os.ResponsavelCulpado,
                    os.DanosLataria, os.DanosMotor, os.DanosAcessorios, os.DanosOutros,
                    os.ContratoLocacao, cli.NomeFantasia as Cliente,
                    os.Latitude, os.Longitude, os.Cidade, os.Estado
                FROM OcorrenciasSinistro os 
                LEFT JOIN ContratosLocacao cl ON os.Placa = cl.PlacaPrincipal 
                LEFT JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial 
                LEFT JOIN Clientes cli ON cc.IdCliente = cli.IdCliente 
                WHERE YEAR(os.DataSinistro) = ${year}`
            },
            {
                table: 'fat_multas',
                queryGen: (year) => `SELECT 
                    oi.IdOcorrencia, oi.Ocorrencia, oi.IdVeiculo, oi.Placa,
                    FORMAT(oi.DataInfracao, 'yyyy-MM-dd') as DataInfracao,
                    oi.DescricaoInfracao, oi.CodigoInfracao, oi.AutoInfracao,
                    oi.OrgaoAutuador, oi.EstadoOrgaoAutuador,
                    ${castM('oi.ValorInfracao')} as ValorMulta, 
                    ${castM('oi.ValorInfracaoDesconto')} as ValorDesconto,
                    oi.SituacaoOcorrencia as Status,
                    oi.NomeCondutor as Condutor, oi.ContratoLocacao, cli.NomeFantasia as Cliente,
                    FORMAT(oi.DataLimiteRecurso, 'yyyy-MM-dd') as DataLimiteRecurso,
                    FORMAT(oi.DataLimitePagamento, 'yyyy-MM-dd') as DataLimitePagamento,
                    oi.EmRecurso, oi.MotivoRecurso,
                    oi.Latitude, oi.Longitude, oi.Cidade, oi.Estado
                FROM OcorrenciasInfracoes oi 
                OUTER APPLY (
                    SELECT TOP 1 cl.IdContrato, cl.PlacaPrincipal
                    FROM ContratosLocacao cl
                    WHERE cl.PlacaPrincipal = oi.Placa
                    ORDER BY cl.DataInicial DESC
                ) cl
                LEFT JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial 
                LEFT JOIN Clientes cli ON cc.IdCliente = cli.IdCliente 
                WHERE YEAR(oi.DataInfracao) = ${year}`
            }
        ];

        const totalSteps = 
            DIMENSIONS.length + 
            (factDefs.length * years.length) + 
            (years.length * 12) + 
            CONSOLIDATED.length;
            
        let currentStep = 0;

        const getProgress = () => {
            currentStep++;
            const pct = ((currentStep / totalSteps) * 100).toFixed(1);
            return `[${currentStep}/${totalSteps} | ${pct}%]`;
        };

        // ========== PROCESSAMENTO ==========

        console.log(`📦 FASE 1: Processando Dimensões (${DIMENSIONS.length} tabelas) - PARALELO`);
        console.log(`${'─'.repeat(80)}`);
        
        // Processar dimensões em paralelo (são independentes)
        const dimPromises = DIMENSIONS.map(dim => 
            processQuery(pgClient, sqlPool, dim.table, dim.query, false, getProgress())
        );
        await Promise.all(dimPromises);
        await flushUploads(); // Aguardar uploads das dimensões

        console.log(`\n📅 FASE 2: Processando Fatos Anuais (${factDefs.length * years.length} etapas) - PARALELO`);
        console.log(`${'─'.repeat(80)}`);
        
        for (const fact of factDefs) {
            console.log(`   📊 ${fact.table}`);
            const client = await pgClient.connect();
            try { 
                await client.query(`DROP TABLE IF EXISTS public.${fact.table};`); 
            } catch(e) {} finally {
                client.release();
            }
            
            // Processar anos em paralelo para cada fato (máximo 3 por vez para não sobrecarregar)
            for (let i = 0; i < years.length; i += 3) {
                const yearBatch = years.slice(i, i + 3);
                const yearPromises = yearBatch.map(year => 
                    processQuery(pgClient, sqlPool, fact.table, fact.queryGen(year), true, `${getProgress()} [${year}]`, year)
                );
                await Promise.all(yearPromises);
            }
        }
        await flushUploads(); // Aguardar uploads dos fatos

        console.log(`\n💰 FASE 3: Processando Financeiro Universal (${years.length * 12} meses) - PARALELO`);
        console.log(`${'─'.repeat(80)}`);
        
        const client = await pgClient.connect();
        try { 
            await client.query(`DROP TABLE IF EXISTS public.fat_financeiro_universal;`); 
        } catch(e) {} finally {
            client.release();
        }
        
        for (const year of years) {
            console.log(`   📆 Ano ${year}`);
            // Processar 6 meses por vez em paralelo
            for (let monthStart = 1; monthStart <= 12; monthStart += 6) {
                const months = [];
                for (let m = monthStart; m < monthStart + 6 && m <= 12; m++) {
                    months.push(m);
                }
                
                const monthPromises = months.map(month => {
                    const yearMonthLabel = `[${year}-${month.toString().padStart(2, '0')}]`;
                    return processQuery(pgClient, sqlPool, 'fat_financeiro_universal', buildFinanceUniversalQuery(year, month), true, `${getProgress()} ${yearMonthLabel}`, year, month);
                });
                
                await Promise.all(monthPromises);
            }
        }
        await flushUploads(); // Aguardar uploads financeiros

        console.log(`\n📊 FASE 4: Processando Consolidados (${CONSOLIDATED.length} tabelas) - PARALELO`);
        console.log(`${'─'.repeat(80)}`);
        
        // Processar consolidados em paralelo (máximo 5 por vez)
        for (let i = 0; i < CONSOLIDATED.length; i += 5) {
            const batch = CONSOLIDATED.slice(i, i + 5);
            const consPromises = batch.map(cons => 
                processQuery(pgClient, sqlPool, cons.table, cons.query, false, getProgress())
            );
            await Promise.all(consPromises);
        }
        
        // Aguardar todos os uploads restantes
        await flushUploads();

        // ========== FINALIZAÇÃO ==========
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🏁 PROCESSO CONCLUÍDO COM SUCESSO!`);
        console.log(`📅 Finalizado em: ${new Date().toLocaleString('pt-BR')}`);
        console.log(`${'='.repeat(80)}\n`);

    } catch (err) {
        console.error("\n❌ ERRO CRÍTICO:", err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        console.log('\n🔌 Encerrando conexões...');
        if (sqlPool) await sqlPool.close();
        if (pgClient) await pgClient.end();
        console.log('✅ Conexões encerradas');
    }
}

// Executar ETL
runMasterETL();
