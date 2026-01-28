SELECT 
                    CONVERT(VARCHAR(36), NEWID()) + '|' + CAST(ln.NumeroLancamento AS VARCHAR(50)) + '|' + ISNULL(ln.Natureza, '') as IdLancamentoNatureza,
                ln.NumeroLancamento as IdLancamento,
                ln.NumeroLancamento as NumeroLancamento,
                    FORMAT(ln.DataCompetencia, 'yyyy-MM-dd') as DataCompetencia,
                    ln.Natureza,
                    CASE 
                        WHEN ln.TipoLancamento = 'Entrada' THEN 'Entrada'
                        WHEN ln.TipoLancamento = 'Saída' THEN 'Saída'
                        ELSE 'Outro'
                    END as TipoLancamento,
                    (
    CASE
        WHEN CHARINDEX(',', ISNULL(CAST(ISNULL(ln.ValorPagoRecebido, 0) AS VARCHAR), '')) > 0
            THEN TRY_CAST(REPLACE(REPLACE(ISNULL(CAST(ISNULL(ln.ValorPagoRecebido, 0) AS VARCHAR), '0'), '.', ''), ',', '.') AS DECIMAL(15,2))
        ELSE TRY_CAST(ISNULL(ISNULL(ln.ValorPagoRecebido, 0), 0) AS DECIMAL(15,2))
    END
) as Valor,
                    ln.Descricao as DescricaoLancamento,
                    ln.Conta,
                    ln.FormaPagamento,
                    FORMAT(ln.DataPagamentoRecebimento, 'yyyy-MM-dd') as DataPagamentoRecebimento,
                        ln.PagarReceberDe as NomeEntidade,
                        ln.PagarReceberDe,
                        ln.NumeroDocumento,
                        COALESCE(cli.NomeFantasia, os.Cliente, '') as NomeCliente,
                        COALESCE(os.Placa, vv.Placa, vc.Placa, NULL) as Placa,
                        os.ContratoComercial as ContratoComercial,
                        os.ContratoLocacao as ContratoLocacao
                    FROM LancamentosComNaturezas ln WITH (NOLOCK, INDEX(0))

                    LEFT JOIN OrdensServico os WITH (NOLOCK) ON ISNULL(ln.OrdemCompra, '') = ISNULL(os.OrdemCompra, '') AND os.SituacaoOrdemServico <> 'Cancelada'

                    OUTER APPLY (
                       SELECT TOP 1 vv.Placa, vv.FaturaVenda
                       FROM VeiculosVendidos vv WITH (NOLOCK)
                       WHERE vv.FaturaVenda = ln.NumeroDocumento OR vv.FaturaVenda = LEFT(ln.NumeroDocumento, CASE WHEN CHARINDEX('/', ln.NumeroDocumento) > 0 THEN CHARINDEX('/', ln.NumeroDocumento)-1 ELSE LEN(ln.NumeroDocumento) END)
                    ) vv

                    OUTER APPLY (
                       SELECT TOP 1 vc.Placa, vc.NumeroNotaFiscal, vc.DataCompra
                       FROM VeiculosComprados vc WITH (NOLOCK)
                       WHERE vc.NumeroNotaFiscal = ln.NumeroDocumento OR vc.NumeroNotaFiscal = LEFT(ln.NumeroDocumento, CASE WHEN CHARINDEX('/', ln.NumeroDocumento) > 0 THEN CHARINDEX('/', ln.NumeroDocumento)-1 ELSE LEN(ln.NumeroDocumento) END)
                       