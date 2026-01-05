-- ============================================================================
-- Script SQL parte 2 - Permissões no schema public
-- Execute com: psql -U postgres -h localhost -d bluconecta_dw -f setup2.sql
-- ============================================================================

GRANT ALL ON SCHEMA public TO quality_etl_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO quality_etl_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO quality_etl_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO quality_etl_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO quality_etl_user;

SELECT 'Permissoes concedidas com sucesso!' as status;
