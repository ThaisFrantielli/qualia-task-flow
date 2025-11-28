-- Script 1: Criar coluna status_triagem (executar PRIMEIRO)
-- Este script adiciona a coluna status_triagem à tabela clientes

ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS status_triagem VARCHAR(50) DEFAULT 'aguardando';

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_clientes_status_triagem ON clientes(status_triagem);

-- Comentário explicativo
COMMENT ON COLUMN clientes.status_triagem IS 'Status do lead na triagem: aguardando, em_atendimento, atendido, descartado, comercial, pos_venda';
