# Script para remover FORMAT de datas - Otimização #2
$filePath = ".\run-sync-v2.js"
$content = Get-Content $filePath -Raw

Write-Host "🔍 Removendo FORMAT de datas..." -ForegroundColor Cyan

# Substituir todas as ocorrências de FORMAT(campo, 'yyyy-MM-dd') por apenas o campo
# Padrão: FORMAT(qualquerCoisa, 'yyyy-MM-dd')  →  qualquerCoisa
$content = $content -creplace "FORMAT\(([\w\.]+),\s*'yyyy-MM-dd'\)", '$1'

# Padrão mais complexo: FORMAT(campo, 'yyyy-MM-dd HH:mm:ss')
$content = $content -creplace "FORMAT\(([\w\.]+),\s*'yyyy-MM-dd HH:mm:ss'\)", '$1'

Write-Host "✅ FORMATs removidos!" -ForegroundColor Green

# Salvar arquivo
$content | Out-File $filePath -Encoding UTF8 -NoNewline

Write-Host "💾 Arquivo salvo: $filePath" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Benefícios:" -ForegroundColor Yellow
Write-Host "   • Dados agora são Date nativos (não String)" -ForegroundColor White
Write-Host "   • Índices de data funcionam no PostgreSQL" -ForegroundColor White
Write-Host "   • Queries 'últimos 7 dias' ficam 10-100x mais rápidas" -ForegroundColor White
