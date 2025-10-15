-- FASE 2: Limpar conversações duplicadas e adicionar índice único

-- Deletar conversações duplicadas, mantendo apenas a mais recente
DELETE FROM whatsapp_conversations
WHERE id NOT IN (
  SELECT DISTINCT ON (cliente_id, whatsapp_number) id
  FROM whatsapp_conversations
  ORDER BY cliente_id, whatsapp_number, created_at DESC
);

-- Criar índice único para prevenir duplicatas futuras
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_conversations_unique 
ON whatsapp_conversations(cliente_id, whatsapp_number);

-- Atualizar customer_phone das conversações existentes com dados da tabela clientes
UPDATE whatsapp_conversations wc
SET 
  customer_phone = COALESCE(c.whatsapp_number, c.telefone, ''),
  customer_name = COALESCE(c.nome_fantasia, c.razao_social, 'Cliente'),
  updated_at = NOW()
FROM clientes c
WHERE wc.cliente_id = c.id
  AND (wc.customer_phone IS NULL OR wc.customer_phone = '');