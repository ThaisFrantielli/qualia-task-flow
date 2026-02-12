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
    
    // Create a map for quick frota lookup by normalized plate
    const normalizeForLookup = (p: unknown) => {
      if (!p) return '';
      return String(p).toUpperCase().replace(/[^A-Z0-9]/g, '');
    };
    
    const frotaMap = new Map<string, AnyObject>();
    frotaArray.forEach(v => {
      const placa = v.Placa || v.placa;
      const key = normalizeForLookup(placa);
      if (key) frotaMap.set(key, v);
    });

    console.log(`[ContractsDashboard] Processing ${contractsArray.length} contracts with ${frotaData?.length || 0} vehicle records available for fallback.`);

    return contractsArray.map((c, idx) => {
      // Helper for numeric parsing
      const parseNum = (val: any): number => {
        if (val === null || val === undefined) return 0;
        const s = String(val).replace(/[^0-9.]/g, '');
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : 0;
      };

      // Helper for string fallback
      const getStr = (...candidates: any[]) => {
        for (const cand of candidates) {
          if (cand && typeof cand === 'string' && cand.trim() !== '' && cand !== 'N/A') return cand;
        }
        return '';
      };

      // 1. Resolve Vehicle (Primary or Reserve/Temporary)
      let lookupKey = normalizeForLookup(c.plate || c.PlacaPrincipal);
      let veiculo = lookupKey ? frotaMap.get(lookupKey) : undefined;
      let displaySuffix = '';

      // Fallback: If no primary vehicle, try PlacaReserva
      if (!lookupKey) {
        const pReserva = getStr(c.PlacaReserva, c.placa_reserva);
        if (pReserva) {
          // Use reserve plate for lookup to find vehicle stats (Model, KM, etc)
          lookupKey = normalizeForLookup(pReserva);
          veiculo = lookupKey ? frotaMap.get(lookupKey) : undefined;
          
          const tTemporario = getStr(c.TipoVeiculoTemporario, c.tipo_veiculo_temporario);
          if (tTemporario) {
             displaySuffix = ` (${tTemporario})`;
          }
        }
      }

      let finalPlate = getStr(c.plate, c.PlacaPrincipal, veiculo?.Placa, getStr(c.PlacaReserva, c.placa_reserva));
      if (finalPlate && displaySuffix) {
        finalPlate += displaySuffix;
      }

      // Prefer data from the matched `veiculo` (dim_frota) when available.
      // This ensures that when we use a reserve plate (PlacaReserva) the model/categoria
      // reflect the reserve vehicle instead of falling back to contract-level fields.
      const finalMontadora = getStr(veiculo?.Montadora, c.montadora, c.Montadora);
      const finalModelo = getStr(veiculo?.Modelo, c.modelo_veiculo, c.Modelo, c.model);
      const finalCategoria = getStr(veiculo?.Categoria, veiculo?.GrupoVeiculo, c.categoria, c.Categoria);

      // KM Logic: prefer dim_frota values (most authoritative) then API aliases
      const rawKm = veiculo?.KmInformado || veiculo?.KM || veiculo?.Km || c.currentKm || c.KmInformado || c.km;
      const finalKm = rawKm ? parseNum(rawKm) : 0;

      // Age Logic: prefer dim_frota age when available
      const rawAge = veiculo?.IdadeVeiculo || c.ageMonths || c.IdadeVeiculo;
      const finalAge = (rawAge !== undefined && rawAge !== null) ? Math.round(parseNum(rawAge)) : undefined;

      // Ensure unique ID (using index to prevent duplicates)
      const uniqueId = `${c.IdContratoLocacao || 'gen'}-${idx}`;

      return {
        id: uniqueId,
        contractNumber: String(c.ContratoLocacao || c.NumeroContrato || c.id_contrato_locacao || 'N/A'),
        clientName: String(c.NomeCliente || c.nome_cliente || 'N/A'),
        
        plate: finalPlate,
        plateNormalized: normalizeForLookup(finalPlate),
        
        model: finalModelo,
        montadora: finalMontadora,
        categoria: finalCategoria,
        modelo_veiculo: finalModelo,
        localizacaoVeiculo: veiculo?.LocalizacaoVeiculo || veiculo?.Localizacao || c.LocalizacaoVeiculo || c.Localizacao || '',
        mainPlate: finalPlate,

        // Numeric fields
        currentKm: finalKm,
        KmInformado: finalKm, // for compatibility
        ageMonths: finalAge,
        
        // FIPE: prefer dim_frota authoritative values
        valorFipeAtual: parseNum(veiculo?.ValorFipeAtual || veiculo?.ValorFipe || c.valorFipeAtual || c.ValorFipeAtual),
        
        // Original fields logic preserved but simplified
        type: String(c.TipoLocacao || 'Locação'),
        startDate: c.DataInicio || c.DataInicial || new Date().toISOString(),
        endDate: c.DataTermino || c.DataFinal || new Date().toISOString(),
        monthlyValue: parseNum(c.ValorMensalAtual || c.ValorLocacao),
        currentFipe: parseNum(c.valorFipeAtual || veiculo?.ValorFipeAtual),
        purchasePrice: parseNum(veiculo?.ValorCompra || c.ValorCompra),
        manufacturingYear: parseInt(String(veiculo?.AnoFabricacao || new Date().getFullYear())) || new Date().getFullYear(),
        renewalStrategy: 'WAIT_PERIOD',
        // Dates
        initialDate: c.DataInicio || c.DataInicial || undefined,
        finalDate: c.DataTermino || c.DataFinal || undefined,
        contractStatus: String(c.SituacaoContratoLocacao || c.SituacaoContrato || ''),
        closingDate: c.DataEncerramento || undefined,
        commercialContract: c.ContratoComercial || '',
        
        // Calculate period if needed
        periodMonths: (() => {
           const start = c.DataInicio || c.DataInicial;
           const end = c.DataTermino || c.DataFinal;
           if (start && end) {
             return Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
           }
           return undefined;
        })()
      } as Contract;
    });
  }, [contractsData, frotaData]);

  // Update contracts whenever enriched data changes
  React.useEffect(() => {
    if (enrichedContracts.length > 0) {
      const sample = enrichedContracts[0];
      console.log('[ContractsDashboard] Dados do primeiro contrato:', {
        id: sample.id,
        plate: sample.plate,
        currentKm: sample.currentKm,
        ageMonths: sample.ageMonths,
        montadora: sample.montadora,
        modelo_veiculo: sample.modelo_veiculo,
        categoria: sample.categoria,
        currentFipe: sample.currentFipe
      });
      // Debug specific plate (reserve) if present - helps verify veiculo lookup
      try {
        const normalize = (s?: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const target = 'REO-3G47';
        const targetNorm = normalize(target);
        const found = enrichedContracts.find(x => normalize(x.plate) === targetNorm || normalize(x.mainPlate) === targetNorm);
        if (found) console.log('[ContractsDashboard][DEBUG] Found reserva plate data:', found);
      } catch (e) {
        // ignore
      }
      setContracts(enrichedContracts);
    }
  }, [enrichedContracts]);

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
