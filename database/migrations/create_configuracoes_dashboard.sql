-- ============================================================================
-- Tabela: configuracoes_dashboard_manutencao
-- Descrição: Armazena configurações personalizadas para os dashboards de manutenção
-- Autor: Sistema BluConecta
-- Data: 2026-01-07
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracoes_dashboard_manutencao (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER, -- FK para tabela de usuários (se existir)
    tipo_configuracao VARCHAR(50) NOT NULL, -- 'metas', 'capacidade_fornecedor', 'alerta'
    
    -- Metas de Performance
    meta_lead_time_total_dias INTEGER DEFAULT 5,
    meta_lead_time_agendamento_dias INTEGER DEFAULT 1,
    meta_lead_time_oficina_dias INTEGER DEFAULT 3,
    meta_taxa_preventiva_pct DECIMAL(5,2) DEFAULT 60.00,
    meta_sla_cumprido_pct DECIMAL(5,2) DEFAULT 85.00,
    meta_custo_km_maximo DECIMAL(10,2) DEFAULT NULL,
    meta_ticket_medio DECIMAL(10,2) DEFAULT NULL,
    
    -- Capacidade de Fornecedores
    fornecedor_id INTEGER, -- FK para dim_fornecedores
    fornecedor_nome VARCHAR(255),
    capacidade_mensal_os INTEGER DEFAULT 50,
    capacidade_diaria_os INTEGER DEFAULT 5,
    
    -- Configurações de Alertas
    alerta_os_critica_dias INTEGER DEFAULT 10, -- OS com mais de X dias = alerta vermelho
    alerta_os_atencao_dias INTEGER DEFAULT 5, -- OS com mais de X dias = alerta amarelo
    alerta_etapa_travada_dias INTEGER DEFAULT 5, -- Mesma etapa por X dias = alerta
    alerta_fornecedor_lead_time_variacao_pct DECIMAL(5,2) DEFAULT 30.00, -- Variação de +X% = alerta
    alerta_retrabalho_max_pct DECIMAL(5,2) DEFAULT 15.00, -- >X% retrabalho = alerta
    alerta_custo_anomalo_multiplicador DECIMAL(5,2) DEFAULT 3.00, -- Custo >X× média = alerta
    
    -- Alertas Habilitados (flags booleanas)
    alerta_os_critica_ativo BOOLEAN DEFAULT TRUE,
    alerta_os_atencao_ativo BOOLEAN DEFAULT TRUE,
    alerta_etapa_travada_ativo BOOLEAN DEFAULT TRUE,
    alerta_fornecedor_lead_time_ativo BOOLEAN DEFAULT TRUE,
    alerta_retrabalho_ativo BOOLEAN DEFAULT TRUE,
    alerta_custo_anomalo_ativo BOOLEAN DEFAULT TRUE,
    alerta_sem_movimentacao_72h_ativo BOOLEAN DEFAULT TRUE,
    
    -- Preferências de Visualização
    periodo_padrao VARCHAR(20) DEFAULT 'ultimos_30_dias', -- 'ultimos_7_dias', 'ultimos_30_dias', 'mes_atual', 'ano_atual'
    granularidade_padrao VARCHAR(10) DEFAULT 'day', -- 'day', 'month', 'year'
    mostrar_canceladas BOOLEAN DEFAULT FALSE,
    exportar_com_formatacao BOOLEAN DEFAULT TRUE,
    
    -- Metadados
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE,
    
    -- Índices e constraints
    CONSTRAINT chk_tipo_configuracao CHECK (tipo_configuracao IN ('metas', 'capacidade_fornecedor', 'alerta', 'visualizacao'))
);

-- Índices para performance
CREATE INDEX idx_config_dash_usuario ON configuracoes_dashboard_manutencao(usuario_id);
CREATE INDEX idx_config_dash_tipo ON configuracoes_dashboard_manutencao(tipo_configuracao);
CREATE INDEX idx_config_dash_fornecedor ON configuracoes_dashboard_manutencao(fornecedor_id);
CREATE INDEX idx_config_dash_ativo ON configuracoes_dashboard_manutencao(ativo);

-- Comentários das colunas
COMMENT ON TABLE configuracoes_dashboard_manutencao IS 'Configurações personalizadas dos dashboards de manutenção por usuário';
COMMENT ON COLUMN configuracoes_dashboard_manutencao.tipo_configuracao IS 'Tipo da configuração: metas, capacidade_fornecedor, alerta, visualizacao';
COMMENT ON COLUMN configuracoes_dashboard_manutencao.meta_lead_time_total_dias IS 'Meta de lead time total em dias (padrão: 5 dias)';
COMMENT ON COLUMN configuracoes_dashboard_manutencao.meta_taxa_preventiva_pct IS 'Meta de taxa de manutenção preventiva em % (padrão: 60%)';
COMMENT ON COLUMN configuracoes_dashboard_manutencao.capacidade_mensal_os IS 'Capacidade mensal do fornecedor em número de OS';
COMMENT ON COLUMN configuracoes_dashboard_manutencao.alerta_os_critica_dias IS 'OS com mais de X dias são consideradas críticas (padrão: 10 dias)';

