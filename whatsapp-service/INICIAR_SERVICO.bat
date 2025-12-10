@echo off
echo ========================================
echo  Iniciando Servico WhatsApp Quality
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando instalacao do Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, instale o Node.js em https://nodejs.org/
    pause
    exit /b 1
)

echo [2/3] Instalando dependencias...
call npm install

echo.
echo [3/3] Iniciando servico WhatsApp...
echo.
echo ========================================
echo  Servico iniciado! Aguarde o QR Code...
echo ========================================
echo.
echo Acesse: http://localhost:3005/qr-view
echo.
echo Pressione Ctrl+C para encerrar o servico
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0run-forever.ps1"
