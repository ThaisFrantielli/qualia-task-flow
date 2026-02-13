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
      const parseCurrency = (raw: string): number => {
        if (raw === null || raw === undefined) return 0;
        let out = String(raw).replace(/\s/g, '');
        // If contains both '.' and ',', assume '.' thousands and ',' decimal (pt-BR)
        if (out.indexOf('.') !== -1 && out.indexOf(',') !== -1) {
          out = out.replace(/\./g, '').replace(',', '.');
          const v = parseFloat(out);
          return Number.isFinite(v) ? v : 0;
        }
        // If contains only comma, treat comma as decimal separator
        if (out.indexOf(',') !== -1 && out.indexOf('.') === -1) {
          out = out.replace(',', '.');
          const v = parseFloat(out);
          return Number.isFinite(v) ? v : 0;
        }
        // Otherwise remove non-digit except dot and parse
        out = out.replace(/[^0-9.\-]/g, '');
        const v = parseFloat(out);
        return Number.isFinite(v) ? v : 0;
      };

      const parseNum = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
        const s = String(val).replace(/[^0-9.,-]/g, '').trim();
        if (!s) return 0;
        return parseCurrency(s);
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
        // prefer explicit saved `valor_aquisicao` (can be 0). fallback to ERP ValorCompra
        purchasePrice: (c.valor_aquisicao !== undefined && c.valor_aquisicao !== null) ? parseNum(c.valor_aquisicao) : parseNum(c.ValorCompra || c.valorcompra),
        // novo campo salvo pelo usuário
        modelo_aquisicao: (c.modelo_aquisicao as string) ?? null,
        // Ação do usuário (campo novo salvo em dim_contratos_metadata.acao_usuario)
        acao_usuario: (c.acao_usuario as any) ?? null,
        // Prefer explicit DB column `TipoDeContrato` if present, fallback to legacy `TipoLocacao` then 'Locação'
        type: String(getStr(c.TipoDeContrato, c.TipoLocacao) || 'Locação'),
        startDate: c.DataInicial || c.DataInicio || c.DataInicial || new Date().toISOString(),
        endDate: c.DataFinal || c.DataTermino || c.DataFinal || new Date().toISOString(),
        // Prefer new Oracle column UltimoValorLocacao (may be formatted string), fallback to legacy fields
        monthlyValue: parseNum(((c.UltimoValorLocacao ?? c.ultimo_valor_locacao ?? c.ValorMensalAtual ?? c.ValorLocacao ?? c.ValorMensal) || 0)),
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
      // Prefer sending the plate (PlacaPrincipal) as id_referencia to match dim_contratos_metadata.id_referencia
      // Prefer normalized plate (without formatting) as id_referencia; fallback to rawId or contractNumber
      const maybePlateNorm = (updatedContract as any).plateNormalized || (updatedContract as any).plate || (updatedContract as any).mainPlate || '';
      const normalizeRef = (s: unknown) => {
        if (!s && s !== 0) return '';
        return String(s).toUpperCase().replace(/[^A-Z0-9]/g, '') || '';
      };
      const rawIdVal = (updatedContract as any).rawId;
      const id_ref = normalizeRef(maybePlateNorm) || (rawIdVal ? String(rawIdVal) : (updatedContract.contractNumber || ''));
      if (!id_ref) {
        console.warn('[ContractsDashboard] No id_referencia available for save');
        t.update({ title: 'Erro', description: 'Referência ausente para salvar.', variant: 'destructive' } as any);
        return;
      }

      const normVal = (v: any) => {
        if (v === null || v === undefined) return null;
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s || s.toLowerCase() === 'undefined') return null;
          return s;
        }
        return v;
      };

      const payload = {
        id_referencia: id_ref,
        estrategia: normVal(updatedContract.renewalStrategy),
        acao_usuario: normVal((updatedContract as any).acao_usuario),
        valor_aquisicao_zero: Boolean((updatedContract as any).purchasePrice === 0),
        valor_aquisicao: (updatedContract as any).purchasePrice ?? null,
        ultimo_valor_locacao: (updatedContract as any).monthlyValue ?? null,
        observacoes: (updatedContract as any).observation ?? null,
        modelo_aquisicao: (updatedContract as any).modelo_aquisicao ?? null,
      };

      console.debug('[ContractsDashboard] save payload', payload);
      const resp = await fetch('/api/save-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let saveJson: any = null;
      try {
        saveJson = await resp.clone().json();
      } catch (e) {
        try { saveJson = await resp.clone().text(); } catch { saveJson = null; }
      }
      console.debug('[ContractsDashboard] save response', resp.status, saveJson);

      if (!resp.ok) {
        const body = typeof saveJson === 'string' ? saveJson : JSON.stringify(saveJson);
        console.error('[ContractsDashboard] save-metadata failed:', resp.status, body);
        t.update({ title: 'Erro ao salvar', description: `Status ${resp.status}: ${body}`, variant: 'destructive' } as any);
        return;
      }

      // Refresh data so metadata from DB is reflected (API batch includes metadata now)
      // Also trigger server-side cache refresh for bi-data so UI shows latest metadata
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const bustResp = await fetch(`/api/bi-data?table=dim_contratos_locacao&bust=${Date.now()}`, { signal: controller.signal });
          if (!bustResp.ok) console.warn('[ContractsDashboard] bust fetch responded not ok', bustResp.status);
        } catch (e) {
          console.warn('[ContractsDashboard] bust fetch error', e);
        } finally {
          clearTimeout(timeout);
        }
      } catch (e) {
        console.warn('[ContractsDashboard] bust fetch outer error', e);
      }

      if (typeof refetch === 'function') {
        try { await (refetch as any)(); } catch (e) { console.warn('[ContractsDashboard] refetch failed', e); }
      }

      const durationMsg = saveJson && typeof saveJson === 'object' && saveJson.duration_ms ? ` (db ${saveJson.duration_ms}ms)` : '';
      t.update({ title: 'Sucesso!', description: `Alterações salvas com sucesso.${durationMsg}` } as any);
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
