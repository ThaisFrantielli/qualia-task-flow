-- Adicionar campos faltantes na tabela whatsapp_conversations
ALTER TABLE whatsapp_conversations 
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS last_message TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Atualizar dados existentes se houver
UPDATE whatsapp_conversations 
SET customer_phone = whatsapp_number 
WHERE customer_phone IS NULL AND whatsapp_number IS NOT NULL;

-- Adicionar campos faltantes na tabela whatsapp_messages
ALTER TABLE whatsapp_messages 
  ADD COLUMN IF NOT EXISTS sender_phone TEXT,
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Atualizar trigger para updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_messages_updated_at_trigger ON whatsapp_messages;
CREATE TRIGGER update_whatsapp_messages_updated_at_trigger
BEFORE UPDATE ON whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_messages_updated_at();

-- Adicionar campos faltantes na tabela clientes se necessário
ALTER TABLE clientes 
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_customer_phone ON whatsapp_conversations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at);

-- Habilitar realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;