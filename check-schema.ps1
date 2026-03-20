$conn = New-Object System.Data.SqlClient.SqlConnection
$conn.ConnectionString = "Server=200.219.192.34,3494;Database=blufleet-dw;User Id=qualidade;Password=AWJ5A95cD5fW;Encrypt=false;TrustServerCertificate=true;"
$conn.Open()

$query = @"
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'OcorrenciasSinistro'
ORDER BY ORDINAL_POSITION
"@

$cmd = $conn.CreateCommand()
$cmd.CommandText = $query

try {
    $reader = $cmd.ExecuteReader()
    Write-Host "COLUNAS DA TABELA OcorrenciasSinistro:" -ForegroundColor Cyan
    while ($reader.Read()) {
        Write-Host "  $($reader['COLUMN_NAME']): $($reader['DATA_TYPE'])"
    }
    $reader.Close()
} catch {
    Write-Host "ERRO: $_" -ForegroundColor Red
}

$conn.Close()
