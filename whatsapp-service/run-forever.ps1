$ScriptPath = $PSScriptRoot
Set-Location $ScriptPath

Write-Host "========================================"
Write-Host " WhatsApp Service - Always On Monitor"
Write-Host "========================================"

while ($true) {
    Write-Host "$(Get-Date): Starting WhatsApp Service..." -ForegroundColor Green
    try {
        # Run npm start and wait for it to finish (it shouldn't unless it crashes)
        # We use cmd /c to ensure npm is found and runs in the current console
        cmd /c "npm start"
    } catch {
        Write-Host "$(Get-Date): Error occurred: $_" -ForegroundColor Red
    }
    
    Write-Host "$(Get-Date): Service stopped or crashed. Restarting in 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}
