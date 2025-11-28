-- Tabela de Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_ticket VARCHAR(50) UNIQUE NOT NULL, -- Ex: TKT-2025-001
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) DEFAULT 'pos_venda', -- pos_venda, suporte, reclamacao
  prioridade VARCHAR(20) DEFAULT 'media', -- baixa, media, alta, urgente
  status VARCHAR(50) DEFAULT 'aguardando_triagem', -- aguardando_triagem, em_atendimento, aguardando_setor, resolvido, fechado
  atendente_id UUID REFERENCES profiles(id),
  setor_responsavel VARCHAR(100), -- tecnico, financeiro, comercial, etc
  origem VARCHAR(50) DEFAULT 'manual', -- whatsapp, email, telefone, manual
  data_abertura TIMESTAMP DEFAULT NOW(),
  data_fechamento TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Interações do Ticket (histórico)
CREATE TABLE IF NOT EXISTS ticket_interacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id),
  tipo VARCHAR(50) NOT NULL, -- comentario, encaminhamento, mudanca_status
  mensagem TEXT,
  setor_origem VARCHAR(100),
  setor_destino VARCHAR(100),
  status_anterior VARCHAR(50),
  status_novo VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tickets_cliente ON tickets(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_atendente ON tickets(atendente_id);
CREATE INDEX IF NOT EXISTS idx_ticket_interacoes_ticket ON ticket_interacoes(ticket_id);

-- RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_interacoes ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para desenvolvimento
CREATE POLICY "Allow all for authenticated users" ON tickets FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON ticket_interacoes FOR ALL USING (true);

-- Função para gerar número de ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS VARCHAR AS $$
DECLARE
  next_num INTEGER;
  ticket_num VARCHAR;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_ticket FROM 10) AS INTEGER)), 0) + 1
  INTO next_num
  FROM tickets
  WHERE numero_ticket LIKE 'TKT-' || TO_CHAR(NOW(), 'YYYY') || '-%';
  
  ticket_num := 'TKT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar número automaticamente
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_ticket IS NULL THEN
    NEW.numero_ticket := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_ticket_number ON tickets;
CREATE TRIGGER trigger_set_ticket_number
BEFORE INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION set_ticket_number();
