// Types for Survey System - Quality Frotas

export type SurveyType = 'comercial' | 'entrega' | 'manutencao' | 'devolucao';

export interface SurveyCampaign {
  id: string;
  name: string;
  description: string | null;
  type: SurveyType;
  is_active: boolean;
  welcome_message: string | null;
  csat_question: string;
  factors_label: string | null;
  influencing_factors: string[];
  include_nps: boolean;
  nps_question: string | null;
  include_open_feedback: boolean;
  open_feedback_question: string | null;
  send_via: 'whatsapp' | 'email' | 'manual';
  auto_send_delay_hours: number;
  reminder_enabled: boolean;
  reminder_delay_hours: number;
  max_reminders: number;
  expires_after_days: number;
  created_at: string;
  updated_at: string;
  created_by_id: string | null;
}

export interface Survey {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  type: SurveyType;
  license_plate: string | null;
  driver_name: string | null;
  created_at: string;
  sent_at: string | null;
  responded_at: string | null;
  created_by_id: string | null;
  cliente_id: string | null;
  campaign_id: string | null;
  sent_via: 'whatsapp' | 'email' | 'manual';
  reminder_count: number;
  expires_at: string | null;
  follow_up_status: 'none' | 'pending' | 'in_progress' | 'completed';
  follow_up_notes: string | null;
  follow_up_by_id: string | null;
  follow_up_at: string | null;
}

export interface SurveyResponse {
  id: number;
  survey_id: string;
  survey_type: SurveyType;
  csat_score: number | null;
  nps_score: number | null;
  influencing_factors: string[] | null;
  other_factor_text: string | null;
  feedback_comment: string | null;
  open_feedback: string | null;
  response_time_seconds: number | null;
  created_at: string;
}

export interface SurveyWithResponse extends Survey {
  response?: SurveyResponse;
  cliente?: {
    id: string;
    nome_fantasia: string | null;
    razao_social: string | null;
  };
}

// Metrics types
export interface CSATMetrics {
  total: number;
  satisfied: number; // scores 4 and 5
  neutral: number; // score 3
  dissatisfied: number; // scores 1 and 2
  percentage: number;
  trend: number; // change from previous period
}

export interface NPSMetrics {
  total: number;
  promoters: number; // scores 9-10
  passives: number; // scores 7-8
  detractors: number; // scores 0-6
  score: number; // % promoters - % detractors
  trend: number;
}

export interface SurveyMetrics {
  csat: CSATMetrics;
  nps: NPSMetrics;
  responseRate: number;
  avgResponseTime: number; // in hours
  totalSent: number;
  totalResponded: number;
  totalPending: number;
  detractorsPending: number;
  byType: {
    type: SurveyType;
    csat: number;
    count: number;
  }[];
  byPeriod: {
    date: string;
    csat: number;
    nps: number;
    count: number;
  }[];
  topFactors: {
    factor: string;
    count: number;
    percentage: number;
  }[];
}

// CSAT level helpers
export type CSATLevel = 'excellent' | 'good' | 'attention' | 'critical';

export const getCSATLevel = (percentage: number): CSATLevel => {
  if (percentage >= 85) return 'excellent';
  if (percentage >= 75) return 'good';
  if (percentage >= 50) return 'attention';
  return 'critical';
};

export const getCSATLevelColor = (level: CSATLevel): string => {
  switch (level) {
    case 'excellent': return 'text-green-600';
    case 'good': return 'text-blue-600';
    case 'attention': return 'text-yellow-600';
    case 'critical': return 'text-red-600';
  }
};

export const getCSATLevelBg = (level: CSATLevel): string => {
  switch (level) {
    case 'excellent': return 'bg-green-100';
    case 'good': return 'bg-blue-100';
    case 'attention': return 'bg-yellow-100';
    case 'critical': return 'bg-red-100';
  }
};

// NPS level helpers
export type NPSLevel = 'excellent' | 'good' | 'attention' | 'critical';

export const getNPSLevel = (score: number): NPSLevel => {
  if (score >= 50) return 'excellent';
  if (score >= 30) return 'good';
  if (score >= 0) return 'attention';
  return 'critical';
};

export const getNPSLevelColor = (level: NPSLevel): string => {
  switch (level) {
    case 'excellent': return 'text-green-600';
    case 'good': return 'text-blue-600';
    case 'attention': return 'text-yellow-600';
    case 'critical': return 'text-red-600';
  }
};

// Survey type labels
export const surveyTypeLabels: Record<SurveyType, string> = {
  comercial: 'Pós-Contrato',
  entrega: 'Entrega de Veículo',
  manutencao: 'Manutenção',
  devolucao: 'Devolução',
};

// CSAT star labels
export const csatLabels: Record<number, string> = {
  1: 'Muito Insatisfeito',
  2: 'Insatisfeito',
  3: 'Neutro',
  4: 'Satisfeito',
  5: 'Muito Satisfeito',
};

export const csatDescriptions: Record<number, string> = {
  1: 'Falha grave no serviço que gerou grande transtorno',
  2: 'A experiência ficou abaixo do esperado',
  3: 'O serviço foi "OK", sem diferencial',
  4: 'Boa experiência, processo fluido',
  5: 'Experiência excepcional, superou expectativas',
};
