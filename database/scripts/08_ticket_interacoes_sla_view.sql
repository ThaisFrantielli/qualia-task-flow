-- Script 8: Atualizar tabela ticket_interacoes e criar view de SLA

-- Adicionar campos a ticket_interacoes
ALTER TABLE ticket_interacoes
ADD COLUMN IF NOT EXISTS departamento VARCHAR(50),
ADD COLUMN IF NOT EXISTS anexos JSONB;

-- Comentários
COMMENT ON COLUMN ticket_interacoes.departamento IS 'Departamento que fez a interação';
COMMENT ON COLUMN ticket_interacoes.anexos IS 'Array de anexos da interação (JSON)';

-- Criar view de SLA para monitoramento
CREATE OR REPLACE VIEW tickets_sla AS
SELECT 
    t.id,
    t.numero_ticket,
    t.titulo,
    t.status,
    t.prioridade,
    t.created_at,
    t.sla_primeira_resposta,
    t.sla_resolucao,
    t.tempo_primeira_resposta,
    t.tempo_total_resolucao,
    
    -- Cliente
    c.nome_fantasia as cliente_nome,
    c.razao_social as cliente_razao,
    
    -- Tempo decorrido desde criação (em horas)
    EXTRACT(EPOCH FROM (NOW() - t.created_at))/3600 as horas_abertas,
    
    -- Status SLA primeira resposta
    CASE 
        WHEN t.tempo_primeira_resposta IS NOT NULL THEN 'CUMPRIDO'
        WHEN t.sla_primeira_resposta < NOW() THEN 'VENCIDO'
        ELSE 'EM_ANDAMENTO'
    END as status_sla_primeira_resposta,
    
    -- Tempo restante para primeira resposta (em minutos)
    CASE 
        WHEN t.tempo_primeira_resposta IS NOT NULL THEN NULL
        ELSE EXTRACT(EPOCH FROM (t.sla_primeira_resposta - NOW()))/60
    END as minutos_restantes_primeira_resposta,
    
    -- Status SLA resolução
    CASE 
        WHEN t.status IN ('resolvido', 'fechado') AND t.tempo_total_resolucao IS NOT NULL THEN 'CUMPRIDO'
        WHEN t.status IN ('resolvido', 'fechado') AND t.sla_resolucao < NOW() THEN 'VENCIDO'
        WHEN t.status NOT IN ('resolvido', 'fechado') AND t.sla_resolucao < NOW() THEN 'VENCIDO'
        ELSE 'EM_ANDAMENTO'
    END as status_sla_resolucao,
    
    -- Tempo restante para resolução (em horas)
    CASE 
        WHEN t.status IN ('resolvido', 'fechado') THEN NULL
        ELSE EXTRACT(EPOCH FROM (t.sla_resolucao - NOW()))/3600
    END as horas_restantes_resolucao,
    
    -- Departamentos envolvidos (count)
    (SELECT COUNT(*) FROM ticket_departamentos td WHERE td.ticket_id = t.id) as total_departamentos,
    
    -- Departamentos pendentes (sem resposta)
    (SELECT COUNT(*) FROM ticket_departamentos td WHERE td.ticket_id = t.id AND td.respondido_em IS NULL) as departamentos_pendentes
    
FROM tickets t
LEFT JOIN clientes c ON t.cliente_id = c.id;

-- Comentário
COMMENT ON VIEW tickets_sla IS 'View para monitoramento de SLA dos tickets com cálculos em tempo real';

-- Criar índice na view (materialized view para performance - opcional)
-- Para usar materialized view, descomente abaixo:
-- DROP MATERIALIZED VIEW IF EXISTS tickets_sla_materialized;
-- CREATE MATERIALIZED VIEW tickets_sla_materialized AS SELECT * FROM tickets_sla;
-- CREATE INDEX idx_tickets_sla_mat_status ON tickets_sla_materialized(status);
-- CREATE INDEX idx_tickets_sla_mat_prioridade ON tickets_sla_materialized(prioridade);
