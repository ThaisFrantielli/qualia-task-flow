$projectRef = 'apqrjkobktjcyrxhqwtm'
$url = "https://$projectRef.supabase.co/storage/v1/object/public/bi-reports/agg_rentabilidade_contratos_mensal.json?t=$(Get-Date -UFormat %s)"
Write-Host "URL: $url"

try {
  $resp = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -ErrorAction Stop
  Write-Host "HEAD Status:" $resp.StatusCode
} catch {
  Write-Host "HEAD error:" $_.Exception.Message
}

try {
  $r = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -ErrorAction Stop
  Write-Host "GET Status:" $r.StatusCode
  $content = $r.Content
  Write-Host "Length(chars):" $content.Length
  Write-Host "Primeiros 600 chars:\n" ($content.Substring(0, [math]::Min(600, $content.Length)))
  try {
    $json = $content | ConvertFrom-Json -ErrorAction Stop
    if ($json -is [System.Array]) { Write-Host "Formato: array no root (OK) - itens:" $json.Length }
    elseif ($json.data -is [System.Array]) { Write-Host "Formato: objeto com data array (OK) - data.length:" $json.data.Length }
    else { Write-Host "Formato inesperado: nem array nem { data: [] }" }
  } catch { Write-Host "JSON inválido:" $_.Exception.Message }
} catch { Write-Host "GET error:" $_.Exception.Message }
