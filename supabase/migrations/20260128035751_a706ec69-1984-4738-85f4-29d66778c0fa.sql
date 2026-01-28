-- =========================================
-- Sistema de Tickets - Tabelas Dinâmicas e Melhorias
-- =========================================

-- 1. Tabela de Origens de Lead (dinâmica)
CREATE TABLE IF NOT EXISTS public.ticket_origens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Análises Finais (dinâmica) - substitui enum
CREATE TABLE IF NOT EXISTS public.ticket_analises_finais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT 'HelpCircle',
  color TEXT DEFAULT 'text-gray-600',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Motivos (dinâmica) - para substituir enum
CREATE TABLE IF NOT EXISTS public.ticket_motivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Vínculos (OS, Faturas, Ocorrências)
CREATE TABLE IF NOT EXISTS public.ticket_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('ordem_servico', 'fatura', 'ocorrencia')),
  numero VARCHAR(100) NOT NULL,
  descricao TEXT,
  valor DECIMAL(15,2),
  data_documento DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Novas colunas na tabela tickets
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS contrato_comercial VARCHAR(100),
ADD COLUMN IF NOT EXISTS contrato_locacao VARCHAR(100),
ADD COLUMN IF NOT EXISTS veiculo_modelo VARCHAR(100),
ADD COLUMN IF NOT EXISTS veiculo_ano VARCHAR(10),
ADD COLUMN IF NOT EXISTS veiculo_cliente VARCHAR(100),
ADD COLUMN IF NOT EXISTS veiculo_km INTEGER,
ADD COLUMN IF NOT EXISTS analise_final_id UUID REFERENCES public.ticket_analises_finais(id),
ADD COLUMN IF NOT EXISTS origem_id UUID REFERENCES public.ticket_origens(id),
ADD COLUMN IF NOT EXISTS motivo_id UUID REFERENCES public.ticket_motivos(id),
ADD COLUMN IF NOT EXISTS data_primeira_interacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMPTZ;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_ticket_vinculos_ticket ON public.ticket_vinculos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_vinculos_tipo ON public.ticket_vinculos(tipo);
CREATE INDEX IF NOT EXISTS idx_tickets_origem ON public.tickets(origem_id);
CREATE INDEX IF NOT EXISTS idx_tickets_motivo ON public.tickets(motivo_id);
CREATE INDEX IF NOT EXISTS idx_tickets_analise ON public.tickets(analise_final_id);

-- 7. RLS Policies
ALTER TABLE public.ticket_origens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_analises_finais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_motivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_vinculos ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura para autenticados
CREATE POLICY "Origens visíveis para autenticados" ON public.ticket_origens
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Análises visíveis para autenticados" ON public.ticket_analises_finais
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Motivos visíveis para autenticados" ON public.ticket_motivos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vínculos visíveis para autenticados" ON public.ticket_vinculos
  FOR SELECT TO authenticated USING (true);

-- Políticas de escrita para gestão
CREATE POLICY "Origens editáveis por gestão" ON public.ticket_origens
  FOR ALL TO authenticated USING (public.is_gestao_or_above(auth.uid()));

CREATE POLICY "Análises editáveis por gestão" ON public.ticket_analises_finais
  FOR ALL TO authenticated USING (public.is_gestao_or_above(auth.uid()));

CREATE POLICY "Motivos editáveis por gestão" ON public.ticket_motivos
  FOR ALL TO authenticated USING (public.is_gestao_or_above(auth.uid()));

CREATE POLICY "Vínculos editáveis por autenticados" ON public.ticket_vinculos
  FOR ALL TO authenticated USING (true);

-- 8. Dados iniciais - Origens
INSERT INTO public.ticket_origens (value, label, sort_order) VALUES
('whatsapp', 'WhatsApp', 1),
('site', 'Site', 2),
('ligacao', 'Ligação', 3),
('redes_sociais', 'Redes Sociais', 4),
('email', 'E-mail', 5)
ON CONFLICT (value) DO NOTHING;

-- 9. Dados iniciais - Análises Finais (Dúvida em vez de Parcialmente)
INSERT INTO public.ticket_analises_finais (value, label, icon, color, sort_order) VALUES
('procedente', 'Procedente', 'CheckCircle', 'text-green-600', 1),
('improcedente', 'Improcedente', 'XCircle', 'text-red-600', 2),
('duvida', 'Dúvida', 'HelpCircle', 'text-yellow-600', 3)
ON CONFLICT (value) DO NOTHING;

-- 10. Dados iniciais - Motivos
INSERT INTO public.ticket_motivos (value, label, sort_order) VALUES
('contestacao_cobranca', 'Contestação de Cobrança', 1),
('demora_aprovacao_orcamento', 'Demora na Aprovação do Orçamento', 2),
('agendamento_erroneo', 'Agendamento Errôneo', 3),
('ma_qualidade_servico', 'Má Qualidade do Serviço', 4),
('problema_fornecedor', 'Problema com Fornecedor', 5),
('demora_atendimento', 'Demora no Atendimento', 6),
('multas_notificacoes', 'Multas e Notificações', 7),
('problemas_entrega_veiculo', 'Problemas na Entrega do Veículo', 8),
('problemas_veiculo', 'Problemas com o Veículo', 9),
('atendimento_comercial', 'Atendimento Comercial', 10),
('oportunidade_erronea', 'Oportunidade Aberta Erroneamente', 11),
('problemas_acesso', 'Problemas de Acesso', 12),
('problemas_terceiro', 'Problemas com Terceiro', 13),
('duvida', 'Dúvida', 14),
('outros', 'Outros', 15)
ON CONFLICT (value) DO NOTHING;

-- 11. Função para calcular tempo total do ticket
CREATE OR REPLACE FUNCTION public.calcular_tempo_ticket(ticket_id UUID)
RETURNS INTERVAL AS $$
DECLARE
  t_abertura TIMESTAMPTZ;
  t_conclusao TIMESTAMPTZ;
BEGIN
  SELECT created_at, data_conclusao INTO t_abertura, t_conclusao
  FROM public.tickets WHERE id = ticket_id;
  
  IF t_conclusao IS NOT NULL THEN
    RETURN t_conclusao - t_abertura;
  ELSE
    RETURN NOW() - t_abertura;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 12. Trigger para registrar primeira interação
CREATE OR REPLACE FUNCTION public.registrar_primeira_interacao()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza a data da primeira interação se ainda não tiver
  UPDATE public.tickets 
  SET data_primeira_interacao = NOW()
  WHERE id = NEW.ticket_id 
    AND data_primeira_interacao IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_primeira_interacao ON public.ticket_interacoes;
CREATE TRIGGER trigger_primeira_interacao
  AFTER INSERT ON public.ticket_interacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_primeira_interacao();

-- 13. Comentários
COMMENT ON TABLE public.ticket_origens IS 'Origens de lead configuráveis dinamicamente';
COMMENT ON TABLE public.ticket_analises_finais IS 'Classificações finais do ticket (Procedente, Improcedente, Dúvida)';
COMMENT ON TABLE public.ticket_motivos IS 'Motivos de reclamação configuráveis';
COMMENT ON TABLE public.ticket_vinculos IS 'Vínculos do ticket com OS, Faturas e Ocorrências';