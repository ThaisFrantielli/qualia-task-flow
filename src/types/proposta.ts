// =========================================
// Tipos para Propostas Comerciais e Precificação
// =========================================

export interface PricingParameters {
  id: string;
  
  // Taxas financeiras
  taxa_financiamento: number;
  taxa_sinistro: number;
  taxa_impostos: number;
  taxa_custo_administrativo: number;
  taxa_comissao_comercial: number;
  taxa_depreciacao_anual: number;
  taxa_ipva_anual: number;
  
  // Custos operacionais
  custo_manutencao_por_km: number;
  preco_combustivel_litro: number;
  consumo_medio_km_litro: number;
  km_mensal_padrao: number;
  custo_lavagem_mensal: number;
  custo_telemetria_mensal: number;
  
  // Implantação
  custo_emplacamento: number;
  custo_licenciamento: number;
  
  // Multas rescisão
  multa_0_12_meses: number;
  multa_13_24_meses: number;
  multa_25_36_meses: number;
  multa_37_48_meses: number;
  
  // Proteções
  participacao_perda_parcial: number;
  participacao_perda_total: number;
  
  user_id?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export type PropostaStatus = 
  | 'rascunho'
  | 'enviada'
  | 'em_negociacao'
  | 'aprovada'
  | 'rejeitada'
  | 'cancelada';

export interface Proposta {
  id: string;
  numero_proposta: number;
  numero_contrato?: string;
  
  // Cliente
  cliente_id?: string;
  cliente_nome: string;
  cliente_cnpj?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  cliente_endereco?: string;
  
  // Responsável
  vendedor_id?: string;
  vendedor_nome?: string;
  
  // Oportunidade
  oportunidade_id?: number;
  
  // Status e datas
  status: PropostaStatus;
  data_criacao: string;
  data_envio?: string;
  data_validade?: string;
  data_aprovacao?: string;
  
  // Condições gerais
  prazo_contrato_meses: number;
  vencimento_mensalidade: number;
  indice_reajuste: string;
  local_entrega?: string;
  local_devolucao?: string;
  
  // Veículos substitutos
  veiculos_provisorios: number;
  limite_substituicao_sinistro: number;
  limite_substituicao_manutencao: number;
  prazo_substituicao_sinistro_horas: number;
  prazo_substituicao_manutencao_horas: number;
  
  // Proteções
  protecao_roubo: boolean;
  protecao_furto: boolean;
  protecao_colisao: boolean;
  protecao_incendio: boolean;
  limite_danos_materiais: number;
  limite_danos_morais: number;
  limite_danos_pessoais: number;
  limite_app_passageiro: number;
  
  // Taxas
  taxa_administracao_multas: number;
  taxa_reembolsaveis: number;
  custo_remocao_forcada: number;
  custo_lavagem_simples: number;
  custo_higienizacao: number;
  
  // Totais
  valor_mensal_total: number;
  valor_anual_total: number;
  quantidade_veiculos: number;
  
  observacoes?: string;
  
  created_at: string;
  updated_at: string;
}

export interface PropostaVeiculo {
  id: string;
  proposta_id: string;
  
  modelo_id?: string;
  modelo_nome: string;
  montadora?: string;
  ano_modelo?: number;
  placa?: string;
  
  cor_id?: string;
  cor_nome?: string;
  cor_valor_adicional: number;
  
  valor_aquisicao: number;
  valor_revenda_estimado?: number;
  custo_acessorios: number;
  custo_emplacamento: number;
  custo_licenciamento: number;
  
  aluguel_unitario: number;
  franquia_km: number;
  valor_km_excedente: number;
  
  custo_manutencao_mensal?: number;
  custo_combustivel_mensal?: number;
  custo_ipva_mensal?: number;
  custo_lavagem_mensal?: number;
  custo_telemetria_mensal?: number;
  
  prazo_entrega?: string;
  data_entrega_efetiva?: string;
  
  quantidade: number;
  
  created_at: string;
}

export interface PropostaVeiculoItem {
  id: string;
  proposta_veiculo_id: string;
  item_id?: string;
  nome: string;
  valor: number;
  created_at: string;
}

export interface PropostaCenario {
  id: string;
  proposta_id: string;
  
  prazo_meses: number;
  modalidade: 'avista' | '50%' | '70%' | '100%';
  
  valor_mensal_por_veiculo?: number;
  valor_mensal_total?: number;
  valor_anual?: number;
  valor_contrato_total?: number;
  
  investimento_inicial?: number;
  receita_bruta_contrato?: number;
  custos_operacionais?: number;
  custos_financeiros?: number;
  margem_liquida?: number;
  roi_anual?: number;
  percentual_locacao_investimento?: number;
  payback_meses?: number;
  
  fluxo_caixa?: FluxoCaixaMensal[];
  
  is_selecionado: boolean;
  
  created_at: string;
}

export interface FluxoCaixaMensal {
  mes: number;
  receita: number;
  custos: number;
  resultado: number;
  acumulado: number;
}

export interface PropostaHistorico {
  id: string;
  proposta_id: string;
  tipo_evento: string;
  descricao?: string;
  detalhes?: Record<string, unknown>;
  user_id?: string;
  user_nome?: string;
  created_at: string;
}

export interface PropostaWithDetails extends Proposta {
  veiculos: PropostaVeiculoWithItems[];
  cenarios: PropostaCenario[];
  historico: PropostaHistorico[];
}

export interface PropostaVeiculoWithItems extends PropostaVeiculo {
  itens: PropostaVeiculoItem[];
}

// Status labels
export const PROPOSTA_STATUS_LABELS: Record<PropostaStatus, string> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  em_negociacao: 'Em Negociação',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  cancelada: 'Cancelada'
};

// Status colors
export const PROPOSTA_STATUS_COLORS: Record<PropostaStatus, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  enviada: 'bg-blue-500/10 text-blue-500',
  em_negociacao: 'bg-amber-500/10 text-amber-500',
  aprovada: 'bg-emerald-500/10 text-emerald-500',
  rejeitada: 'bg-destructive/10 text-destructive',
  cancelada: 'bg-muted text-muted-foreground'
};

// Prazos de contrato disponíveis
export const PRAZOS_CONTRATO = [12, 18, 24, 30, 36, 48] as const;

// Índices de reajuste
export const INDICES_REAJUSTE = ['IPCA', 'IGP-M', 'INPC', 'Fixo'] as const;
