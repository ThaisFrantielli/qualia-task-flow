-- Script 3: Criar tabelas para funis personalizáveis
-- Este script cria a estrutura para gerenciar funis customizados

-- Tabela de tipos de funil
CREATE TABLE IF NOT EXISTS funis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) NOT NULL DEFAULT 'custom', -- 'vendas', 'suporte', 'custom'
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Tabela de estágios do funil
CREATE TABLE IF NOT EXISTS funil_estagios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funil_id UUID REFERENCES funis(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    ordem INTEGER NOT NULL,
    cor VARCHAR(20) DEFAULT '#3b82f6', -- hex color (azul padrão)
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(funil_id, ordem)
);

-- Adicionar funil_id e estagio_id às oportunidades
ALTER TABLE oportunidades 
ADD COLUMN IF NOT EXISTS funil_id UUID REFERENCES funis(id),
ADD COLUMN IF NOT EXISTS estagio_id UUID REFERENCES funil_estagios(id);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_funil_estagios_funil ON funil_estagios(funil_id);
CREATE INDEX IF NOT EXISTS idx_funil_estagios_ordem ON funil_estagios(funil_id, ordem);
CREATE INDEX IF NOT EXISTS idx_oportunidades_funil ON oportunidades(funil_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_estagio ON oportunidades(estagio_id);

-- Comentários
COMMENT ON TABLE funis IS 'Tipos de funil personalizáveis (vendas, suporte, etc)';
COMMENT ON TABLE funil_estagios IS 'Estágios de cada funil';
COMMENT ON COLUMN funil_estagios.ordem IS 'Ordem de exibição do estágio no funil';
COMMENT ON COLUMN funil_estagios.cor IS 'Cor do estágio em formato hexadecimal';

-- Inserir funis padrão
INSERT INTO funis (nome, descricao, tipo, ativo) VALUES
('Funil de Vendas Padrão', 'Funil padrão para processo de vendas', 'vendas', true),
('Funil de Suporte', 'Funil para tickets de suporte', 'suporte', true)
ON CONFLICT DO NOTHING;

-- Inserir estágios do funil de vendas
INSERT INTO funil_estagios (funil_id, nome, ordem, cor)
SELECT 
    f.id,
    estagio.nome,
    estagio.ordem,
    estagio.cor
FROM funis f
CROSS JOIN (
    VALUES 
        ('Prospecção', 1, '#6366f1'),
        ('Qualificação', 2, '#8b5cf6'),
        ('Proposta', 3, '#ec4899'),
        ('Negociação', 4, '#f59e0b'),
        ('Fechamento', 5, '#10b981'),
        ('Ganho', 6, '#22c55e'),
        ('Perdido', 7, '#ef4444')
) AS estagio(nome, ordem, cor)
WHERE f.tipo = 'vendas'
ON CONFLICT DO NOTHING;

-- Inserir estágios do funil de suporte
INSERT INTO funil_estagios (funil_id, nome, ordem, cor)
SELECT 
    f.id,
    estagio.nome,
    estagio.ordem,
    estagio.cor
FROM funis f
CROSS JOIN (
    VALUES 
        ('Novo', 1, '#3b82f6'),
        ('Em Análise', 2, '#8b5cf6'),
        ('Em Atendimento', 3, '#f59e0b'),
        ('Resolvido', 4, '#10b981'),
        ('Fechado', 5, '#6b7280')
) AS estagio(nome, ordem, cor)
WHERE f.tipo = 'suporte'
ON CONFLICT DO NOTHING;
