/**
 * Tipos para o módulo de Analytics
 * Define interfaces fortes para dados de BI
 */

// ============= GENÉRICOS =============

export type AnyObject = Record<string, unknown>;

export interface BIMetadata {
  generated_at?: string;
  chunked?: boolean;
  totalParts?: number;
  totalRecords?: number;
  [key: string]: unknown;
}

// ============= VEÍCULOS / FROTA =============

export interface VeiculoFrota {
  Placa: string;
  Modelo: string;
  Montadora?: string;
  AnoFabricacao?: number;
  AnoModelo?: number;
  Status: string;
  Categoria?: string;
  Combustivel?: string;
  Cor?: string;
  Chassi?: string;
  Renavam?: string;
  ValorAquisicao?: number;
  DataAquisicao?: string;
  DataVenda?: string;
  ValorVenda?: number;
  KmAtual?: number;
  Localizacao?: string;
  ClienteAtual?: string;
  ContratoAtual?: string;
  DiasNoStatus?: number;
  ValorLocacaoMensal?: number;
  DataInicioLocacao?: string;
  DataFimLocacao?: string;
}

export type StatusVeiculo = 
  | 'LOCADO'
  | 'DISPONIVEL'
  | 'MANUTENÇÃO'
  | 'RESERVA'
  | 'VENDIDO'
  | 'BAIXADO'
  | 'ROUBO / FURTO'
  | 'SINISTRO PERDA TOTAL';

export type CategoriaVeiculo = 'Produtiva' | 'Improdutiva' | 'Inativa';

// ============= MANUTENÇÃO =============

export interface OrdemServico {
  IdOrdemServico: number;
  IdOcorrencia?: number;
  TipoEvento?: string;
  DataEvento?: string;
  Placa: string;
  Modelo?: string;
  TipoOcorrencia?: string;
  Fornecedor?: string;
  Cliente?: string;
  CustoTotalOS?: number;
  CustoPecas?: number;
  CustoServicos?: number;
  LeadTimeTotalDias?: number;
  LeadTimeOficina?: number;
  Chegadas?: number;
  Conclusoes?: number;
  DataAbertura?: string;
  DataConclusao?: string;
  Status?: string;
  Descricao?: string;
}

export type TipoManutencao = 'Preventiva' | 'Corretiva' | 'Sinistro' | 'Recall';
export type GravidadeOS = 'Baixa' | 'Média' | 'Alta' | 'Crítica';

// ============= FINANCEIRO =============

export interface Faturamento {
  IdFaturamento?: number;
  DataFaturamento: string;
  Cliente?: string;
  ClienteId?: string;
  Contrato?: string;
  ContratoId?: string;
  Placa?: string;
  Valor: number;
  TipoReceita?: string;
  Status?: string;
  DataVencimento?: string;
  DataPagamento?: string;
  DiasAtraso?: number;
}

export interface DespesaOperacional {
  IdDespesa?: number;
  DataDespesa: string;
  Categoria: string;
  Subcategoria?: string;
  Valor: number;
  Placa?: string;
  Contrato?: string;
  Fornecedor?: string;
  Descricao?: string;
}

// ============= CLIENTES =============

export interface Cliente {
  ClienteId: string;
  RazaoSocial?: string;
  NomeFantasia?: string;
  CNPJ?: string;
  CPF?: string;
  Email?: string;
  Telefone?: string;
  Endereco?: string;
  Cidade?: string;
  Estado?: string;
  Status?: string;
  DataCadastro?: string;
  SegmentoMercado?: string;
  Porte?: string;
  QtdVeiculos?: number;
  ValorMensalTotal?: number;
  ReceitaTotal?: number;
}

// ============= CONTRATOS =============

export interface Contrato {
  ContratoId: string;
  NumeroContrato?: string;
  ClienteId?: string;
  ClienteNome?: string;
  DataInicio: string;
  DataFim?: string;
  Status: string;
  TipoContrato?: string;
  ValorMensal?: number;
  QtdVeiculos?: number;
  PrazoMeses?: number;
  IndiceReajuste?: string;
}

export type StatusContrato = 'Ativo' | 'Encerrado' | 'Cancelado' | 'Em Negociação';

// ============= MULTAS =============

export interface Multa {
  IdOcorrencia: number;
  Ocorrencia: string;
  Placa: string;
  DataInfracao: string;
  TipoInfracao?: string;
  Condutor?: string;
  ValorMulta?: number;
  ValorReembolsado?: number;
  DataLimitePagamento?: string;
  ValorDesconto?: number;
  Status?: string;
  DescricaoInfracao?: string;
  CodigoInfracao?: string;
  OrgaoAutuador?: string;
  Pontuacao?: number;
  Modelo?: string;
  AutoInfracao?: string;
  Latitude?: number;
  Longitude?: number;
  Cidade?: string;
  Estado?: string;
}

// ============= TIMELINE / HISTÓRICO =============

export interface EventoTimeline {
  Placa: string;
  TipoEvento: string;
  DataEvento: string;
  Detalhe1?: string;
  Detalhe2?: string;
  ValorEvento?: number;
  Usuario?: string;
}

// ============= AUDITORIA =============

export interface AuditoriaRegistro {
  Tabela: string;
  Campo: string;
  TipoProblema: string;
  Gravidade: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  QtdAfetados: number;
  ImpactoFinanceiro?: number;
  Descricao?: string;
  DataDeteccao?: string;
}

// ============= CHURN =============

export interface ChurnRegistro {
  ClienteId: string;
  ClienteNome?: string;
  DataChurn?: string;
  MotivoChurn?: string;
  ValorPerda?: number;
  TempoCliente?: number;
  UltimoContato?: string;
  RiscoChurn?: number;
}

// ============= KPIs =============

export interface KPIData {
  label: string;
  value: number;
  previousValue?: number;
  target?: number;
  unit?: 'currency' | 'percent' | 'number' | 'days';
  trend?: 'up' | 'down' | 'stable';
  trendIsGood?: boolean;
}

// ============= CHART DATA =============

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: unknown;
}

export interface TimeSeriesDataPoint {
  date: string;
  label: string;
  value: number;
  [key: string]: unknown;
}

// ============= FILTROS =============

export interface AnalyticsFilter {
  key: string;
  values: string[];
}

export interface DateRangeFilter {
  startDate: Date | null;
  endDate: Date | null;
  preset?: string;
}

// ============= DRILL-DOWN =============

export type DrillLevel = 'year' | 'month' | 'day';

export interface DrillState {
  level: DrillLevel;
  year?: number;
  month?: number;
  day?: number;
}
