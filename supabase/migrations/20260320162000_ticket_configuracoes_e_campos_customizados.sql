-- =====================================================
-- Tickets: classificacoes configuraveis + campos customizados
-- =====================================================

-- 1) Catalogo de departamentos para tickets (configuravel)
CREATE TABLE IF NOT EXISTS public.ticket_departamento_opcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Etapas PEPS configuraveis por fluxo
CREATE TABLE IF NOT EXISTS public.ticket_peps_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fluxo_tipo TEXT NOT NULL CHECK (fluxo_tipo IN ('padrao', 'comercial', 'pos_vendas')),
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fluxo_tipo, value)
);

-- 3) Definicao de campos customizados de ticket
CREATE TABLE IF NOT EXISTS public.ticket_custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'datetime', 'select', 'multiselect', 'checkbox')),
  entity TEXT NOT NULL DEFAULT 'ticket' CHECK (entity = 'ticket'),
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  placeholder TEXT,
  help_text TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Valores customizados no ticket (json por chave)
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 5) Indices
CREATE INDEX IF NOT EXISTS idx_ticket_departamento_opcoes_active_order
  ON public.ticket_departamento_opcoes (is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_ticket_peps_etapas_fluxo_active_order
  ON public.ticket_peps_etapas (fluxo_tipo, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_ticket_custom_field_definitions_active_order
  ON public.ticket_custom_field_definitions (entity, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_tickets_custom_fields_gin
  ON public.tickets USING gin (custom_fields);

-- 6) Triggers de updated_at
DROP TRIGGER IF EXISTS set_ticket_departamento_opcoes_updated_at ON public.ticket_departamento_opcoes;
CREATE TRIGGER set_ticket_departamento_opcoes_updated_at
BEFORE UPDATE ON public.ticket_departamento_opcoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_ticket_peps_etapas_updated_at ON public.ticket_peps_etapas;
CREATE TRIGGER set_ticket_peps_etapas_updated_at
BEFORE UPDATE ON public.ticket_peps_etapas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_ticket_custom_field_definitions_updated_at ON public.ticket_custom_field_definitions;
CREATE TRIGGER set_ticket_custom_field_definitions_updated_at
BEFORE UPDATE ON public.ticket_custom_field_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) RLS
ALTER TABLE public.ticket_departamento_opcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_peps_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_custom_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ticket departamentos visiveis para autenticados" ON public.ticket_departamento_opcoes;
CREATE POLICY "Ticket departamentos visiveis para autenticados"
ON public.ticket_departamento_opcoes
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Ticket departamentos editaveis por gestao" ON public.ticket_departamento_opcoes;
CREATE POLICY "Ticket departamentos editaveis por gestao"
ON public.ticket_departamento_opcoes
FOR ALL TO authenticated
USING (public.is_gestao_or_above(auth.uid()))
WITH CHECK (public.is_gestao_or_above(auth.uid()));

DROP POLICY IF EXISTS "Ticket PEPS visivel para autenticados" ON public.ticket_peps_etapas;
CREATE POLICY "Ticket PEPS visivel para autenticados"
ON public.ticket_peps_etapas
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Ticket PEPS editavel por gestao" ON public.ticket_peps_etapas;
CREATE POLICY "Ticket PEPS editavel por gestao"
ON public.ticket_peps_etapas
FOR ALL TO authenticated
USING (public.is_gestao_or_above(auth.uid()))
WITH CHECK (public.is_gestao_or_above(auth.uid()));

DROP POLICY IF EXISTS "Ticket custom fields visiveis para autenticados" ON public.ticket_custom_field_definitions;
CREATE POLICY "Ticket custom fields visiveis para autenticados"
ON public.ticket_custom_field_definitions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Ticket custom fields editaveis por gestao" ON public.ticket_custom_field_definitions;
CREATE POLICY "Ticket custom fields editaveis por gestao"
ON public.ticket_custom_field_definitions
FOR ALL TO authenticated
USING (public.is_gestao_or_above(auth.uid()))
WITH CHECK (public.is_gestao_or_above(auth.uid()));

-- 8) Seed de departamentos (print do negocio)
INSERT INTO public.ticket_departamento_opcoes (value, label, sort_order) VALUES
('manutencao', 'Manutenção', 1),
('central_atendimento', 'Central de atendimento', 2),
('documentacao', 'Documentação', 3),
('operacao', 'Operação', 4),
('comercial', 'Comercial', 5),
('financeiro', 'Financeiro', 6),
('operacao_sp', 'Operação SP', 7),
('nao_se_aplica', 'Não se aplica', 8)
ON CONFLICT (value) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;

