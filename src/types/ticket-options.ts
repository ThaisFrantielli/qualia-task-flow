// =========================================
// Tipos para Opções Dinâmicas de Tickets
// =========================================

export interface TicketOrigem {
  id: string;
  value: string;
  label: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface TicketAnaliseFinal {
  id: string;
  value: string;
  label: string;
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface TicketMotivo {
  id: string;
  value: string;
  label: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface TicketVinculo {
  id: string;
  ticket_id: string;
  tipo: 'ordem_servico' | 'fatura' | 'ocorrencia';
  numero: string;
  descricao?: string;
  valor?: number;
  data_documento?: string;
  created_at: string;
}

export type TicketVinculoTipo = TicketVinculo['tipo'];

export const VINCULO_LABELS: Record<TicketVinculoTipo, string> = {
  ordem_servico: 'Ordem de Serviço',
  fatura: 'Fatura',
  ocorrencia: 'Ocorrência'
};

export interface VeiculoBI {
  Placa?: string;
  Modelo?: string;
  AnoModelo?: string;
  AnoFabricacao?: string;
  Cliente?: string;
  KmAtual?: number;
  ContratoLocacao?: string;
  ContratoComercial?: string;
  Cor?: string;
  Status?: string;
}
