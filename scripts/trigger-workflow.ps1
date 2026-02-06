# Script para disparar workflow do GitHub Actions via API
# Uso: .\trigger-workflow.ps1 <GITHUB_TOKEN>

param(
    [Parameter(Mandatory=$false)]
    [string]$Token = $env:GITHUB_TOKEN
)

if (-not $Token) {
    Write-Host "❌ GitHub Token não fornecido." -ForegroundColor Red
    Write-Host ""
    Write-Host "Opções:" -ForegroundColor Yellow
    Write-Host "  1. Defina variável de ambiente: `$env:GITHUB_TOKEN='seu_token'" -ForegroundColor White
    Write-Host "  2. Passe como parâmetro: .\trigger-workflow.ps1 'seu_token'" -ForegroundColor White
    Write-Host "  3. Ou acesse: https://github.com/ThaisFrantielli/qualia-task-flow/actions/workflows/sync-data.yml" -ForegroundColor White
    Write-Host "     E clique em 'Run workflow' manualmente" -ForegroundColor White
    exit 1
}

$headers = @{
    "Accept" = "application/vnd.github+json"
    "Authorization" = "Bearer $Token"
    "X-GitHub-Api-Version" = "2022-11-28"
}

$body = @{
    ref = "main"
} | ConvertTo-Json

Write-Host "🚀 Disparando workflow 'Sincronizar Dados (3x ao Dia)'..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/ThaisFrantielli/qualia-task-flow/actions/workflows/sync-data.yml/dispatches" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "✅ Workflow disparado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Acompanhe em:" -ForegroundColor Yellow
    Write-Host "   https://github.com/ThaisFrantielli/qualia-task-flow/actions" -ForegroundColor White
    
} catch {
    Write-Host "❌ Erro ao disparar workflow:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solução: Acesse manualmente" -ForegroundColor Yellow
    Write-Host "   https://github.com/ThaisFrantielli/qualia-task-flow/actions/workflows/sync-data.yml" -ForegroundColor White
    exit 1
}
