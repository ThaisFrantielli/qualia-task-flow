-- Script 5: Atualizar tabela tickets com campos de Pós-Vendas
-- Adiciona campos para classificação, SLA e métricas

-- Adicionar novos campos
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS tipo_reclamacao VARCHAR(50), -- produto, servico, entrega, qualidade, outro
ADD COLUMN IF NOT EXISTS procedencia VARCHAR(20), -- procedente, improcedente, parcial
ADD COLUMN IF NOT EXISTS solucao_aplicada TEXT,
ADD COLUMN IF NOT EXISTS acoes_corretivas TEXT,
ADD COLUMN IF NOT EXISTS tempo_primeira_resposta INTERVAL,
ADD COLUMN IF NOT EXISTS tempo_total_resolucao INTERVAL,
ADD COLUMN IF NOT EXISTS sla_primeira_resposta TIMESTAMP,
ADD COLUMN IF NOT EXISTS sla_resolucao TIMESTAMP,
ADD COLUMN IF NOT EXISTS feedback_cliente TEXT,
ADD COLUMN IF NOT EXISTS nota_cliente INTEGER CHECK (nota_cliente BETWEEN 1 AND 5);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tickets_tipo_reclamacao ON tickets(tipo_reclamacao);
CREATE INDEX IF NOT EXISTS idx_tickets_procedencia ON tickets(procedencia);
CREATE INDEX IF NOT EXISTS idx_tickets_sla_primeira_resposta ON tickets(sla_primeira_resposta);
CREATE INDEX IF NOT EXISTS idx_tickets_sla_resolucao ON tickets(sla_resolucao);

-- Comentários
COMMENT ON COLUMN tickets.tipo_reclamacao IS 'Tipo da reclamação: produto, servico, entrega, qualidade, outro';
COMMENT ON COLUMN tickets.procedencia IS 'Classificação final: procedente, improcedente, parcial';
COMMENT ON COLUMN tickets.solucao_aplicada IS 'Descrição da solução aplicada ao problema';
COMMENT ON COLUMN tickets.acoes_corretivas IS 'Ações corretivas implementadas';
COMMENT ON COLUMN tickets.sla_primeira_resposta IS 'Prazo para primeira resposta';
COMMENT ON COLUMN tickets.sla_resolucao IS 'Prazo para resolução completa';
COMMENT ON COLUMN tickets.nota_cliente IS 'Avaliação do cliente de 1 a 5';

-- Função para calcular SLA baseado na prioridade
CREATE OR REPLACE FUNCTION calcular_sla_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular SLA de primeira resposta baseado na prioridade
    NEW.sla_primeira_resposta := CASE NEW.prioridade
        WHEN 'urgente' THEN NEW.created_at + INTERVAL '1 hour'
        WHEN 'alta' THEN NEW.created_at + INTERVAL '2 hours'
        WHEN 'media' THEN NEW.created_at + INTERVAL '4 hours'
        WHEN 'baixa' THEN NEW.created_at + INTERVAL '8 hours'
        ELSE NEW.created_at + INTERVAL '4 hours'
    END;
    
    -- Calcular SLA de resolução baseado na prioridade
    NEW.sla_resolucao := CASE NEW.prioridade
        WHEN 'urgente' THEN NEW.created_at + INTERVAL '4 hours'
        WHEN 'alta' THEN NEW.created_at + INTERVAL '24 hours'
        WHEN 'media' THEN NEW.created_at + INTERVAL '48 hours'
        WHEN 'baixa' THEN NEW.created_at + INTERVAL '72 hours'
        ELSE NEW.created_at + INTERVAL '48 hours'
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para calcular SLA automaticamente
DROP TRIGGER IF EXISTS trigger_calcular_sla_ticket ON tickets;
CREATE TRIGGER trigger_calcular_sla_ticket
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION calcular_sla_ticket();

-- Atualizar SLA para tickets existentes
UPDATE tickets 
SET 
    sla_primeira_resposta = CASE prioridade
        WHEN 'urgente' THEN created_at + INTERVAL '1 hour'
        WHEN 'alta' THEN created_at + INTERVAL '2 hours'
        WHEN 'media' THEN created_at + INTERVAL '4 hours'
        WHEN 'baixa' THEN created_at + INTERVAL '8 hours'
        ELSE created_at + INTERVAL '4 hours'
    END,
    sla_resolucao = CASE prioridade
        WHEN 'urgente' THEN created_at + INTERVAL '4 hours'
        WHEN 'alta' THEN created_at + INTERVAL '24 hours'
        WHEN 'media' THEN created_at + INTERVAL '48 hours'
        WHEN 'baixa' THEN created_at + INTERVAL '72 hours'
        ELSE created_at + INTERVAL '48 hours'
    END
WHERE sla_primeira_resposta IS NULL;
