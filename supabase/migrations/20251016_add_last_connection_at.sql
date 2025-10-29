-- Add missing last_connection_at column to whatsapp_config table
-- Migration: Add last_connection_at field

-- Add the missing column if it doesn't exist
ALTER TABLE whatsapp_config 
ADD COLUMN IF NOT EXISTS last_connection_at TIMESTAMPTZ;

-- Update any existing connected records to have a connection timestamp
UPDATE whatsapp_config 
SET last_connection_at = updated_at 
WHERE is_connected = true AND last_connection_at IS NULL;