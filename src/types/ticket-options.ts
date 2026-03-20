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

export interface TicketDepartamentoOpcao {
  id: string;
  value: string;
  label: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface TicketPepsEtapa {
  id: string;
  fluxo_tipo: 'padrao' | 'comercial' | 'pos_vendas';
  value: string;
  label: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface TicketCustomFieldDefinition {
  id: string;
  field_key: string;
  label: string;
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'multiselect' | 'checkbox';
  entity: 'ticket';
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  placeholder?: string | null;
  help_text?: string | null;
  options: Array<{ value: string; label: string }>;
  validation_rules: Record<string, any>;
  created_at: string;
}

export interface TicketConfigAuditLog {
  id: string;
  table_name: string;
  record_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_fields: Record<string, any> | null;
  changed_by: string | null;
  changed_at: string;
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
