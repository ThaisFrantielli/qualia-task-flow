-- Script 6: Criar tabela de departamentos envolvidos em tickets

CREATE TABLE IF NOT EXISTS ticket_departamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    departamento VARCHAR(50) NOT NULL, -- comercial, tecnico, logistica, financeiro, qualidade
    solicitado_em TIMESTAMP DEFAULT NOW(),
    solicitado_por UUID REFERENCES profiles(id),
    respondido_em TIMESTAMP,
    respondido_por UUID REFERENCES profiles(id),
    resposta TEXT,
    task_id UUID REFERENCES tasks(id), -- Task criada para o departamento
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_ticket_departamentos_ticket ON ticket_departamentos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_departamentos_departamento ON ticket_departamentos(departamento);
CREATE INDEX IF NOT EXISTS idx_ticket_departamentos_task ON ticket_departamentos(task_id);

-- Comentários
COMMENT ON TABLE ticket_departamentos IS 'Departamentos envolvidos na resolução de tickets';
COMMENT ON COLUMN ticket_departamentos.departamento IS 'Nome do departamento: comercial, tecnico, logistica, financeiro, qualidade';
COMMENT ON COLUMN ticket_departamentos.task_id IS 'Task criada para o departamento responder';

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_ticket_departamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_ticket_departamentos_updated_at ON ticket_departamentos;
CREATE TRIGGER trigger_update_ticket_departamentos_updated_at
    BEFORE UPDATE ON ticket_departamentos
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_departamentos_updated_at();
