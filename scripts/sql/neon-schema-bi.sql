-- =============================================================================
-- SCHEMA SQL PARA BANCO DE DESTINO - BluFleet BI Analytics
-- =============================================================================
-- Execute este script no SQL Editor do banco de destino para criar as tabelas antes do ETL
-- Versão: 1.0
-- Data: 2026-01-14
-- =============================================================================

-- ============================================================================
-- DIMENSÕES
-- ============================================================================

-- dim_clientes
CREATE TABLE IF NOT EXISTS dim_clientes (
    idcliente INTEGER PRIMARY KEY,
    nome VARCHAR(500),
    cnpj VARCHAR(20),
    cpf VARCHAR(20),
    tipo VARCHAR(50),
    naturezacliente VARCHAR(100),
    cidade VARCHAR(200),
    estado VARCHAR(50),
    segmento VARCHAR(100),
    situacao VARCHAR(50)
);

-- dim_condutores
CREATE TABLE IF NOT EXISTS dim_condutores (
    idcondutor INTEGER PRIMARY KEY,
    nome VARCHAR(500),
    cpf VARCHAR(20),
    numerocnh VARCHAR(50),
    tipocnh VARCHAR(20),
    venccnh DATE,
    email VARCHAR(255),
    telefone1 VARCHAR(50),
    telefone2 VARCHAR(50),
    telefone3 VARCHAR(50)
);

-- dim_fornecedores
CREATE TABLE IF NOT EXISTS dim_fornecedores (
    idfornecedor INTEGER PRIMARY KEY,
    nomefantasia VARCHAR(500),
    cnpj VARCHAR(20),
    cpf VARCHAR(20),
    classificacao VARCHAR(100),
    marca VARCHAR(200),
    endereco VARCHAR(500),
    numeroendereco VARCHAR(50),
    complemento VARCHAR(200),
    bairro VARCHAR(200),
    cidade VARCHAR(200),
    estado VARCHAR(50),
    criadoem DATE
);

-- dim_frota (tabela principal de veículos)
CREATE TABLE IF NOT EXISTS dim_frota (
    idveiculo INTEGER PRIMARY KEY,
    placa VARCHAR(10),
    chassi VARCHAR(50),
    renavam VARCHAR(20),
    modelo VARCHAR(200),
    montadora VARCHAR(100),
    anofabricacao INTEGER,
    anomodelo INTEGER,
    cor VARCHAR(50),
    filial VARCHAR(100),
    categoria VARCHAR(100),
    taxadedepreciacaoanual DECIMAL(10,4),
    status VARCHAR(100),
    situacaofinanceira VARCHAR(100),
    diassituacao INTEGER,
    localizacao VARCHAR(200),
    localizacaoveiculo VARCHAR(200),
    diaslocalizacao INTEGER,
    observacaolocalizacao TEXT,
    km INTEGER,
    kminformado INTEGER,
    kmconfirmado INTEGER,
    valorcompra DECIMAL(15,2),
    valorfipeatual DECIMAL(15,2),
    valorfipe DECIMAL(15,2),
    valorfipenacompra DECIMAL(15,2),
    valorfipezerokmAtual DECIMAL(15,2),
    datacompra DATE,
    idadeveiculo INTEGER,
    proprietario VARCHAR(200),
    uf_lic VARCHAR(5),
    cidadelicenciamento VARCHAR(200),
    numeromotor VARCHAR(50),
    tanque INTEGER,
    ultimamanutencao DATE,
    ultimamanutencaopreventiva DATE,
    kmultimamanutencaopreventiva INTEGER,
    provedortelemetria VARCHAR(100),
    ultimaatualizacaotelemetria TIMESTAMP,
    latitude DECIMAL(15,10),
    longitude DECIMAL(15,10),
    ultimoenderecotelemetria TEXT,
    finalidadeuso VARCHAR(100),
    comsegurovigente BOOLEAN,
    custototalporkMrodado DECIMAL(15,4),
    idcondutor INTEGER,
    nomecondutor VARCHAR(500),
    cpfcondutor VARCHAR(20),
    telefonecondutor VARCHAR(50),
    situacaofinanceiracontratolocacao VARCHAR(100),
    bancofinanciador VARCHAR(200),
    quitacao DATE,
    dataprimParcela DATE,
    nomecliente VARCHAR(500),
    tipolocacao VARCHAR(100),
    valorlocacao DECIMAL(15,2),
    idcontratolocacao INTEGER,
    numerocontratolocacao VARCHAR(50),
    datavenda DATE
);

