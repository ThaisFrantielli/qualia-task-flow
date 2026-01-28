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
    
    return {
      modelo: veiculo.Modelo || veiculo.modelo,
      ano: veiculo.AnoModelo || veiculo.ano_modelo || veiculo.AnoFabricacao,
      cliente: veiculo.Cliente || veiculo.cliente || veiculo.NomeCliente,
      km: veiculo.KmAtual || veiculo.km_atual || veiculo.Km,
      contratoLocacao: veiculo.ContratoLocacao || veiculo.contrato_locacao || veiculo.NumeroContrato,
      contratoComercial: veiculo.ContratoComercial || veiculo.contrato_comercial,
      cor: veiculo.Cor || veiculo.cor,
      status: veiculo.Status || veiculo.status || veiculo.Situacao,
      found: true
    };
  }, [placa, frota, loading]);
  
  return result;
}
