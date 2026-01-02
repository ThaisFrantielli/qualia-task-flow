// =========================================
// Tipos para Catálogo de Modelos de Veículos
// =========================================

export interface Montadora {
  id: string;
  nome: string;
  logo_url?: string;
  pais_origem?: string;
  ativo: boolean;
  created_at: string;
}

export interface ModeloVeiculo {
  id: string;
  codigo?: string;
  nome: string;
  montadora: string;
  categoria?: string;
  
  ano_modelo: number;
  ano_fabricacao?: number;
  
  preco_publico: number;
  percentual_desconto: number;
  valor_final?: number;
  valor_km_adicional?: number; // Valor por KM excedente (R$/km) - movido de km_packages
  
  motor?: string;
  potencia?: string;
  transmissao?: string;
  combustivel?: string;
  consumo_urbano?: number;
  consumo_rodoviario?: number;
  
  ativo: boolean;
  imagem_url?: string;
  observacoes?: string;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ModeloCor {
  id: string;
  modelo_id: string;
  nome_cor: string;
  codigo_cor?: string;
  tipo_cor: 'sólida' | 'metálica' | 'perolizada';
  valor_adicional: number;
  is_padrao: boolean;
  hex_color?: string;
  created_at: string;
}

export interface ModeloItemAdicional {
  id: string;
  modelo_id: string;
  tipo: 'acessorio' | 'opcional' | 'pacote';
  nome: string;
  descricao?: string;
  valor: number;
  obrigatorio: boolean;
  incluso_padrao: boolean;
  created_at: string;
}

export interface ModeloVeiculoWithDetails extends ModeloVeiculo {
  cores: ModeloCor[];
  itens: ModeloItemAdicional[];
}

// Opções para categorias de veículos
export const CATEGORIAS_VEICULO = [
  'Sedan',
  'SUV',
  'Hatch',
  'Pickup',
  'Van',
  'Utilitário',
  'Executivo',
  'Compacto'
] as const;

// Opções para tipos de cor
export const TIPOS_COR = [
  { value: 'sólida', label: 'Sólida' },
  { value: 'metálica', label: 'Metálica' },
  { value: 'perolizada', label: 'Perolizada' }
] as const;

// Opções para tipos de item adicional
export const TIPOS_ITEM_ADICIONAL = [
  { value: 'acessorio', label: 'Acessório' },
  { value: 'opcional', label: 'Opcional' },
  { value: 'pacote', label: 'Pacote' }
] as const;

// Opções para combustível
export const TIPOS_COMBUSTIVEL = [
  'Flex',
  'Gasolina',
  'Diesel',
  'Elétrico',
  'Híbrido'
] as const;

// Opções para transmissão
export const TIPOS_TRANSMISSAO = [
  'Manual',
  'Automático',
  'Automatizado',
  'CVT'
] as const;