-- dim_veiculos_acessorios
CREATE TABLE IF NOT EXISTS dim_veiculos_acessorios (
    id SERIAL PRIMARY KEY,
    idveiculo INTEGER,
    acessorio VARCHAR(200),
    origem VARCHAR(100)
);

-- historico_situacao_veiculos
CREATE TABLE IF NOT EXISTS historico_situacao_veiculos (
    id SERIAL PRIMARY KEY,
    dataatualizacaodados TIMESTAMP,
    idveiculo INTEGER,
    placa VARCHAR(10),
    ultimaatualizacao TIMESTAMP,
    atualizadopor VARCHAR(200),
    situacaoanteriorveiculo VARCHAR(100),
    situacaoveiculo VARCHAR(100),
    localizacaoanteriorveiculo VARCHAR(200),
    localizacaoveiculo VARCHAR(200),
    situacaofinanceiraanteriorveiculo VARCHAR(100),
    situacaofinanceiraveiculo VARCHAR(100),
    informacoes TEXT
);

-- dim_contratos_locacao
CREATE TABLE IF NOT EXISTS dim_contratos_locacao (
    idcontratolocacao INTEGER PRIMARY KEY,
    idcontratocomercial INTEGER,
    contratocomercial VARCHAR(100),
    contratolocacao VARCHAR(100),
    refcontratocliente VARCHAR(100),
    nomecliente VARCHAR(500),
    situacaocontrato VARCHAR(100),
    tipolocacao VARCHAR(100),
    nomepromotor VARCHAR(200),
    placaprincipal VARCHAR(10),
    statuslocacao VARCHAR(100),
    situacaodofaturamento VARCHAR(100),
    nomecondutor VARCHAR(500),
    valormensalatual DECIMAL(15,2),
    inicio DATE,
    fim DATE,
    dataencerramento DATE,
    periodoemMeses INTEGER
);

-- dim_itens_contrato
CREATE TABLE IF NOT EXISTS dim_itens_contrato (
    iditemcontrato INTEGER PRIMARY KEY,
    idcontrato INTEGER,
    nomemodelo VARCHAR(200),
    quantidade INTEGER,
    valor DECIMAL(15,2),
    periodolocacao INTEGER
);

-- dim_regras_contrato
CREATE TABLE IF NOT EXISTS dim_regras_contrato (
    id SERIAL PRIMARY KEY,
    contrato VARCHAR(100),
    nomeregra VARCHAR(200),
    conteudoregra TEXT,
    nomepolitica VARCHAR(200),
    conteudopolitica TEXT
);

-- dim_movimentacao_patios
CREATE TABLE IF NOT EXISTS dim_movimentacao_patios (
    id SERIAL PRIMARY KEY,
    idveiculo INTEGER,
    placa VARCHAR(10),
    idpatio INTEGER,
    patio VARCHAR(200),
    datamovimentacao TIMESTAMP,
    comentarios TEXT,
    idusuariomovimentacao INTEGER,
    usuariomovimentacao VARCHAR(200)
);

-- dim_movimentacao_veiculos
CREATE TABLE IF NOT EXISTS dim_movimentacao_veiculos (
    id SERIAL PRIMARY KEY,
    idcontratolocacao INTEGER,
    contratolocacao VARCHAR(100),
    idcontratocomercial INTEGER,
    contratocomercial VARCHAR(100),
    idclassificacaocontrato INTEGER,
    classificacaocontrato VARCHAR(100),
    dataencerramento TIMESTAMP,
    idsituacaocontratolocacao INTEGER,
    situacaocontratolocacao VARCHAR(100),
    cliente VARCHAR(500),
    idveiculo INTEGER,
    placa VARCHAR(10),
    idmodelo INTEGER,
    modelo VARCHAR(200),
    dataretirada TIMESTAMP,
    odometroretirada INTEGER,
    datadevolucao TIMESTAMP,
    odometrodevolucao INTEGER,
    idtipolocacao INTEGER,
    tipolocacao VARCHAR(100),
    enderecoentrega TEXT,
    enderecodevolucao TEXT
);

