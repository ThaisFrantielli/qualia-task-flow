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

// HELPER (Para campos monetários - converte formato BR para US e usa DECIMAL para precisão)
const castM = (col) => `TRY_CAST(REPLACE(REPLACE(REPLACE(REPLACE(ISNULL(CAST(${col} AS VARCHAR), '0'), 'R$', ''), '.', ''), ',', '.'), ' ', '') AS DECIMAL(15,2))`;

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
                    CAST(ISNULL(v.CustoTotalPorKmRodado, 0) AS DECIMAL(15,2)) as CustoTotalPorKmRodado,
                    v.IdCondutor,
                    c.Nome as NomeCondutor,
                    c.CPF as CPFCondutor,
                    c.Telefone1 as TelefoneCondutor,
                    v.SituacaoFinanceiraContratoLocacao,
                    al.Instituicao as BancoFinanciador, 
                    FORMAT(al.Termino, 'yyyy-MM-dd') as Quitacao, 
                    FORMAT(al.VencimentoPrimeiraParcela, 'yyyy-MM-dd') as DataPrimParcela,
                    ContratoAtivo.NomeCliente,
                    ContratoAtivo.TipoLocacao,
                    CAST(ISNULL(ContratoAtivo.ValorLocacao, 0) AS DECIMAL(15,2)) as ValorLocacao,
                    ContratoAtivo.IdContratoLocacao,
                    ContratoAtivo.ContratoLocacao as NumeroContratoLocacao
                FROM Veiculos v 
                LEFT JOIN GruposVeiculos g ON v.IdGrupoVeiculo = g.IdGrupoVeiculo 
                LEFT JOIN Patios p ON v.IdPatio = p.IdPatio 
                LEFT JOIN Condutores c ON v.IdCondutor = c.IdCondutor
                
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
                ) ContratoAtivo
                WHERE COALESCE(v.FinalidadeUso, '') <> 'Terceiro'` 
    },
    { 
        table: 'dim_veiculos_acessorios', 
        query: `SELECT IdVeiculo, NomeAcessorio as Acessorio, TipoInstalacao as Origem FROM VeiculosAcessorios` 
    },
    {
        table: 'historico_situacao_veiculos',
        query: `SELECT
                    FORMAT(DataAtualizacaoDados, 'yyyy-MM-dd HH:mm:ss') as DataAtualizacaoDados,
                    IdVeiculo,
                    Placa,
                    FORMAT(UltimaAtualizacao, 'yyyy-MM-dd HH:mm:ss') as UltimaAtualizacao,
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
        query: `WITH Base AS ( SELECT v.IdVeiculo, v.Placa, v.Modelo, g.GrupoVeiculo as Grupo, v.DataCompra FROM Veiculos v LEFT JOIN GruposVeiculos g ON v.IdGrupoVeiculo = g.IdGrupoVeiculo WHERE COALESCE(v.FinalidadeUso, '') <> 'Terceiro' ), Ops AS ( SELECT Placa, SUM(${castM('ValorTotal')}) as CustoTotal, COUNT(IdOrdemServico) as Passagens FROM OrdensServico WHERE SituacaoOrdemServico <> 'Cancelada' GROUP BY Placa ), Fin AS ( SELECT fi.IdVeiculo, SUM(${castM('fi.ValorTotal')}) as FatTotal FROM FaturamentoItems fi JOIN Faturamentos f ON fi.IdNota = f.IdNota WHERE f.SituacaoNota <> 'Cancelada' GROUP BY fi.IdVeiculo ) SELECT B.*, CAST(O.CustoTotal AS DECIMAL(15,2)) as CustoOp, CAST(F.FatTotal AS DECIMAL(15,2)) as ReceitaLoc, O.Passagens FROM Base B LEFT JOIN Ops O ON B.Placa = O.Placa LEFT JOIN Fin F ON B.IdVeiculo = F.IdVeiculo` 
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
                FORMAT(cl.DataInicial, 'yyyy-MM-dd') as DataInicio,
                FORMAT(cl.DataFinal, 'yyyy-MM-dd') as DataFimPrevista,
                FORMAT(cl.DataEncerramento, 'yyyy-MM-dd') as DataFimReal,
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
                FORMAT(cl.DataInicial, 'yyyy-MM-dd'), FORMAT(cl.DataFinal, 'yyyy-MM-dd'), FORMAT(cl.DataEncerramento, 'yyyy-MM-dd'),
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
                FORMAT(os.DataInicioServico, 'yyyy-MM-dd'), 
                NULL, -- DataPrevista removida
                FORMAT(os.DataConclusaoOcorrencia, 'yyyy-MM-dd'),
                NULL, 
                LEFT(os.Motivo, 150),
                os.IdOrdemServico, os.Tipo, os.Fornecedor,
                ${castM('os.ValorTotal')},
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
                FORMAT(s.DataSinistro, 'yyyy-MM-dd'), NULL, FORMAT(s.DataConclusaoOcorrencia, 'yyyy-MM-dd'),
                NULL, LEFT(s.Observacoes, 150),
                NULL, NULL, NULL,
                ${castM('s.ValorOrcamento')}, -- Corrigido para ValorOrcamento
                s.BoletimOcorrencia, 
                s.Tipo, NULL, NULL
            FROM Veiculos v WITH (NOLOCK)
            INNER JOIN OcorrenciasSinistro s WITH (NOLOCK) ON s.Placa = v.Placa
            LEFT JOIN Clientes c WITH (NOLOCK) ON c.IdCliente = s.IdCliente
            WHERE s.DataSinistro IS NOT NULL AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'

            UNION ALL

            /* 5. MULTA */
            SELECT 
                v.Placa, v.IdVeiculo, v.Modelo, v.Montadora, v.AnoFabricacao, v.Cor,
                'MULTA' as TipoEvento,
                CAST(m.DataInfracao AS DATETIME) as DataEvento,
                NULL, NULL,
                ISNULL(con.Nome, 'Condutor não identificado'), con.CPF,
                m.SituacaoOcorrencia,
                FORMAT(m.DataInfracao, 'yyyy-MM-dd'), NULL, NULL, -- DataPagamento removida
                NULL, LEFT(m.Observacoes, 150),
                NULL, NULL, NULL, NULL,
                m.AutoInfracao, -- Corrigido para AutoInfracao
                NULL,
                ${castM('m.ValorInfracao')},
                m.DescricaoInfracao
            FROM Veiculos v WITH (NOLOCK)
            INNER JOIN OcorrenciasInfracoes m WITH (NOLOCK) ON m.Placa = v.Placa
            LEFT JOIN Condutores con WITH (NOLOCK) ON con.IdCondutor = m.IdCondutor
            WHERE m.DataInfracao IS NOT NULL AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'

            UNION ALL

            /* 6. COMPRA */
            SELECT 
                v.Placa, v.IdVeiculo, v.Modelo, v.Montadora, v.AnoFabricacao, v.Cor,
                'COMPRA' as TipoEvento,
                CAST(v.DataCompra AS DATETIME) as DataEvento,
                NULL, NULL,
                ISNULL(v.Proprietario, 'Aquisição Frota'), NULL,
                'ADQUIRIDO',
                FORMAT(v.DataCompra, 'yyyy-MM-dd'), NULL, NULL,
                NULL, 
                LEFT(ISNULL(v.InformacoesAdicionais, 'Nota Fiscal não detalhada'), 150), -- Corrigido para InformacoesAdicionais
                NULL, NULL, 
                ISNULL(v.Proprietario, 'Fornecedor Padrão'), 
                ${castM('v.ValorCompra')},
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
                FORMAT(vv.DataVenda, 'yyyy-MM-dd'), NULL, NULL,
                NULL, 'Fatura: ' + ISNULL(vv.FaturaVenda, '-'),
                NULL, NULL, NULL,
                ${castM('vv.ValorVenda')},
                NULL, NULL, NULL, NULL
            FROM Veiculos v WITH (NOLOCK)
            LEFT JOIN VeiculosVendidos vv WITH (NOLOCK) ON vv.Placa = v.Placa
            WHERE vv.DataVenda IS NOT NULL AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'

            ORDER BY Placa, DataEvento DESC
        ` 
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
                    CAST(ISNULL(Valores.SomaMensal, 0) AS DECIMAL(15,2)) as ValorMensal 
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
        query: `SELECT 'Frota' as Area, v.Placa, v.Modelo, CASE WHEN CAST(ISNULL(v.ValorCompra, 0) AS DECIMAL(15,2)) = 0 THEN 'Valor de compra não informado' WHEN v.OdometroConfirmado IS NULL THEN 'Odômetro não confirmado' WHEN v.DataCompra IS NULL THEN 'Data de compra não informada' END as Erro, 'Alta' as Gravidade, 'Atualizar cadastro do veículo' as AcaoRecomendada FROM Veiculos v WHERE CAST(ISNULL(v.ValorCompra, 0) AS DECIMAL(15,2)) = 0 OR v.OdometroConfirmado IS NULL OR v.DataCompra IS NULL UNION ALL SELECT 'Comercial', cc.NumeroDocumento, cli.NomeFantasia, 'Contrato sem itens vinculados' as Erro, 'Média' as Gravidade, 'Verificar itens do contrato' as AcaoRecomendada FROM ContratosComerciais cc LEFT JOIN Clientes cli ON cc.IdCliente = cli.IdCliente LEFT JOIN ItensContratos ic ON cc.IdContratoComercial = ic.IdContrato WHERE ic.IdItemContrato IS NULL AND cc.SituacaoContrato = 'Ativo'` 
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
                    FORMAT(ovt.DataCriacao, 'yyyy-MM-dd') as DataCriacao,
                    FORMAT(ovt.DataRetiradaEfetiva, 'yyyy-MM-dd') as DataRetirada,
                    FORMAT(ovt.DataRetiradaEfetiva, 'yyyy-MM-dd') as DataInicio,
                    FORMAT(ovt.DataDevolucaoEfetiva, 'yyyy-MM-dd') as DataDevolucao,
                    FORMAT(ovt.DataDevolucaoEfetiva, 'yyyy-MM-dd') as DataFim,
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
                    FORMAT(ovt.DataAtualizacaoDados, 'yyyy-MM-dd HH:mm:ss') as DataAtualizacaoDados,
                    ovt.IdOcorrenciaOrigem,
                    ovt.IdClassificacaoContrato,
                    ovt.ClassificacaoContrato,
                    FORMAT(ovt.DataRetiradaEfetiva, 'yyyy-MM-dd') as DataRetiradaEfetiva,
                    FORMAT(ovt.DataDevolucaoEfetiva, 'yyyy-MM-dd') as DataDevolucaoEfetiva,
                    CAST(ISNULL(ovt.DiariasEfetivas, 0) AS INT) as DiariasEfetivas,
                    ovt.CanceladoPor,
                    FORMAT(ovt.CanceladoEm, 'yyyy-MM-dd') as CanceladoEm,
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
                    FORMAT(ovt.DataConclusaoOcorrencia, 'yyyy-MM-dd') as DataConclusaoOcorrencia,
                    ovt.Etapa,
                    ovt.IdCondutor,
                    ovt.NomeCondutor,
                    ovt.TipoVeiculoTemporario,
                    ovt.IdFornecedorReserva,
                    ovt.FornecedorReserva as FornecedorReservaOriginal
                FROM OcorrenciasVeiculoTemporario ovt
                -- Tentar casar pelo IdContratoLocacao quando disponível, senão por placa principal ativa
                LEFT JOIN ContratosLocacao cl ON (ovt.IdContratoLocacao IS NOT NULL AND ovt.IdContratoLocacao = cl.IdContratoLocacao) OR (ovt.Placa = cl.PlacaPrincipal AND cl.SituacaoContratoLocacao = 'Ativo')
                -- Contrato comercial vinculado ao contrato de locação
                LEFT JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
                -- Contrato comercial declarado diretamente na ocorrência (fallback)
                LEFT JOIN ContratosComerciais cc_t ON ovt.IdContratoComercial = cc_t.IdContratoComercial
                -- Cliente via contrato comercial vinculado
                LEFT JOIN Clientes cli ON cc.IdCliente = cli.IdCliente
                -- Cliente informado diretamente na ocorrência (fallback)
                LEFT JOIN Clientes cli_t ON ovt.IdCliente = cli_t.IdCliente` 
    },
    { 
        table: 'fat_manutencao_unificado', 
        query: `SELECT 
                    -- Identificação da Ocorrência (tabela principal)
                    om.IdOcorrencia,
                    om.Ocorrencia,
                    om.Ocorrencia as NumeroOcorrencia,
                    
                    -- Dados da Ocorrência
                    om.IdSituacaoOcorrencia as IdSituacaoOcorrenciaManut,
                    om.SituacaoOcorrencia,
                    om.IdEtapa,
                    om.Etapa,
                    om.IdTipo as IdTipoOcorrencia,
                    om.Tipo as TipoOcorrencia,
                    om.IdMotivo as IdMotivoOcorrencia,
                    om.Motivo,
                    om.Descricao as DescricaoOcorrencia,
                    om.Observacoes,
                    
                    -- Datas da Ocorrência
                    FORMAT(om.DataCriacao, 'yyyy-MM-dd HH:mm:ss') as DataAberturaOcorrencia,
                    FORMAT(om.DataAgendamento, 'yyyy-MM-dd HH:mm:ss') as DataAgendamento,
                    FORMAT(om.DataConclusaoOcorrencia, 'yyyy-MM-dd HH:mm:ss') as DataConclusaoOcorrencia,
                    FORMAT(om.DataPrevisaoConclusaoServico, 'yyyy-MM-dd') as DataPrevisaoConclusao,
                    FORMAT(om.DataConfirmacaoSaida, 'yyyy-MM-dd') as DataConfirmacaoSaida,
                    FORMAT(om.DataRetiradaVeiculo, 'yyyy-MM-dd HH:mm:ss') as DataRetiradaVeiculo,
                    -- Data de chegada baseada em movimentações (Etapa 'Aguardando Chegada')
                    (
                        SELECT TOP 1 mo3.DataDeConfirmacao
                        FROM MovimentacaoOcorrencias mo3
                        WHERE mo3.Ocorrencia = om.Ocorrencia AND mo3.Etapa LIKE '%Aguardando Chegada%'
                        ORDER BY mo3.DataDeConfirmacao ASC
                    ) as DataChegadaVeiculo,
                    -- Movimentações detalhadas por ocorrência (etapa + data + tempo desde etapa anterior)
                    (
                        SELECT
                            mo2.Etapa as Etapa,
                            FORMAT(mo2.DataDeConfirmacao, 'yyyy-MM-dd HH:mm:ss') as DataConfirmacao,
                            mo2.Usuario as Usuario,
                            DATEDIFF(MINUTE, ISNULL(LAG(mo2.DataDeConfirmacao) OVER (ORDER BY mo2.DataDeConfirmacao), mo2.CriadoEm), mo2.DataDeConfirmacao) as MinutosDesdeAnterior,
                            DATEDIFF(HOUR, ISNULL(LAG(mo2.DataDeConfirmacao) OVER (ORDER BY mo2.DataDeConfirmacao), mo2.CriadoEm), mo2.DataDeConfirmacao) as HorasDesdeAnterior,
                            DATEDIFF(DAY, ISNULL(LAG(mo2.DataDeConfirmacao) OVER (ORDER BY mo2.DataDeConfirmacao), mo2.CriadoEm), mo2.DataDeConfirmacao) as DiasDesdeAnterior
                        FROM MovimentacaoOcorrencias mo2
                        WHERE mo2.Ocorrencia = om.Ocorrencia AND mo2.DataDeConfirmacao IS NOT NULL
                        ORDER BY mo2.DataDeConfirmacao
                        FOR JSON PATH
                    ) as MovimentacoesJson,

                    -- KPI: diferença entre conclusão da ocorrência e retirada do veículo
                    DATEDIFF(MINUTE, om.DataConclusaoOcorrencia, om.DataRetiradaVeiculo) as Minutos_Conclusao_Retirada,
                    DATEDIFF(HOUR, om.DataConclusaoOcorrencia, om.DataRetiradaVeiculo) as Horas_Conclusao_Retirada,
                    DATEDIFF(DAY, om.DataConclusaoOcorrencia, om.DataRetiradaVeiculo) as Dias_Conclusao_Retirada,
                    -- KPI: diferença entre chegada do veículo (Aguardando Chegada) e retirada do veículo
                    DATEDIFF(MINUTE, (
                        SELECT TOP 1 mo3.DataDeConfirmacao
                        FROM MovimentacaoOcorrencias mo3
                        WHERE mo3.Ocorrencia = om.Ocorrencia AND mo3.Etapa LIKE '%Aguardando Chegada%'
                        ORDER BY mo3.DataDeConfirmacao ASC
                    ), om.DataRetiradaVeiculo) as Minutos_Chegada_Retirada,
                    DATEDIFF(HOUR, (
                        SELECT TOP 1 mo3.DataDeConfirmacao
                        FROM MovimentacaoOcorrencias mo3
                        WHERE mo3.Ocorrencia = om.Ocorrencia AND mo3.Etapa LIKE '%Aguardando Chegada%'
                        ORDER BY mo3.DataDeConfirmacao ASC
                    ), om.DataRetiradaVeiculo) as Horas_Chegada_Retirada,
                    DATEDIFF(DAY, (
                        SELECT TOP 1 mo3.DataDeConfirmacao
                        FROM MovimentacaoOcorrencias mo3
                        WHERE mo3.Ocorrencia = om.Ocorrencia AND mo3.Etapa LIKE '%Aguardando Chegada%'
                        ORDER BY mo3.DataDeConfirmacao ASC
                    ), om.DataRetiradaVeiculo) as Dias_Chegada_Retirada,
                    
                    -- Veículo
                    om.IdVeiculo,
                    om.Placa,
                    v.Modelo,
                    ISNULL(g.GrupoVeiculo, '') as CategoriaVeiculo,
                    om.OdometroAtual as Odometro,
                    
                    -- Fornecedor/Oficina (da ocorrência)
                    om.IdFornecedor as IdFornecedorOcorrencia,
                    om.Fornecedor as FornecedorOcorrencia,
                    
                    -- Cliente e Condutor
                    om.IdCliente,
                    om.NomeCliente as Cliente,
                    om.IdCondutor,
                    om.NomeCondutor as Condutor,
                    om.NomeRequisitante,
                    om.EmailRequisitante,
                    om.TelefoneRequisitante,
                    
                    -- Contratos
                    om.IdContratoLocacao,
                    om.ContratoLocacao,
                    om.IdContratoComercial,
                    om.ContratoComercial,
                    om.IdClassificacaoContrato,
                    om.ClassificacaoContrato,
                    
                    -- Localização
                    om.Endereco,
                    om.Numero,
                    om.Bairro,
                    om.Cidade,
                    om.Estado,
                    
                    -- Cancelamento
                    om.CanceladoPor,
                    FORMAT(om.CanceladoEm, 'yyyy-MM-dd') as DataCancelamento,
                    om.MotivoCancelamento,
                    
                    -- Origem
                    om.Origem,
                    
                    -- Dados da OS (quando existir)
                    os.IdOrdemServico,
                    os.OrdemServico,
                    os.IdSituacaoOrdemServico,
                    os.SituacaoOrdemServico as StatusOS,
                    os.Categoria,
                    os.Despesa,
                    os.OrdemCompra,
                    os.IdFornecedor as IdFornecedorOS,
                    os.Fornecedor as FornecedorOS,
                    FORMAT(os.OrdemServicoCriadaEm, 'yyyy-MM-dd') as DataCriacaoOS,
                    FORMAT(os.DataInicioServico, 'yyyy-MM-dd') as DataEntrada,
                    FORMAT(os.DataConclusaoOcorrencia, 'yyyy-MM-dd') as DataSaida,
                    CAST(ISNULL(os.OdometroConfirmado, 0) AS INT) as OdometroOS,
                    
                    -- Valores Financeiros (da OS)
                    (${castM('ISNULL(os.ValorTotal, 0)')} / 100.0) as CustoTotalOS,
                    (${castM('ISNULL(os.ValorTotal, 0)')} / 100.0) as ValorTotal,
                    (${castM('ISNULL(os.ValorNaoReembolsavel, 0)')} / 100.0) as ValorNaoReembolsavel,
                    (${castM('ISNULL(os.ValorReembolsavel, 0)')} / 100.0) as ValorReembolsavel,
                    
                    -- Lead Time
                    DATEDIFF(DAY, om.DataCriacao, ISNULL(om.DataConclusaoOcorrencia, GETDATE())) as LeadTimeTotalDias,
                    DATEDIFF(DAY, os.DataInicioServico, ISNULL(os.DataConclusaoOcorrencia, os.OrdemServicoCriadaEm)) as DiasOS,
                    
                    -- Tipo de Manutenção (inferido)
                    CASE 
                        WHEN om.Tipo LIKE '%preventiv%' OR om.Tipo LIKE '%Preventiv%' THEN 'Preventiva'
                        WHEN om.Tipo LIKE '%corretiv%' OR om.Tipo LIKE '%Corretiv%' THEN 'Corretiva'
                        WHEN om.Tipo LIKE '%preditiv%' OR om.Tipo LIKE '%Preditiv%' THEN 'Preditiva'
                        ELSE 'Outros'
                    END as TipoManutencao
                    
                FROM OcorrenciasManutencao om
                -- JOIN com Ordens de Serviço
                LEFT JOIN OrdensServico os ON om.IdOcorrencia = os.IdOcorrencia
                -- JOINs para enriquecer com dados de relacionamento
                LEFT JOIN Veiculos v ON om.Placa = v.Placa
                LEFT JOIN GruposVeiculos g ON v.IdGrupoVeiculo = g.IdGrupoVeiculo
                WHERE om.SituacaoOcorrencia NOT IN ('Cancelada')
                  AND om.DataCriacao >= DATEADD(YEAR, -3, GETDATE())` 
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
                        FORMAT(os.DataInicioServico, 'yyyy-MM-dd') as DataEntrada,
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
                    FORMAT(mo.CanceladoEm, 'yyyy-MM-dd HH:mm:ss') as DataCancelamento,
                    mo.MotivoCancelamento,
                    
                    -- Dados de Criação
                    mo.CriadoPor,
                    FORMAT(mo.CriadoEm, 'yyyy-MM-dd HH:mm:ss') as DataCriacao,
                    
                    -- Dados da Etapa (histórico de movimentação)
                    mo.Etapa,
                    FORMAT(mo.DataDeConfirmacao, 'yyyy-MM-dd HH:mm:ss') as DataEtapa,
                    mo.Usuario as UsuarioEtapa,
                    
                    -- Metadata
                    FORMAT(mo.DataAtualizacaoDados, 'yyyy-MM-dd') as DataAtualizacao,
                    
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
                    FORMAT(DataEtapaAnterior, 'yyyy-MM-dd HH:mm:ss') as DataEtapaAnterior,
                    FORMAT(DataDeConfirmacao, 'yyyy-MM-dd HH:mm:ss') as DataEtapaAtual,
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
                    MIN(FORMAT(mo.DataDeConfirmacao, 'yyyy-MM-dd')) as PrimeiraAtividade,
                    MAX(FORMAT(mo.DataDeConfirmacao, 'yyyy-MM-dd')) as UltimaAtividade,
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
                    FORMAT(os.DataInicioServico, 'yyyy-MM-dd') as DataServico,
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
const uploadQueue = [];

/**
 * Adiciona upload à fila (não-bloqueante) com suporte a chunking para arquivos grandes
 */
function queueUpload(tableName, data, year = null, month = null) {
    if (!SUPABASE_SERVICE_KEY) return;

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

            const uploadPromise = attemptUploadChunk().catch(err => {
                console.error(`         ❌ Upload final falhou para ${chunkFileName}:`, err.message);
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

        // Remover duplicatas se houver ID column (manter última ocorrência)
        // EXCETO para dim_contratos_locacao que pode ter múltiplos contratos por placa
        const pkRaw = columns[0];
        const hasIdColumn = pkRaw && pkRaw.toLowerCase().startsWith('id');
        const shouldDedup = hasIdColumn && tableName !== 'dim_contratos_locacao';
        let finalData = sanitizedData;

        if (shouldDedup) {
            const seen = new Map();
            sanitizedData.forEach(row => {
                seen.set(row[pkRaw], row); // Última ocorrência sobrescreve
            });
            finalData = Array.from(seen.values());

            if (finalData.length < sanitizedData.length) {
                console.log(`         ⚠️  Removidas ${sanitizedData.length - finalData.length} duplicatas de ${tableName}`);
            }
        }

        // Identificar primeira coluna como possível PK para UPSERT (nome seguro)
        const firstCol = (pkRaw || '').replace(/[^a-zA-Z0-9_]/g, "");
        const finalRowCount = finalData.length;
        
        // Usar transação única para todos os batches da tabela
        const client = await pgClient.connect();
        try {
            await client.query('BEGIN');
            
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
                let insertQuery;
                if (hasIdColumn) {
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

        // ========== UPLOAD PARA SUPABASE STORAGE (ASSÍNCRONO) ==========
        queueUpload(tableName, finalData, year, month);

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
                    os.IdOcorrencia,
                    os.Ocorrencia,
                    os.Ocorrencia as NumeroOcorrencia,
                    os.IdVeiculo,
                    os.Placa, 
                    FORMAT(os.DataSinistro, 'yyyy-MM-dd HH:mm:ss') as DataSinistro,
                    FORMAT(os.DataSinistro, 'yyyy-MM-dd HH:mm:ss') as DataOcorrencia,
                    FORMAT(os.DataAberturaOcorrencia, 'yyyy-MM-dd HH:mm:ss') as DataAberturaOcorrencia,
                    FORMAT(os.DataConclusaoOcorrencia, 'yyyy-MM-dd HH:mm:ss') as DataConclusaoOcorrencia,
                    FORMAT(os.DataAgendamentoAtendimento, 'yyyy-MM-dd HH:mm:ss') as DataAgendamento,
                    FORMAT(os.DataLiberacao, 'yyyy-MM-dd HH:mm:ss') as DataLiberacao,
                    os.Descricao,
                    os.SituacaoOcorrencia as Status,
                    ${castM('os.ValorOrcamento')} as ValorOrcado, 
                    os.BoletimOcorrencia,
                    os.ApoliceSeguro,
                    os.NomeCondutor as Condutor,
                    os.EmailRequisitante,
                    os.TelefoneRequisitante,
                    os.MotoristaCulpado,
                    os.ResponsavelCulpado,
                    os.DanosLataria,
                    os.DanosMotor,
                    os.DanosAcessorios,
                    os.DanosOutros,
                    os.ContratoLocacao,
                    cli.NomeFantasia as Cliente,
                    os.Latitude,
                    os.Longitude,
                    os.Cidade,
                    os.Estado
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
