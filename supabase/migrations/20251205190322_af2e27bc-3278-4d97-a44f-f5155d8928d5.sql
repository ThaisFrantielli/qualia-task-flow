-- =============================================
-- SISTEMA DE SATISFAÇÃO - QUALITY FROTAS
-- =============================================

-- 1. Nova tabela para campanhas de pesquisa
CREATE TABLE IF NOT EXISTS public.survey_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type survey_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  welcome_message TEXT,
  csat_question TEXT NOT NULL,
  factors_label TEXT DEFAULT 'O que mais influenciou sua nota?',
  influencing_factors JSONB DEFAULT '[]'::jsonb,
  include_nps BOOLEAN DEFAULT false,
  nps_question TEXT,
  include_open_feedback BOOLEAN DEFAULT false,
  open_feedback_question TEXT,
  send_via TEXT DEFAULT 'whatsapp' CHECK (send_via IN ('whatsapp', 'email', 'manual')),
  auto_send_delay_hours INTEGER DEFAULT 24,
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_delay_hours INTEGER DEFAULT 48,
  max_reminders INTEGER DEFAULT 2,
  expires_after_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID REFERENCES profiles(id)
);

-- 2. Tabela para templates de perguntas customizadas
CREATE TABLE IF NOT EXISTS public.survey_question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES survey_campaigns(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('csat', 'nps', 'multiple_choice', 'text', 'rating')),
  options JSONB DEFAULT '[]'::jsonb,
  order_position INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Adicionar novas colunas à tabela surveys
ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id),
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES survey_campaigns(id),
ADD COLUMN IF NOT EXISTS sent_via TEXT DEFAULT 'manual' CHECK (sent_via IN ('whatsapp', 'email', 'manual')),
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS follow_up_status TEXT DEFAULT 'none' CHECK (follow_up_status IN ('none', 'pending', 'in_progress', 'completed')),
ADD COLUMN IF NOT EXISTS follow_up_notes TEXT,
ADD COLUMN IF NOT EXISTS follow_up_by_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;

-- 4. Adicionar campos extras à tabela survey_responses
ALTER TABLE public.survey_responses
ADD COLUMN IF NOT EXISTS open_feedback TEXT,
ADD COLUMN IF NOT EXISTS response_time_seconds INTEGER;

-- 5. Enable RLS
ALTER TABLE public.survey_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_question_templates ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies para survey_campaigns
CREATE POLICY "Authenticated users can view active campaigns"
ON public.survey_campaigns FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage campaigns"
ON public.survey_campaigns FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
);

-- 7. RLS Policies para survey_question_templates
CREATE POLICY "Authenticated users can view question templates"
ON public.survey_question_templates FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage question templates"
ON public.survey_question_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
);

-- 8. Inserir campanhas padrão baseadas no documento Quality Frotas
INSERT INTO public.survey_campaigns (name, description, type, welcome_message, csat_question, factors_label, influencing_factors, include_nps, nps_question, include_open_feedback, open_feedback_question, send_via, auto_send_delay_hours) VALUES
(
  'Pesquisa Comercial',
  'Avalia a clareza, agilidade e atendimento da equipe comercial após assinatura do contrato',
  'comercial',
  'Seja muito bem-vindo(a) à Quality Frotas! Agradecemos por nos escolher para cuidar da sua mobilidade.',
  'Em uma escala de 1 a 5, qual o seu nível de satisfação com o processo de negociação e contratação com a Quality Frotas?',
  'O que mais influenciou sua nota?',
  '["Agilidade do consultor(a)", "Clareza da proposta", "Flexibilidade na negociação", "Facilidade do contrato"]'::jsonb,
  false,
  NULL,
  false,
  NULL,
  'email',
  24
),
(
  'Pesquisa de Entrega',
  'Mede a qualidade do primeiro contato físico com o serviço após retirada do veículo',
  'entrega',
  'Esperamos que sua jornada com o novo veículo seja excelente!',
  'Em uma escala de 1 a 5, qual seu nível de satisfação com a entrega do seu veículo?',
  'O que mais se destacou (positivo ou negativo)?',
  '["Agilidade no atendimento", "Limpeza e condição do veículo", "Clareza das informações passadas", "Cordialidade da equipe"]'::jsonb,
  false,
  NULL,
  false,
  NULL,
  'whatsapp',
  3
),
(
  'Pesquisa de Manutenção',
  'Avalia eficiência e comunicação durante a manutenção do veículo',
  'manutencao',
  'Vimos que a manutenção do seu veículo foi concluída. Sua opinião é essencial para a qualidade dos nossos parceiros e processos.',
  'Qual seu nível de satisfação com o serviço de manutenção realizado?',
  'O que mais influenciou sua nota?',
  '["Qualidade do reparo executado", "Cumprimento do prazo combinado", "Comunicação sobre andamento do serviço, orçamento e serviços realizados", "Atendimento e cordialidade da equipe (oficina)"]'::jsonb,
  false,
  NULL,
  false,
  NULL,
  'whatsapp',
  24
),
(
  'Pesquisa Final de Lealdade',
  'Mede lealdade geral (NPS) e satisfação com o processo de devolução',
  'devolucao',
  'Agradecemos pela parceria e confiança na Quality Frotas durante todo este período!',
  'Avaliando o processo de devolução do veículo, qual seu nível de satisfação?',
  'O que mais influenciou sua nota sobre o processo de devolução?',
  '["Agilidade e rapidez no atendimento", "Facilidade e simplicidade do processo", "Transparência na vistoria e encerramento do contrato", "Atendimento e cordialidade da equipe"]'::jsonb,
  true,
  'Em uma escala de 0 a 10, o quão provável você é de recomendar a Quality Frotas a um amigo ou colega?',
  true,
  'Existe algo que poderíamos ter feito melhor em sua jornada conosco?',
  'whatsapp',
  24
);

-- 9. Trigger para atualizar updated_at em survey_campaigns
CREATE OR REPLACE FUNCTION update_survey_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_survey_campaigns_updated_at
BEFORE UPDATE ON public.survey_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_survey_campaigns_updated_at();

-- 10. Índices para performance
CREATE INDEX IF NOT EXISTS idx_surveys_cliente_id ON public.surveys(cliente_id);
CREATE INDEX IF NOT EXISTS idx_surveys_campaign_id ON public.surveys(campaign_id);
CREATE INDEX IF NOT EXISTS idx_surveys_type ON public.surveys(type);
CREATE INDEX IF NOT EXISTS idx_surveys_responded_at ON public.surveys(responded_at);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_campaigns_type ON public.survey_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_survey_campaigns_is_active ON public.survey_campaigns(is_active);