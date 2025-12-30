# ETL V2 - Queries SQL Completas para run-sync.js

Este documento contém todas as queries SQL que devem ser adicionadas ao seu `run-sync.js` para alinhar os dados do ETL com os dashboards do sistema BI.

---

## 📋 RESUMO DE ARQUIVOS A GERAR

### Dimensões (DIMENSIONS array)
| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `dim_clientes.json` | ✅ Existente | Cadastro de clientes |
| `dim_condutores.json` | ✅ Existente | Cadastro de condutores |
| `dim_fornecedores.json` | ✅ Existente | Cadastro de fornecedores |
| `dim_frota.json` | ✅ Existente | Frota ativa |
| `dim_veiculos_acessorios.json` | ✅ Existente | Acessórios dos veículos |
| `dim_contratos_locacao.json` | ✅ Existente | Contratos de locação |
| `dim_itens_contrato.json` | ✅ Existente | Itens dos contratos |
| `dim_regras_contrato.json` | ✅ Existente | Regras contratuais |
| `dim_contratos.json` | 🆕 NOVO | Contratos consolidados (usado pelo ExecutiveDashboard) |
| `dim_compras.json` | 🆕 NOVO | Compras de veículos (usado pelo PurchasesDashboard) |
| `dim_alienacoes.json` | 🆕 NOVO | Alienações/Financiamentos (usado pelo PurchasesDashboard) |

### Fatos Não-Anuais (CONSOLIDATED array)
| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `fat_historico_mobilizacao.json` | ✅ Existente | Histórico de mobilização |
| `rentabilidade_360_geral.json` | ✅ Existente | Rentabilidade geral |
| `hist_vida_veiculo_timeline.json` | ✅ Existente | Timeline de eventos |
| `fat_churn.json` | 🆕 NOVO | Contratos cancelados (ChurnDashboard) |
| `fat_inadimplencia.json` | 🆕 NOVO | Aging de recebíveis (FinancialDashboard) |
| `agg_dre_mensal.json` | 🆕 NOVO | DRE mensal (FinancialDashboard) |
| `auditoria_consolidada.json` | 🆕 NOVO | Erros de dados (DataAudit) |
| `fat_carro_reserva.json` | 🆕 NOVO | Veículos reserva (FleetDashboard) |
| `fat_manutencao_unificado.json` | 🆕 NOVO | Eventos chegada/saída (MaintenanceDashboard) |
| `fat_manutencao_completa.json` | 🆕 NOVO | OS completa com cliente (MaintenanceDashboard) |
| `hist_vida_veiculo.json` | 🆕 NOVO | Timeline completa (FleetDashboard) |

### Fatos Anuais (YEARLY_FACTS - dentro de runYearlySync)
| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `fat_faturamentos_YYYY.json` | ✅ Existente | Faturamento por ano |
| `fat_detalhe_itens_os_YYYY.json` | ✅ Existente | Itens de OS |
| `fat_ocorrencias_master_YYYY.json` | ✅ Existente | Ocorrências unificadas |
| `fat_financeiro_universal_YYYY_MM.json` | ✅ Existente | Lançamentos financeiros |
| `fat_manutencao_os_YYYY.json` | 🆕 NOVO | OS de manutenção (MaintenanceDashboard) |
| `fat_vendas_YYYY.json` | 🆕 NOVO | Vendas de veículos (SalesDashboard) |
| `fat_compras_YYYY.json` | 🆕 NOVO | Compras anuais (PurchasesDashboard) |
| `fat_propostas_YYYY.json` | 🆕 NOVO | Propostas comerciais (CommercialDashboard) |
| `fat_sinistros_YYYY.json` | 🆕 NOVO | Sinistros por ano (MaintenanceDashboard) |
| `fat_faturamento_YYYY.json` | 🆕 RENOMEAR | Padronizar nome (sem 's') |

---

## 🔧 QUERIES SQL PARA ADICIONAR

### 1. NOVAS DIMENSÕES (adicionar ao array DIMENSIONS)

