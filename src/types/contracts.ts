export type RenewalStrategy =
  | 'NO_RENEW'
  | 'NO_RENEW_RETURN'
  | 'RENEW_SAME'
  | 'RENEW_SWAP_SEMINOVO'
  | 'RENEW_SWAP_ZERO'
  | 'SUBLEASE'
  | 'WAIT_PERIOD'
  | 'UNDEFINED';

export const RenewalStrategyLabel: Record<RenewalStrategy, string> = {
  NO_RENEW: 'Não Renova',
  NO_RENEW_RETURN: 'Não Renova (Retorna pra Frota)',
  RENEW_SAME: 'Renova com mesmo Veiculo',
  RENEW_SWAP_SEMINOVO: 'Renova com Troca (Seminovo)',
  RENEW_SWAP_ZERO: 'Renova com troca (zero)',
  SUBLEASE: 'Sublocado',
  WAIT_PERIOD: 'Aguardando período para análise',
  UNDEFINED: 'Indefinido'
};

export interface Contract {
  id: string;
  contractNumber: string;
  clientName: string;
  plate: string;
  model: string;
  type: string;
  startDate: string;
  endDate: string;
  monthlyValue: number;
  currentFipe: number;
  purchasePrice: number;
  currentKm: number;
  manufacturingYear: number;
  renewalStrategy: RenewalStrategy;
  observation?: string;
  // Idade do veículo em meses (quando disponível a partir de `dim_frota`)
  ageMonths?: number;
  // Valor FIPE atual trazido de `dim_frota`
  valorFipeAtual?: number;
  // Montadora (ex: Volkswagen, Toyota)
  montadora?: string;
  // Modelo do veículo (string original do dim_frota)
  modelo?: string;
  // Categoria / Grupo do veículo
  categoria?: string;
  // Campos adicionais
  commercialContract?: string;
  mainPlate?: string;
  initialDate?: string;
  finalDate?: string;
  periodMonths?: number;
  contractStatus?: string;
  closingDate?: string;
}
