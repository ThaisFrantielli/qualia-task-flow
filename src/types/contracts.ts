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
  // KmInformado alternative field name (for compatibility)
  KmInformado?: number;
  manufacturingYear: number;
  renewalStrategy: RenewalStrategy;
  observation?: string;
  // Idade do veículo em meses (quando disponível a partir de `dim_frota`)
  ageMonths?: number;
  // Km informado / atual (alguns registros usam `km` como alias)
  km?: number;
  // Valor FIPE atual trazido de `dim_frota`
  valorFipeAtual?: number;
  // Valor de compra do veículo (dim_frota)
  ValorCompra?: number;
  // Montadora (ex: Volkswagen, Toyota)
  montadora?: string;
  // Modelo do veículo (string original do dim_frota)
  modelo?: string;
  // Modelo alternativo vindo do JOIN (`modelo_veiculo`)
  modelo_veiculo?: string;
  // Modelo de aquisição salvo pelo usuário (campo novo)
  modelo_aquisicao?: string;
  // Categoria / Grupo do veículo
  // Grupo do Veículo (mapeado da coluna `GrupoVeiculo` em `dim_frota`)
  grupoVeiculo?: string;
  // Deprecated: campo antigo `categoria` mantido por compatibilidade.
  // Favor usar `grupoVeiculo` que corresponde à coluna `GrupoVeiculo`.
  categoria?: string;
  // Localização do veículo vinda de dim_frota (LocalizacaoVeiculo / Localizacao)
  localizacaoVeiculo?: string;
  // Campos adicionais
  commercialContract?: string;
  mainPlate?: string;
  initialDate?: string;
  finalDate?: string;
  periodMonths?: number;
  contractStatus?: string;
  closingDate?: string;
}