```javascript
// ============================================
// dim_contratos.json - Contratos Consolidados
// ============================================
{
    filename: 'dim_contratos.json',
    query: `
        SELECT 
            cc.IdContratoComercial as Id,
            cc.NumeroDocumentoPersonalizado as NumeroContrato,
            cc.NomeCliente as Cliente,
            cc.SituacaoContrato as Status,
            cc.TipoLocacao,
            cc.NomePromotor as Vendedor,
            FORMAT(cc.DataInicio, 'yyyy-MM-dd') as DataInicio,
            FORMAT(cc.DataFim, 'yyyy-MM-dd') as DataFim,
            cc.PrazoContrato as PrazoMeses,
            ${castM('cc.ValorMensal')} as ValorMensal,
            COUNT(cl.IdContratoLocacao) as QtdLocacoes,
            SUM(${castM('cl.ValorMensal')}) as ValorMensalTotal
        FROM ContratosComerciais cc
        LEFT JOIN ContratosLocacao cl ON cl.IdContrato = cc.IdContratoComercial
        GROUP BY cc.IdContratoComercial, cc.NumeroDocumentoPersonalizado, 
                 cc.NomeCliente, cc.SituacaoContrato, cc.TipoLocacao,
                 cc.NomePromotor, cc.DataInicio, cc.DataFim, cc.PrazoContrato, cc.ValorMensal`
},

// ============================================
// dim_compras.json - Compras de Veículos (Master)
// ============================================
{
    filename: 'dim_compras.json',
    query: `
        SELECT 
            v.IdVeiculo,
            v.Placa,
            v.Chassi,
            v.Modelo,
            v.Montadora,
            v.AnoFabricacao,
            v.AnoModelo,
            v.Cor,
            v.Filial,
            v.FornecedorCompra as Fornecedor,
            FORMAT(v.DataCompra, 'yyyy-MM-dd') as DataCompra,
            ${castM('v.ValorCompra')} as ValorCompra,
            ${castM('v.ValorAtualFIPE')} as ValorFipeAtual,
            ${castM('v.ValorAcessorios')} as ValorAcessorios,
            v.SituacaoVeiculo as Status,
            al.Instituicao as Banco,
            ${castM('al.ValorFinanciado')} as ValorFinanciado,
            al.QuantidadeParcelas as TotalParcelas,
            ${castM('al.ValorParcela')} as ValorParcela
        FROM Veiculos v
        LEFT JOIN Alienacoes al ON v.Placa = al.Placa AND al.Situacao = 'Ativa'
        WHERE v.DataCompra IS NOT NULL
          AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'`
},

// ============================================
// dim_alienacoes.json - Financiamentos/Alienações
// ============================================
{
    filename: 'dim_alienacoes.json',
    query: `
        SELECT 
            a.IdAlienacao,
            a.NumeroContrato,
            a.Placa,
            a.Instituicao as Banco,
            a.Situacao,
            FORMAT(a.Inicio, 'yyyy-MM-dd') as DataInicio,
            FORMAT(a.Termino, 'yyyy-MM-dd') as DataQuitacao,
            FORMAT(a.VencimentoPrimeiraParcela, 'yyyy-MM-dd') as DataPrimeiroVencimento,
            a.QuantidadeParcelas as TotalParcelas,
            ${castM('a.ValorParcela')} as ValorParcela,
            ${castM('a.ValorFinanciado')} as ValorFinanciado,
            ${castM('a.SaldoDevedor')} as SaldoDevedor,
            a.QuantidadeParcelasRestantes as QuantidadeParcelasRemanescentes
        FROM Alienacoes a`
}
```

### 2. NOVAS CONSOLIDAÇÕES (adicionar ao array CONSOLIDATED)

```javascript
// ============================================
// fat_churn.json - Contratos Cancelados/Encerrados
// ============================================
{
    filename: 'fat_churn.json',
    query: `
        SELECT 
            cc.IdContratoComercial,
            cc.NumeroDocumentoPersonalizado as Contrato,
            cc.NomeCliente as Cliente,
            cc.SituacaoContrato as Status,
            cc.MotivoEncerramento,
            FORMAT(cc.DataEncerramento, 'yyyy-MM-dd') as DataEncerramento,
            FORMAT(cc.DataInicio, 'yyyy-MM-dd') as DataInicio,
            DATEDIFF(MONTH, cc.DataInicio, COALESCE(cc.DataEncerramento, GETDATE())) as DuracaoMeses,
            ${castM('cc.ValorMensal')} as ValorMensal,
            cl.PlacaPrincipal as Placa
        FROM ContratosComerciais cc
        LEFT JOIN ContratosLocacao cl ON cc.IdContratoComercial = cl.IdContrato
        WHERE cc.SituacaoContrato IN ('Encerrado', 'Cancelado', 'Finalizado', 'Rescindido')`
},

