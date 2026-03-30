-- Script 15: Adicionar funcionalidade de exclusão de tickets com justificativa
-- Soft delete para manter histórico e auditoria
-- Timestamp: 20260330000000

-- 1. Adicionar colunas de controle de exclusão à tabela tickets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'is_deleted') THEN
        ALTER TABLE public.tickets ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.tickets ADD COLUMN deleted_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'deleted_by') THEN
        ALTER TABLE public.tickets ADD COLUMN deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'deleted_reason') THEN
        ALTER TABLE public.tickets ADD COLUMN deleted_reason TEXT;
    END IF;
END $$;

-- 2. Criar índice para soft delete (para queries mais rápidas)
CREATE INDEX IF NOT EXISTS idx_tickets_is_deleted ON public.tickets(is_deleted, created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_deleted_at ON public.tickets(deleted_at);

-- 3. Criar tabela de auditoria para exclusões
CREATE TABLE IF NOT EXISTS public.ticket_deletions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    numero_ticket VARCHAR(50),
    titulo VARCHAR(255),
    cliente_id UUID,
    deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP DEFAULT NOW(),
    deleted_reason TEXT,
    deleted_by_name VARCHAR(255),
    ticket_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Criar índices para auditoria
CREATE INDEX IF NOT EXISTS idx_deletions_ticket_id ON public.ticket_deletions_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_deletions_deleted_by ON public.ticket_deletions_log(deleted_by);
CREATE INDEX IF NOT EXISTS idx_deletions_deleted_at ON public.ticket_deletions_log(deleted_at);

-- 5. RLS para ticket_deletions_log
ALTER TABLE public.ticket_deletions_log ENABLE ROW LEVEL SECURITY;

-- Política permissiva para desenvolvimento
-- DROP existing policy if present (some Postgres versions don't support CREATE POLICY IF NOT EXISTS)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.ticket_deletions_log;
CREATE POLICY "Allow all for authenticated users" ON public.ticket_deletions_log 
FOR ALL USING (true);

-- 6. Função para registrar exclusão
CREATE OR REPLACE FUNCTION log_ticket_deletion()
RETURNS TRIGGER AS $$
DECLARE
    deleted_user_name VARCHAR(255);
BEGIN
    IF NEW.is_deleted AND NOT COALESCE(OLD.is_deleted, FALSE) THEN
        -- Obter nome do usuário que deletou
        SELECT full_name INTO deleted_user_name 
        FROM profiles 
        WHERE id = NEW.deleted_by;
        
        -- Registrar na auditoria
        INSERT INTO ticket_deletions_log (
            ticket_id,
            numero_ticket,
            titulo,
            cliente_id,
            deleted_by,
            deleted_at,
            deleted_reason,
            deleted_by_name,
            ticket_data
        ) VALUES (
            NEW.id,
            NEW.numero_ticket,
            NEW.titulo,
            NEW.cliente_id,
            NEW.deleted_by,
            NEW.deleted_at,
            NEW.deleted_reason,
            deleted_user_name,
            row_to_json(NEW)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para registrar exclusão
DROP TRIGGER IF EXISTS trigger_log_ticket_deletion ON public.tickets;
CREATE TRIGGER trigger_log_ticket_deletion
AFTER UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION log_ticket_deletion();

-- 8. Função para exclusão lógica de ticket
CREATE OR REPLACE FUNCTION delete_ticket_soft(
    p_ticket_id UUID,
    p_deleted_by UUID,
    p_deleted_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.tickets
    SET 
        is_deleted = TRUE,
        deleted_at = NOW(),
        deleted_by = p_deleted_by,
        deleted_reason = p_deleted_reason,
        updated_at = NOW()
    WHERE id = p_ticket_id AND NOT is_deleted;
    
    -- Marcar departamentos pendentes como respondidos pela exclusão
    UPDATE public.ticket_departamentos
    SET
        respondido_em = COALESCE(respondido_em, NOW()),
        respondido_por = COALESCE(respondido_por, p_deleted_by),
        resposta = COALESCE(resposta, 'Ticket excluído pelo usuário')
    WHERE ticket_id = p_ticket_id AND respondido_em IS NULL;

    -- Opcional: fechar conversas relacionadas (se houver vínculo)
    -- UPDATE public.whatsapp_conversations SET status = 'closed' WHERE ticket_id = p_ticket_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Função para restaurar ticket excluído (se necessário)
CREATE OR REPLACE FUNCTION restore_ticket(p_ticket_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.tickets
    SET 
        is_deleted = FALSE,
        deleted_at = NULL,
        deleted_by = NULL,
        deleted_reason = NULL,
        updated_at = NOW()
    WHERE id = p_ticket_id AND is_deleted;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. View para tickets não deletados (para facilitar queries)
DROP VIEW IF EXISTS public.tickets_active CASCADE;
CREATE VIEW public.tickets_active AS
SELECT * FROM public.tickets
WHERE NOT is_deleted;

-- 11. View para tickets deletados
DROP VIEW IF EXISTS public.tickets_deleted CASCADE;
CREATE VIEW public.tickets_deleted AS
SELECT * FROM public.tickets
WHERE is_deleted;

-- 12. Comentários de documentação
COMMENT ON COLUMN public.tickets.is_deleted IS 'Marca se o ticket foi deletado (soft delete)';
COMMENT ON COLUMN public.tickets.deleted_at IS 'Data e hora da exclusão';
COMMENT ON COLUMN public.tickets.deleted_by IS 'ID do usuário que excluiu o ticket';
COMMENT ON COLUMN public.tickets.deleted_reason IS 'Justificativa/motivo da exclusão';
COMMENT ON TABLE public.ticket_deletions_log IS 'Log de auditoria para tickets excluídos';
