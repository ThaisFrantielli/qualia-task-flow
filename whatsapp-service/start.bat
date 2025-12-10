@echo off
REM Script de inicialização rápida do serviço WhatsApp (Windows)
REM Uso: start.bat

echo ========================================================
echo      WhatsApp Service - Inicializacao Rapida
echo ========================================================
echo.

REM Verificar se está no diretório correto
if not exist "package.json" (
    echo [ERRO] Execute este script de dentro da pasta whatsapp-service
    echo   cd whatsapp-service ^&^& start.bat
    pause
    exit /b 1
)

REM Verificar se Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js nao esta instalado
    echo   Instale o Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
node -v
echo.

REM Verificar se dependências estão instaladas
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
    echo.
)

echo Iniciando servico WhatsApp na porta 3005...
echo.
echo --------------------------------------------------------
echo.

REM Iniciar o serviço com monitoramento de reinício automático
powershell -ExecutionPolicy Bypass -File "%~dp0run-forever.ps1"