-- 9) Seed PEPS (print do negocio)
INSERT INTO public.ticket_peps_etapas (fluxo_tipo, value, label, sort_order) VALUES
('padrao', 'lead_inicial', 'Lead inicial', 1),
('padrao', 'analise_caso', 'Análise do caso', 2),
('padrao', 'aguardando_cliente', 'Aguardando cliente', 3),
('padrao', 'envio_proposta', 'Envio de proposta', 4),

('comercial', 'analise_caso', 'Análise do caso', 1),
('comercial', 'agendamento_devolucao_veiculo', 'Agendamento de devolução do veículo', 2),
('comercial', 'renovacao_contrato', 'Renovação de contrato', 3),
('comercial', 'analise_documentos', 'Análise de documentos', 4),
('comercial', 'assinatura_contrato', 'Assinatura do contrato', 5),
('comercial', 'agendamento_entrega_veiculo', 'Agendamento de entrega do veículo', 6),

('pos_vendas', 'analise_caso', 'Análise do caso', 1),
('pos_vendas', 'aguardando_departamento', 'Aguardando departamento', 2),
('pos_vendas', 'aberta_erroneamente', 'Aberta erroneamente', 3),
('pos_vendas', 'concluida', 'Concluída', 4),
('pos_vendas', 'duvida', 'Dúvida', 5)
ON CONFLICT (fluxo_tipo, value) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;

-- 10) Ajuste de labels de origem e motivo com o catalogo mais recente
INSERT INTO public.ticket_origens (value, label, sort_order) VALUES
('Whatsapp', 'WhatsApp', 1),
('Site', 'Site', 2),
('Ligação', 'Ligação', 3),
('Redes Sociais', 'Redes Sociais', 4),
('E-mail', 'E-mail', 5)
ON CONFLICT (value) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;

INSERT INTO public.ticket_motivos (value, label, sort_order) VALUES
('contestacao_cobranca', 'Contestação cobrança', 1),
('demora_aprovacao_orcamento', 'Demora na aprovação do orçamento', 2),
('agendamento_erroneo', 'Agendamento errôneo', 3),
('ma_qualidade_servico', 'Má qualidade do serviço', 4),
('problema_fornecedor', 'Problema com fornecedor', 5),
('demora_atendimento', 'Demora no atendimento', 6),
('multas_notificacoes', 'Multas e notificações', 7),
('problemas_entrega_veiculo', 'Problemas na entrega do veículo', 8),
('problemas_veiculo', 'Problemas com o veículo', 9),
('atendimento_comercial', 'Atendimento comercial', 10),
('oportunidade_erronea', 'Oportunidade aberta erroneamente', 11),
('problemas_acesso', 'Problemas de acesso', 12),
('problemas_terceiro', 'Problemas com terceiro', 13),
('duvida', 'Dúvida', 14),
('outros', 'Outros', 15)
ON CONFLICT (value) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;

COMMENT ON TABLE public.ticket_departamento_opcoes IS 'Catalogo configuravel de departamentos para abertura/encaminhamento de tickets';
COMMENT ON TABLE public.ticket_peps_etapas IS 'Catalogo configuravel de etapas PEPS por fluxo (padrao, comercial, pos-vendas)';
COMMENT ON TABLE public.ticket_custom_field_definitions IS 'Definicao de campos customizados para tickets (futuras extensoes sem deploy)';
COMMENT ON COLUMN public.tickets.custom_fields IS 'Valores de campos customizados do ticket em JSONB';
