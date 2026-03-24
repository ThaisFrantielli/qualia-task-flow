# PowerShell Script para configurar WhatsApp Service 24/7 no Windows
# Execute como Administrator
# Exemplo: powershell -ExecutionPolicy ByPass -File setup-windows-service.ps1

# Verificar se está rodando como Admin
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host "Clique com direito em PowerShell e selecione 'Executar como Administrador'" -ForegroundColor Yellow
    exit 1
}

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  WhatsApp Service Windows Setup (24/7)        ║" -ForegroundColor Green
Write-Host "║  O serviço rodará automaticamente ao iniciar  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Variáveis
$serviceName = "WhatsAppService247"
$displayName = "WhatsApp Service 24/7"
$servicePath = (Get-Location).Path
$nodeExe = "$env:ProgramFiles\nodejs\node.exe"
$scriptPath = "$servicePath\index-auto-reconnect.js"

# Verificar Node.js
Write-Host "🔍 Verificando Node.js..." -ForegroundColor Yellow
if (-not (Test-Path $nodeExe)) {
    Write-Host "❌ Node.js não encontrado em $nodeExe" -ForegroundColor Red
    Write-Host "Instale Node.js de https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Node.js encontrado" -ForegroundColor Green
Write-Host ""

# Verificar se serviço já existe
Write-Host "🔍 Verificando se serviço já existe..." -ForegroundColor Yellow
$existingService = Get-Service $serviceName -ErrorAction SilentlyContinue

if ($existingService) {
    Write-Host "⚠️  Serviço '$serviceName' já existe!" -ForegroundColor Yellow
    
    $response = Read-Host "Deseja remover e recriar? (S/N)"
    if ($response -eq "S" -or $response -eq "s") {
        Write-Host "🛑 Parando serviço..." -ForegroundColor Yellow
        Stop-Service -Name $serviceName -Force
        Start-Sleep -Seconds 2
        
        Write-Host "🗑️  Removendo serviço..." -ForegroundColor Yellow
        $sc = New-Object System.Diagnostics.ProcessStartInfo
        $sc.FileName = "sc"
        $sc.Arguments = "delete $serviceName"
        $sc.RedirectStandardOutput = $true
        $process = [System.Diagnostics.Process]::Start($sc)
        $process.WaitForExit()
    } else {
        Write-Host "❌ Operação cancelada" -ForegroundColor Red
        exit 1
    }
}

# Criar serviço Windows usando nssm (se disponível) ou SC (fallback)
Write-Host ""
Write-Host "📝 Criando serviço Windows..." -ForegroundColor Yellow
Write-Host "   Nome: $serviceName" -ForegroundColor Cyan
Write-Host "   Caminho: $scriptPath" -ForegroundColor Cyan
Write-Host ""

# Usar SC (built-in Windows) como fallback
$sc = New-Object System.Diagnostics.ProcessStartInfo
$sc.FileName = "sc"
$sc.Arguments = "create `"$serviceName`" binPath=`"$nodeExe $scriptPath`" start=auto DisplayName=`"$displayName`""
$sc.RedirectStandardOutput = $true
$sc.UseShellExecute = $false

Write-Host "Executando: sc create '$serviceName'..." -ForegroundColor Cyan
$process = [System.Diagnostics.Process]::Start($sc)
$output = $process.StandardOutput.ReadToEnd()
$process.WaitForExit()

if ($process.ExitCode -eq 0) {
    Write-Host "✅ Serviço criado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao criar serviço" -ForegroundColor Red
    Write-Host $output -ForegroundColor Red
    exit 1
}

# Configurar para iniciar automaticamente
Write-Host ""
Write-Host "⚙️  Configurando propriedades do serviço..." -ForegroundColor Yellow

$sc2 = New-Object System.Diagnostics.ProcessStartInfo
$sc2.FileName = "sc"
$sc2.Arguments = "config `"$serviceName`" start=auto"
$process2 = [System.Diagnostics.Process]::Start($sc2)
$process2.WaitForExit()

Write-Host "✅ Serviço configurado para iniciar automaticamente" -ForegroundColor Green

# Iniciar serviço
Write-Host ""
Write-Host "▶️  Iniciando serviço..." -ForegroundColor Yellow

try {
    Start-Service -Name $serviceName
    Start-Sleep -Seconds 3
    
    $service = Get-Service $serviceName
    if ($service.Status -eq "Running") {
        Write-Host "✅ Serviço está rodando!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Serviço criado mas não iniciou" -ForegroundColor Yellow
        Write-Host "Verifique logs de erro do Windows Event Viewer" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erro ao iniciar: $_" -ForegroundColor Red
}

# Resumo final
Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ INSTALAÇÃO CONCLUÍDA!                      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos Passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Abra o navegador:"
Write-Host "   👉 http://localhost:3005" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Crie uma nova instância e escaneie o QR code"
Write-Host ""
Write-Host "3. Seu WhatsApp agora rodará 24/7 sem interferência!"
Write-Host ""
Write-Host "📊 Monitorar Status:" -ForegroundColor Cyan
Write-Host "   👉 http://localhost:3005/status" -ForegroundColor Yellow
Write-Host ""
Write-Host "🛑 Gerenciar Serviço:" -ForegroundColor Cyan
Write-Host "   Parar:     net stop $serviceName" -ForegroundColor Cyan
Write-Host "   Iniciar:   net start $serviceName" -ForegroundColor Cyan
Write-Host "   Remover:   sc delete $serviceName" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Ver Logs do Sistema:" -ForegroundColor Cyan
Write-Host "   👉 Abra Event Viewer (eventvwr.msc)" -ForegroundColor Yellow
Write-Host "      → Windows Logs → Application" -ForegroundColor Yellow
Write-Host ""

# Verificação final
Write-Host "🔍 Verificação de Status..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3005/status" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Serviço respondendo normalmente!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Serviço respondendo, mas com status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Serviço pode estar iniciando. Tente novamente em 10s" -ForegroundColor Yellow
    Write-Host "   Comando: curl http://localhost:3005/status" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