// ============================================
// fat_inadimplencia.json - Aging de Recebíveis
// ============================================
{
    filename: 'fat_inadimplencia.json',
    query: `
        SELECT 
            f.IdNota,
            f.Cliente,
            f.Nota as NumeroNota,
            ${castM('f.ValorTotal')} as SaldoDevedor,
            FORMAT(f.Vencimento, 'yyyy-MM-dd') as Vencimento,
            DATEDIFF(DAY, f.Vencimento, GETDATE()) as DiasAtraso,
            CASE 
                WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 0 THEN 'A Vencer'
                WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 30 THEN '1-30 dias'
                WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 60 THEN '31-60 dias'
                WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 90 THEN '61-90 dias'
                ELSE '+90 dias'
            END as FaixaAging
        FROM Faturamentos f
        WHERE f.SituacaoNota IN ('Pendente', 'Em Aberto', 'Atrasado')
          AND f.ValorTotal > 0`
},

// ============================================
// agg_dre_mensal.json - DRE Agregado Mensal
// ============================================
{
    filename: 'agg_dre_mensal.json',
    query: `
        SELECT 
            FORMAT(DataCompetencia, 'yyyy-MM') as Competencia,
            Natureza,
            SUM(CASE WHEN TipoLancamento = 'Receita' OR Natureza LIKE '%Receita%' THEN ${castM('ValorPagoRecebido')} ELSE 0 END) as Receita,
            SUM(CASE WHEN TipoLancamento = 'Despesa' OR Natureza LIKE '%Despesa%' OR Natureza LIKE '%Custo%' THEN ${castM('ValorPagoRecebido')} ELSE 0 END) as Despesa
        FROM LancamentosComNaturezas
        WHERE DataCompetencia >= DATEADD(YEAR, -3, GETDATE())
        GROUP BY FORMAT(DataCompetencia, 'yyyy-MM'), Natureza
        ORDER BY Competencia`
},

// ============================================
// auditoria_consolidada.json - Erros de Dados
// ============================================
{
    filename: 'auditoria_consolidada.json',
    query: `
        -- Erros de Frota
        SELECT 'Frota' as Area, v.Placa, v.Modelo, 
               'Valor de compra não informado' as Erro,
               'Alta' as Gravidade,
               'Atualizar cadastro do veículo' as Recomendacao
        FROM Veiculos v
        WHERE (v.ValorCompra IS NULL OR v.ValorCompra = 0)
          AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'
        
        UNION ALL
        
        SELECT 'Frota', v.Placa, v.Modelo,
               'Data de compra não informada',
               'Alta',
               'Verificar NF de aquisição'
        FROM Veiculos v
        WHERE v.DataCompra IS NULL
          AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'
        
        UNION ALL
        
        SELECT 'Frota', v.Placa, v.Modelo,
               'Odômetro não confirmado',
               'Média',
               'Confirmar KM atual do veículo'
        FROM Veiculos v
        WHERE v.OdometroConfirmado IS NULL
          AND v.SituacaoVeiculo = 'Locado'
        
        UNION ALL
        
        -- Erros Comerciais
        SELECT 'Comercial', cc.NumeroDocumentoPersonalizado, cc.NomeCliente,
               'Contrato ativo sem veículos vinculados',
               'Alta',
               'Verificar locações do contrato'
        FROM ContratosComerciais cc
        LEFT JOIN ContratosLocacao cl ON cc.IdContratoComercial = cl.IdContrato
        WHERE cl.IdContratoLocacao IS NULL 
          AND cc.SituacaoContrato = 'Ativo'
        
        UNION ALL
        
        -- Erros de Manutenção
        SELECT 'Manutenção', os.OrdemServico, os.Placa,
               'OS aberta há mais de 30 dias',
               'Média',
               'Verificar status da manutenção'
        FROM OrdensServico os
        WHERE os.SituacaoOrdemServico IN ('Aberta', 'Em Andamento')
          AND DATEDIFF(DAY, os.DataInicioServico, GETDATE()) > 30
        
        UNION ALL
        
        -- Erros de Compras
        SELECT 'Compras', v.Placa, v.Modelo,
               'Veículo sem FIPE cadastrada',
               'Média',
               'Atualizar valor FIPE'
        FROM Veiculos v
        WHERE (v.ValorAtualFIPE IS NULL OR v.ValorAtualFIPE = 0)
          AND v.DataCompra IS NOT NULL
          AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'`
},