-- ============================================================================
-- FATOS
-- ============================================================================

-- fat_historico_mobilizacao
CREATE TABLE IF NOT EXISTS fat_historico_mobilizacao (
    id SERIAL PRIMARY KEY,
    contrato VARCHAR(100),
    fila VARCHAR(100),
    situacao VARCHAR(100),
    pedido VARCHAR(100),
    placa VARCHAR(10),
    modelo VARCHAR(200),
    tempoemdias INTEGER,
    ultimocomentariomobilizacao TEXT
);

-- fat_faturamentos (dados de faturamento)
CREATE TABLE IF NOT EXISTS fat_faturamentos (
    id SERIAL PRIMARY KEY,
    ano INTEGER,
    mes INTEGER,
    idfaturamento INTEGER,
    idcontrato INTEGER,
    contrato VARCHAR(100),
    cliente VARCHAR(500),
    tipolocacao VARCHAR(100),
    placa VARCHAR(10),
    modelo VARCHAR(200),
    dataemissao DATE,
    datavencimento DATE,
    datapagamento DATE,
    valorfaturado DECIMAL(15,2),
    valorpago DECIMAL(15,2),
    status VARCHAR(100),
    diasatraso INTEGER
);

-- fat_os (ordens de serviço / manutenção)
CREATE TABLE IF NOT EXISTS fat_os (
    id SERIAL PRIMARY KEY,
    ano INTEGER,
    idordemservico INTEGER,
    numeroos VARCHAR(50),
    placa VARCHAR(10),
    modelo VARCHAR(200),
    montadora VARCHAR(100),
    idfornecedor INTEGER,
    fornecedor VARCHAR(500),
    tipoocorrencia VARCHAR(100),
    statusos VARCHAR(100),
    datacriacao TIMESTAMP,
    dataagendamento TIMESTAMP,
    dataentrada TIMESTAMP,
    datasaida TIMESTAMP,
    dataconclusao TIMESTAMP,
    leadtimetotaldias INTEGER,
    leadtimeoficina INTEGER,
    custopecas DECIMAL(15,2),
    custoservicos DECIMAL(15,2),
    custototal DECIMAL(15,2),
    kmnaentrada INTEGER,
    descricao TEXT,
    cliente VARCHAR(500),
    idcliente INTEGER
);

-- fat_abastecimentos
CREATE TABLE IF NOT EXISTS fat_abastecimentos (
    id SERIAL PRIMARY KEY,
    ano INTEGER,
    idabastecimento INTEGER,
    placa VARCHAR(10),
    dataabastecimento DATE,
    litros DECIMAL(10,3),
    valorlitro DECIMAL(10,4),
    valortotal DECIMAL(15,2),
    km INTEGER,
    tipocombustivel VARCHAR(50),
    posto VARCHAR(200),
    cidade VARCHAR(200),

-- fat_precos_locacao: histórico de preços de contratos (origem: ContratosLocacaoPrecos)
CREATE TABLE IF NOT EXISTS fat_precos_locacao (
    id SERIAL PRIMARY KEY,
    idprecocontratolocacao INTEGER,
    idcontratolocacao INTEGER,
    precounitario DECIMAL(15,2),
    datainicial DATE,
    datafinal DATE,
    observacoes TEXT,
    -- armazenamento flexível para quaisquer colunas adicionais da origem
    raw JSONB
);

CREATE INDEX IF NOT EXISTS idx_fat_precos_locacao_idcontrato ON fat_precos_locacao(idcontratolocacao);
CREATE INDEX IF NOT EXISTS idx_fat_precos_locacao_datainicial ON fat_precos_locacao(datainicial);
    estado VARCHAR(5)
);

