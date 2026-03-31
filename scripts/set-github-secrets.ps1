param()

$envFile = Join-Path $PSScriptRoot '..\.env' | Resolve-Path -ErrorAction Stop
$envFile = $envFile.ProviderPath
if (-not (Test-Path $envFile)) {
  Write-Error ".env not found at $envFile"
  exit 1
}

function Get-EnvValue($key) {
  $line = Select-String -Path $envFile -Pattern "^$key=" -SimpleMatch -Quiet:$false | Select-Object -First 1
  if (-not $line) { return $null }
  $v = $line.Line -replace "^$key=", ""
  if ($v -match '^"(.*)"$') { return $Matches[1] }
  return $v
}

$keys = @(
  'SQL_SERVER','SQL_PORT','SQL_USER','SQL_PASSWORD','SQL_DATABASE',
  'PG_POOLER_HOST','PG_POOLER_PORT','PG_POOLER_USER','PG_PASSWORD','PG_DATABASE',
  'HEAVY_PG_POOLER_HOST','HEAVY_PG_POOLER_PORT','HEAVY_PG_POOLER_USER','HEAVY_PG_PASSWORD','HEAVY_PG_DATABASE',
  'SUPABASE_SERVICE_ROLE_KEY','VITE_SUPABASE_URL'
)

Write-Host "This will set GitHub repo secrets using values from $envFile" -ForegroundColor Yellow
$confirm = Read-Host "Proceed? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') { Write-Host 'Aborted'; exit 1 }

foreach ($k in $keys) {
  $v = Get-EnvValue $k
  if ([string]::IsNullOrEmpty($v)) {
    Write-Host "Skipping $k (not set)"
    continue
  }
  Write-Host "Setting secret $k..."
  gh secret set $k --body $v
}

Write-Host "Done. Confirm secrets in repository Settings -> Secrets and variables -> Actions." -ForegroundColor Green
