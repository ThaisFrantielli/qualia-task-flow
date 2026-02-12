import { useMemo, useCallback } from 'react';
import useBIData from '@/hooks/useBIData';
import { Contracts } from '@/components/analytics/Contracts';
import { Contract } from '@/types/contracts';
import { Loader2 } from 'lucide-react';

type AnyObject = { [k: string]: any };

export default function ContractsDashboard(): JSX.Element {
  const { data: contractsData, loading: loadingContracts } = useBIData<AnyObject[]>('dim_contratos_locacao');
  const { data: frotaData, loading: loadingFrota } = useBIData<AnyObject[]>('dim_frota');
  
  // Transform raw data to Contract types
  const contracts = useMemo(() => {
    if (!contractsData || !Array.isArray(contractsData)) return [];
    
    const contractsArray = contractsData as AnyObject[];
    // Build a lookup map from frota (dim_frota) by normalized plate
    const normalizeForLookup = (p: unknown) => {
      if (!p) return '';
      return String(p).toUpperCase().replace(/[^A-Z0-9]/g, '');
    };

    const frotaMap: Record<string, { grupo?: string; idadeMeses?: number; odometro?: number; fipeAtual?: number }> = {};
    if (Array.isArray(frotaData)) {
      for (const row of frotaData) {
        const placa = row.Placa || row.placa || row.placaprincipal || row.plate;
        const grupo = row.GrupoVeiculo || row.grupoveiculo || row.Grupo || row.grupo;
        const rawIdade = row.IdadeEmMeses || row.idadeEmMeses || row.idade_em_meses || row.Idade || row.idade;
        const idadeMeses = rawIdade !== undefined && rawIdade !== null ? parseInt(String(rawIdade).replace(/[^0-9]/g, '')) || undefined : undefined;
        const rawOdometro = row.OdometroInformado || row.odometroInformado || row.Odometro || row.odometro || row.Odometro_Informado;
        const odometroVal = rawOdometro !== undefined && rawOdometro !== null ? parseFloat(String(rawOdometro).replace(/[^0-9.]/g, '')) || undefined : undefined;
        const rawFipe = row.ValorAtualFipe || row.valorAtualFipe || row.ValorFipeAtual || row.valorFipeAtual || row.ValorFipe || row.valorfipe;
        const fipeVal = rawFipe !== undefined && rawFipe !== null ? parseFloat(String(rawFipe).replace(/[^0-9.]/g, '')) || undefined : undefined;
        const key = normalizeForLookup(placa);
        if (key) frotaMap[key] = { grupo: grupo || frotaMap[key]?.grupo || '', idadeMeses: idadeMeses ?? frotaMap[key]?.idadeMeses, odometro: odometroVal ?? frotaMap[key]?.odometro, fipeAtual: fipeVal ?? frotaMap[key]?.fipeAtual };
      }
    }
    

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

      // 1. Resolve plate and joined vehicle fields from API
      // keep a rawPlate (without suffix) for lookup, and finalPlate for display
      const rawPlateCandidate = getStr(c.plate, c.PlacaPrincipal, c.placaprincipal, getStr(c.PlacaReserva, c.placa_reserva));
      let lookupKey = normalizeForLookup(rawPlateCandidate);
      let displaySuffix = '';

      // Fallback: If no primary vehicle, try PlacaReserva
      if (!lookupKey) {
        const pReserva = getStr(c.PlacaReserva, c.placa_reserva);
        if (pReserva) {
          lookupKey = normalizeForLookup(pReserva);
          
          const tTemporario = getStr(c.TipoVeiculoTemporario, c.tipo_veiculo_temporario);
          if (tTemporario) {
             displaySuffix = ` (${tTemporario})`;
          }
        }
      }

      let finalPlate = rawPlateCandidate;
      if (finalPlate && displaySuffix) {
        finalPlate += displaySuffix;
      }

      // Dados vindos do LEFT JOIN de dim_contratos_locacao + dim_frota
      const finalMontadora = getStr(c.Montadora, c.montadora);
      const finalModelo = getStr(c.Modelo, c.modelo_veiculo, c.modelo, c.model);
      // Prefer GrupoVeiculo from dim_contratos (if present), otherwise try frota lookup
      let finalCategoria = getStr(c.GrupoVeiculo, c.grupoveiculo, c.Categoria, c.categoria);
      if ((!finalCategoria || finalCategoria === '') && lookupKey) {
        const fromFrota = frotaMap[lookupKey]?.grupo;
        if (fromFrota) finalCategoria = fromFrota;
      }

      // KM / Idade / FIPE / Compra via JOIN (com fallback de nomes)
      const rawKm = (c.currentKm ?? c.KmInformado ?? c.kminformado ?? c.km);
      let finalKm = (rawKm !== undefined && rawKm !== null && String(rawKm).trim() !== '') ? parseNum(rawKm) : 0;
      // fallback to dim_frota OdometroInformado when contract km is missing
      if ((finalKm === 0 || finalKm === undefined) && lookupKey) {
        const frotaOd = frotaMap[lookupKey]?.odometro;
        if (frotaOd !== undefined && frotaOd !== null) {
          finalKm = Math.round(frotaOd);
        }
      }

      // FIPE: prefer contract field, otherwise use dim_frota.ValorAtualFipe
      const rawFipeFromContract = c.valorFipeAtual || c.ValorFipeAtual || c.ValorFipe || c.valorfipe;
      const parsedContractFipe = rawFipeFromContract ? parseNum(rawFipeFromContract) : 0;
      const frotaFipe = lookupKey ? frotaMap[lookupKey]?.fipeAtual : undefined;
      const finalFipe = (parsedContractFipe && parsedContractFipe > 0) ? parsedContractFipe : (frotaFipe ?? 0);

      const rawAge = c.ageMonths || c.IdadeVeiculo || c.idadeveiculo;
      let finalAge = (rawAge !== undefined && rawAge !== null) ? Math.round(parseNum(rawAge)) : undefined;
      // If no age from contrato, fallback to dim_frota lookup by plate
      if ((finalAge === undefined || finalAge === 0) && lookupKey) {
        const frotaEntry = frotaMap[lookupKey];
        if (frotaEntry && frotaEntry.idadeMeses !== undefined) {
          finalAge = frotaEntry.idadeMeses;
        }
      }

      // Ensure unique ID (using index to prevent duplicates)
      const uniqueId = `${c.IdContratoLocacao || 'gen'}-${idx}`;

      return {
        id: uniqueId,
        contractNumber: String(c.ContratoLocacao || c.NumeroContrato || c.id_contrato_locacao || 'N/A'),
        clientName: String(c.NomeCliente || c.nome_cliente || 'N/A'),
        
        plate: finalPlate,
        plateNormalized: normalizeForLookup(rawPlateCandidate || finalPlate),
        
        model: finalModelo,
        montadora: finalMontadora,
        grupoVeiculo: finalCategoria,
        // backward-compatible field
        categoria: finalCategoria,
        modelo_veiculo: finalModelo,
        localizacaoVeiculo: c.LocalizacaoVeiculo || c.localizacaoveiculo || c.Localizacao || c.localizacao || '',
        mainPlate: finalPlate,

        // Numeric fields
        currentKm: finalKm,
        KmInformado: finalKm, // for compatibility
        ageMonths: finalAge,
        
        // FIPE e Compra via JOIN
        valorFipeAtual: finalFipe,
        ValorCompra: parseNum(c.ValorCompra || c.valorcompra),
        
        // Original fields logic preserved but simplified
        type: String(c.TipoLocacao || 'Locação'),
        startDate: c.DataInicio || c.DataInicial || new Date().toISOString(),
        endDate: c.DataTermino || c.DataFinal || new Date().toISOString(),
        monthlyValue: parseNum(c.ValorMensalAtual || c.ValorLocacao),
        currentFipe: parseNum(c.valorFipeAtual || c.ValorFipeAtual || c.ValorFipe),
        purchasePrice: parseNum(c.ValorCompra || c.valorcompra),
        manufacturingYear: parseInt(String(c.AnoFabricacao || c.anofabricacao || new Date().getFullYear())) || new Date().getFullYear(),
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

  const handleUpdateContract = useCallback((updatedContract: Contract) => {
    // Handle updates if needed in the future
    console.log('Contract update requested:', updatedContract.id);
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
