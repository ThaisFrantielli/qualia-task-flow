-- Fase 4: Adicionar ticket_id à tabela whatsapp_conversations
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_ticket_id ON public.whatsapp_conversations(ticket_id);

-- Comentário
COMMENT ON COLUMN public.whatsapp_conversations.ticket_id IS 'Vinculação com ticket para rastreamento de conversas';