// ============================================
// fat_carro_reserva.json - Veículos Reserva
// ============================================
{
    filename: 'fat_carro_reserva.json',
    query: `
        SELECT 
            ovt.IdOcorrencia,
            ovt.Ocorrencia,
            ovt.PlacaPrincipal as PlacaOriginal,
            ovt.PlacaReserva,
            ovt.ModeloVeiculoReserva as ModeloReserva,
            ovt.Cliente,
            ovt.Motivo,
            ovt.SituacaoOcorrencia as StatusOcorrencia,
            FORMAT(ovt.DataRetiradaEfetiva, 'yyyy-MM-dd') as DataRetirada,
            FORMAT(ovt.DataDevolucaoEfetiva, 'yyyy-MM-dd') as DataDevolucao,
            ovt.DiariasEfetivas as DiasEmReserva,
            ${castM('ovt.ValorDiaria')} as ValorDiaria,
            ${castM('ovt.ValorTotal')} as ValorTotal
        FROM OcorrenciasVeiculoTemporario ovt
        WHERE ovt.SituacaoOcorrencia NOT IN ('Cancelada')`
},

// ============================================
// fat_manutencao_unificado.json - Eventos Chegada/Saída
// ============================================
{
    filename: 'fat_manutencao_unificado.json',
    query: `
        -- Eventos de CHEGADA (entrada na oficina)
        SELECT 
            'Chegada' as TipoEvento,
            os.IdOrdemServico,
            os.OrdemServico,
            os.Placa,
            os.Modelo,
            os.Fornecedor,
            os.Tipo as TipoOcorrencia,
            FORMAT(os.DataInicioServico, 'yyyy-MM-dd') as DataEvento,
            1 as Chegadas,
            0 as Conclusoes,
            ${castM('os.ValorTotal')} as CustoTotalOS,
            ${castM('os.ValorPecas')} as CustoPecas,
            ${castM('os.ValorServicos')} as CustoServicos,
            DATEDIFF(DAY, os.DataInicioServico, ISNULL(os.DataConclusao, GETDATE())) as LeadTimeTotalDias,
            cc.NomeCliente as Cliente
        FROM OrdensServico os
        LEFT JOIN ContratosLocacao cl ON os.Placa = cl.PlacaPrincipal AND cl.SituacaoContratoLocacao = 'Ativo'
        LEFT JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
        WHERE os.SituacaoOrdemServico <> 'Cancelada'
          AND os.DataInicioServico IS NOT NULL
        
        UNION ALL
        
        -- Eventos de CONCLUSÃO (saída da oficina)
        SELECT 
            'Conclusao' as TipoEvento,
            os.IdOrdemServico,
            os.OrdemServico,
            os.Placa,
            os.Modelo,
            os.Fornecedor,
            os.Tipo,
            FORMAT(os.DataConclusao, 'yyyy-MM-dd') as DataEvento,
            0 as Chegadas,
            1 as Conclusoes,
            ${castM('os.ValorTotal')} as CustoTotalOS,
            ${castM('os.ValorPecas')} as CustoPecas,
            ${castM('os.ValorServicos')} as CustoServicos,
            DATEDIFF(DAY, os.DataInicioServico, os.DataConclusao) as LeadTimeTotalDias,
            cc.NomeCliente as Cliente
        FROM OrdensServico os
        LEFT JOIN ContratosLocacao cl ON os.Placa = cl.PlacaPrincipal AND cl.SituacaoContratoLocacao = 'Ativo'
        LEFT JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
        WHERE os.DataConclusao IS NOT NULL 
          AND os.SituacaoOrdemServico <> 'Cancelada'`
},

