import { useMemo, useCallback } from 'react';
import useBIData from '@/hooks/useBIData';
import { Contracts } from '@/components/analytics/Contracts';
import { Contract } from '@/types/contracts';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AnyObject = { [k: string]: any };

export default function ContractsDashboard(): JSX.Element {
  // API already JOINs dim_contratos_locacao with dim_frota — no need for separate dim_frota fetch
  const { data: contractsData, loading: loadingContracts, refetch } = useBIData<AnyObject[]>('dim_contratos_locacao');
  
  const { toast } = useToast();

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
      const finalModelo = getStr(c.Modelo, c.modelo_veiculo, c.modelo, c.Modelo);
      const finalCategoria = getStr(c.Categoria, c.categoria, c.GrupoVeiculo, c.grupoveiculo);

      const finalKm = parseNum(c.KmConfirmado ?? c.OdometroConfirmado ?? c.KmInformado ?? c.currentKm ?? 0);
      const finalFipe = parseNum(c.ValorFipe ?? c.ValorAtualFIPE ?? c.valorFipeAtual ?? c.ValorFipeAtual ?? 0);
      const finalAge = parseNum(c.IdadeEmMeses ?? c.IdadeVeiculo ?? c.ageMonths ?? 0) || undefined;

      const uniqueId = `${c.IdContratoLocacao || 'gen'}-${idx}`;

      // keep original contract id for metadata reference when available
      const rawRef = c.IdContratoLocacao ?? c.NumeroContratoLocacao ?? c.NumeroContrato ?? c.ContratoLocacao;

      return {
        rawId: rawRef,
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
        // metadata saved by user (priority over ERP fields)
        observation: c.observacoes_salvas ?? (c.observation || undefined),
        renewalStrategy: (c.estrategia_salva as any) ?? 'WAIT_PERIOD',
        purchasePrice: (c.valor_zero_salvo ? 0 : parseNum(c.ValorCompra || c.valorcompra)),
        type: String(c.TipoLocacao || 'Locação'),
        startDate: c.DataInicial || c.DataInicio || c.DataInicial || new Date().toISOString(),
        endDate: c.DataFinal || c.DataTermino || c.DataFinal || new Date().toISOString(),
        monthlyValue: parseNum(c.ValorMensalAtual || c.ValorLocacao),
        currentFipe: finalFipe,
        // purchasePrice already set above (honoring valor_zero_salvo)
        manufacturingYear: parseInt(String(c.AnoFabricacao || c.anofabricacao || new Date().getFullYear())) || new Date().getFullYear(),
        // prefer explicit DataInicial/DataFinal from API (pascal-case DB columns)
        initialDate: c.DataInicial || c.DataInicio || undefined,
        finalDate: c.DataFinal || c.DataTermino || undefined,
        // migration metadata
        migratedFrom: c.ContratoDeOrigem ?? c.contratoDeOrigem ?? undefined,
        migrationDate: c.DataMigracao ?? c.DataMigracao ?? c.dataMigracao ?? undefined,
        migrationSource: c.OrigemMigracao ?? c.OrigemMigracao ?? c.origemMigracao ?? undefined,
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

  const handleUpdateContract = useCallback(async (updatedContract: Contract) => {
    const t = toast({ title: 'Salvando...', description: 'Enviando alterações ao servidor...' });
    try {
      const id_ref = (updatedContract as any).rawId ? String((updatedContract as any).rawId) : (updatedContract.plate || updatedContract.contractNumber || '') ;
      if (!id_ref) {
        console.warn('[ContractsDashboard] No id_referencia available for save');
        t.update({ title: 'Erro', description: 'Referência ausente para salvar.', variant: 'destructive' } as any);
        return;
      }

      const payload = {
        id_referencia: id_ref,
        estrategia: updatedContract.renewalStrategy || null,
        valor_aquisicao_zero: Boolean((updatedContract as any).purchasePrice === 0),
        observacoes: (updatedContract as any).observation ?? null,
      };

      const resp = await fetch('/api/save-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.text();
        console.error('[ContractsDashboard] save-metadata failed:', resp.status, body);
        t.update({ title: 'Erro ao salvar', description: `Status ${resp.status}: ${body}`, variant: 'destructive' } as any);
        return;
      }

      // Refresh data so metadata from DB is reflected (API batch includes metadata now)
      if (typeof refetch === 'function') refetch();

      t.update({ title: 'Sucesso!', description: 'Alterações salvas com sucesso.' } as any);
    } catch (err: any) {
      console.error('[ContractsDashboard] Error saving metadata:', err);
      t.update({ title: 'Erro ao salvar', description: err?.message || String(err), variant: 'destructive' } as any);
    }
  }, [refetch]);

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
