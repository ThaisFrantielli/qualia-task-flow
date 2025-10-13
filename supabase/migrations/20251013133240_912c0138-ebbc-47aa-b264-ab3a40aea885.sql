-- Adicionar coluna whatsapp_number para identificar qual número da empresa está sendo usado
ALTER TABLE whatsapp_conversations 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT NOT NULL DEFAULT '0000000000';

-- Criar índice para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_cliente_number 
ON whatsapp_conversations(cliente_id, whatsapp_number);

-- Atualizar valores existentes com um número padrão (deve ser ajustado manualmente depois)
COMMENT ON COLUMN whatsapp_conversations.whatsapp_number IS 'Número do WhatsApp da empresa que está conversando com o cliente';