param(
    [string]$EnvFile = ".env",
    [string]$Repo = ""
)

$ErrorActionPreference = "Stop"

function Resolve-GhPath {
    $cmd = Get-Command gh -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $defaultPath = "C:\Program Files\GitHub CLI\gh.exe"
    if (Test-Path $defaultPath) {
        return $defaultPath
    }

    throw "GitHub CLI nao encontrado. Instale com: winget install --id GitHub.cli -e"
}

function ConvertFrom-DotEnv {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw "Arquivo de ambiente nao encontrado: $Path"
    }

    $map = @{}
    Get-Content -Path $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line) { return }
        if ($line.StartsWith("#")) { return }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { return }

        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()

        if ($val.StartsWith('"') -and $val.EndsWith('"') -and $val.Length -ge 2) {
            $val = $val.Substring(1, $val.Length - 2)
        }

        $map[$key] = $val
    }

    return $map
}

function Resolve-Repo {
    param([string]$InputRepo)

    if ($InputRepo) {
        return $InputRepo
    }

    $origin = git remote get-url origin 2>$null
    if (-not $origin) {
        throw "Nao foi possivel detectar o remote origin. Use -Repo owner/repo."
    }

    if ($origin -match "github.com[:/](?<slug>[^/]+/[^/.]+)(\.git)?$") {
        return $Matches["slug"]
    }

    throw "Remote origin nao parece ser um repositorio GitHub: $origin"
}

$ghExe = Resolve-GhPath

$null = & $ghExe --version

$authOk = $true
try {
    $null = & $ghExe auth status 2>$null
} catch {
    $authOk = $false
}

if (-not $authOk) {
    throw "GitHub CLI nao autenticado. Rode: gh auth login"
}

$repoSlug = Resolve-Repo -InputRepo $Repo
$envMap = ConvertFrom-DotEnv -Path $EnvFile

# Secrets exigidos pelo workflow .github/workflows/db-sync.yml
$requiredSecrets = @(
    "SQL_SERVER",
    "SQL_USER",
    "SQL_PASSWORD",
    "SQL_DATABASE",
    "SQL_PORT",
    "PG_POOLER_HOST",
    "PG_POOLER_PORT",
    "PG_POOLER_USER",
    "PG_PASSWORD",
    "PG_DATABASE",
    "HEAVY_PG_POOLER_HOST",
    "HEAVY_PG_POOLER_PORT",
    "HEAVY_PG_POOLER_USER",
    "HEAVY_PG_PASSWORD",
    "HEAVY_PG_DATABASE"
)

$missing = @()
foreach ($name in $requiredSecrets) {
    if (-not $envMap.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($envMap[$name])) {
        $missing += $name
    }
}

if ($missing.Count -gt 0) {
    throw "Variaveis ausentes no ${EnvFile}: $($missing -join ', ')"
}

Write-Host "Repositorio alvo: $repoSlug"
Write-Host "Aplicando $($requiredSecrets.Count) secrets..."

foreach ($name in $requiredSecrets) {
    $value = $envMap[$name]
    $value | & $ghExe secret set $name --repo $repoSlug
    Write-Host "OK: $name"
}

Write-Host "Concluido. Secrets atualizados com sucesso."