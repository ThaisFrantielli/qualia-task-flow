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

// PostgreSQL (DESTINO - BluConecta_Dw)
// Forçar uso das variáveis PG_* locais. Neon foi removido do fluxo.
const pgConfig = {
    host: process.env.PG_HOST || '127.0.0.1',
    port: process.env.PG_PORT || 5432,
    user: (process.env.PG_USER || '').toLowerCase().trim(),
    password: (process.env.PG_PASSWORD || '').trim(),
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

// Modo apenas JSON local: evita conexões/gravações no PostgreSQL (Neon)
const JSON_ONLY = process.argv.includes('--json-only') || process.env.JSON_ONLY === '1';
if (JSON_ONLY) console.log('⚠️  Modo JSON_ONLY ativo: não será feita escrita no PostgreSQL (somente geração/upload de JSON).');

// HELPER (Para campos monetários)
// Trata dois cenários:
// 1) Valores em formato BR (ex: '1.234,56') -> remove separador de milhares e troca vírgula por ponto
// 2) Valores já numéricos/US (ex: 1234.56) -> faz cast direto para DECIMAL
// Isso evita remover o ponto decimal quando a string não usa vírgula (causando multiplicação por 100/10000).
const castM = (col) => `(
    CASE
        WHEN CHARINDEX(',', ISNULL(CAST(${col} AS VARCHAR), '')) > 0
            THEN TRY_CAST(REPLACE(REPLACE(ISNULL(CAST(${col} AS VARCHAR), '0'), '.', ''), ',', '.') AS DECIMAL(15,2))
        ELSE TRY_CAST(ISNULL(${col}, 0) AS DECIMAL(15,2))
    END
)`;

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
        table: 'dim_alienacoes',
        query: `SELECT 
                    av.IdVeiculo,
                    av.IdVeiculo as id_veiculo,
                    av.IdAlienacao,
                    av.IdAlienacao as id_alienacao,
                    av.Placa,
                    av.Placa as placa,
                    av.Modelo,
                    av.Modelo as modelo,
                    av.Montadora as marca,
                    av.DataEntrada as DataAlienacao,
                    av.DataEntrada as data_alienacao,
                    ISNULL(av.Instituicao, 'Não Informado') as Banco,
                    ISNULL(av.Instituicao, 'Não Informado') as banco,
                    ${castM('av.ValorAlienado')} as ValorFinanciado,
                    ${castM('av.ValorAlienado')} as valor_financiado,
                    CAST(0 AS DECIMAL(15,4)) as TaxaJuros,
                    CAST(0 AS DECIMAL(15,4)) as taxa_juros,
                    CAST(ISNULL(av.QuantidadeParcelas, 0) AS INT) as QuantidadeParcelas,
                    CAST(ISNULL(av.QuantidadeParcelas, 0) AS INT) as quantidade_parcelas,
                    CAST(ISNULL(av.QuantidadeParcelas, 0) AS INT) as TotalParcelas,
                    ${castM('av.ValorParcela')} as ValorParcela,
                    ${castM('av.ValorParcela')} as valor_parcela,
                    av.VencimentoPrimeiraParcela as data_primeira_parcela,
                    av.VencimentoPrimeiraParcela as DataPrimeiroVencimento,
                    av.Termino as data_ultima_parcela,
                    CAST(ISNULL(av.ValorParcela, 0) * ISNULL(av.QuantidadeParcelasRemanescentes, 0) AS DECIMAL(15,2)) as saldo_devedor,
                    CAST(ISNULL(av.ValorParcela, 0) * ISNULL(av.QuantidadeParcelasRemanescentes, 0) AS DECIMAL(15,2)) as SaldoDevedor,
                    CAST(ISNULL(av.QuantidadeParcelasRemanescentes, 0) AS INT) as QuantidadeParcelasRemanescentes,
                    CAST(ISNULL(av.QuantidadeParcelas, 0) - ISNULL(av.QuantidadeParcelasRemanescentes, 0) AS INT) as parcelas_pagas,
                    av.SituacaoVeiculo as situacao,
                    av.NumeroContrato as numero_contrato,
                    av.NumeroContrato as NumeroContrato,
                    ISNULL(av.Unidade, '') as unidade,
                    ISNULL(av.Unidade, '') as observacoes
                FROM Alienacoes av WITH (NOLOCK)
                -- Removido filtro WHERE av.DataEntrada IS NOT NULL para incluir todas alienações
                `
    },
    {
        table: 'dim_clientes',
        query: `SELECT 
                    DataAtualizacaoDados,
                    IdCliente,
                    Tipo,
                    Nome,
                    NomeFantasia,
                    CNPJ,
                    InscricaoEstadual,
                    InscricaoMunicipal,
                    NaturezaCliente,
                    CPF,
                    RG,
                    GestorFrota,
                    EmailGestorFrota,
                    TelefoneGestorFrota,
                    Site,
                    Classificacao,
                    Segmento,
                    ISNULL(Observacoes, '') as Observacoes,
                    Situacao,
                    DataCriacao as DataCriacao,
                    Endereco,
                    NumeroEndereco,
                    Complemento,
                    Bairro,
                    Cidade,
                    Estado,
                    NascimentoCondutor as NascimentoCondutor,
                    EmailCondutor,
                    Telefone1Condutor,
                    Telefone2Condutor,
                    Telefone3Condutor,
                    NumeroCarteiraCondutor,
                    TipoCarteiraCondutor,
                    VencimentoCarteiraCondutor as VencimentoCarteiraCondutor,
                    InformacoesAdicionaisCondutor,
                    EstadoCarteiraCondutor,
                    EmissorCarteiraCondutor,
                    DocumentoEstrangeiro,
                    NumeroDocumentoEstrangeiro,
                    IdTipoDocumentoInternacional,
                    TipoDocumentoInternacional,
                    CriadoPor,
                    ParticipaRevisaoProgramada,
                    LiberarAprovacaoItensReembolsaveisPortalCliente,
                    RequerAprovacaoDeItensNoPortalDoClienteParaFaturar,
                    IdClienteGrupoEconomico,
                    GrupoEconomico,
                    GestorComercial
                FROM Clientes WITH (NOLOCK)`
    },
    {
        table: 'dim_condutores',
        query: `SELECT IdCondutor, Nome, CPF, NúmeroCnh as NumeroCnh, TipoCnh, VencimentoCnh as VencCnh, Email, Telefone1, Telefone2, Telefone3 FROM Condutores WITH (NOLOCK)`
    },
    {
        table: 'dim_fornecedores',
        query: `SELECT IdFornecedor, NomeFantasia, CNPJ, CPF, Classificacao, Marca, Endereco, NumeroEndereco, Complemento, Bairro, Cidade, Estado, CriadoEm as CriadoEm FROM Fornecedores WITH (NOLOCK)`
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
                    
                    -- FIPE na Compra (Corrigido: Data Aproximada)
                    CAST(ISNULL(FipeData.PrecoFIPE, 0) AS FLOAT) as ValorFipeNaCompra,

                    -- FIPE Zero KM (Esta é a linha que faltava no seu SELECT)
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
                
                -- LÓGICA 1: Preco FIPE na época da compra (Melhor Aproximação)
                OUTER APPLY (
                        SELECT TOP 1 pf.PrecoFIPE as PrecoFIPE
                        FROM PrecosFIPE pf
                        WHERE pf.CodigoFIPE = v.CodigoFIPE
                            AND pf.AnoModelo = v.AnoModelo
                            AND v.DataCompra IS NOT NULL
                        ORDER BY ABS(DATEDIFF(MONTH, pf.DataMesFIPE, v.DataCompra)) ASC
                ) FipeData

                -- LÓGICA 2: Último PrecoFIPE disponível (Valor Atual de Mercado do usado)
                OUTER APPLY (
                    SELECT TOP 1 pf2.PrecoFIPE as PrecoFIPE
                    FROM PrecosFIPE pf2
                    WHERE pf2.CodigoFIPE = v.CodigoFIPE
                      AND pf2.AnoModelo = v.AnoModelo
                    ORDER BY pf2.DataMesFIPE DESC
                ) FipeLatest

                -- LÓGICA 3: Preço Zero KM (Prioriza 32000, senão pega o mais novo)
                OUTER APPLY (
                    SELECT TOP 1 pf3.PrecoFIPE as PrecoFIPE
                    FROM PrecosFIPE pf3
                    WHERE pf3.CodigoFIPE = v.CodigoFIPE
                    ORDER BY 
                        CASE WHEN pf3.AnoModelo = 32000 THEN 1 ELSE 0 END DESC, -- Tenta Zero KM primeiro
                        pf3.AnoModelo DESC, -- Senão pega o ano mais alto
                        pf3.DataMesFIPE DESC -- Sempre a tabela mais recente
                ) FipeZeroKm

                OUTER APPLY (
                    SELECT TOP 1 Instituicao, Termino, VencimentoPrimeiraParcela 
                    FROM Alienacoes 
                    WHERE Placa = v.Placa 
                    ORDER BY Inicio DESC
                ) al 
                -- Contrato ativo para NomeCliente, TipoLocacao e ValorLocacao
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
                ) ContratoAtivo`
    },
    {
        table: 'dim_veiculos_acessorios',
        query: `SELECT IdVeiculo, NomeAcessorio as Acessorio, TipoInstalacao as Origem FROM VeiculosAcessorios`
    },
    {
        table: 'historico_situacao_veiculos',
        query: `SELECT
                    DataAtualizacaoDados as DataAtualizacaoDados,
                    IdVeiculo,
                    Placa,
                    UltimaAtualizacao as UltimaAtualizacao,
                    AtualizadoPor,
                    SituacaoAnteriorVeiculo,
                    SituacaoVeiculo,
                    LocalizacaoAnteriorVeiculo,
                    LocalizacaoVeiculo,
                    SituacaoFinanceiraAnteriorVeiculo,
                    SituacaoFinanceiraVeiculo,
                    Informacoes
                FROM HistoricoSituacaoVeiculos WITH (NOLOCK)
                WHERE Placa IS NOT NULL
                ORDER BY DataAtualizacaoDados DESC`
    },
    {
        table: 'dim_contratos_locacao',
        query: `SELECT 
                                        cl.IdContratoLocacao, 
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
                                        cl.PlacaPrincipal, 
                                        cl.SituacaoContratoLocacao as StatusLocacao, 
                                        cl.SituacaoDoFaturamento,
                                        cl.NomeCondutor,
                                        CAST(ISNULL(preco.PrecoUnitario, 0) AS FLOAT) as ValorMensalAtual,
                                        cl.DataInicial as Inicio, 
                                        cl.DataFinal as Fim, 
                                        cl.DataEncerramento as DataEncerramento,
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
                    DataMovimentacao as DataMovimentacao, 
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
                    DataEncerramento as DataEncerramento, 
                    IdSituacaoContratoLocacao, SituacaoContratoLocacao, 
                    NomeFantasia as Cliente, IdVeiculo, Placa, IdModelo, Modelo, 
                    DataRetirada as DataRetirada, 
                    OdometroRetirada, 
                    DataDevolucao as DataDevolucao, 
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
        query: `WITH Base AS ( SELECT v.IdVeiculo, v.Placa, v.Modelo, g.GrupoVeiculo as Grupo, v.DataCompra FROM Veiculos v WITH (NOLOCK) LEFT JOIN GruposVeiculos g WITH (NOLOCK) ON v.IdGrupoVeiculo = g.IdGrupoVeiculo ), Ops AS ( SELECT Placa, SUM(${castM('ValorTotal')}) as CustoTotal, COUNT(IdOrdemServico) as Passagens FROM OrdensServico WITH (NOLOCK) WHERE SituacaoOrdemServico <> 'Cancelada' GROUP BY Placa ), Fin AS ( SELECT fi.IdVeiculo, SUM(${castM('fi.ValorTotal')}) as FatTotal FROM FaturamentoItems fi WITH (NOLOCK) JOIN Faturamentos f WITH (NOLOCK) ON fi.IdNota = f.IdNota WHERE f.SituacaoNota <> 'Cancelada' GROUP BY fi.IdVeiculo ) SELECT B.*, CAST(O.CustoTotal AS DECIMAL(15,2)) as CustoOp, CAST(F.FatTotal AS DECIMAL(15,2)) as ReceitaLoc, O.Passagens FROM Base B LEFT JOIN Ops O ON B.Placa = O.Placa LEFT JOIN Fin F ON B.IdVeiculo = F.IdVeiculo`
    },
    {
        table: 'hist_vida_veiculo_timeline',
        query: `
            /* 1. LOCAÇÃO (Início de contrato) */
            SELECT 
                v.Placa,
                v.IdVeiculo,
                v.Modelo,
                v.Montadora as Marca,
                v.AnoFabricacao,
                v.Cor,
                'LOCACAO' as TipoEvento,
                CAST(cl.DataInicial AS DATETIME) as DataEvento,
                ISNULL(cc.NumeroDocumento, 'S/N') as ContratoComercial,
                ISNULL(cl.ContratoLocacao, 'S/N') as ContratoLocacao,
                ISNULL(c.NomeFantasia, 'Consumidor Final / Não Identificado') as Cliente,
                ISNULL(c.CNPJ, c.CPF) as ClienteDocumento,
                ISNULL(cl.SituacaoContratoLocacao, 'Ativo') as Situacao,
                cl.DataInicial as DataInicio,
                cl.DataFinal as DataFimPrevista,
                cl.DataEncerramento as DataFimReal,
                CAST(ISNULL(preco.PrecoUnitario, 0) AS DECIMAL(15,2)) as ValorMensal,
                LEFT(cl.PeriodoEmMeses, 150) as Observacao,
                NULL as IdOrdemServico, NULL as TipoManutencao, NULL as Fornecedor, NULL as CustoTotal, NULL as NumeroBO, NULL as TipoSinistro, NULL as ValorMulta, NULL as TipoInfracao
            FROM Veiculos v WITH (NOLOCK)
            INNER JOIN ContratosLocacao cl WITH (NOLOCK) ON cl.PlacaPrincipal = v.Placa
            LEFT JOIN ContratosComerciais cc WITH (NOLOCK) ON cc.IdContratoComercial = cl.IdContrato
            LEFT JOIN Clientes c WITH (NOLOCK) ON c.IdCliente = cc.IdCliente
            OUTER APPLY (SELECT TOP 1 PrecoUnitario FROM ContratosLocacaoPrecos WHERE IdContratoLocacao = cl.IdContratoLocacao ORDER BY DataInicial DESC) preco
            WHERE cl.DataInicial IS NOT NULL AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'

            UNION ALL

            /* 2. DEVOLUÇÃO (Fim de contrato) */
            SELECT 
                v.Placa, v.IdVeiculo, v.Modelo, v.Montadora, v.AnoFabricacao, v.Cor,
                'DEVOLUCAO' as TipoEvento,
                CAST(cl.DataEncerramento AS DATETIME) as DataEvento,
                ISNULL(cc.NumeroDocumento, 'S/N'), ISNULL(cl.ContratoLocacao, 'S/N'),
                ISNULL(c.NomeFantasia, 'Consumidor Final'), ISNULL(c.CNPJ, c.CPF),
                'DEVOLVIDO' as Situacao,
                cl.DataInicial, cl.DataFinal, cl.DataEncerramento,
                CAST(ISNULL(preco.PrecoUnitario, 0) AS DECIMAL(15,2)), 
                'Encerrado em: ' + FORMAT(cl.DataEncerramento, 'dd/MM/yyyy'),
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
            FROM Veiculos v WITH (NOLOCK)
            INNER JOIN ContratosLocacao cl WITH (NOLOCK) ON cl.PlacaPrincipal = v.Placa
            LEFT JOIN ContratosComerciais cc WITH (NOLOCK) ON cc.IdContratoComercial = cl.IdContrato
            LEFT JOIN Clientes c WITH (NOLOCK) ON c.IdCliente = cc.IdCliente
            OUTER APPLY (SELECT TOP 1 PrecoUnitario FROM ContratosLocacaoPrecos WHERE IdContratoLocacao = cl.IdContratoLocacao ORDER BY DataInicial DESC) preco
            WHERE cl.DataEncerramento IS NOT NULL AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'

            UNION ALL

            /* 3. MANUTENÇÃO */
            SELECT 
                v.Placa, v.IdVeiculo, v.Modelo, v.Montadora, v.AnoFabricacao, v.Cor,
                'MANUTENCAO' as TipoEvento,
                CAST(os.DataInicioServico AS DATETIME) as DataEvento,
                NULL, NULL,
                ISNULL(os.Fornecedor, 'Oficina não informada'), NULL,
                os.SituacaoOrdemServico,
                os.DataInicioServico, 
                NULL, -- DataPrevista removida
                os.DataConclusaoOcorrencia,
                NULL, 
                LEFT(os.Motivo, 150),
                os.IdOrdemServico, os.Tipo, os.Fornecedor,
                CAST(${castM("ISNULL(os.ValorTotal, 0)")} AS DECIMAL(15,2)) as CustoTotal,
                NULL, NULL, NULL, NULL
            FROM Veiculos v WITH (NOLOCK)
            INNER JOIN OrdensServico os WITH (NOLOCK) ON os.Placa = v.Placa
            WHERE os.DataInicioServico IS NOT NULL AND os.SituacaoOrdemServico <> 'Cancelada' AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'

            UNION ALL

            /* 4. SINISTRO */
            SELECT 
                v.Placa, v.IdVeiculo, v.Modelo, v.Montadora, v.AnoFabricacao, v.Cor,
                'SINISTRO' as TipoEvento,
                CAST(s.DataSinistro AS DATETIME) as DataEvento,
                NULL, NULL,
                ISNULL(c.NomeFantasia, 'Sem Cliente Vinculado'), NULL,
                s.SituacaoOcorrencia,
                s.DataSinistro, NULL, s.DataConclusaoOcorrencia,
                NULL, LEFT(COALESCE(s.Descricao, s.Observacoes, ''), 150),
                NULL, NULL, NULL,
                CAST(${castM("ISNULL(s.ValorOrcamento, 0)")} AS DECIMAL(15,2)) as CustoTotal,
                s.BoletimOcorrencia, 
                s.Tipo, NULL, NULL
            FROM Veiculos v WITH (NOLOCK)
            INNER JOIN OcorrenciasSinistro s WITH (NOLOCK) ON s.IdVeiculo = v.IdVeiculo
            LEFT JOIN Clientes c WITH (NOLOCK) ON c.IdCliente = s.IdCliente
            WHERE s.DataSinistro IS NOT NULL AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'

            UNION ALL

            /* 5. MULTA */
            SELECT 
                ISNULL(v.Placa, m.Placa) as Placa,
                v.IdVeiculo,
                v.Modelo,
                v.Montadora,
                v.AnoFabricacao,
                v.Cor,
                'MULTA' as TipoEvento,
                CAST(m.DataInfracao AS DATETIME) as DataEvento,
                NULL, NULL,
                ISNULL(con.Nome, 'Condutor não identificado'), con.CPF,
                m.SituacaoOcorrencia,
                m.DataInfracao, NULL, NULL, -- DataPagamento removida
                NULL, LEFT(m.Observacoes, 150),
                NULL, NULL, NULL, NULL,
                m.AutoInfracao, -- Corrigido para AutoInfracao
                NULL,
                CAST(${castM("ISNULL(m.ValorInfracao, 0)")} AS DECIMAL(15,2)) as CustoTotal,
                m.DescricaoInfracao
            FROM OcorrenciasInfracoes m WITH (NOLOCK)
            LEFT JOIN Veiculos v WITH (NOLOCK) ON v.Placa = m.Placa
            LEFT JOIN Condutores con WITH (NOLOCK) ON con.IdCondutor = m.IdCondutor
            WHERE m.DataInfracao IS NOT NULL AND (v.Placa IS NULL OR COALESCE(v.FinalidadeUso, '') <> 'Terceiro')

            UNION ALL

            /* 6. COMPRA */
            SELECT 
                v.Placa, v.IdVeiculo, v.Modelo, v.Montadora, v.AnoFabricacao, v.Cor,
                'COMPRA' as TipoEvento,
                CAST(v.DataCompra AS DATETIME) as DataEvento,
                NULL, NULL,
                ISNULL(v.Proprietario, 'Aquisição Frota'), NULL,
                'ADQUIRIDO',
                v.DataCompra, NULL, NULL,
                NULL, 
                LEFT(ISNULL(v.InformacoesAdicionais, 'Nota Fiscal não detalhada'), 150), -- Corrigido para InformacoesAdicionais
                NULL, NULL, 
                ISNULL(v.Proprietario, 'Fornecedor Padrão'), 
                CAST(ISNULL(v.ValorCompra, 0) AS DECIMAL(15,2)) as CustoTotal,
                NULL, NULL, NULL, NULL
            FROM Veiculos v WITH (NOLOCK)
            WHERE v.DataCompra IS NOT NULL AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'

            UNION ALL

            /* 7. VENDA */
            SELECT 
                v.Placa, v.IdVeiculo, v.Modelo, v.Montadora, v.AnoFabricacao, v.Cor,
                'VENDA' as TipoEvento,
                CAST(vv.DataVenda AS DATETIME) as DataEvento,
                NULL, NULL,
                ISNULL(vv.Comprador, 'Comprador não inf.'), NULL,
                'BAIXADO',
                vv.DataVenda, NULL, NULL,
                NULL, 'Fatura: ' + ISNULL(vv.FaturaVenda, '-'),
                NULL, NULL, NULL,
                CAST(${castM("ISNULL(vv.ValorVenda, 0)")} AS DECIMAL(15,2)) as CustoTotal,
                NULL, NULL, NULL, NULL
            FROM Veiculos v WITH (NOLOCK)
            LEFT JOIN VeiculosVendidos vv WITH (NOLOCK) ON vv.Placa = v.Placa
            WHERE vv.DataVenda IS NOT NULL AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'

                        UNION ALL

                        /* 8. SEM EVENTOS (placeholder) - garante presença na timeline para veículos sem eventos */
                        SELECT
                                v.Placa, v.IdVeiculo, v.Modelo, v.Montadora, v.AnoFabricacao, v.Cor,
                                'SEM_EVENTOS' as TipoEvento,
                                CAST(ISNULL(v.DataCompra, GETDATE()) AS DATETIME) as DataEvento,
                                NULL, NULL,
                                ISNULL(v.Proprietario, 'Proprietário não informado') as Cliente,
                                NULL,
                                v.SituacaoVeiculo as Situacao,
                                v.DataCompra as DataInicio,
                                NULL as DataFimPrevista,
                                NULL as DataFimReal,
                                NULL as ValorMensal,
                                LEFT(ISNULL(v.ObservacaoLocalizacao, ''), 150) as Observacao,
                                NULL as IdOrdemServico, NULL as TipoManutencao, NULL as Fornecedor, NULL as CustoTotal, NULL as NumeroBO, NULL as TipoSinistro, NULL as ValorMulta, NULL as TipoInfracao
                        FROM Veiculos v WITH (NOLOCK)
                        WHERE COALESCE(v.FinalidadeUso, '') <> 'Terceiro'
                            AND NOT EXISTS (SELECT 1 FROM ContratosLocacao cl WHERE cl.PlacaPrincipal = v.Placa)
                            AND NOT EXISTS (SELECT 1 FROM OrdensServico os WHERE os.Placa = v.Placa AND os.DataInicioServico IS NOT NULL)
                            AND NOT EXISTS (SELECT 1 FROM OcorrenciasSinistro s WHERE s.IdVeiculo = v.IdVeiculo)
                            AND NOT EXISTS (SELECT 1 FROM OcorrenciasInfracoes m WHERE m.Placa = v.Placa AND m.DataInfracao IS NOT NULL)
                            AND NOT EXISTS (SELECT 1 FROM VeiculosVendidos vv2 WHERE vv2.Placa = v.Placa AND vv2.DataVenda IS NOT NULL)

                        ORDER BY Placa, DataEvento DESC
        `
    },
    {
        table: 'fat_churn',
        query: `SELECT 
                    cc.IdContratoComercial,
                    cc.IdContratoComercial as id_contrato_comercial,
                    cc.NumeroDocumento as Contrato,
                    cc.NumeroDocumento as contrato,
                    ISNULL(cc.NumeroDocumentoPersonalizado, '') as RefCliente,
                    ISNULL(cc.NumeroDocumentoPersonalizado, '') as ref_cliente,
                    ISNULL(cli.IdCliente, 0) as IdCliente,
                    ISNULL(cli.IdCliente, 0) as id_cliente,
                    ISNULL(cli.NomeFantasia, 'Não Identificado') as Cliente,
                    ISNULL(cli.NomeFantasia, 'Não Identificado') as cliente,
                    cc.SituacaoContrato as Status,
                    cc.SituacaoContrato as status,
                    cl_enc.DataEncerramento as DataEncerramento,
                    cl_enc.DataEncerramento as data_encerramento,
                    ISNULL(DATEDIFF(MONTH, cl_enc.DataInicial, cl_enc.DataEncerramento), 0) as DuracaoMeses,
                    ISNULL(DATEDIFF(MONTH, cl_enc.DataInicial, cl_enc.DataEncerramento), 0) as duracao_meses,
                    CAST(ISNULL((
                        SELECT SUM(ISNULL(preco.PrecoUnitario, 0))
                        FROM ContratosLocacao cl2
                        LEFT JOIN (
                            SELECT IdContratoLocacao, PrecoUnitario,
                                   ROW_NUMBER() OVER (PARTITION BY IdContratoLocacao ORDER BY DataInicial DESC) as rn
                            FROM ContratosLocacaoPrecos
                            WHERE DataInicial <= GETDATE()
                        ) preco ON preco.IdContratoLocacao = cl2.IdContratoLocacao AND preco.rn = 1
                        WHERE cl2.IdContrato = cc.IdContratoComercial
                          AND cl2.SituacaoContratoLocacao NOT IN ('Cancelado')
                    ), 0) AS DECIMAL(15,2)) as ValorMensal,
                    CAST(ISNULL((
                        SELECT SUM(ISNULL(preco.PrecoUnitario, 0))
                        FROM ContratosLocacao cl2
                        LEFT JOIN (
                            SELECT IdContratoLocacao, PrecoUnitario,
                                   ROW_NUMBER() OVER (PARTITION BY IdContratoLocacao ORDER BY DataInicial DESC) as rn
                            FROM ContratosLocacaoPrecos
                            WHERE DataInicial <= GETDATE()
                        ) preco ON preco.IdContratoLocacao = cl2.IdContratoLocacao AND preco.rn = 1
                        WHERE cl2.IdContrato = cc.IdContratoComercial
                          AND cl2.SituacaoContratoLocacao NOT IN ('Cancelado')
                    ), 0) AS DECIMAL(15,2)) as valor_mensal,
                    cl_enc.DataInicial as data_inicio,
                    COUNT(cl_all.IdContratoLocacao) as quantidade_veiculos
                FROM ContratosComerciais cc WITH (NOLOCK)
                LEFT JOIN Clientes cli WITH (NOLOCK) ON cc.IdCliente = cli.IdCliente
                LEFT JOIN ContratosLocacao cl_enc WITH (NOLOCK) ON cl_enc.IdContrato = cc.IdContratoComercial 
                    AND cl_enc.DataEncerramento IS NOT NULL
                    AND cl_enc.IdContratoLocacao = (
                        SELECT TOP 1 IdContratoLocacao 
                        FROM ContratosLocacao 
                        WHERE IdContrato = cc.IdContratoComercial 
                          AND DataEncerramento IS NOT NULL
                        ORDER BY DataEncerramento DESC
                    )
                LEFT JOIN ContratosLocacao cl_all WITH (NOLOCK) ON cl_all.IdContrato = cc.IdContratoComercial
                WHERE cc.SituacaoContrato IN ('Encerrado', 'Cancelado', 'Finalizado')
                GROUP BY cc.IdContratoComercial, cc.NumeroDocumento, cc.NumeroDocumentoPersonalizado,
                         cli.IdCliente, cli.NomeFantasia, cc.SituacaoContrato,
                         cl_enc.DataEncerramento, cl_enc.DataInicial`
    },
    {
        table: 'fat_inadimplencia',
        query: `SELECT f.IdNota, f.Cliente, f.Nota, ${castM('f.ValorTotal')} as SaldoDevedor, f.Vencimento as Vencimento, DATEDIFF(DAY, f.Vencimento, GETDATE()) as DiasAtraso, CASE WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 0 THEN 'A Vencer' WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 30 THEN '1-30 dias' WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 60 THEN '31-60 dias' WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 90 THEN '61-90 dias' ELSE '90+ dias' END as FaixaAging FROM Faturamentos f WHERE f.SituacaoNota = 'Pendente'`
    },
    {
        table: 'agg_dre_mensal',
        query: `SELECT FORMAT(DataCompetencia, 'yyyy-MM') as Competencia, SUM(CASE WHEN Natureza LIKE '%Receita%' THEN ${castM('ValorPagoRecebido')} ELSE 0 END) as Receita, SUM(CASE WHEN Natureza LIKE '%Despesa%' OR Natureza LIKE '%Custo%' THEN ${castM('ValorPagoRecebido')} ELSE 0 END) as Despesa FROM LancamentosComNaturezas WHERE DataCompetencia >= DATEADD(YEAR, -2, GETDATE()) GROUP BY FORMAT(DataCompetencia, 'yyyy-MM')`
    },
    {
        table: 'fato_financeiro_dre',
        query: `SELECT 
                    CONVERT(VARCHAR(36), NEWID()) + '|' + CAST(ln.NumeroLancamento AS VARCHAR(50)) + '|' + ISNULL(ln.Natureza, '') as IdLancamentoNatureza,
                ln.NumeroLancamento as IdLancamento,
                ln.NumeroLancamento as NumeroLancamento,
                    ln.DataCompetencia as DataCompetencia,
                    ln.Natureza,
                    CASE 
                        WHEN ln.TipoLancamento = 'Entrada' THEN 'Entrada'
                        WHEN ln.TipoLancamento = 'Saída' THEN 'Saída'
                        ELSE 'Outro'
                    END as TipoLancamento,
                    (CASE WHEN CHARINDEX(',', ISNULL(CAST(ISNULL(ln.ValorPagoRecebido, 0) AS VARCHAR), '')) > 0 THEN TRY_CAST(REPLACE(REPLACE(ISNULL(CAST(ISNULL(ln.ValorPagoRecebido, 0) AS VARCHAR), '0'), '.', ''), ',', '.') AS DECIMAL(15,2)) ELSE TRY_CAST(ISNULL(ln.ValorPagoRecebido, 0) AS DECIMAL(15,2)) END) as Valor,
                    ln.Descricao as DescricaoLancamento,
                    ln.Conta,
                    ln.FormaPagamento,
                    ln.DataPagamentoRecebimento as DataPagamentoRecebimento,
                        ln.PagarReceberDe as NomeEntidade,
                        ln.PagarReceberDe,
                        ln.NumeroDocumento,
                        COALESCE(cli.NomeFantasia, os.Cliente, '') as NomeCliente,
                        os.Placa as Placa,
                        os.ContratoComercial as ContratoComercial,
                        os.ContratoLocacao as ContratoLocacao
                    FROM LancamentosComNaturezas ln WITH (NOLOCK)

                    LEFT JOIN OrdensServico os WITH (NOLOCK) ON ISNULL(ln.OrdemCompra, '') = ISNULL(os.OrdemCompra, '') AND os.SituacaoOrdemServico <> 'Cancelada'

                    LEFT JOIN Clientes cli WITH (NOLOCK) ON os.IdCliente = cli.IdCliente`
    },
    {
        table: 'auditoria_consolidada',
        query: `SELECT 'Frota' as Area, v.Placa, v.Modelo, CASE WHEN CAST(ISNULL(v.ValorCompra, 0) AS DECIMAL(15,2)) = 0 THEN 'Valor de compra não informado' WHEN v.OdometroConfirmado IS NULL THEN 'Odômetro não confirmado' WHEN v.DataCompra IS NULL THEN 'Data de compra não informada' END as Erro, 'Alta' as Gravidade, 'Atualizar cadastro do veículo' as AcaoRecomendada FROM Veiculos v WHERE CAST(ISNULL(v.ValorCompra, 0) AS DECIMAL(15,2)) = 0 OR v.OdometroConfirmado IS NULL OR v.DataCompra IS NULL UNION ALL SELECT 'Comercial', cc.NumeroDocumento, cli.NomeFantasia, 'Contrato sem itens vinculados' as Erro, 'Média' as Gravidade, 'Verificar itens do contrato' as AcaoRecomendada FROM ContratosComerciais cc LEFT JOIN Clientes cli ON cc.IdCliente = cli.IdCliente LEFT JOIN ItensContratos ic ON cc.IdContratoComercial = ic.IdContrato WHERE ic.IdItemContrato IS NULL AND cc.SituacaoContrato = 'Ativo'`
    },
    {
        table: 'dim_compras',
        query: `SELECT 
                    vc.IdVeiculo,
                    vc.IdVeiculo as id_veiculo,
                    vc.Placa,
                    vc.Placa as placa,
                    vc.Modelo,
                    vc.Modelo as modelo,
                    vc.Montadora as marca,
                    vc.AnoFabricacao as ano_fabricacao,
                    vc.AnoModelo as ano_modelo,
                    vc.DataCompra as DataCompra,
                    vc.DataCompra as data_compra,
                    YEAR(vc.DataCompra) as ano_compra,
                    MONTH(vc.DataCompra) as mes_compra,
                    ${castM('vc.ValorCompra')} as ValorCompra,
                    ${castM('vc.ValorCompra')} as valor_compra,
                    ${castM('vc.ValorAtualFIPE')} as ValorFIPE,
                    ${castM('vc.ValorAtualFIPE')} as valor_fipe,
                    CASE 
                        WHEN ${castM('vc.ValorAtualFIPE')} > 0 
                        THEN CAST(((${castM('vc.ValorCompra')} / ${castM('vc.ValorAtualFIPE')}) * 100) AS DECIMAL(15,2))
                        ELSE 0
                    END as percentual_fipe,
                    ISNULL(vc.NomeFornecedorNotaFiscal, 'Não Informado') as Fornecedor,
                    ISNULL(vc.NomeFornecedorNotaFiscal, 'Não Informado') as fornecedor,
                    vc.NumeroNotaFiscal as nota_fiscal,
                    vc.Chassi as chassi,
                    vc.Renavam as renavam,
                    ISNULL(vc.InformacoesAdicionais, '') as observacoes,
                    ${castM('vc.ValorAcessorios')} as valor_acessorios,
                    ${castM("ISNULL(vc.ValorCompra, 0) + ISNULL(vc.ValorAcessorios, 0)")} as valor_total_compra,
                    vc.SituacaoVeiculo as situacao_atual
                FROM VeiculosComprados vc WITH (NOLOCK)
                WHERE vc.DataCompra IS NOT NULL`
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
                    ovt.ModeloVeiculoReserva as ModeloReserva,
                    ovt.GrupoVeiculoReserva,
                    ovt.FornecedorReserva,
                    ovt.DataCriacao as DataCriacao,
                    ovt.DataRetiradaEfetiva as DataRetirada,
                    ovt.DataRetiradaEfetiva as DataInicio,
                    ovt.DataDevolucaoEfetiva as DataDevolucao,
                    ovt.DataDevolucaoEfetiva as DataFim,
                    CAST(ISNULL(ovt.DiariasEfetivas, 0) AS INT) as Diarias,
                    ovt.Motivo,
                    ovt.SituacaoOcorrencia,
                    ovt.SituacaoOcorrencia as StatusOcorrencia,
                    -- Preferir valores já presentes na ocorrência; se ausentes, buscar via contratos/cliente relacionados
                    COALESCE(ovt.NomeCliente, cli_t.NomeFantasia, cli.NomeFantasia, '') as Cliente,
                    COALESCE(ovt.IdContratoComercial, cc.IdContratoComercial, cc_t.IdContratoComercial) as IdContratoComercial,
                    COALESCE(ovt.ContratoComercial, cc.NumeroDocumento, cc_t.NumeroDocumento, '') as ContratoComercial,
                    COALESCE(ovt.IdContratoLocacao, cl.IdContratoLocacao) as IdContratoLocacao,
                    COALESCE(ovt.ContratoLocacao, cl.ContratoLocacao, '') as ContratoLocacao,
                    COALESCE(ovt.IdCliente, cli_t.IdCliente, cli.IdCliente) as IdCliente,

                    -- Campos adicionais para detalhamento
                    ovt.DataAtualizacaoDados as DataAtualizacaoDados,
                    ovt.IdOcorrenciaOrigem,
                    ovt.IdClassificacaoContrato,
                    ovt.ClassificacaoContrato,
                    ovt.DataRetiradaEfetiva as DataRetiradaEfetiva,
                    ovt.DataDevolucaoEfetiva as DataDevolucaoEfetiva,
                    CAST(ISNULL(ovt.DiariasEfetivas, 0) AS INT) as DiariasEfetivas,
                    ovt.CanceladoPor,
                    ovt.CanceladoEm as CanceladoEm,
                    ovt.MotivoCancelamento,
                    ovt.IdTipo as IdTipoOcorrencia,
                    ovt.Tipo as TipoOcorrencia,
                    ovt.IdMotivo,
                    ovt.NumeroReserva,
                    ovt.PlacaVeiculoInterno,
                    ovt.IdVeiculoInterno,
                    ovt.NomeRequisitante,
                    ovt.EmailRequisitante,
                    ovt.TelefoneRequisitante,
                    ovt.Origem,
                    ovt.Endereco,
                    ovt.Numero as NumeroEndereco,
                    ovt.Complemento,
                    ovt.Bairro,
                    ovt.Cidade,
                    ovt.Estado,
                    ovt.Pais,
                    ovt.CEP,
                    CAST(ovt.Latitude AS FLOAT) as Latitude,
                    CAST(ovt.Longitude AS FLOAT) as Longitude,
                    CAST(ISNULL(ovt.OdometroAtual, 0) AS INT) as OdometroAtual,
                    CAST(ISNULL(ovt.OdometroInicial, 0) AS INT) as OdometroInicial,
                    CAST(ISNULL(ovt.OdometroFinal, 0) AS INT) as OdometroFinal,
                    ovt.Observacoes,
                    ovt.DataConclusaoOcorrencia as DataConclusaoOcorrencia,
                    ovt.Etapa,
                    ovt.IdCondutor,
                    ovt.NomeCondutor,
                    ovt.TipoVeiculoTemporario,
                    ovt.IdFornecedorReserva,
                    ovt.FornecedorReserva as FornecedorReservaOriginal
                FROM OcorrenciasVeiculoTemporario ovt WITH (NOLOCK)
                -- Tentar casar pelo IdContratoLocacao quando disponível, senão por placa principal ativa
                LEFT JOIN ContratosLocacao cl WITH (NOLOCK) ON (ovt.IdContratoLocacao IS NOT NULL AND ovt.IdContratoLocacao = cl.IdContratoLocacao) OR (ovt.Placa = cl.PlacaPrincipal AND cl.SituacaoContratoLocacao = 'Ativo')
                -- Contrato comercial vinculado ao contrato de locação
                LEFT JOIN ContratosComerciais cc WITH (NOLOCK) ON cl.IdContrato = cc.IdContratoComercial
                -- Contrato comercial declarado diretamente na ocorrência (fallback)
                LEFT JOIN ContratosComerciais cc_t WITH (NOLOCK) ON ovt.IdContratoComercial = cc_t.IdContratoComercial
                -- Cliente via contrato comercial vinculado
                LEFT JOIN Clientes cli WITH (NOLOCK) ON cc.IdCliente = cli.IdCliente
                -- Cliente informado diretamente na ocorrência (fallback)
                LEFT JOIN Clientes cli_t WITH (NOLOCK) ON ovt.IdCliente = cli_t.IdCliente`
    },
    {
        table: 'fat_manutencao_unificado',
        query: `SELECT 
                    -- Campos diretos de OcorrenciasManutencao (100% da base, sem filtros)
                    FORMAT(GETDATE(), 'yyyy-MM-dd HH:mm:ss.fff') as DataAtualizacaoDados,
                    om.IdOcorrencia,
                    om.Ocorrencia,
                    om.IdContratoLocacao,
                    om.ContratoLocacao,
                    om.IdContratoComercial,
                    om.ContratoComercial,
                    om.IdClassificacaoContrato,
                    om.ClassificacaoContrato,
                    om.DataCriacao as DataCriacao,
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
                    om.DataConclusaoOcorrencia as DataConclusaoOcorrencia,
                    om.SugestaoAgendamento1 as SugestaoAgendamento1,
                    om.SugestaoAgendamento2 as SugestaoAgendamento2,
                    om.SugestaoAgendamento3 as SugestaoAgendamento3,
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
                    om.DataAgendamento as DataAgendamento,
                    om.Descricao,
                    om.Observacoes,
                    CAST(ISNULL(om.OdometroAtual, 0) AS INT) as OdometroAtual,
                    om.NomeRequisitante,
                    om.EmailRequisitante,
                    om.TelefoneRequisitante,
                    om.CanceladoPor,
                    om.CanceladoEm as CanceladoEm,
                    om.MotivoCancelamento,
                    om.DataPrevisaoConclusaoServico as DataPrevisaoConclusaoServico,
                    om.DataConclusaoServico as DataConclusaoServico,
                    om.DataConfirmacaoSaida as DataConfirmacaoSaida,
                    om.DataRetiradaVeiculo as DataRetiradaVeiculo,
                    om.IdJustificativa,
                    om.IdFilialOperacional,
                    
                    -- Campos de Veículos (JOIN com Veiculos)
                    os.ModeloVeiculo as Modelo,
                    v.Categoria as CategoriaVeiculo,
                    v.Marca,
                    v.AnoFabricacao,
                    v.AnoModelo,
                    v.Cor,
                    v.Chassi,
                    v.Renavam,
                    
                    -- Campos de Ordem de Serviço (buscar valores)
                    os.ValorTotal,
                    os.ValorNaoReembolsavel,
                    os.ValorReembolsavel,
                    os.Cliente as ClienteContrato,
                    os.TipoLocacao,
                    os.Categoria as TipoManutencao,
                    os.Fornecedor as FornecedorOcorrencia,
                    os.DataInicioServico as DataInicioServico,
                    os.SituacaoOrdemServico as StatusOS,
                    os.IdOrdemServico,
                    os.OrdemServico,
                    os.OcorrenciaCriadaEm as OcorrenciaCriadaEm,
                    os.OdometroConfirmado,
                    
                    -- Campos calculados úteis para o dashboard
                    om.DataCriacao as DataEntrada,
                    DATEDIFF(DAY, om.DataCriacao, ISNULL(om.DataConclusaoOcorrencia, GETDATE())) as DiasAberta,
                    CASE 
                        WHEN om.DataConclusaoOcorrencia IS NOT NULL THEN 'Fechada'
                        WHEN om.SituacaoOcorrencia = 'Cancelada' THEN 'Cancelada'
                        ELSE 'Aberta'
                    END as StatusSimplificado,
                    DATEDIFF(DAY, os.DataInicioServico, ISNULL(os.DataConclusaoServico, GETDATE())) as LeadTimeTotalDias
                    
                FROM OcorrenciasManutencao om WITH (NOLOCK)
                LEFT JOIN Veiculos v WITH (NOLOCK) ON om.IdVeiculo = v.IdVeiculo
                LEFT JOIN OrdensServico os WITH (NOLOCK) ON om.IdOcorrencia = os.IdOcorrencia
                WHERE om.DataCriacao >= '2024-01-01'
                -- SEM FILTROS de tipo - Mantendo 100% da base conforme solicitado
                ORDER BY om.IdOcorrencia DESC
                `
    },
    {
        table: 'agg_kpis_manutencao_mensal',
        query: `WITH ManutencaoBase AS (
                    SELECT 
                        FORMAT(os.DataInicioServico, 'yyyy-MM') as MesAno,
                        os.IdOrdemServico,
                        os.Placa,
                        os.Fornecedor,
                        CASE 
                            WHEN os.Tipo LIKE '%preventiv%' OR os.Tipo LIKE '%Preventiv%' THEN 'Preventiva'
                            WHEN os.Tipo LIKE '%corretiv%' OR os.Tipo LIKE '%Corretiv%' THEN 'Corretiva'
                            ELSE 'Outros'
                        END as TipoManutencao,
                        CAST(ISNULL(os.ValorTotal, 0) AS DECIMAL(15,2)) as ValorTotal,
                        DATEDIFF(DAY, os.DataInicioServico, ISNULL(os.DataConclusaoOcorrencia, GETDATE())) as DiasParado,
                        os.DataInicioServico as DataEntrada,
                        CASE WHEN os.DataConclusaoOcorrencia IS NOT NULL THEN 1 ELSE 0 END as OSConcluida
                    FROM OrdensServico os
                    WHERE os.SituacaoOrdemServico <> 'Cancelada'
                      AND os.DataInicioServico >= DATEADD(MONTH, -24, GETDATE())
                ),
                KPIsPorMes AS (
                    SELECT 
                        MesAno,
                        -- Totalizadores
                        COUNT(*) as TotalOS,
                        COUNT(DISTINCT Placa) as TotalVeiculos,
                        COUNT(DISTINCT Fornecedor) as TotalFornecedores,
                        SUM(ValorTotal) as CustoTotal,
                        
                        -- Médias
                        AVG(ValorTotal) as TicketMedio,
                        AVG(CASE WHEN OSConcluida = 1 THEN DiasParado ELSE NULL END) as MTTR,
                        
                        -- Por Tipo
                        SUM(CASE WHEN TipoManutencao = 'Preventiva' THEN 1 ELSE 0 END) as OSPreventiva,
                        SUM(CASE WHEN TipoManutencao = 'Corretiva' THEN 1 ELSE 0 END) as OSCorretiva,
                        SUM(CASE WHEN TipoManutencao = 'Preventiva' THEN ValorTotal ELSE 0 END) as CustoPreventiva,
                        SUM(CASE WHEN TipoManutencao = 'Corretiva' THEN ValorTotal ELSE 0 END) as CustoCorretiva
                    FROM ManutencaoBase
                    GROUP BY MesAno
                )
                SELECT 
                    MesAno,
                    TotalOS,
                    TotalVeiculos,
                    TotalFornecedores,
                    CustoTotal,
                    TicketMedio,
                    ISNULL(MTTR, 0) as MTTR,
                    OSPreventiva,
                    OSCorretiva,
                    CustoPreventiva,
                    CustoCorretiva,
                    CASE WHEN TotalOS > 0 THEN (CAST(OSPreventiva AS FLOAT) / TotalOS) * 100 ELSE 0 END as PctPreventiva,
                    CASE WHEN TotalOS > 0 THEN (CAST(OSCorretiva AS FLOAT) / TotalOS) * 100 ELSE 0 END as PctCorretiva
                FROM KPIsPorMes
                ORDER BY MesAno DESC`
    },
    {
        table: 'fat_movimentacao_ocorrencias',
        query: `SELECT 
                    -- Identificação da Ocorrência
                    mo.Ocorrencia,
                    mo.Tipo,
                    mo.Motivo,
                    mo.Placa,
                    mo.ModeloVeiculo,
                    mo.IdCliente,
                    
                    -- Situação Atual
                    mo.Situacao,
                    mo.EtapaAtual,
                    
                    -- Dados de Cancelamento
                    mo.CanceladoPor,
                    mo.CanceladoEm as DataCancelamento,
                    mo.MotivoCancelamento,
                    
                    -- Dados de Criação
                    mo.CriadoPor,
                    mo.CriadoEm as DataCriacao,
                    
                    -- Dados da Etapa (histórico de movimentação)
                    mo.Etapa,
                    mo.DataDeConfirmacao as DataEtapa,
                    mo.Usuario as UsuarioEtapa,
                    
                    -- Metadata
                    mo.DataAtualizacaoDados as DataAtualizacao,
                    
                    -- Campos calculados para análise
                    DATEDIFF(HOUR, mo.CriadoEm, mo.DataDeConfirmacao) as HorasAteConclusaoEtapa,
                    DATEDIFF(DAY, mo.CriadoEm, mo.DataDeConfirmacao) as DiasAteConclusaoEtapa,
                    
                    -- Indicadores booleanos
                    CASE WHEN mo.Situacao = 'Concluída' THEN 1 ELSE 0 END as IsConcluida,
                    CASE WHEN mo.Situacao = 'Cancelada' THEN 1 ELSE 0 END as IsCancelada,
                    CASE WHEN mo.Situacao = 'Aberta' THEN 1 ELSE 0 END as IsAberta
                    
                FROM MovimentacaoOcorrencias mo
                WHERE mo.Etapa IS NOT NULL 
                  AND mo.DataDeConfirmacao IS NOT NULL
                ORDER BY mo.Ocorrencia, mo.DataDeConfirmacao`
    },
    {
        table: 'agg_lead_time_etapas',
        query: `WITH EtapasOrdenadas AS (
                    SELECT 
                        mo.Ocorrencia,
                        mo.Tipo,
                        mo.Motivo,
                        mo.Placa,
                        mo.Situacao,
                        mo.Etapa,
                        mo.DataDeConfirmacao,
                        mo.Usuario,
                        LAG(mo.DataDeConfirmacao) OVER (PARTITION BY mo.Ocorrencia ORDER BY mo.DataDeConfirmacao) as DataEtapaAnterior,
                        LAG(mo.Etapa) OVER (PARTITION BY mo.Ocorrencia ORDER BY mo.DataDeConfirmacao) as EtapaAnterior,
                        LAG(mo.Usuario) OVER (PARTITION BY mo.Ocorrencia ORDER BY mo.DataDeConfirmacao) as UsuarioAnterior,
                        ROW_NUMBER() OVER (PARTITION BY mo.Ocorrencia ORDER BY mo.DataDeConfirmacao) as OrdemEtapa
                    FROM MovimentacaoOcorrencias mo
                    WHERE mo.Etapa IS NOT NULL 
                      AND mo.DataDeConfirmacao IS NOT NULL
                )
                SELECT 
                    Ocorrencia,
                    Tipo,
                    Motivo,
                    Placa,
                    Situacao,
                    EtapaAnterior,
                    Etapa as EtapaAtual,
                    DataEtapaAnterior as DataEtapaAnterior,
                    DataDeConfirmacao as DataEtapaAtual,
                    UsuarioAnterior,
                    Usuario as UsuarioAtual,
                    OrdemEtapa,
                    DATEDIFF(MINUTE, DataEtapaAnterior, DataDeConfirmacao) as TempoEntreEtapas_Minutos,
                    DATEDIFF(HOUR, DataEtapaAnterior, DataDeConfirmacao) as TempoEntreEtapas_Horas,
                    DATEDIFF(DAY, DataEtapaAnterior, DataDeConfirmacao) as TempoEntreEtapas_Dias,
                    -- Indicador de retrabalho (voltou para etapa anterior)
                    CASE 
                        WHEN OrdemEtapa > 1 AND Etapa IN (
                            SELECT Etapa FROM MovimentacaoOcorrencias mo2 
                            WHERE mo2.Ocorrencia = EtapasOrdenadas.Ocorrencia 
                              AND mo2.DataDeConfirmacao < DataEtapaAnterior
                        ) THEN 1 
                        ELSE 0 
                    END as IsRetrabalho
                FROM EtapasOrdenadas
                WHERE EtapaAnterior IS NOT NULL
                ORDER BY Ocorrencia, OrdemEtapa
                OPTION (MAXDOP 2, FAST 1000)`
    },
    {
        table: 'agg_funil_conversao',
        query: `SELECT 
                    mo.Etapa,
                    mo.Tipo,
                    COUNT(*) as TotalMovimentacoes,
                    COUNT(DISTINCT mo.Ocorrencia) as TotalOcorrencias,
                    SUM(CASE WHEN mo.Situacao = 'Concluída' THEN 1 ELSE 0 END) as TotalConcluidas,
                    SUM(CASE WHEN mo.Situacao = 'Cancelada' THEN 1 ELSE 0 END) as TotalCanceladas,
                    SUM(CASE WHEN mo.Situacao = 'Aberta' THEN 1 ELSE 0 END) as TotalAbertas,
                    AVG(DATEDIFF(HOUR, mo.CriadoEm, mo.DataDeConfirmacao)) as TempoMedioAteEtapa_Horas,
                    AVG(DATEDIFF(DAY, mo.CriadoEm, mo.DataDeConfirmacao)) as TempoMedioAteEtapa_Dias,
                    MIN(DATEDIFF(HOUR, mo.CriadoEm, mo.DataDeConfirmacao)) as TempoMinimo_Horas,
                    MAX(DATEDIFF(HOUR, mo.CriadoEm, mo.DataDeConfirmacao)) as TempoMaximo_Horas,
                    -- Taxa de conversão (chegar nesta etapa)
                    CAST(COUNT(DISTINCT mo.Ocorrencia) AS FLOAT) / 
                        (SELECT COUNT(DISTINCT Ocorrencia) FROM MovimentacaoOcorrencias) * 100 as TaxaConversao
                FROM MovimentacaoOcorrencias mo
                WHERE mo.Etapa IS NOT NULL 
                  AND mo.DataDeConfirmacao IS NOT NULL
                GROUP BY mo.Etapa, mo.Tipo
                ORDER BY mo.Tipo, TotalOcorrencias DESC`
    },
    {
        table: 'agg_performance_usuarios',
        query: `SELECT 
                    mo.Usuario,
                    mo.Etapa,
                    mo.Tipo,
                    COUNT(*) as TotalProcessadas,
                    COUNT(DISTINCT mo.Ocorrencia) as TotalOcorrenciasDistintas,
                    SUM(CASE WHEN mo.Situacao = 'Concluída' THEN 1 ELSE 0 END) as TotalConcluidas,
                    SUM(CASE WHEN mo.Situacao = 'Cancelada' THEN 1 ELSE 0 END) as TotalCanceladas,
                    AVG(DATEDIFF(HOUR, mo.CriadoEm, mo.DataDeConfirmacao)) as TempoMedio_Horas,
                    MIN(mo.DataDeConfirmacao) as PrimeiraAtividade,
                    MAX(mo.DataDeConfirmacao) as UltimaAtividade,
                    -- Taxa de conclusão
                    CASE 
                        WHEN COUNT(*) > 0 
                        THEN CAST(SUM(CASE WHEN mo.Situacao = 'Concluída' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100 
                        ELSE 0 
                    END as TaxaConclusao,
                    -- Taxa de cancelamento
                    CASE 
                        WHEN COUNT(*) > 0 
                        THEN CAST(SUM(CASE WHEN mo.Situacao = 'Cancelada' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100 
                        ELSE 0 
                    END as TaxaCancelamento
                FROM MovimentacaoOcorrencias mo
                WHERE mo.Usuario IS NOT NULL 
                  AND mo.Etapa IS NOT NULL
                  AND mo.DataDeConfirmacao IS NOT NULL
                GROUP BY mo.Usuario, mo.Etapa, mo.Tipo
                ORDER BY TotalProcessadas DESC`
    },
    {
        table: 'agg_rentabilidade_contratos_mensal',
        query: `SELECT 
                    c.IdCliente,
                    c.Cliente,
                    cl.IdContratoComercial,
                    cl.IdContratoLocacao,
                    cl.ContratoLocacao,
                    ISNULL(gv.GrupoVeiculo, 'Sem Grupo') as GrupoVeiculo,
                    v.Modelo,
                    cl.PlacaPrincipal as Placa,
                    FORMAT(f.DataCompetencia, 'yyyy-MM') as Competencia,
                    FORMAT(f.DataCompetencia, 'yyyy') as Ano,
                    FORMAT(f.DataCompetencia, 'MM') as Mes,
                    
                    -- Receitas
                    SUM(${castM('ISNULL(f.ValorTotal, 0)')}) as ReceitaFaturamento,
                    SUM(${castM('ISNULL(f.ValorLocacao, 0)')}) as ReceitaLocacao,
                    SUM(${castM('ISNULL(f.ValorTaxas, 0)')}) as ReceitaTaxas,
                    SUM(${castM('ISNULL(f.ValorOutros, 0)')}) as ReceitaOutros,
                    
                    -- Custos Diretos (Manutenção)
                    SUM(${castM('ISNULL(os.ValorTotal, 0)')}) as CustoManutencao,
                    SUM(${castM('ISNULL(os.ValorReembolsavel, 0)')}) as ReembolsoManutencao,
                    SUM(${castM('ISNULL(os.ValorNaoReembolsavel, 0)')}) as CustoLiquidoManutencao,
                    
                    -- Custos de Multas e Sinistros
                    SUM(${castM('ISNULL(inf.ValorInfracao, 0)')}) as CustoMultas,
                    SUM(${castM('ISNULL(sin.ValorOrcamento, 0)')}) as CustoSinistros,
                    
                    -- Indicadores de Volume
                    COUNT(DISTINCT f.IdFaturamento) as QtdFaturas,
                    COUNT(DISTINCT os.IdOrdemServico) as QtdOrdemServico,
                    COUNT(DISTINCT inf.IdOcorrencia) as QtdMultas,
                    COUNT(DISTINCT sin.IdOcorrencia) as QtdSinistros,
                    
                    -- Rentabilidade Calculada
                    (
                        SUM(${castM('ISNULL(f.ValorTotal, 0)')}) 
                        - SUM(${castM('ISNULL(os.ValorNaoReembolsavel, 0)')})
                        - SUM(${castM('ISNULL(inf.ValorInfracao, 0)')})
                        - SUM(${castM('ISNULL(sin.ValorOrcamento, 0)')})
                    ) as LucroLiquido,
                    
                    -- Margem de Rentabilidade (%)
                    CASE 
                        WHEN SUM(${castM('ISNULL(f.ValorTotal, 0)')}) > 0 
                        THEN (
                            (SUM(${castM('ISNULL(f.ValorTotal, 0)')}) 
                             - SUM(${castM('ISNULL(os.ValorNaoReembolsavel, 0)')})
                             - SUM(${castM('ISNULL(inf.ValorInfracao, 0)')})
                             - SUM(${castM('ISNULL(sin.ValorOrcamento, 0)')})
                            ) / SUM(${castM('ISNULL(f.ValorTotal, 0)')})
                        ) * 100
                        ELSE 0
                    END as MargemRentabilidade
                    
                FROM ContratosLocacao cl WITH (NOLOCK)
                JOIN ContratosComerciais cc WITH (NOLOCK) ON cl.IdContratoComercial = cc.IdContratoComercial
                JOIN Clientes c WITH (NOLOCK) ON cc.IdCliente = c.IdCliente
                LEFT JOIN Veiculos v WITH (NOLOCK) ON cl.PlacaPrincipal = v.Placa
                LEFT JOIN GruposVeiculos gv WITH (NOLOCK) ON v.IdGrupoVeiculo = gv.IdGrupoVeiculo
                LEFT JOIN Faturamentos f WITH (NOLOCK) ON f.IdContratoLocacao = cl.IdContratoLocacao 
                    AND f.SituacaoNota NOT IN ('Cancelada')
                    AND f.DataCompetencia >= DATEADD(YEAR, -3, GETDATE())
                LEFT JOIN OrdensServico os WITH (NOLOCK) ON os.Placa = cl.PlacaPrincipal
                    AND os.SituacaoOrdemServico NOT IN ('Cancelada')
                    AND FORMAT(os.DataInicioServico, 'yyyy-MM') = FORMAT(f.DataCompetencia, 'yyyy-MM')
                LEFT JOIN OcorrenciasInfracoes inf WITH (NOLOCK) ON inf.Placa = cl.PlacaPrincipal
                    AND inf.SituacaoOcorrencia NOT IN ('Cancelada')
                    AND FORMAT(inf.DataInfracao, 'yyyy-MM') = FORMAT(f.DataCompetencia, 'yyyy-MM')
                LEFT JOIN OcorrenciasSinistro sin WITH (NOLOCK) ON sin.Placa = cl.PlacaPrincipal
                    AND sin.SituacaoOcorrencia NOT IN ('Cancelada')
                    AND FORMAT(sin.DataSinistro, 'yyyy-MM') = FORMAT(f.DataCompetencia, 'yyyy-MM')
                WHERE f.DataCompetencia IS NOT NULL
                GROUP BY 
                    c.IdCliente, c.Cliente, 
                    cl.IdContratoComercial, cl.IdContratoLocacao, cl.ContratoLocacao,
                    gv.GrupoVeiculo, v.Modelo, cl.PlacaPrincipal,
                    FORMAT(f.DataCompetencia, 'yyyy-MM'),
                    FORMAT(f.DataCompetencia, 'yyyy'),
                    FORMAT(f.DataCompetencia, 'MM')
                HAVING SUM(${castM('ISNULL(f.ValorTotal, 0)')}) > 0
                ORDER BY Competencia DESC, c.Cliente`
    },
    {
        table: 'agg_custos_detalhados',
        query: `SELECT 
                    os.IdOrdemServico,
                    os.OrdemServico,
                    os.Ocorrencia,
                    os.Placa,
                    os.ModeloVeiculo,
                    os.Fornecedor,
                    os.Tipo,
                    os.Motivo,
                    os.Cliente,
                    os.DataInicioServico as DataServico,
                    -- Agregação de custos por grupo de despesa
                    ISNULL(
                        (SELECT SUM(ios.ValorTotal) 
                         FROM ItensOrdemServico ios 
                         WHERE ios.IdOrdemServico = os.IdOrdemServico 
                           AND (ios.GrupoDespesa LIKE '%peça%' 
                                OR ios.GrupoDespesa LIKE '%peças%' 
                                OR ios.GrupoDespesa LIKE '%Peça%'
                                OR ios.GrupoDespesa LIKE '%Peças%')
                        ), 0) as CustoPecas,
                    ISNULL(
                        (SELECT SUM(ios.ValorTotal) 
                         FROM ItensOrdemServico ios 
                         WHERE ios.IdOrdemServico = os.IdOrdemServico 
                           AND (ios.GrupoDespesa LIKE '%serviço%' 
                                OR ios.GrupoDespesa LIKE '%serviços%'
                                OR ios.GrupoDespesa LIKE '%Serviço%'
                                OR ios.GrupoDespesa LIKE '%Serviços%'
                                OR ios.GrupoDespesa LIKE '%mão de obra%'
                                OR ios.GrupoDespesa LIKE '%mao de obra%')
                        ), 0) as CustoServicos,
                    ISNULL(
                        (SELECT SUM(ios.ValorTotal) 
                         FROM ItensOrdemServico ios 
                         WHERE ios.IdOrdemServico = os.IdOrdemServico 
                           AND ios.GrupoDespesa NOT LIKE '%peça%' 
                           AND ios.GrupoDespesa NOT LIKE '%peças%'
                           AND ios.GrupoDespesa NOT LIKE '%Peça%'
                           AND ios.GrupoDespesa NOT LIKE '%Peças%'
                           AND ios.GrupoDespesa NOT LIKE '%serviço%'
                           AND ios.GrupoDespesa NOT LIKE '%serviços%'
                           AND ios.GrupoDespesa NOT LIKE '%Serviço%'
                           AND ios.GrupoDespesa NOT LIKE '%Serviços%'
                           AND ios.GrupoDespesa NOT LIKE '%mão de obra%'
                           AND ios.GrupoDespesa NOT LIKE '%mao de obra%'
                        ), 0) as CustoOutros,
                    os.ValorTotal as CustoTotal,
                    -- KM percorrido (campo não disponível em OrdensServico - seria necessário MovimentacaoOcorrencias)
                    0 as KmPercorrido,
                    -- Custo por KM (sempre 0 por enquanto)
                    0.0 as CustoPorKm,
                    -- Valores de reembolso
                    os.ValorReembolsavel,
                    os.ValorNaoReembolsavel,
                    -- Taxa de reembolso
                    CASE 
                        WHEN os.ValorTotal > 0 
                        THEN (os.ValorReembolsavel / os.ValorTotal) * 100
                        ELSE 0
                    END as TaxaReembolso
                FROM OrdensServico os
                WHERE os.SituacaoOrdemServico <> 'Cancelada'
                  AND os.ValorTotal > 0
                ORDER BY os.DataInicioServico DESC
                OPTION (MAXDOP 2, FAST 1000)`
    }
];

// ==============================================================================
// FUNÇÕES AUXILIARES
// ==============================================================================

// Fila de uploads assíncronos para não bloquear PostgreSQL
// OTIMIZAÇÃO: Função queueUpload removida - não geramos mais JSONs locais ou Supabase
// Todo processamento agora vai direto para PostgreSQL

// Placeholder vazio - JSON desabilitado (otimização focada em PostgreSQL)
function queueUpload_DEPRECATED(tableName, data, year = null, month = null) {
    // REMOVIDO: Toda lógica de JSON/Supabase foi eliminada
    return;

    const MAX_CHUNK_SIZE = 10000; // Reduzido para 10K para evitar HTTP 546 (Edge Function limit)
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

        let manifestPromise = Promise.resolve();
        if (shouldUploadToSupabase) {
            manifestPromise = fetch(`${SUPABASE_URL}/functions/v1/sync-dw-to-storage`, {
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
        }

        // also write manifest locally if requested
        if (writeLocal) {
            try {
                const outDir = path.join(process.cwd(), 'public', 'data');
                if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
                fs.writeFileSync(path.join(outDir, manifestFileName), JSON.stringify(manifestData), 'utf8');
                console.log(`         💾 Gravado local: ${manifestFileName}`);
            } catch (err) {
                console.error(`         ❌ Falha ao gravar manifest local ${manifestFileName}:`, err.message);
            }
        }

        uploadQueue.push(manifestPromise);

        for (let i = 0; i < totalChunks; i++) {
            const chunk = data.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE);
            const chunkFileName = `${baseFileName}_part${i + 1}of${totalChunks}.json`;

            const chunkMetadata = { ...metadata, chunk: i + 1, total_chunks: totalChunks, record_count: chunk.length };

            // tentativa com retries para uploads de chunk (corrige falhas intermitentes HTTP 546)
            const attemptUploadChunk = async (tries = 3, delayMs = 1500) => {
                for (let attempt = 1; attempt <= tries; attempt++) {
                    try {
                        const resp = await fetch(`${SUPABASE_URL}/functions/v1/sync-dw-to-storage`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ fileName: chunkFileName, data: chunk, metadata: chunkMetadata })
                        });
                        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                        const result = await resp.json();
                        console.log(`         📤 Upload: ${chunkFileName} (${result.recordCount} registros)`);
                        return result;
                    } catch (err) {
                        console.error(`         ❌ Erro upload ${chunkFileName} (attempt ${attempt}):`, err.message);
                        if (attempt < tries) await new Promise(r => setTimeout(r, delayMs));
                        else throw err;
                    }
                }
            };
            let uploadPromise = Promise.resolve();
            if (shouldUploadToSupabase) {
                uploadPromise = attemptUploadChunk().catch(err => {
                    console.error(`         ❌ Upload final falhou para ${chunkFileName}:`, err.message);
                });
            }

            // write chunk locally if requested
            if (writeLocal) {
                try {
                    const outDir = path.join(process.cwd(), 'public', 'data');
                    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
                    
                    // Envolver chunk em um objeto com metadata
                    const wrappedChunk = {
                        metadata: chunkMetadata,
                        data: chunk
                    };
                    
                    fs.writeFileSync(path.join(outDir, chunkFileName), JSON.stringify(wrappedChunk), 'utf8');
                    console.log(`         💾 Gravado local: ${chunkFileName} (com metadata)`);
                } catch (err) {
                    console.error(`         ❌ Falha ao gravar chunk local ${chunkFileName}:`, err.message);
                }
            }

            uploadQueue.push(uploadPromise);
        }
    } else {
        // Upload normal para arquivos pequenos
        const fileName = `${baseFileName}.json`;
        let uploadPromise = Promise.resolve();
        if (shouldUploadToSupabase) {
            uploadPromise = fetch(`${SUPABASE_URL}/functions/v1/sync-dw-to-storage`, {
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
        }

        if (writeLocal) writeSmallLocal(fileName, data, metadata);

        uploadQueue.push(uploadPromise);
    }
}

// Se escrevemos localmente para arquivos pequenos (não chunked)
function writeSmallLocal(fileName, dataObj, metadata) {
    try {
        const fs = require('fs');
        const path = require('path');
        const outDir = path.join(process.cwd(), 'public', 'data');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        
        // Envolver dados em um objeto com metadata
        const wrappedData = {
            metadata: metadata || { 
                generated_at: new Date().toISOString(),
                record_count: Array.isArray(dataObj) ? dataObj.length : 0 
            },
            data: dataObj
        };
        
        fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(wrappedData), 'utf8');
        console.log(`         💾 Gravado local: ${fileName} (com metadata)`);
    } catch (err) {
        console.error(`         ❌ Falha ao gravar local ${fileName}:`, err.message);
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

    // Identificar possível chave primária (IdOcorrencia, IdNota, IdOrdemServico, etc)
    const firstKey = Object.keys(sampleRow)[0];
    const pkColumn = firstKey.replace(/[^a-zA-Z0-9_]/g, "");
    const hasPK = firstKey.toLowerCase().startsWith('id');

    const createSql = hasPK
        ? `CREATE TABLE IF NOT EXISTS public.${tableName} (${columns}, PRIMARY KEY ("${pkColumn}"));`
        : `CREATE TABLE IF NOT EXISTS public.${tableName} (${columns});`;

    try {
        await pgClient.query(createSql);
    } catch (err) {
        // Ignorar erro se PRIMARY KEY já existe
        if (!err.message.includes('já existe')) {
            console.error(`         ⚠️  Erro ao criar tabela ${tableName}:`, err.message);
        }
    }
}

/**
 * Processa query: extrai dados, salva no PostgreSQL e faz upload para Supabase Storage
 */
async function processQuery(pgClient, sqlPool, tableName, query, appendMode = false, progressStr = '', year = null, month = null) {
    const start = performance.now();
    let recordset;

    try {
        if (tableName === 'dim_alienacoes') {
            console.log(`🔍 [DEBUG] Executando query para ${tableName}...`);
            // console.log(query); 
        }
        const result = await sqlPool.request().query(query);
        recordset = result.recordset;
        if (tableName === 'dim_alienacoes') {
            console.log(`🔍 [DEBUG] ${tableName}: Retornou ${recordset.length} linhas.`);
        }
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
        if (JSON_ONLY) {
            // Em modo somente JSON, apenas enfileira upload/gera arquivos locais e pula escrita no Postgres
            const columns = Object.keys(recordset[0]);
            // reutiliza a sanitização feita abaixo para finalData
            const BATCH_SIZE = 500;
            const totalRows = recordset.length;
            // sanitizar dados como no fluxo padrão
            const sanitizedData = recordset.map(row => {
                const sanitized = {};
                Object.keys(row).forEach(col => {
                    const val = row[col];
                    if (val === undefined) sanitized[col] = null;
                    else if (val instanceof Date) sanitized[col] = val.toISOString();
                    else if (typeof val === 'string' && val.trim() === '') sanitized[col] = null;
                    else sanitized[col] = val;
                });
                return sanitized;
            });

            // deduplicação semelhante
            const pkRaw = Object.keys(recordset[0])[0];
            const hasIdColumn = pkRaw && pkRaw.toLowerCase().startsWith('id');
            let finalData = sanitizedData;
            // OTIMIZAÇÃO: Deduplicação removida - PostgreSQL ON CONFLICT cuida disso
            // (Modo JSON_ONLY simplificado)

            // Upload/JSON desabilitado (Otimização #1)
            const duration = ((performance.now() - start) / 1000).toFixed(2);
            console.log(`      ✅ ${progressStr} ${tableName} (${finalData.length} linhas) - ${duration}s (JSON_ONLY)`);

            return;
        }

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

        // Remover duplicatas se houver ID column (manter última ocorrência)
        // EXCETO para tabelas de histórico temporal que legitimamente têm múltiplas entradas
        // E EXCETO para fat_manutencao_unificado que deve manter 100% da base
        const pkRaw = columns[0];
        const hasIdColumn = pkRaw && pkRaw.toLowerCase().startsWith('id');
        const historicalTables = [
            'dim_contratos_locacao',
            'dim_movimentacao_patios',
            'dim_movimentacao_veiculos',
            'dim_veiculos_acessorios',
            'historico_situacao_veiculos',
            'fat_movimentacao_ocorrencias',
            'fat_manutencao_unificado', // MANTÉM 100% DA BASE SEM DEDUPLICAÇÃO
            'fato_financeiro_dre' // MANTÉM 100% DA BASE (não deduplicar por IdLancamento)
        ];
        const shouldDedup = hasIdColumn && !historicalTables.includes(tableName);
        let finalData = sanitizedData;

        // OTIMIZA├ç├âO AJUSTADA: Deduplica├º├úo seletiva para tabelas com duplicatas reais
        // Estas tabelas T├èM duplicatas nos dados de origem que causam erro "ON CONFLICT cannot affect row a second time"
        // IMPORTANTE: Deduplica INDEPENDENTE de estarem em historicalTables
        const tablesWithRealDuplicates = [
            'dim_movimentacao_veiculos',
            'dim_veiculos_acessorios',
            'dim_movimentacao_patios',
            'fat_faturamentos',
            'fat_detalhe_itens_os'
        ];

        if (hasIdColumn && tablesWithRealDuplicates.includes(tableName)) {
            const seen = new Map();
            sanitizedData.forEach(row => {
                seen.set(row[pkRaw], row); // ├Ültima ocorr├¬ncia sobrescreve
            });
            finalData = Array.from(seen.values());

            if (finalData.length < sanitizedData.length) {
                console.log(`         ÔÜá´ŞĆ  Removidas ${sanitizedData.length - finalData.length} duplicatas de ${tableName}`);
            }
        }

        // Identificar primeira coluna como possível PK para UPSERT (nome seguro)
        const firstCol = (pkRaw || '').replace(/[^a-zA-Z0-9_]/g, "");

        // Tabelas com PKs simples no PostgreSQL mas que precisam deduplic JavaScript
        // (porque na verdade têm estrutura histórica com múltiplos registros por ID)
        const needsJSDedup = [
            'dim_veiculos_acessorios',
            'dim_movimentacao_patios',
            'dim_movimentacao_veiculos'
        ];

        // DELETE movido para dentro da transação (Otimização #3)

        // OTIMIZAÇÃO: Deduplicação JS removida - needsJSDedup não necessário
        // PostgreSQL ON CONFLICT gerencia duplicatas automaticamente

        const finalRowCount = finalData.length;

        // Se não houver dados após filtros, pular inserção
        if (finalRowCount === 0) {
            const duration = ((performance.now() - start) / 1000).toFixed(2);
            console.log(`      ⚠️  ${progressStr} ${tableName} (0 linhas após filtros) - ${duration}s`);
            return;
        }

        // Usar transação única para todos os batches da tabela
        const client = await pgClient.connect();
        try {
            await client.query('BEGIN');

            // TRUNCATE para tabelas históricas (dentro da transação - Zero Downtime)
            if (!shouldDedup) {
                await client.query(`TRUNCATE TABLE public.${tableName}`);
            }

            for (let i = 0; i < finalRowCount; i += BATCH_SIZE) {
                const chunk = finalData.slice(i, i + BATCH_SIZE);
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

                // UPSERT se tiver ID column (evita duplicatas)
                // Para tabelas históricas sem PK única, usar INSERT simples (já truncadas)
                let insertQuery;
                if (hasIdColumn && shouldDedup) {
                    const updateSet = columns
                        .filter(col => col !== columns[0]) // Excluir PK do UPDATE
                        .map(col => {
                            const safeName = col.replace(/[^a-zA-Z0-9_]/g, "");
                            return `"${safeName}" = EXCLUDED."${safeName}"`;
                        })
                        .join(', ');

                    insertQuery = `INSERT INTO public.${tableName} (${columnNames}) VALUES ${placeholders.join(', ')} 
                                  ON CONFLICT ("${firstCol}") DO UPDATE SET ${updateSet};`;
                } else {
                    insertQuery = `INSERT INTO public.${tableName} (${columnNames}) VALUES ${placeholders.join(', ')};`;
                }

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
        console.log(`      ✅ ${progressStr} ${tableName} (${finalData.length} linhas) - ${duration}s`);

        // OTIMIZAÇÃO: Upload JSON/Supabase removido (#1)

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
            L.DataCompetencia as Data, 
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
                queryGen: (year) => `SELECT f.IdNota, f.Nota as NumeroNota, f.TipoNota, f.SituacaoNota, f.IdCliente, f.Cliente as NomeCliente, f.DataCompetencia as Competencia, f.Vencimento as Vencimento, ${castM('f.ValorLocacao')} as VlrLocacao, ${castM('f.ValorReembolsaveis')} as VlrReembolso, ${castM('f.ValorMultas')} as VlrMultas, ${castM('f.ValorTotal')} as VlrTotal, fi.IdVeiculo, fi.Descricao as DetalheItem, ${castM('fi.ValorTotal')} as VlrItem FROM Faturamentos f LEFT JOIN FaturamentoItems fi ON f.IdNota = fi.IdNota WHERE YEAR(f.DataCompetencia) = ${year}`
            },
            {
                table: 'fat_detalhe_itens_os',
                queryGen: (year) => `SELECT ios.IdItemOrdemServico, os.OrdemServico as OS, os.Placa, ios.GrupoDespesa, ios.DescricaoItem, ios.Quantidade, ${castM('ios.ValorTotal')} as Valor FROM ItensOrdemServico ios JOIN OrdensServico os ON ios.IdOrdemServico = os.IdOrdemServico WHERE YEAR(os.DataInicioServico) = ${year} AND os.SituacaoOrdemServico <> 'Cancelada'`
            },
            {
                table: 'fat_ocorrencias_master',
                queryGen: (year) => `
                    SELECT 'Manutencao' as Classe, Ocorrencia, Placa, Tipo, Motivo, SituacaoOcorrencia as Status, DataCriacao as Data, ${castM('0')} as Valor 
                    FROM OcorrenciasManutencao WITH (NOLOCK)
                    WHERE YEAR(DataCriacao) = ${year} 
                    
                    UNION ALL 
                    
                    SELECT 'Sinistro', Ocorrencia, Placa, Tipo, Motivo, SituacaoOcorrencia, DataSinistro, ${castM('ValorOrcamento')} 
                    FROM OcorrenciasSinistro WITH (NOLOCK)
                    WHERE YEAR(DataSinistro) = ${year} AND DataSinistro IS NOT NULL
                    
                    UNION ALL 
                    
                    SELECT 'Multa', Ocorrencia, Placa, DescricaoInfracao, OrgaoAutuador, SituacaoOcorrencia, DataInfracao, ${castM('ValorInfracao')} 
                    FROM OcorrenciasInfracoes WITH (NOLOCK)
                    WHERE YEAR(DataInfracao) = ${year} 
                    
                    UNION ALL 
                    
                    SELECT 'Devolucao', Ocorrencia, Placa, Tipo, Motivo, SituacaoOcorrencia, DataConclusaoOcorrencia, ${castM('ValorTotal')} 
                    FROM OcorrenciasDevolucao WITH (NOLOCK)
                    WHERE YEAR(DataConclusaoOcorrencia) = ${year} 
                    
                    UNION ALL 
                    
                    SELECT 'Reserva', Ocorrencia, Placa, ModeloVeiculoReserva, Motivo, SituacaoOcorrencia, DataRetiradaEfetiva, ${castM('DiariasEfetivas')} 
                    FROM OcorrenciasVeiculoTemporario WITH (NOLOCK)
                    WHERE YEAR(DataRetiradaEfetiva) = ${year}`
            },
            {
                table: 'fat_sinistros',
                queryGen: (year) => `SELECT 
                    os.IdOcorrencia,
                    os.Ocorrencia as NumeroOcorrencia,
                    os.IdVeiculo,
                    os.Placa,
                    
                    -- Datas principais
                    os.DataCriacao as DataCriacao,
                    os.DataSinistro as DataSinistro,
                    os.DataSinistro as DataOcorrencia,
                    os.DataConclusaoOcorrencia as DataConclusaoOcorrencia,
                    os.DataAgendamento as DataAgendamento,
                    os.DataRetirada as DataRetirada,
                    os.DataRetiradaVeiculo as DataRetiradaVeiculo,
                    os.DataPrevisaoConclusaoServico as DataPrevisaoConclusao,
                    os.DataConclusaoServico as DataConclusaoServico,
                    os.CanceladoEm as DataCancelamento,
                    
                    -- Status e classificações
                    os.IdSituacaoOcorrencia,
                    os.SituacaoOcorrencia as Status,
                    os.IdEtapa,
                    os.Etapa,
                    os.IdTipo,
                    os.Tipo as TipoSinistro,
                    os.IdMotivo,
                    os.Motivo,
                    os.Origem,
                    
                    -- Contrato e Cliente
                    os.IdContratoLocacao,
                    os.ContratoLocacao,
                    os.IdContratoComercial,
                    os.ContratoComercial,
                    os.IdClassificacaoContrato,
                    os.ClassificacaoContrato,
                    os.IdCliente,
                    COALESCE(os.NomeCliente, cli.NomeFantasia) as Cliente,
                    
                    -- Condutor
                    os.IdCondutor,
                    os.NomeCondutor as Condutor,
                    
                    -- Fornecedor
                    os.IdFornecedor,
                    os.Fornecedor,
                    
                    -- Localização do sinistro
                    os.Endereco,
                    os.Numero as NumeroEndereco,
                    os.Complemento,
                    os.Bairro,
                    os.Cidade,
                    os.Estado,
                    os.Pais,
                    os.CEP,
                    CAST(os.Latitude AS FLOAT) as Latitude,
                    CAST(os.Longitude AS FLOAT) as Longitude,
                    
                    -- Local de atendimento
                    os.LocalAtendimentoEndereco,
                    os.LocalAtendimentoNumero,
                    os.LocalAtendimentoComplemento,
                    os.LocalAtendimentoBairro,
                    os.LocalAtendimentoCidade,
                    os.LocalAtendimentoEstado,
                    os.LocalAtendimentoPais,
                    os.LocalAtendimentoCEP,
                    CAST(os.LocalAtendimentoLatitude AS FLOAT) as LocalAtendimentoLatitude,
                    CAST(os.LocalAtendimentoLongitude AS FLOAT) as LocalAtendimentoLongitude,
                    
                    -- Descrições e detalhes
                    os.Descricao,
                    os.ParecerMotorista,
                    os.ParecerResponsavel,
                    os.Observacoes,
                    os.ComentariosEncerramento,
                    
                    -- Responsabilidade
                    CAST(ISNULL(os.MotoristaCulpado, 0) AS BIT) as MotoristaCulpado,
                    CAST(ISNULL(os.ResponsavelCulpado, 0) AS BIT) as ResponsavelCulpado,
                    
                    -- Danos (são campos de texto com descrições, não booleanos)
                    os.DanosLataria,
                    os.DanosMotor,
                    os.DanosAcessorios,
                    os.DanosOutros,
                    
                    -- Valores monetários
                    ${castM('os.ValorOrcamento')} as ValorOrcado,
                    ${castM('os.ReembolsoTerceiro')} as ReembolsoTerceiro,
                    ${castM('os.IndenizacaoSeguradora')} as IndenizacaoSeguradora,
                    
                    -- Documentos e referências
                    os.BoletimOcorrencia,
                    os.ApoliceSeguro,
                    os.ReparoIndenizacao,
                    CAST(ISNULL(os.OdometroAtual, 0) AS INT) as OdometroAtual,
                    
                    -- Requisitante
                    os.NomeRequisitante,
                    os.EmailRequisitante,
                    os.TelefoneRequisitante,
                    
                    -- Cancelamento
                    os.CanceladoPor,
                    os.MotivoCancelamento,
                    
                    -- Outros
                    os.IdUsuarioCriacao,
                    os.IdJustificativa,
                    os.IdFilialOperacional
                    
                FROM OcorrenciasSinistro os WITH (NOLOCK)
                LEFT JOIN Clientes cli WITH (NOLOCK) ON os.IdCliente = cli.IdCliente
                WHERE os.DataSinistro IS NOT NULL 
                    AND YEAR(os.DataSinistro) = ${year}`
            },
            {
                table: 'fat_multas',
                queryGen: (year) => `SELECT 
                    oi.IdOcorrencia, oi.Ocorrencia, oi.IdVeiculo, oi.Placa,
                    oi.DataInfracao as DataInfracao,
                    oi.DescricaoInfracao, oi.CodigoInfracao, oi.AutoInfracao,
                    oi.OrgaoAutuador, oi.EstadoOrgaoAutuador,
                    ${castM('oi.ValorInfracao')} as ValorMulta, 
                    ${castM('oi.ValorInfracaoDesconto')} as ValorDesconto,
                    oi.SituacaoOcorrencia as Status,
                    oi.NomeCondutor as Condutor, oi.ContratoLocacao, cli.NomeFantasia as Cliente,
                    oi.DataLimiteRecurso as DataLimiteRecurso,
                    oi.DataLimitePagamento as DataLimitePagamento,
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
            },
            {
                table: 'fat_propostas_blufleet',
                queryGen: (year) => `SELECT 
                    p.IdProposta,
                    p.IdProposta as id_proposta,
                    p.NumeroDocumento as numero_proposta,
                    p.IdCliente,
                    p.IdCliente as id_cliente,
                    ISNULL(cli.NomeFantasia, 'Cliente não identificado') as Cliente,
                    ISNULL(cli.NomeFantasia, 'Cliente não identificado') as cliente,
                    p.DataCriacaoContratoComercial as DataProposta,
                    p.DataCriacaoContratoComercial as data_proposta,
                    YEAR(p.DataCriacaoContratoComercial) as ano_proposta,
                    MONTH(p.DataCriacaoContratoComercial) as mes_proposta,
                    p.IdSituacaoProposta as id_situacao,
                    p.SituacaoContrato as Status,
                    p.SituacaoContrato as status,
                    CAST(ISNULL(p.PeriodoContratoComercial, 0) AS INT) as periodo_contrato,
                    p.IdTipoPeriodoContratoComercial as id_tipo_periodo,
                    p.TipoPeriodoContratoComercial as tipo_periodo,
                    p.IdTipoContratoComercial as id_tipo_contrato,
                    p.TipoContratoComercial as tipo_contrato,
                    p.IdTipoLocacao as id_tipo_locacao,
                    p.TipoLocacao as tipo_locacao,
                    ISNULL(p.NomeRequisitante, 'Não informado') as requisitante,
                    ISNULL(p.NomePromotor, 'Não informado') as promotor,
                    p.IdPromotor as id_promotor,
                    CAST(ISNULL(p.PorcentagemComissao, 0) AS DECIMAL(15,2)) as percentual_comissao,
                    ${castM('p.ValorComissao')} as valor_comissao,
                    p.IdIndiceReajuste as id_indice_reajuste,
                    p.SiglaIndiceReajuste as sigla_indice,
                    p.IndiceReajuste as indice_reajuste,
                    ISNULL(p.Observacoes, '') as observacoes,
                    ISNULL(p.MotivoDaPerda, '') as motivo_perda,
                    p.UnidadeDeFaturamento as unidade_faturamento,
                    p.CidadeEntrega as cidade_entrega,
                    p.EstadoEntrega as estado_entrega,
                    CASE 
                        WHEN p.SituacaoContrato = 'Aceita' THEN 'Fechada'
                        WHEN p.SituacaoContrato = 'Recusada' THEN 'Perdida'
                        ELSE 'Em Análise'
                    END as status_pipeline
                FROM Propostas p WITH (NOLOCK)
                LEFT JOIN Clientes cli WITH (NOLOCK) ON p.IdCliente = cli.IdCliente
                WHERE p.DataCriacaoContratoComercial IS NOT NULL 
                    AND YEAR(p.DataCriacaoContratoComercial) = ${year}`
            },
            {
                table: 'fat_vendas',
                queryGen: (year) => `SELECT 
                    vv.IdVeiculo,
                    vv.IdVeiculo as id_veiculo,
                    vv.Chassi,
                    vv.Chassi as chassi,
                    vv.Placa,
                    vv.Placa as placa,
                    vv.IdMontadora as id_montadora,
                    vv.Montadora as marca,
                    vv.IdModelo as id_modelo,
                    vv.Modelo as modelo,
                    vv.CodigoFIPE as codigo_fipe,
                    vv.Renavam as renavam,
                    vv.IdCor as id_cor,
                    vv.Cor as cor,
                    vv.DataCompra as data_compra,
                    ${castM('vv.ValorCompra')} as valor_compra,
                    ${castM('vv.ValorAcessorios')} as valor_acessorios,
                    ${castM('vv.ValorTotal')} as valor_total_compra,
                    vv.DataVenda as DataVenda,
                    vv.DataVenda as data_venda,
                    YEAR(vv.DataVenda) as ano_venda,
                    MONTH(vv.DataVenda) as mes_venda,
                    ${castM('vv.ValorVenda')} as ValorVenda,
                    ${castM('vv.ValorVenda')} as valor_venda,
                    vv.IdComprador as id_comprador,
                    ISNULL(vv.Comprador, 'Não informado') as Comprador,
                    ISNULL(vv.Comprador, 'Não informado') as comprador,
                    vv.UnidadeId as id_unidade,
                    vv.Unidade as unidade,
                    vv.IdFaturaVenda as id_fatura_venda,
                    vv.FaturaVenda as fatura_venda,
                    ${castM('vv.ValorVenda')} - ${castM('vv.ValorTotal')} as margem_lucro,
                    CASE 
                        WHEN ${castM('vv.ValorTotal')} > 0 
                        THEN CAST(((${castM('vv.ValorVenda')} - ${castM('vv.ValorTotal')}) / ${castM('vv.ValorTotal')} * 100) AS DECIMAL(15,2))
                        ELSE 0
                    END as percentual_lucro,
                    CAST(ISNULL(vv.PorcentagemDepreciacaoFiscal, 0) AS DECIMAL(15,2)) as percentual_depreciacao_fiscal,
                    CAST(ISNULL(vv.DiasDepreciados, 0) AS INT) as dias_depreciados,
                    CAST(ISNULL(vv.MesesDepreciados, 0) AS INT) as meses_depreciados,
                    ${castM('vv.DepreciacaoFiscalDiaria')} as depreciacao_fiscal_diaria,
                    ${castM('vv.DepreciacaoFiscalAcumulada')} as depreciacao_fiscal_acumulada,
                    ${castM('vv.DepreciacaoFiscalAcessoriosAcumulada')} as depreciacao_acessorios_acumulada,
                    ${castM('vv.DepreciacaoSocietariaDiaria')} as depreciacao_societaria_diaria,
                    ${castM('vv.DepreciacaoSocietariaAcumulada')} as depreciacao_societaria_acumulada,
                    CASE 
                        WHEN ${castM('vv.ValorVenda')} > ${castM('vv.ValorTotal')} THEN 'Lucro'
                        WHEN ${castM('vv.ValorVenda')} < ${castM('vv.ValorTotal')} THEN 'Prejuízo'
                        ELSE 'Neutro'
                    END as resultado
                FROM VeiculosVendidos vv WITH (NOLOCK)
                WHERE vv.DataVenda IS NOT NULL 
                    AND YEAR(vv.DataVenda) = ${year}`
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
        // await flushUploads(); // Aguardar uploads das dimensões

        console.log(`\n📅 FASE 2: Processando Fatos Anuais (${factDefs.length * years.length} etapas) - PARALELO`);
        console.log(`${'─'.repeat(80)}`);

        for (const fact of factDefs) {
            console.log(`   📊 ${fact.table}`);
            if (!JSON_ONLY) {
                const client = await pgClient.connect();
                try {
                    await client.query(`DROP TABLE IF EXISTS public.${fact.table};`);
                } catch (e) { } finally {
                    client.release();
                }
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
        // await flushUploads(); // Aguardar uploads dos fatos

        console.log(`\n💰 FASE 3: Processando Financeiro Universal (${years.length * 12} meses) - PARALELO`);
        console.log(`${'─'.repeat(80)}`);

        if (!JSON_ONLY) {
            const client = await pgClient.connect();
            try {
                await client.query(`DROP TABLE IF EXISTS public.fat_financeiro_universal;`);
            } catch (e) { } finally {
                client.release();
            }
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
        // await flushUploads(); // Aguardar uploads financeiros

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
        // await flushUploads();

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
