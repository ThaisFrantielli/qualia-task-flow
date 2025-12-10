$SERVICE_URL = "http://localhost:3006"
$SERVICE_DIR = Join-Path $PSScriptRoot "..\whatsapp-service"
$SERVICE_SCRIPT = "simple-whatsapp-service.js"

Write-Host "Verificando servico WhatsApp em $SERVICE_URL..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "$SERVICE_URL/status" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "Servico WhatsApp esta rodando!" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Gray
    exit 0
} catch {
    Write-Host "Servico WhatsApp nao esta rodando" -ForegroundColor Yellow
    Write-Host ""
    
    $choice = Read-Host "Deseja iniciar o servico agora? (S/N)"
    
    if ($choice -eq "S" -or $choice -eq "s") {
        Write-Host ""
        Write-Host "Iniciando servico WhatsApp..." -ForegroundColor Cyan
        Write-Host "Diretorio: $SERVICE_DIR" -ForegroundColor Gray
        Write-Host ""
        
        if (-Not (Test-Path $SERVICE_DIR)) {
            Write-Host "Diretorio do servico nao encontrado: $SERVICE_DIR" -ForegroundColor Red
            exit 1
        }
        
        if (-Not (Test-Path "$SERVICE_DIR\node_modules")) {
            Write-Host "Instalando dependencias..." -ForegroundColor Yellow
            Push-Location $SERVICE_DIR
            npm install
            Pop-Location
        }
        
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$SERVICE_DIR'; Write-Host 'Iniciando WhatsApp Service...' -ForegroundColor Cyan; node $SERVICE_SCRIPT"
        
        Write-Host ""
        Write-Host "Servico iniciado em nova janela!" -ForegroundColor Green
        Write-Host "Aguarde alguns segundos para o servico inicializar." -ForegroundColor Gray
        Write-Host ""
        
        Start-Sleep -Seconds 5
        
        try {
            $response = Invoke-WebRequest -Uri "$SERVICE_URL/status" -Method GET -TimeoutSec 2 -ErrorAction Stop
            Write-Host "Servico verificado e funcionando!" -ForegroundColor Green
        } catch {
            Write-Host "Servico pode ainda estar inicializando. Verifique a janela do servico." -ForegroundColor Yellow
        }
    } else {
        Write-Host ""
        Write-Host "Para iniciar manualmente:" -ForegroundColor Cyan
        Write-Host "   cd whatsapp-service" -ForegroundColor Gray
        Write-Host "   node $SERVICE_SCRIPT" -ForegroundColor Gray
        Write-Host ""
    }
}
