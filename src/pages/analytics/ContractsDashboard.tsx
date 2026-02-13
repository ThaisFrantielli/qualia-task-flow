import { useMemo, useCallback } from 'react';
import useBIData from '@/hooks/useBIData';
import { Contracts } from '@/components/analytics/Contracts';
import { Contract } from '@/types/contracts';
import { Loader2 } from 'lucide-react';

type AnyObject = { [k: string]: any };

export default function ContractsDashboard(): JSX.Element {
  // API already JOINs dim_contratos_locacao with dim_frota — no need for separate dim_frota fetch
  const { data: contractsData, loading: loadingContracts } = useBIData<AnyObject[]>('dim_contratos_locacao');
  
  // Transform raw data to Contract types
  const contracts = useMemo(() => {
    if (!contractsData || !Array.isArray(contractsData)) return [];
    
    const contractsArray = contractsData as AnyObject[];
    const normalizeForLookup = (p: unknown) => {
      if (!p) return '';
      return String(p).toUpperCase().replace(/[^A-Z0-9]/g, '');
    };

    return contractsArray.map((c, idx) => {
      const parseNum = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
        const s = String(val).replace(/[^0-9.]/g, '');
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : 0;
      };

      const getStr = (...candidates: any[]) => {
        for (const cand of candidates) {
          if (cand && typeof cand === 'string' && cand.trim() !== '' && cand !== 'N/A') return cand;
        }
        return '';
      };

      // Plate resolution
      const rawPlateCandidate = getStr(c.PlacaPrincipal, c.placaprincipal, c.PlacaReserva, c.placa_reserva);
      let displaySuffix = '';
      if (!rawPlateCandidate) {
        const pReserva = getStr(c.PlacaReserva, c.placa_reserva);
        if (pReserva) {
          const tTemporario = getStr(c.TipoVeiculoTemporario, c.tipo_veiculo_temporario);
          if (tTemporario) displaySuffix = ` (${tTemporario})`;
        }
      }

      let finalPlate = rawPlateCandidate;
      if (finalPlate && displaySuffix) finalPlate += displaySuffix;

      // Fields already come from the LEFT JOIN in the API
      const finalMontadora = getStr(c.Montadora, c.montadora);
      const finalModelo = getStr(c.Modelo, c.modelo_veiculo, c.modelo);
      const finalCategoria = getStr(c.Categoria, c.categoria, c.GrupoVeiculo, c.grupoveiculo);

      const finalKm = parseNum(c.currentKm ?? c.KmInformado ?? c.kminformado ?? 0);
      const finalFipe = parseNum(c.valorFipeAtual ?? c.ValorFipeAtual ?? 0);
      const finalAge = parseNum(c.ageMonths ?? c.IdadeVeiculo ?? 0) || undefined;

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
        categoria: finalCategoria,
        modelo_veiculo: finalModelo,
        localizacaoVeiculo: c.LocalizacaoVeiculo || c.localizacaoveiculo || '',
        mainPlate: finalPlate,
        currentKm: finalKm,
        KmInformado: finalKm,
        ageMonths: finalAge,
        valorFipeAtual: finalFipe,
        ValorCompra: parseNum(c.ValorCompra || c.valorcompra),
        type: String(c.TipoLocacao || 'Locação'),
        startDate: c.DataInicio || c.DataTermino || new Date().toISOString(),
        endDate: c.DataTermino || c.DataInicio || new Date().toISOString(),
        monthlyValue: parseNum(c.ValorMensalAtual || c.ValorLocacao),
        currentFipe: finalFipe,
        purchasePrice: parseNum(c.ValorCompra || c.valorcompra),
        manufacturingYear: parseInt(String(c.AnoFabricacao || c.anofabricacao || new Date().getFullYear())) || new Date().getFullYear(),
        renewalStrategy: 'WAIT_PERIOD',
        initialDate: c.DataInicio || undefined,
        finalDate: c.DataTermino || undefined,
        contractStatus: String(c.SituacaoContratoLocacao || c.SituacaoContrato || ''),
        closingDate: c.DataEncerramento || undefined,
        commercialContract: c.ContratoComercial || '',
        periodMonths: (() => {
          const start = c.DataInicio;
          const end = c.DataTermino;
          if (start && end) {
            return Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
          }
          return undefined;
        })()
      } as Contract;
    });
  }, [contractsData]);

  const handleUpdateContract = useCallback((updatedContract: Contract) => {
    console.log('Contract update requested:', updatedContract.id);
  }, []);

  if (loadingContracts) {
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
