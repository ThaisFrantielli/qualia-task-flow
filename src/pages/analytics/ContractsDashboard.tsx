import React, { useMemo, useState, useCallback } from 'react';
import useBIData from '@/hooks/useBIData';
import { Contracts } from '@/components/analytics/Contracts';
import { Contract } from '@/types/contracts';
import { Loader2 } from 'lucide-react';

type AnyObject = { [k: string]: any };

export default function ContractsDashboard(): JSX.Element {
  const { data: contractsData, loading: loadingContracts } = useBIData<AnyObject[]>('dim_contratos_locacao');
  const { data: frotaData, loading: loadingFrota } = useBIData<AnyObject[]>('dim_frota');
  
  const [contracts, setContracts] = useState<Contract[]>([]);

  // Transform raw data to Contract types
  const enrichedContracts = useMemo(() => {
    if (!contractsData || !Array.isArray(contractsData)) return [];
    
    const contractsArray = contractsData as AnyObject[];
    const frotaArray = (frotaData || []) as AnyObject[];
    
    // Create a map for quick frota lookup by plate
    const frotaMap = new Map<string, AnyObject>();
    frotaArray.forEach(v => {
      const placa = v.Placa || v.placa;
      if (placa) frotaMap.set(String(placa).toUpperCase(), v);
    });

    return contractsArray.map((c, idx) => {
      const placa = String(c.Placa || c.placa || '').toUpperCase();
      const veiculo = frotaMap.get(placa);
      
      // Parse dates
      const dataInicio = c.DataInicio || c.data_inicio || c.DataRetirada || c.data_retirada || c.DataInicial;
      const dataFim = c.DataTermino || c.data_fim || c.DataDevolucao || c.data_devolucao || c.DataFimContrato || c.DataFinal;
      const dataEncerramento = c.DataEncerramento || c.data_encerramento;
      
      // Calculate period in months
      let periodMonths = 0;
      if (dataInicio && dataFim) {
        const start = new Date(dataInicio);
        const end = new Date(dataFim);
        periodMonths = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      }
      
      return {
        id: String(c.IdContratoLocacao || c.id_contrato_locacao || c.IdContrato || idx),
        contractNumber: String(c.ContratoLocacao || c.contrato_locacao || c.NumeroContrato || c.RefContratoCliente || 'N/A'),
        clientName: String(c.NomeCliente || c.nome_cliente || c.Cliente || 'N/A'),
        plate: placa || 'N/A',
        model: String(veiculo?.Modelo || c.Modelo || c.modelo || 'N/A'),
        type: String(c.TipoLocacao || c.tipo_locacao || 'Locação'),
        startDate: dataInicio || new Date().toISOString(),
        endDate: dataFim || new Date().toISOString(),
        monthlyValue: parseFloat(String(c.ValorMensalAtual || c.valor_mensal_atual || c.ValorLocacao || 0).replace(/[^0-9.-]/g, '')) || 0,
        currentFipe: parseFloat(String(veiculo?.ValorFipe || veiculo?.ValorFipeAtual || veiculo?.ValorAtualFIPE || 0).replace(/[^0-9.-]/g, '')) || 0,
        // Valor FIPE atual explicitamente solicitado
        valorFipeAtual: parseFloat(String(veiculo?.ValorFipeAtual || veiculo?.ValorFipe || veiculo?.ValorAtualFIPE || 0).replace(/[^0-9.-]/g, '')) || 0,
        purchasePrice: parseFloat(String(veiculo?.ValorCompra || 0).replace(/[^0-9.-]/g, '')) || 0,
        // Priorizar KmInformado quando disponível
        currentKm: parseInt(String(veiculo?.KmInformado || veiculo?.KmInformado || veiculo?.KmConfirmado || veiculo?.KM || veiculo?.OdometroConfirmado || veiculo?.OdometroInformado || 0).replace(/[^0-9]/g, '')) || 0,
        // Idade em meses trazida diretamente (IdadeVeiculo) quando disponível
        ageMonths: Number.isFinite(Number(veiculo?.IdadeVeiculo)) ? parseInt(String(veiculo?.IdadeVeiculo).replace(/[^0-9]/g, '')) : undefined,
        manufacturingYear: parseInt(String(veiculo?.AnoFabricacao || veiculo?.AnoModelo || new Date().getFullYear()).replace(/[^0-9]/g, '')) || new Date().getFullYear(),
        renewalStrategy: 'WAIT_PERIOD',
        observation: undefined,
        // Additional fields
        commercialContract: String(c.ContratoComercial || c.contrato_comercial || c.RefContratoCliente || ''),
        mainPlate: String(c.PlacaPrincipal || c.placa_principal || placa || ''),
        // Dados extraídos de `dim_frota`
        montadora: String(veiculo?.Montadora || veiculo?.montadora || ''),
        modelo: String(veiculo?.Modelo || c.Modelo || c.modelo || ''),
        categoria: String(veiculo?.Categoria || veiculo?.GrupoVeiculo || ''),
        initialDate: dataInicio || undefined,
        finalDate: dataFim || undefined,
        periodMonths: periodMonths || undefined,
        contractStatus: String(c.SituacaoContratoLocacao || c.situacao_contrato_locacao || c.SituacaoContrato || ''),
        closingDate: dataEncerramento || undefined
      } as Contract;
    });
  }, [contractsData, frotaData]);

  // Update contracts whenever enriched data changes
  React.useEffect(() => {
    if (enrichedContracts.length > 0 && contracts.length === 0) {
      setContracts(enrichedContracts);
    }
  }, [enrichedContracts, contracts.length]);

  const handleUpdateContract = useCallback((updatedContract: Contract) => {
    setContracts(prev => prev.map(c => c.id === updatedContract.id ? updatedContract : c));
  }, []);

  if (loadingContracts || loadingFrota) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-slate-600">Carregando contratos...</p>
        </div>
      </div>
    );
  }

  if (!contractsData || contractsData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600 text-lg mb-2">Nenhum contrato encontrado</p>
          <p className="text-slate-400 text-sm">Verifique se os dados foram sincronizados.</p>
        </div>
      </div>
    );
  }

  return <Contracts contracts={contracts} onUpdateContract={handleUpdateContract} />;
}