-- ============================================================================
-- Inserir configurações padrão (globais - sem usuario_id)
-- ============================================================================

INSERT INTO configuracoes_dashboard_manutencao (
    tipo_configuracao,
    meta_lead_time_total_dias,
    meta_lead_time_agendamento_dias,
    meta_lead_time_oficina_dias,
    meta_taxa_preventiva_pct,
    meta_sla_cumprido_pct,
    alerta_os_critica_dias,
    alerta_os_atencao_dias,
    alerta_etapa_travada_dias,
    alerta_fornecedor_lead_time_variacao_pct,
    alerta_retrabalho_max_pct,
    alerta_custo_anomalo_multiplicador
) VALUES (
    'metas',
    5, -- Lead time total: 5 dias
    1, -- Lead time agendamento: 1 dia
    3, -- Lead time oficina: 3 dias
    60.00, -- Taxa preventiva: 60%
    85.00, -- SLA cumprido: 85%
    10, -- OS crítica: >10 dias
    5, -- OS atenção: >5 dias
    5, -- Etapa travada: >5 dias mesma etapa
    30.00, -- Variação fornecedor: +30%
    15.00, -- Retrabalho máximo: 15%
    3.00 -- Custo anômalo: >3× média
);

-- ============================================================================
-- Função para atualizar updated_at automaticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_configuracoes_dashboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_configuracoes_dashboard_updated_at
    BEFORE UPDATE ON configuracoes_dashboard_manutencao
    FOR EACH ROW
    EXECUTE FUNCTION update_configuracoes_dashboard_updated_at();

-- ============================================================================
-- Views auxiliares para consulta fácil
-- ============================================================================

-- View: Metas ativas
CREATE OR REPLACE VIEW v_metas_dashboard AS
SELECT 
    meta_lead_time_total_dias,
    meta_lead_time_agendamento_dias,
    meta_lead_time_oficina_dias,
    meta_taxa_preventiva_pct,
    meta_sla_cumprido_pct,
    meta_custo_km_maximo,
    meta_ticket_medio,
    updated_at
FROM configuracoes_dashboard_manutencao
WHERE tipo_configuracao = 'metas' AND ativo = TRUE
ORDER BY updated_at DESC
LIMIT 1;

-- View: Alertas ativos
CREATE OR REPLACE VIEW v_alertas_dashboard AS
SELECT 
    alerta_os_critica_dias,
    alerta_os_atencao_dias,
    alerta_etapa_travada_dias,
    alerta_fornecedor_lead_time_variacao_pct,
    alerta_retrabalho_max_pct,
    alerta_custo_anomalo_multiplicador,
    alerta_os_critica_ativo,
    alerta_os_atencao_ativo,
    alerta_etapa_travada_ativo,
    alerta_fornecedor_lead_time_ativo,
    alerta_retrabalho_ativo,
    alerta_custo_anomalo_ativo,
    alerta_sem_movimentacao_72h_ativo
FROM configuracoes_dashboard_manutencao
WHERE tipo_configuracao = 'alerta' AND ativo = TRUE
ORDER BY updated_at DESC
LIMIT 1;

-- View: Capacidades de fornecedores
CREATE OR REPLACE VIEW v_capacidade_fornecedores AS
SELECT 
    fornecedor_id,
    fornecedor_nome,
    capacidade_mensal_os,
    capacidade_diaria_os,
    updated_at
FROM configuracoes_dashboard_manutencao
WHERE tipo_configuracao = 'capacidade_fornecedor' AND ativo = TRUE
ORDER BY fornecedor_nome;

-- ============================================================================
-- Grants (ajustar conforme usuários do sistema)
-- ============================================================================

-- GRANT SELECT, INSERT, UPDATE ON configuracoes_dashboard_manutencao TO app_user;
-- GRANT USAGE, SELECT ON SEQUENCE configuracoes_dashboard_manutencao_id_seq TO app_user;
-- GRANT SELECT ON v_metas_dashboard, v_alertas_dashboard, v_capacidade_fornecedores TO app_user;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================

-- Para executar este script localmente no PostgreSQL:
-- psql -h localhost -p 5432 -U postgres -d BluConecta_Dw -f create_configuracoes_dashboard.sql
