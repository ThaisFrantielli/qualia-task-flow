-- Script 2: Expandir status_triagem e adicionar campos de rastreamento
-- Este script expande os valores possíveis e adiciona campos de controle
-- EXECUTAR APÓS o script 01_add_status_triagem.sql

-- Adicionar campos para rastrear último atendimento
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS ultimo_atendimento_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ultimo_atendente_id UUID REFERENCES profiles(id);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_clientes_ultimo_atendimento ON clientes(ultimo_atendimento_at);
CREATE INDEX IF NOT EXISTS idx_clientes_ultimo_atendente ON clientes(ultimo_atendente_id);

-- Comentários
COMMENT ON COLUMN clientes.ultimo_atendimento_at IS 'Data/hora do último atendimento realizado';
COMMENT ON COLUMN clientes.ultimo_atendente_id IS 'ID do último atendente que atendeu este cliente';