-- fat_multas
CREATE TABLE IF NOT EXISTS fat_multas (
    id SERIAL PRIMARY KEY,
    ano INTEGER,
    idmulta INTEGER,
    placa VARCHAR(10),
    datainfração DATE,
    valororiginal DECIMAL(15,2),
    valorfinal DECIMAL(15,2),
    pontos INTEGER,
    tipoinfracao VARCHAR(200),
    local TEXT,
    condutor VARCHAR(500),
    status VARCHAR(100),
    cliente VARCHAR(500)
);

-- fat_sinistros
CREATE TABLE IF NOT EXISTS fat_sinistros (
    id SERIAL PRIMARY KEY,
    ano INTEGER,
    idsinistro INTEGER,
    placa VARCHAR(10),
    datasinistro DATE,
    tiposinistro VARCHAR(100),
    valorestimado DECIMAL(15,2),
    valorreal DECIMAL(15,2),
    status VARCHAR(100),
    descricao TEXT,
    cliente VARCHAR(500),
    condutor VARCHAR(500)
);

-- fat_financeiro_universal (despesas e receitas consolidadas)
CREATE TABLE IF NOT EXISTS fat_financeiro_universal (
    id SERIAL PRIMARY KEY,
    ano INTEGER,
    mes INTEGER,
    tiporegistro VARCHAR(50),
    idregistro INTEGER,
    dataregistro DATE,
    datavencimento DATE,
    datapagamento DATE,
    categoria VARCHAR(200),
    subcategoria VARCHAR(200),
    descricao TEXT,
    valor DECIMAL(15,2),
    valorpago DECIMAL(15,2),
    status VARCHAR(100),
    placa VARCHAR(10),
    cliente VARCHAR(500),
    fornecedor VARCHAR(500),
    centrocusto VARCHAR(200)
);

-- rentabilidade_360_geral
CREATE TABLE IF NOT EXISTS rentabilidade_360_geral (
    id SERIAL PRIMARY KEY,
    placa VARCHAR(10),
    modelo VARCHAR(200),
    cliente VARCHAR(500),
    tipolocacao VARCHAR(100),
    idcontrato INTEGER,
    receitabruta DECIMAL(15,2),
    custototal DECIMAL(15,2),
    margem DECIMAL(15,2),
    margempct DECIMAL(10,4),
    kmrodado INTEGER,
    custoporKM DECIMAL(10,4)
);

-- fat_manutencao_unificado
CREATE TABLE IF NOT EXISTS fat_manutencao_unificado (
    id SERIAL PRIMARY KEY,
    idordemservico INTEGER,
    idocorrencia INTEGER,
    tipoevento VARCHAR(50),
    dataevento DATE,
    chegadas INTEGER,
    conclusoes INTEGER,
    placa VARCHAR(10),
    modelo VARCHAR(200),
    tipoocorrencia VARCHAR(100),
    fornecedor VARCHAR(500),
    cliente VARCHAR(500),
    custototalos DECIMAL(15,2),
    leadtimetotaldias INTEGER,
    leadtimeoficina INTEGER,
    custopecas DECIMAL(15,2),
    custoservicos DECIMAL(15,2)
);

-- ============================================================================
-- AGREGAÇÕES (tabelas pré-calculadas para performance)
-- ============================================================================

-- agg_dre_mensal (DRE mensal agregado)
CREATE TABLE IF NOT EXISTS agg_dre_mensal (
    id SERIAL PRIMARY KEY,
    ano INTEGER,
    mes INTEGER,
    receitabruta DECIMAL(18,2),
    deducoes DECIMAL(18,2),
    receitaliquida DECIMAL(18,2),
    custosoperacionais DECIMAL(18,2),
    lucrobruto DECIMAL(18,2),
    despesasadministrativas DECIMAL(18,2),
    despesascomerciais DECIMAL(18,2),
    ebitda DECIMAL(18,2),
    depreciaçao DECIMAL(18,2),
    lucrooperacional DECIMAL(18,2),
    despesasfinanceiras DECIMAL(18,2),
    lucroliquido DECIMAL(18,2),
    margem_bruta DECIMAL(10,4),
    margem_ebitda DECIMAL(10,4),
    margem_liquida DECIMAL(10,4)
);

