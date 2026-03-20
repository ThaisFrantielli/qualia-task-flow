$uri = 'http://localhost:8081/api/bi-data-batch?tables=fat_sinistros'
$data = Invoke-RestMethod -Method Get -Uri $uri
$sin = $data.results.fat_sinistros.data | Where-Object { $_.Ocorrencia -eq 'QUAL-302894' } | Select-Object -First 1

Write-Host "VALIDAÇÃO QUAL-302894:" -ForegroundColor Green
Write-Host "IdOcorrencia: $($sin.IdOcorrencia)"
Write-Host "Ocorrencia: $($sin.Ocorrencia)"
Write-Host "Placa: $($sin.Placa)"
Write-Host "Fornecedor: $($sin.Fornecedor)"
Write-Host "Motivo: $($sin.Motivo)"
Write-Host "ValorOrcamento: $($sin.ValorOrcamento)"
Write-Host "ValorSinistro: $($sin.ValorSinistro)"
Write-Host "ValorFinaleiroCalculado: $($sin.ValorFinaleiroCalculado)"
Write-Host "`n"

# Verificar itens associados
$uri_itens = 'http://localhost:8081/api/bi-data-batch?tables=fat_itens_ordem_servico&limit=100000'
$data_itens = Invoke-RestMethod -Method Get -Uri $uri_itens
$itens = $data_itens.results.fat_itens_ordem_servico.data | Where-Object { [string]$_.IdOcorrencia -eq '2058653' }
$somaItens = ($itens | Measure-Object -Property ValorTotal -Sum).Sum

Write-Host "ITENS DE OS ASSOCIADOS:" -ForegroundColor Green
Write-Host "Quantidade de itens: $($itens.Count)"
Write-Host "Soma de ValorTotal dos itens: $somaItens"
Write-Host "`n"

# Exibir detalhes dos itens
Write-Host "DETALHES DOS ITENS:" -ForegroundColor Green
$itens | Select-Object -First 10 IdOcorrencia, OrdemServico, Descricao, ValorTotal, ValorReembolsavel, Fornecedor | Format-Table -AutoSize | Out-String