// ============================================
// fat_manutencao_completa.json - OS com Contexto
// ============================================
{
    filename: 'fat_manutencao_completa.json',
    query: `
        SELECT 
            os.IdOrdemServico,
            os.OrdemServico,
            os.Placa,
            os.Modelo,
            os.Tipo as TipoOcorrencia,
            os.Fornecedor,
            os.SituacaoOrdemServico as Status,
            FORMAT(os.DataInicioServico, 'yyyy-MM-dd') as DataEntradaOficina,
            FORMAT(os.DataConclusao, 'yyyy-MM-dd') as DataSaidaOficina,
            DATEDIFF(DAY, os.DataInicioServico, ISNULL(os.DataConclusao, GETDATE())) as LeadTimeDias,
            ${castM('os.ValorTotal')} as ValorTotal,
            ${castM('os.ValorPecas')} as CustoPecas,
            ${castM('os.ValorServicos')} as CustoServicos,
            os.Km,
            g.GrupoVeiculo as Categoria,
            cc.NomeCliente as Cliente,
            cc.NumeroDocumentoPersonalizado as ContratoComercial,
            v.SituacaoVeiculo as StatusVeiculo
        FROM OrdensServico os
        LEFT JOIN Veiculos v ON os.Placa = v.Placa
        LEFT JOIN GruposVeiculos g ON v.IdGrupoVeiculo = g.IdGrupoVeiculo
        LEFT JOIN ContratosLocacao cl ON os.Placa = cl.PlacaPrincipal
        LEFT JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
        WHERE os.SituacaoOrdemServico <> 'Cancelada'`
},

// ============================================
// hist_vida_veiculo.json - Timeline Completa
// ============================================
{
    filename: 'hist_vida_veiculo.json',
    query: `
        SELECT * FROM (
            SELECT Placa, FORMAT(DataCompra, 'yyyy-MM-dd') as Data, 'COMPRA' as Evento, ${castM('ValorCompra')} as Valor, Modelo FROM Veiculos WHERE DataCompra IS NOT NULL
            UNION ALL
            SELECT PlacaPrincipal, FORMAT(DataInicial, 'yyyy-MM-dd'), 'LOCAÇÃO', ${castM('ValorMensal')}, NULL FROM ContratosLocacao WHERE DataInicial IS NOT NULL
            UNION ALL
            SELECT Placa, FORMAT(DataInfracao, 'yyyy-MM-dd'), 'MULTA', ${castM('ValorInfracao')}, NULL FROM OcorrenciasInfracoes WHERE DataInfracao IS NOT NULL
            UNION ALL
            SELECT Placa, FORMAT(DataInicioServico, 'yyyy-MM-dd'), 'MANUTENÇÃO', ${castM('ValorTotal')}, Modelo FROM OrdensServico WHERE SituacaoOrdemServico <> 'Cancelada' AND DataInicioServico IS NOT NULL
            UNION ALL
            SELECT Placa, FORMAT(DataSinistro, 'yyyy-MM-dd'), 'SINISTRO', ${castM('ValorOrcamento')}, NULL FROM OcorrenciasSinistro WHERE DataSinistro IS NOT NULL
            UNION ALL
            SELECT Placa, FORMAT(DataConclusaoOcorrencia, 'yyyy-MM-dd'), 'DEVOLUÇÃO', ${castM('ValorTotal')}, NULL FROM OcorrenciasDevolucao WHERE DataConclusaoOcorrencia IS NOT NULL
            UNION ALL
            SELECT Placa, FORMAT(DataVenda, 'yyyy-MM-dd'), 'VENDA', ${castM('ValorVenda')}, Modelo FROM VeiculosVendidos WHERE DataVenda IS NOT NULL
        ) as Timeline
        WHERE Data IS NOT NULL
        ORDER BY Data DESC`
}
```

### 3. NOVOS FATOS ANUAIS (adicionar ao YEARLY_FACTS dentro de runYearlySync)

```javascript
// ============================================
// fat_manutencao_os_YYYY.json - OS por Ano
// ============================================
{
    filename: `fat_manutencao_os_${year}.json`,
    query: `
        SELECT 
            os.IdOrdemServico,
            os.OrdemServico,
            os.Placa,
            os.Modelo,
            os.Tipo as TipoManutencao,
            os.Fornecedor,
            os.SituacaoOrdemServico as Status,
            FORMAT(os.DataInicioServico, 'yyyy-MM-dd') as DataEntrada,
            FORMAT(os.DataConclusao, 'yyyy-MM-dd') as DataSaida,
            DATEDIFF(DAY, os.DataInicioServico, ISNULL(os.DataConclusao, GETDATE())) as DiasParado,
            ${castM('os.ValorTotal')} as ValorTotal,
            ${castM('os.ValorPecas')} as ValorPecas,
            ${castM('os.ValorServicos')} as ValorServicos,
            os.Km,
            cc.NomeCliente as Cliente
        FROM OrdensServico os
        LEFT JOIN ContratosLocacao cl ON os.Placa = cl.PlacaPrincipal
        LEFT JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
        WHERE YEAR(os.DataInicioServico) = ${year}
          AND os.SituacaoOrdemServico <> 'Cancelada'`
},

