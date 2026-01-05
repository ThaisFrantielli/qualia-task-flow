-- ============================================================================
-- Script SQL para configurar PostgreSQL BluConecta_Dw
-- Execute com: psql -U postgres -h localhost -f setup.sql
-- ============================================================================

-- Criar banco se não existir
SELECT 'CREATE DATABASE bluconecta_dw'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bluconecta_dw')\gexec

-- Criar usuário (usar minúsculas para evitar problemas)
DO $$
BEGIN
    -- Dropar usuário se existir (para recriar limpo)
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'quality_etl_user') THEN
        DROP USER quality_etl_user;
    END IF;
    
    -- Criar novo usuário
    CREATE USER quality_etl_user WITH PASSWORD 'F4tu5xy3' CREATEDB LOGIN;
END
$$;

-- Conceder permissões no banco
GRANT ALL PRIVILEGES ON DATABASE bluconecta_dw TO quality_etl_user;

-- Mensagem de sucesso
SELECT 'Usuario quality_etl_user criado com sucesso!' as status;

-- ============================================================================
-- CONECTAR AO BANCO E DAR PERMISSÕES NO SCHEMA
-- Execute separadamente: psql -U postgres -h localhost -d bluconecta_dw -f setup2.sql
-- ============================================================================
