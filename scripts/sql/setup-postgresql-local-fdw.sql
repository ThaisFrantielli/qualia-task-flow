-- ============================================================
-- SCRIPT DE CONFIGURAÇÃO PostgreSQL LOCAL PARA FDW
-- ============================================================
-- Executar este script no PostgreSQL local (BluConecta_Dw)
-- ANTES de configurar o FDW no Supabase
-- ============================================================

-- ============================================================
-- PARTE 1: CRIAR USUÁRIO READ-ONLY PARA FDW
-- ============================================================

-- Criar usuário dedicado para conexões FDW
CREATE USER supabase_fdw_reader WITH PASSWORD 'SENHA_SEGURA_AQUI';

-- Comentário para documentação
COMMENT ON ROLE supabase_fdw_reader IS 'Usuário read-only para conexões FDW do Supabase - Criado em 2026-01-12';

-- ============================================================
-- PARTE 2: CONCEDER PERMISSÕES
-- ============================================================

-- Permitir conexão ao banco
GRANT CONNECT ON DATABASE bluconecta_dw TO supabase_fdw_reader;

-- Permitir uso do schema public
GRANT USAGE ON SCHEMA public TO supabase_fdw_reader;

-- Conceder SELECT em todas as tabelas existentes
GRANT SELECT ON ALL TABLES IN SCHEMA public TO supabase_fdw_reader;

-- Conceder SELECT em todas as sequences (se necessário)
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO supabase_fdw_reader;

-- Garantir que novas tabelas também tenham permissão automaticamente
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT ON TABLES TO supabase_fdw_reader;

-- ============================================================
-- PARTE 3: VERIFICAR CONFIGURAÇÃO
-- ============================================================

-- Verificar usuário criado
SELECT 
    rolname,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    rolreplication
FROM pg_roles 
WHERE rolname = 'supabase_fdw_reader';

-- Verificar permissões concedidas
SELECT 
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'supabase_fdw_reader'
ORDER BY table_name
LIMIT 20;

-- ============================================================
-- PARTE 4: TESTAR CONEXÃO LOCAL
-- ============================================================

-- Testar se o usuário consegue fazer SELECT
-- (executar como supabase_fdw_reader ou usar SET ROLE)
-- SET ROLE supabase_fdw_reader;
-- SELECT COUNT(*) FROM dim_clientes;
-- RESET ROLE;

-- ============================================================
-- CONFIGURAÇÃO ADICIONAL (ARQUIVOS DE CONFIGURAÇÃO)
-- ============================================================

/*
postgresql.conf (geralmente em C:\Program Files\PostgreSQL\16\data\):
----------------------------------------------------------------------
# Permitir conexões de qualquer IP
listen_addresses = '*'

# Porta padrão
port = 5432

# Timeout de conexão (em segundos)
authentication_timeout = 60

# Logging para debug (opcional)
log_connections = on
log_disconnections = on


pg_hba.conf (mesmo diretório):
----------------------------------------------------------------------
# Adicionar ANTES das regras existentes:

# Conexões FDW do Supabase (substituir pelo range de IPs do Supabase)
# Para produção, usar IPs específicos ao invés de 0.0.0.0/0
host    bluconecta_dw    supabase_fdw_reader    0.0.0.0/0    scram-sha-256

# Ou para IP específico (mais seguro):
# host    bluconecta_dw    supabase_fdw_reader    XXX.XXX.XXX.XXX/32    scram-sha-256


Após alterar os arquivos, reiniciar PostgreSQL:
----------------------------------------------------------------------
Windows (PowerShell como Admin):
net stop postgresql-x64-16
net start postgresql-x64-16

Ou via services.msc -> PostgreSQL -> Reiniciar
*/

-- ============================================================
-- FIREWALL (Executar no PowerShell como Admin)
-- ============================================================

/*
# Verificar se regra existe
netsh advfirewall firewall show rule name="PostgreSQL FDW"

# Criar regra permitindo porta 5432
netsh advfirewall firewall add rule name="PostgreSQL FDW" dir=in action=allow protocol=TCP localport=5432

# Para restringir a IPs específicos (mais seguro):
netsh advfirewall firewall add rule name="PostgreSQL FDW Supabase" dir=in action=allow protocol=TCP localport=5432 remoteip=XXX.XXX.XXX.XXX
*/

-- ============================================================
-- TESTAR CONECTIVIDADE EXTERNA
-- ============================================================

/*
De outra máquina/rede, testar conexão:

psql -h SEU_IP_PUBLICO -p 5432 -U supabase_fdw_reader -d bluconecta_dw

Ou via PowerShell:
Test-NetConnection -ComputerName SEU_IP_PUBLICO -Port 5432

Deve retornar: TcpTestSucceeded: True
*/

-- ============================================================
-- PARA REVOGAR ACESSO (se necessário)
-- ============================================================

/*
-- Revogar permissões
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM supabase_fdw_reader;
REVOKE USAGE ON SCHEMA public FROM supabase_fdw_reader;
REVOKE CONNECT ON DATABASE bluconecta_dw FROM supabase_fdw_reader;

-- Remover usuário
DROP USER IF EXISTS supabase_fdw_reader;
*/
