# ==============================================================================
# Script de Configuracao do PostgreSQL para ETL BluConecta_Dw
# ==============================================================================

Write-Host ""
Write-Host "================================================================================"
Write-Host "CONFIGURACAO DO POSTGRESQL - BluConecta_Dw"
Write-Host "================================================================================"
Write-Host ""

# ==============================================================================
# 1. Verificar servico PostgreSQL
# ==============================================================================
Write-Host "1. Verificando servico PostgreSQL..." -ForegroundColor Cyan

$pgService = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Running' }

if ($pgService) {
    Write-Host "   [OK] PostgreSQL rodando: $($pgService.Name)" -ForegroundColor Green
} else {
    Write-Host "   [ERRO] PostgreSQL nao esta rodando!" -ForegroundColor Red
    Write-Host "   Tentando iniciar..." -ForegroundColor Yellow
    
    $allPgServices = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue
    if ($allPgServices) {
        $serviceName = $allPgServices[0].Name
        Start-Service $serviceName -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        
        $check = Get-Service $serviceName
        if ($check.Status -eq 'Running') {
            Write-Host "   [OK] Servico iniciado!" -ForegroundColor Green
        } else {
            Write-Host "   [ERRO] Execute: Start-Service $serviceName" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "   [ERRO] PostgreSQL nao encontrado!" -ForegroundColor Red
        exit 1
    }
}

# ==============================================================================
# 2. Localizar psql.exe
# ==============================================================================
Write-Host ""
Write-Host "2. Localizando psql.exe..." -ForegroundColor Cyan

$pgPaths = @(
    "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe",
    "C:\Program Files\PostgreSQL\13\bin\psql.exe"
)

$psqlPath = $null
foreach ($path in $pgPaths) {
    if (Test-Path $path) {
        $psqlPath = $path
        Write-Host "   [OK] Encontrado: $path" -ForegroundColor Green
        break
    }
}

if (-not $psqlPath) {
    Write-Host "   [ERRO] psql.exe nao encontrado!" -ForegroundColor Red
    exit 1
}

# ==============================================================================
# 3. Criar script SQL temporario
# ==============================================================================
Write-Host ""
Write-Host "3. Criando script de configuracao..." -ForegroundColor Cyan

$sqlScript = @"
-- Criar banco bluconecta_dw se nao existir
SELECT 'CREATE DATABASE bluconecta_dw' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bluconecta_dw')\gexec

-- Criar usuario quality_etl_user se nao existir  
DO `$`$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'quality_etl_user') THEN
        CREATE USER quality_etl_user WITH PASSWORD 'F4tu5xy3' CREATEDB;
    ELSE
        ALTER USER quality_etl_user WITH PASSWORD 'F4tu5xy3';
    END IF;
END
`$`$;

-- Conceder permissoes
GRANT ALL PRIVILEGES ON DATABASE bluconecta_dw TO quality_etl_user;

-- Conectar ao banco e dar permissoes no schema
\c bluconecta_dw

GRANT ALL ON SCHEMA public TO quality_etl_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO quality_etl_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO quality_etl_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO quality_etl_user;

-- Testar
SELECT 'Configuracao concluida com sucesso!' as status;
"@

$tempSqlFile = "$env:TEMP\setup_pg.sql"
$sqlScript | Out-File -FilePath $tempSqlFile -Encoding UTF8

Write-Host "   [OK] Script criado: $tempSqlFile" -ForegroundColor Green

# ==============================================================================
# 4. Executar script
# ==============================================================================
Write-Host ""
Write-Host "4. Executando configuracao..." -ForegroundColor Cyan
Write-Host "   Digite a senha do usuario 'postgres' quando solicitado" -ForegroundColor Yellow
Write-Host ""

if (-not $env:PGPASSWORD) {
    $securePass = Read-Host "   Senha do usuario postgres" -AsSecureString
    $plainPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass))
    $env:PGPASSWORD = $plainPass
} else {
    Write-Host "   Usando PG_PASSWORD já definido nas variáveis de ambiente" -ForegroundColor Cyan
}

$result = & $psqlPath -U postgres -h localhost -p 5432 -d postgres -f $tempSqlFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "   [OK] Configuracao executada com sucesso!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "   [ERRO] Falha na execucao:" -ForegroundColor Red
    Write-Host "   $result" -ForegroundColor Red
    Remove-Item $tempSqlFile -ErrorAction SilentlyContinue
    exit 1
}

# ==============================================================================
# 5. Testar conexao com novo usuario
# ==============================================================================
Write-Host ""
Write-Host "5. Testando conexao com 'quality_etl_user'..." -ForegroundColor Cyan

$env:PGPASSWORD = "F4tu5xy3"
$testResult = & $psqlPath -U quality_etl_user -h localhost -p 5432 -d bluconecta_dw -c "SELECT current_database(), current_user;" 2>&1
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Conexao bem-sucedida!" -ForegroundColor Green
} else {
    Write-Host "   [ERRO] Falha na conexao!" -ForegroundColor Red
    Write-Host "   $testResult" -ForegroundColor Red
}

# Limpar arquivo temporario
Remove-Item $tempSqlFile -ErrorAction SilentlyContinue

# ==============================================================================
# RESUMO
# ==============================================================================
Write-Host ""
Write-Host "================================================================================"
Write-Host "CONFIGURACAO CONCLUIDA!"
Write-Host "================================================================================"
Write-Host ""
Write-Host "Banco: bluconecta_dw" -ForegroundColor White
Write-Host "Usuario: quality_etl_user" -ForegroundColor White  
Write-Host "Senha: F4tu5xy3" -ForegroundColor White
Write-Host "Host: localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "Proximo passo: node verify-config.js" -ForegroundColor Yellow
Write-Host "================================================================================"
Write-Host ""