// ============================================
// fat_vendas_YYYY.json - Vendas de Veículos
// ============================================
{
    filename: `fat_vendas_${year}.json`,
    query: `
        SELECT 
            vv.IdVeiculoVendido,
            vv.Placa,
            vv.Modelo,
            vv.Comprador,
            FORMAT(vv.DataVenda, 'yyyy-MM-dd') as DataVenda,
            ${castM('vv.ValorVenda')} as ValorVenda,
            ${castM('v.ValorCompra')} as ValorCompra,
            ${castM('vv.ValorVenda')} - ${castM('v.ValorCompra')} as ResultadoVenda,
            DATEDIFF(MONTH, v.DataCompra, vv.DataVenda) as IdadeNaVenda,
            COALESCE(v.OdometroConfirmado, v.OdometroInformado, 0) as KmNaVenda
        FROM VeiculosVendidos vv
        LEFT JOIN Veiculos v ON vv.Placa = v.Placa
        WHERE YEAR(vv.DataVenda) = ${year}`
},

// ============================================
// fat_compras_YYYY.json - Compras por Ano
// ============================================
{
    filename: `fat_compras_${year}.json`,
    query: `
        SELECT 
            v.IdVeiculo,
            v.Placa,
            v.Modelo,
            v.Montadora,
            v.Cor,
            v.Filial,
            v.FornecedorCompra as Fornecedor,
            FORMAT(v.DataCompra, 'yyyy-MM-dd') as DataCompra,
            ${castM('v.ValorCompra')} as ValorCompra,
            ${castM('v.ValorAtualFIPE')} as ValorFipeAtual,
            ${castM('v.ValorAcessorios')} as ValorAcessorios,
            v.SituacaoVeiculo as Status
        FROM Veiculos v
        WHERE YEAR(v.DataCompra) = ${year}
          AND COALESCE(v.FinalidadeUso, '') <> 'Terceiro'`
},

// ============================================
// fat_propostas_YYYY.json - Propostas Comerciais
// ============================================
{
    filename: `fat_propostas_${year}.json`,
    query: `
        SELECT 
            p.IdProposta,
            p.NumeroProposta,
            p.NomeCliente as Cliente,
            p.Vendedor,
            p.SituacaoProposta as Status,
            FORMAT(p.DataCriacao, 'yyyy-MM-dd') as DataCriacao,
            FORMAT(p.DataFechamento, 'yyyy-MM-dd') as DataFechamento,
            ${castM('p.ValorTotal')} as ValorProposta,
            p.QuantidadeVeiculos,
            p.PrazoContrato as PrazoMeses,
            DATEDIFF(DAY, p.DataCriacao, ISNULL(p.DataFechamento, GETDATE())) as DiasNegociacao
        FROM Propostas p
        WHERE YEAR(p.DataCriacao) = ${year}`
},

