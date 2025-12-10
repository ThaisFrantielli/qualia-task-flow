-- Migration: Sistema de Templates de Mensagem WhatsApp
-- Created: 2024-12-09

-- Tabela de templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('saudacao', 'faq', 'encerramento', 'followup', 'confirmacao', 'outro')),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- Array de variáveis como {name, description, example}
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0
);

-- Índices
CREATE INDEX idx_whatsapp_templates_category ON public.whatsapp_templates(category);
CREATE INDEX idx_whatsapp_templates_active ON public.whatsapp_templates(is_active);
CREATE INDEX idx_whatsapp_templates_created_by ON public.whatsapp_templates(created_by);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_templates_updated_at();

-- RLS Policies
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver templates ativos
CREATE POLICY "Authenticated users can view active templates"
  ON public.whatsapp_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true OR created_by = auth.uid());

-- Usuários podem criar templates
CREATE POLICY "Authenticated users can create templates"
  ON public.whatsapp_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Usuários podem editar seus próprios templates
CREATE POLICY "Users can update own templates"
  ON public.whatsapp_templates
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Usuários podem deletar seus próprios templates
CREATE POLICY "Users can delete own templates"
  ON public.whatsapp_templates
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Inserir templates padrão
INSERT INTO public.whatsapp_templates (name, category, content, variables, created_by) VALUES
  (
    'Saudação Inicial',
    'saudacao',
    'Olá {{nome}}! 👋 Seja bem-vindo(a) à {{empresa}}. Como posso ajudá-lo(a) hoje?',
    '[{"name": "nome", "description": "Nome do cliente", "example": "João"}, {"name": "empresa", "description": "Nome da empresa", "example": "Quality Conecta"}]'::jsonb,
    NULL
  ),
  (
    'Horário de Atendimento',
    'faq',
    'Nosso horário de atendimento é de segunda a sexta, das {{horario_inicio}} às {{horario_fim}}. Sábados: {{horario_sabado}}.',
    '[{"name": "horario_inicio", "description": "Horário de início", "example": "08:00"}, {"name": "horario_fim", "description": "Horário de término", "example": "18:00"}, {"name": "horario_sabado", "description": "Horário de sábado", "example": "08:00 às 12:00"}]'::jsonb,
    NULL
  ),
  (
    'Encerramento Satisfeito',
    'encerramento',
    'Fico feliz em ter ajudado, {{nome}}! Se precisar de algo mais, estou à disposição. Tenha um ótimo dia! 😊',
    '[{"name": "nome", "description": "Nome do cliente", "example": "João"}]'::jsonb,
    NULL
  ),
  (
    'Aguardando Informação',
    'followup',
    'Olá {{nome}}, estou aguardando o(a) senhor(a) me enviar {{informacao_pendente}} para dar continuidade ao seu atendimento.',
    '[{"name": "nome", "description": "Nome do cliente", "example": "João"}, {"name": "informacao_pendente", "description": "Informação que falta", "example": "o número do protocolo"}]'::jsonb,
    NULL
  ),
  (
    'Confirmação de Agendamento',
    'confirmacao',
    '✅ Seu agendamento está confirmado para {{data}} às {{hora}}. Local: {{local}}. Até lá!',
    '[{"name": "data", "description": "Data do agendamento", "example": "15/12/2024"}, {"name": "hora", "description": "Horário", "example": "14:30"}, {"name": "local", "description": "Local do atendimento", "example": "Matriz - Brasília"}]'::jsonb,
    NULL
  ),
  (
    'Ausência Temporária',
    'outro',
    'Recebi sua mensagem! No momento estou indisponível, mas retornarei em breve. Previsão de retorno: {{previsao_retorno}}.',
    '[{"name": "previsao_retorno", "description": "Quando vai retornar", "example": "30 minutos"}]'::jsonb,
    NULL
  );

-- Comentários
COMMENT ON TABLE public.whatsapp_templates IS 'Templates de mensagens WhatsApp com variáveis dinâmicas';
COMMENT ON COLUMN public.whatsapp_templates.variables IS 'Array JSON com definição de variáveis: [{name, description, example}]';
COMMENT ON COLUMN public.whatsapp_templates.usage_count IS 'Contador de quantas vezes o template foi usado';
