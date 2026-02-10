param([switch]$Install, [switch]$Uninstall, [switch]$Status)

$TaskBaseName = "BluConecta-ETL"
$ScriptDir = $PSScriptRoot
$ETLScript = Join-Path $ScriptDir "run-sync-v2.js"

if ($Install) {
    Write-Host " Instalando tarefas agendadas..." -ForegroundColor Yellow
    
    # Tarefa 00:30
    $Action1 = New-ScheduledTaskAction -Execute "node.exe" -Argument "`"$ETLScript`"" -WorkingDirectory $ScriptDir
    $Trigger1 = New-ScheduledTaskTrigger -Daily -At "00:30"
    $Settings1 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName "$TaskBaseName-0030" -Action $Action1 -Trigger $Trigger1 -Settings $Settings1 -Force
    Write-Host " Tarefa 00:30 criada" -ForegroundColor Green
    
    # Tarefa 10:30
    $Action2 = New-ScheduledTaskAction -Execute "node.exe" -Argument "`"$ETLScript`"" -WorkingDirectory $ScriptDir
    $Trigger2 = New-ScheduledTaskTrigger -Daily -At "10:30"
    $Settings2 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName "$TaskBaseName-1030" -Action $Action2 -Trigger $Trigger2 -Settings $Settings2 -Force
    Write-Host " Tarefa 10:30 criada" -ForegroundColor Green
    
    # Tarefa 15:30
    $Action3 = New-ScheduledTaskAction -Execute "node.exe" -Argument "`"$ETLScript`"" -WorkingDirectory $ScriptDir
    $Trigger3 = New-ScheduledTaskTrigger -Daily -At "15:30"
    $Settings3 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName "$TaskBaseName-1530" -Action $Action3 -Trigger $Trigger3 -Settings $Settings3 -Force
    Write-Host " Tarefa 15:30 criada" -ForegroundColor Green
    
    Write-Host "`n Agendamento configurado com sucesso!" -ForegroundColor Green
}
elseif ($Uninstall) {
    Write-Host "  Removendo tarefas..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName "$TaskBaseName-0030" -Confirm:$false -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName "$TaskBaseName-1030" -Confirm:$false -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName "$TaskBaseName-1530" -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host " Tarefas removidas" -ForegroundColor Green
}
elseif ($Status) {
    Write-Host "`n Status das Tarefas:`n" -ForegroundColor Cyan
    Get-ScheduledTask -TaskName "$TaskBaseName-*" -ErrorAction SilentlyContinue | ForEach-Object {
        $info = Get-ScheduledTaskInfo -TaskName $_.TaskName
        Write-Host " $($_.TaskName)" -ForegroundColor Green
        Write-Host "   Estado: $($_.State)" -ForegroundColor Gray
        Write-Host "   Última execução: $($info.LastRunTime)" -ForegroundColor Gray
        Write-Host "   Próxima execução: $($info.NextRunTime)" -ForegroundColor Gray
        Write-Host ""
    }
}
else {
    Write-Host "`nUso:" -ForegroundColor Yellow
    Write-Host "  .\schedule-etl.ps1 -Install     # Instalar agendamento"
    Write-Host "  .\schedule-etl.ps1 -Status      # Ver status"
    Write-Host "  .\schedule-etl.ps1 -Uninstall   # Remover agendamento"
}
