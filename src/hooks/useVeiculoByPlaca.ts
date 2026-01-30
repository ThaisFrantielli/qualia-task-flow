import { useMemo } from 'react';
import useBIData from '@/hooks/useBIData';
import { VeiculoBI } from '@/types/ticket-options';

interface VeiculoResult {
  modelo?: string;
  ano?: string;
  cliente?: string;
  km?: number;
  contratoLocacao?: string;
  contratoComercial?: string;
  cor?: string;
  status?: string;
  found: boolean;
}

export function useVeiculoByPlaca(placa: string): VeiculoResult {
  const { data: frota, loading } = useBIData<any[]>('dim_frota');

  const coerceKm = (value: unknown): number | undefined => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'string') {
      const cleaned = value.trim().replace(/[^0-9.,-]/g, '');
      if (!cleaned) return undefined;
      // pt-BR sometimes uses dot as thousands separator and comma as decimal separator
      const normalized = cleaned.replace(/\./g, '').replace(',', '.');
      const n = Number(normalized);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  };
  
  const result = useMemo((): VeiculoResult => {
    if (!placa || placa.length < 7 || !frota || loading) {
      return { found: false };
    }
    
    // Normalizar placa (remover caracteres especiais)
    const normalizedPlaca = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Buscar veículo na frota
    const veiculo = frota.find((v: VeiculoBI) => {
      const veiculoPlaca = (v.Placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      return veiculoPlaca === normalizedPlaca;
    });
    
    if (!veiculo) {
      return { found: false };
    }

    const kmRaw = veiculo.KmAtual ?? veiculo.km_atual ?? veiculo.Km;
    const km = coerceKm(kmRaw);
    
    return {
      modelo: veiculo.Modelo || veiculo.modelo,
      ano: veiculo.AnoModelo || veiculo.ano_modelo || veiculo.AnoFabricacao,
      cliente: veiculo.Cliente || veiculo.cliente || veiculo.NomeCliente,
      km,
      contratoLocacao: veiculo.ContratoLocacao || veiculo.contrato_locacao || veiculo.NumeroContrato,
      contratoComercial: veiculo.ContratoComercial || veiculo.contrato_comercial,
      cor: veiculo.Cor || veiculo.cor,
      status: veiculo.Status || veiculo.status || veiculo.Situacao,
      found: true
    };
  }, [placa, frota, loading]);
  
  return result;
}
