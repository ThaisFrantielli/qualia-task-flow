-- Criação da tabela whatsapp_config com políticas RLS corretas
-- Migration: Create WhatsApp configuration table

-- Criar tabela se não existe
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    qr_code TEXT,
    is_connected BOOLEAN DEFAULT false,
    connected_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Enable read access for all users" ON whatsapp_config;
DROP POLICY IF EXISTS "Enable insert access for all users" ON whatsapp_config;
DROP POLICY IF EXISTS "Enable update access for all users" ON whatsapp_config;
DROP POLICY IF EXISTS "Enable delete access for all users" ON whatsapp_config;

-- Criar políticas permissivas para permitir operações com chave anon
CREATE POLICY "Enable read access for all users" ON whatsapp_config
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON whatsapp_config
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON whatsapp_config
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON whatsapp_config
    FOR DELETE USING (true);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_whatsapp_config_updated_at ON whatsapp_config;
CREATE TRIGGER update_whatsapp_config_updated_at
    BEFORE UPDATE ON whatsapp_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();