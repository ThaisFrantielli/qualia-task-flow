$conn = New-Object System.Data.SqlClient.SqlConnection
$conn.ConnectionString = "Server=200.219.192.34,3494;Database=blufleet-dw;User Id=qualidade;Password=AWJ5A95cD5fW;Encrypt=false;TrustServerCertificate=true;"
$conn.Open()

$query = @"
SELECT TOP 1 
    IdOcorrencia, 
    Ocorrencia, 
    Placa, 
    ValorOrcamento,
    ReembolsoTerceiro,
    IndenizacaoSeguradora,
    ISNULL(COALESCE(
        NULLIF(CAST(ValorOrcamento AS FLOAT), 0),
        (SELECT SUM(CAST(i.ValorTotal AS FLOAT)) 
         FROM ItensOrdemServico i WITH (NOLOCK) 
         WHERE i.IdOcorrencia = OcorrenciasSinistro.IdOcorrencia 
         AND i.ValorTotal IS NOT NULL)
    ), 0) as ValorFinaleiroCalculado
FROM OcorrenciasSinistro
WHERE Ocorrencia = 'QUAL-302894'
"@

$cmd = $conn.CreateCommand()
$cmd.CommandText = $query
$cmd.CommandTimeout = 30

try {
        Write-Host "`n=== TESTE DE QUERY QUAL-302894 ===" -ForegroundColor Green
    $reader = $cmd.ExecuteReader()
    if ($reader.Read()) {
        Write-Host "IdOcorrencia: $($reader['IdOcorrencia'])" -ForegroundColor Cyan
        Write-Host "Ocorrencia: $($reader['Ocorrencia'])" -ForegroundColor Cyan
        Write-Host "Placa: $($reader['Placa'])" -ForegroundColor Cyan
        Write-Host "`nVALORES:" -ForegroundColor Yellow
        Write-Host "  ValorOrcamento: $($reader['ValorOrcamento'])"
        Write-Host "  ReembolsoTerceiro: $($reader['ReembolsoTerceiro'])"
        Write-Host "  IndenizacaoSeguradora: $($reader['IndenizacaoSeguradora'])"
        Write-Host "`nCALCULADO:" -ForegroundColor Green
        Write-Host "  ValorFinaleiroCalculado: R$ $($reader['ValorFinaleiroCalculado'])" -ForegroundColor Green
    } else {
        Write-Host "Nenhum registro encontrado!" -ForegroundColor Red
    }
    $reader.Close()
} catch {
    Write-Host "ERRO: $_" -ForegroundColor Red
}

$conn.Close()
$conn.Dispose()
