@echo off
REM Script PowerShell para iniciar WhatsApp Service 24/7 no Windows
REM Este script garante que o serviço rode continuamente, mesmo se desligar

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "^
  'WhatsApp Service Auto-Start Script' | Write-Host -ForegroundColor Green; ^
  '';^
  'Iniciando WhatsApp com auto-reconnect...' | Write-Host;^
  '';^
  ^
  $servicePath = '%~dp0';^
  Set-Location $servicePath;^
  '';^
  ^
  'Usando arquivo: index-auto-reconnect.js' | Write-Host -ForegroundColor Yellow;^
  '';^
  ^
  while($true) { ^
    'Iniciando serviço...' | Write-Host -ForegroundColor Green;^
    node index-auto-reconnect.js;^
    '';^
    'Serviço encerrou. Reiniciando em 5 segundos...' | Write-Host -ForegroundColor Red;^
    Start-Sleep -Seconds 5;^
  }^
  "

pause
