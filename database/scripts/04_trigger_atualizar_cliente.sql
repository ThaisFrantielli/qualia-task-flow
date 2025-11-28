-- Script 4: Criar trigger para atualizar cliente ao fechar ticket
-- Este script cria a lógica automática de atualização de status

-- Função para atualizar status do cliente quando ticket é fechado
CREATE OR REPLACE FUNCTION atualizar_cliente_apos_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o ticket foi fechado (mudou de outro status para 'fechado')
    IF NEW.status = 'fechado' AND (OLD.status IS NULL OR OLD.status != 'fechado') THEN
        UPDATE clientes 
        SET 
            status_triagem = 'atendido',
            ultimo_atendimento_at = NOW(),
            ultimo_atendente_id = NEW.atendente_id
        WHERE id = NEW.cliente_id;
    END IF;
    
    -- Se o ticket foi reaberto
    IF NEW.status != 'fechado' AND OLD.status = 'fechado' THEN
        UPDATE clientes 
        SET status_triagem = 'em_atendimento'
        WHERE id = NEW.cliente_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger (remove se já existir)
DROP TRIGGER IF EXISTS trigger_atualizar_cliente_ticket ON tickets;

CREATE TRIGGER trigger_atualizar_cliente_ticket
AFTER UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION atualizar_cliente_apos_ticket();

-- Comentário
COMMENT ON FUNCTION atualizar_cliente_apos_ticket IS 'Atualiza status_triagem do cliente quando ticket é fechado ou reaberto';
