-- Migration: Update WhatsApp config table for multiple instances
-- Date: 2025-10-08

-- Add new columns for multi-instance support
ALTER TABLE whatsapp_config 
ADD COLUMN IF NOT EXISTS instance_name TEXT,
ADD COLUMN IF NOT EXISTS instance_type TEXT DEFAULT 'whatsapp-web',
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'internal';

-- Update existing policies to work with multiple instances
DROP POLICY IF EXISTS "Enable read access for all users" ON whatsapp_config;
DROP POLICY IF EXISTS "Enable insert access for all users" ON whatsapp_config;
DROP POLICY IF EXISTS "Enable update access for all users" ON whatsapp_config;
DROP POLICY IF EXISTS "Enable delete access for all users" ON whatsapp_config;

-- Create new policies for multi-instance support
CREATE POLICY "Enable read access for all users" ON whatsapp_config
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON whatsapp_config
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON whatsapp_config
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON whatsapp_config
    FOR DELETE USING (true);

-- Insert sample instances (similar to Eloca system)
INSERT INTO whatsapp_config (
    id, 
    instance_name, 
    instance_type, 
    phone_number, 
    status, 
    provider,
    is_connected,
    created_at,
    updated_at
) VALUES 
    ('instance-1', 'WhatsApp Principal', 'whatsapp-web', '556199042311', 'disconnected', 'internal', false, now(), now()),
    ('instance-2', 'WhatsApp Suporte', 'whatsapp-web', '556134623640', 'disconnected', 'internal', false, now(), now()),
    ('instance-3', 'WhatsApp Vendas', 'whatsapp-web', '556191208218', 'disconnected', 'internal', false, now(), now())
ON CONFLICT (id) DO UPDATE SET
    instance_name = EXCLUDED.instance_name,
    instance_type = EXCLUDED.instance_type,
    phone_number = EXCLUDED.phone_number,
    status = EXCLUDED.status,
    provider = EXCLUDED.provider,
    updated_at = now();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_instance_type ON whatsapp_config(instance_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_status ON whatsapp_config(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_phone ON whatsapp_config(phone_number);