-- agg_indicadores_frota
CREATE TABLE IF NOT EXISTS agg_indicadores_frota (
    id SERIAL PRIMARY KEY,
    data_referencia DATE,
    total_veiculos INTEGER,
    veiculos_locados INTEGER,
    veiculos_disponiveis INTEGER,
    veiculos_manutencao INTEGER,
    veiculos_vendidos INTEGER,
    taxa_ocupacao DECIMAL(10,4),
    idade_media_frota DECIMAL(10,2),
    km_medio DECIMAL(15,2),
    valor_frota DECIMAL(18,2)
);

-- agg_custos_veiculo
CREATE TABLE IF NOT EXISTS agg_custos_veiculo (
    id SERIAL PRIMARY KEY,
    placa VARCHAR(10),
    ano INTEGER,
    mes INTEGER,
    custo_manutencao DECIMAL(15,2),
    custo_combustivel DECIMAL(15,2),
    custo_multas DECIMAL(15,2),
    custo_sinistros DECIMAL(15,2),
    custo_depreciacao DECIMAL(15,2),
    custo_total DECIMAL(15,2),
    receita DECIMAL(15,2),
    margem DECIMAL(15,2)
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índices em dim_frota
CREATE INDEX IF NOT EXISTS idx_dim_frota_placa ON dim_frota(placa);
CREATE INDEX IF NOT EXISTS idx_dim_frota_status ON dim_frota(status);
CREATE INDEX IF NOT EXISTS idx_dim_frota_cliente ON dim_frota(nomecliente);

-- Índices em dim_clientes
CREATE INDEX IF NOT EXISTS idx_dim_clientes_situacao ON dim_clientes(situacao);
CREATE INDEX IF NOT EXISTS idx_dim_clientes_tipo ON dim_clientes(tipo);

-- Índices em dim_contratos_locacao
CREATE INDEX IF NOT EXISTS idx_dim_contratos_cliente ON dim_contratos_locacao(nomecliente);
CREATE INDEX IF NOT EXISTS idx_dim_contratos_status ON dim_contratos_locacao(statuslocacao);
CREATE INDEX IF NOT EXISTS idx_dim_contratos_placa ON dim_contratos_locacao(placaprincipal);

-- Índices em fat_faturamentos
CREATE INDEX IF NOT EXISTS idx_fat_faturamentos_ano_mes ON fat_faturamentos(ano, mes);
CREATE INDEX IF NOT EXISTS idx_fat_faturamentos_placa ON fat_faturamentos(placa);
CREATE INDEX IF NOT EXISTS idx_fat_faturamentos_cliente ON fat_faturamentos(cliente);

-- Índices em fat_os
CREATE INDEX IF NOT EXISTS idx_fat_os_ano ON fat_os(ano);
CREATE INDEX IF NOT EXISTS idx_fat_os_placa ON fat_os(placa);
CREATE INDEX IF NOT EXISTS idx_fat_os_fornecedor ON fat_os(fornecedor);
CREATE INDEX IF NOT EXISTS idx_fat_os_status ON fat_os(statusos);

-- Índices em fat_financeiro_universal
CREATE INDEX IF NOT EXISTS idx_fat_fin_ano_mes ON fat_financeiro_universal(ano, mes);
CREATE INDEX IF NOT EXISTS idx_fat_fin_categoria ON fat_financeiro_universal(categoria);
CREATE INDEX IF NOT EXISTS idx_fat_fin_placa ON fat_financeiro_universal(placa);

-- Índices em agg_dre_mensal
CREATE INDEX IF NOT EXISTS idx_agg_dre_ano_mes ON agg_dre_mensal(ano, mes);

-- ============================================================================
-- FINALIZAÇÃO
-- ============================================================================

-- Mensagem de confirmação (executar no psql para ver)
DO $$
BEGIN
    RAISE NOTICE '✅ Schema BluFleet BI criado com sucesso no banco de destino!';
    RAISE NOTICE '📊 Total de tabelas: 23 (Dimensões + Fatos + Agregações)';
    RAISE NOTICE '🚀 Pronto para receber dados do ETL.';
END $$;