// ============================================
// fat_sinistros_YYYY.json - Sinistros por Ano
// ============================================
{
    filename: `fat_sinistros_${year}.json`,
    query: `
        SELECT 
            os.IdOcorrencia,
            os.Ocorrencia,
            os.Placa,
            os.Descricao as Tipo,
            os.SituacaoOcorrencia as Status,
            FORMAT(os.DataSinistro, 'yyyy-MM-dd') as DataSinistro,
            FORMAT(os.DataConclusao, 'yyyy-MM-dd') as DataConclusao,
            ${castM('os.ValorOrcamento')} as ValorOrcamento,
            ${castM('os.ValorFranquia')} as ValorFranquia,
            ${castM('os.ValorIndenizacao')} as ValorIndenizacao,
            os.TipoSinistro,
            cc.NomeCliente as Cliente
        FROM OcorrenciasSinistro os
        LEFT JOIN ContratosLocacao cl ON os.Placa = cl.PlacaPrincipal
        LEFT JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
        WHERE YEAR(os.DataSinistro) = ${year}`
},

// ============================================
// fat_faturamento_YYYY.json - Faturamento (renomear)
// ============================================
{
    filename: `fat_faturamento_${year}.json`,  // Sem 's' para consistência
    query: `
        SELECT 
            f.IdNota,
            f.Nota as NumeroNota,
            f.TipoNota,
            f.SituacaoNota,
            f.IdCliente,
            f.Cliente as NomeCliente,
            FORMAT(f.DataEmissao, 'yyyy-MM-dd') as DataEmissao,
            FORMAT(f.DataCompetencia, 'yyyy-MM-dd') as DataCompetencia,
            FORMAT(f.Vencimento, 'yyyy-MM-dd') as Vencimento,
            ${castM('f.ValorLocacao')} as ValorLocacao,
            ${castM('f.ValorReembolsaveis')} as ValorReembolso,
            ${castM('f.ValorMultas')} as ValorMultas,
            ${castM('f.ValorTotal')} as ValorTotal
        FROM Faturamentos f
        WHERE YEAR(f.DataCompetencia) = ${year}`
}
```

---

## ⚙️ ESTRUTURA FINAL DO run-sync.js

```javascript
// DIMENSIONS - Array de dimensões
const DIMENSIONS = [
    // ... suas 8 dimensões existentes ...
    // + 3 novas: dim_contratos, dim_compras, dim_alienacoes
];

// CONSOLIDATED - Array de fatos não-anuais
const CONSOLIDATED = [
    // ... seus 3 existentes ...
    // + 9 novos: fat_churn, fat_inadimplencia, agg_dre_mensal, 
    //            auditoria_consolidada, fat_carro_reserva, 
    //            fat_manutencao_unificado, fat_manutencao_completa,
    //            hist_vida_veiculo
];

// runYearlySync - Fatos anuais
async function runYearlySync(pool, year) {
    const YEARLY_FACTS = [
        // ... seus 3 existentes ...
        // + 6 novos: fat_manutencao_os, fat_vendas, fat_compras,
        //            fat_propostas, fat_sinistros, fat_faturamento
    ];
    // ... resto da função
}
```

---

## 📊 ARQUIVOS TOTAIS APÓS ATUALIZAÇÃO

| Categoria | Quantidade |
|-----------|------------|
| Dimensões | 11 arquivos |
| Fatos Consolidados | 12 arquivos |
| Fatos Anuais (x5 anos) | 9 x 5 = 45 arquivos |
| Fatos Mensais (x60 meses) | 1 x 60 = 60 arquivos |
| **TOTAL** | ~128 arquivos |

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Adicionar 3 novas dimensões ao array `DIMENSIONS`
- [ ] Adicionar 9 novos fatos ao array `CONSOLIDATED`
- [ ] Adicionar 6 novos fatos anuais ao `YEARLY_FACTS`
- [ ] Testar execução local do ETL
- [ ] Verificar arquivos no bucket `bi-reports`
- [ ] Validar dados nos dashboards
