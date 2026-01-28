// =========================================
// Tipos para Templates de Propostas PDF
// =========================================

export interface PropostaTemplate {
  id: string;
  nome: string;
  descricao?: string;
  is_padrao: boolean;
  is_active: boolean;
  
  // Visual
  logo_url?: string;
  cor_primaria: string;
  cor_secundaria: string;
  cor_texto: string;
  slogan: string;
  imagem_capa_url?: string;
  
  // Minuta de contrato padrão
  minuta_padrao_url?: string;
  minuta_padrao_nome?: string;
  
  // Configurações das seções
  secoes_config: SecoesConfig;
  
  // Metadados
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SecoesConfig {
  capa: { visivel: boolean };
  proposta: { visivel: boolean };
  beneficios: { visivel: boolean };
  faq: { visivel: boolean };
  comparativo: { visivel: boolean };
  minuta: { visivel: boolean };
}

export interface PropostaTemplateFAQ {
  id: string;
  template_id: string;
  pergunta: string;
  resposta: string;
  ordem: number;
  is_active: boolean;
  created_at: string;
}

export interface PropostaTemplateBeneficio {
  id: string;
  template_id: string;
  titulo: string;
  descricao?: string;
  icone: string;
  ordem: number;
  is_active: boolean;
  created_at: string;
}

export interface PropostaArquivoGerado {
  id: string;
  proposta_id: string;
  template_id?: string;
  
  // Arquivo gerado
  arquivo_url: string;
  arquivo_nome: string;
  tamanho_bytes?: number;
  
  // Minuta específica (caso a caso)
  minuta_especifica_url?: string;
  minuta_especifica_nome?: string;
  
  // Controle de versão
  versao: number;
  
  // Metadados
  gerado_por?: string;
  created_at: string;
}

export interface PropostaTemplateWithDetails extends PropostaTemplate {
  beneficios: PropostaTemplateBeneficio[];
  faqs: PropostaTemplateFAQ[];
}

// Ícones disponíveis para benefícios
export const BENEFICIO_ICONES = [
  'Shield',
  'Car',
  'Wrench',
  'FileText',
  'Clock',
  'DollarSign',
  'CheckCircle',
  'Star',
  'Heart',
  'Zap',
  'Award',
  'Truck',
  'Phone',
  'MapPin',
  'Calendar',
  'Users'
] as const;

export type BeneficioIcone = typeof BENEFICIO_ICONES[number];
