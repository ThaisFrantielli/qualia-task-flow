-- ============================================================
-- SCRIPT DE CONFIGURAÇÃO FDW - Supabase → PostgreSQL Local
-- ============================================================
-- Executar este script no SQL Editor do Supabase
-- APÓS configurar o PostgreSQL local para aceitar conexões externas
-- ============================================================

-- ============================================================
-- PARTE 1: CRIAR EXTENSÃO E SERVIDOR FDW
-- ============================================================

-- Habilitar extensão Foreign Data Wrapper
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Criar servidor apontando para PostgreSQL local
-- IMPORTANTE: Substituir SEU_IP_PUBLICO pela IP/hostname real
CREATE SERVER bluconecta_dw_server
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host 'SEU_IP_PUBLICO',          -- Ex: '200.219.192.34' ou 'bluconecta.dyndns.org'
    port '5432',
    dbname 'bluconecta_dw',
    fetch_size '50000',             -- Otimização para queries grandes
    connect_timeout '30'            -- Timeout de conexão em segundos
);

-- ============================================================
-- PARTE 2: CRIAR USER MAPPINGS
-- ============================================================

-- Mapear usuário postgres (para migrations e admin)
CREATE USER MAPPING FOR postgres
SERVER bluconecta_dw_server
OPTIONS (
    user 'supabase_fdw_reader',
    password 'SENHA_SEGURA_AQUI'    -- Substituir pela senha real
);

-- Mapear usuário authenticated (para usuários logados)
CREATE USER MAPPING FOR authenticated
SERVER bluconecta_dw_server
OPTIONS (
    user 'supabase_fdw_reader',
    password 'SENHA_SEGURA_AQUI'    -- Substituir pela senha real
);

-- Mapear usuário anon (para acesso público)
CREATE USER MAPPING FOR anon
SERVER bluconecta_dw_server
OPTIONS (
    user 'supabase_fdw_reader',
    password 'SENHA_SEGURA_AQUI'    -- Substituir pela senha real
);

-- Mapear service_role (para edge functions)
CREATE USER MAPPING FOR service_role
SERVER bluconecta_dw_server
OPTIONS (
    user 'supabase_fdw_reader',
    password 'SENHA_SEGURA_AQUI'    -- Substituir pela senha real
);

-- ============================================================
-- PARTE 3: IMPORTAR FOREIGN TABLES
-- ============================================================

-- Importar tabelas de dimensão
IMPORT FOREIGN SCHEMA public
LIMIT TO (
    dim_clientes,
    dim_frota,
    dim_condutores,
    dim_fornecedores,
    dim_contratos_locacao,
    dim_itens_contrato,
    dim_regras_contrato,
    dim_veiculos_acessorios
)
FROM SERVER bluconecta_dw_server
INTO public;

-- Importar tabelas de fato
IMPORT FOREIGN SCHEMA public
LIMIT TO (
    fat_faturamentos,
    fat_detalhe_itens_os,
    fat_ocorrencias_master,
    fat_financeiro_universal,
    fat_manutencao_unificado,
    fat_manutencao_completa
)
FROM SERVER bluconecta_dw_server
INTO public;

-- Importar tabelas agregadas
IMPORT FOREIGN SCHEMA public
LIMIT TO (
    agg_dre_mensal,
    fat_churn,
    fat_inadimplencia,
    hist_vida_veiculo_timeline
)
FROM SERVER bluconecta_dw_server
INTO public;

-- ============================================================
-- PARTE 4: VERIFICAR IMPORTAÇÃO
-- ============================================================

-- Listar todas as foreign tables criadas
SELECT 
    foreign_table_schema,
    foreign_table_name,
    foreign_server_name
FROM information_schema.foreign_tables
ORDER BY foreign_table_name;

-- ============================================================
-- PARTE 5: TESTAR CONECTIVIDADE
-- ============================================================

-- Teste simples de contagem
SELECT 'dim_clientes' AS tabela, COUNT(*) AS registros FROM dim_clientes
UNION ALL
SELECT 'dim_frota', COUNT(*) FROM dim_frota
UNION ALL
SELECT 'fat_faturamentos', COUNT(*) FROM fat_faturamentos;

-- ============================================================
-- PARTE 6: CRIAR VIEWS UNIFICADAS (OPCIONAL)
-- ============================================================

-- View combinando dados do Supabase com dados via FDW
/*
CREATE OR REPLACE VIEW v_clientes_360 AS
SELECT 
    -- Dados operacionais do Supabase
    c.id AS supabase_id,
    c.stage_id,
    c.ultimo_atendente_id,
    c.status_triagem,
    
    -- Dados do BI via FDW
    bi.codigo_cliente,
    bi.razao_social,
    bi.nome_fantasia,
    bi.cpf_cnpj,
    bi.cidade,
    bi.estado,
    bi.situacao
FROM dim_clientes bi
LEFT JOIN clientes c ON c.codigo_cliente = bi.codigo_cliente::text;

GRANT SELECT ON v_clientes_360 TO authenticated;
GRANT SELECT ON v_clientes_360 TO anon;
*/

-- ============================================================
-- TROUBLESHOOTING
-- ============================================================

/*
ERRO: "could not connect to server"
- Verificar firewall do PostgreSQL local
- Verificar pg_hba.conf permite conexão do IP do Supabase
- Testar conectividade com: telnet SEU_IP 5432

ERRO: "password authentication failed"
- Verificar senha no USER MAPPING
- Verificar método de auth no pg_hba.conf (usar scram-sha-256)

ERRO: "permission denied for table X"
- Executar GRANT SELECT no PostgreSQL local:
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO supabase_fdw_reader;

ERRO: "relation X does not exist"
- Tabela não existe no PostgreSQL local
- Executar ETL (run-sync-v2.js) para criar tabelas
*/

-- ============================================================
-- PARA REMOVER FDW (se necessário reverter)
-- ============================================================

/*
-- Remover foreign tables
DROP FOREIGN TABLE IF EXISTS dim_clientes CASCADE;
DROP FOREIGN TABLE IF EXISTS dim_frota CASCADE;
-- ... repetir para cada tabela

-- Remover user mappings
DROP USER MAPPING IF EXISTS FOR postgres SERVER bluconecta_dw_server;
DROP USER MAPPING IF EXISTS FOR authenticated SERVER bluconecta_dw_server;
DROP USER MAPPING IF EXISTS FOR anon SERVER bluconecta_dw_server;
DROP USER MAPPING IF EXISTS FOR service_role SERVER bluconecta_dw_server;

-- Remover servidor
DROP SERVER IF EXISTS bluconecta_dw_server CASCADE;

-- Remover extensão (cuidado: remove TODOS os FDWs)
-- DROP EXTENSION IF EXISTS postgres_fdw;
*/
