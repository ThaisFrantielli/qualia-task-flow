-- Tabela de campanhas de broadcast
CREATE TABLE whatsapp_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  
  -- Configurações anti-banimento
  min_delay_seconds INT DEFAULT 8,
  max_delay_seconds INT DEFAULT 25,
  daily_limit INT DEFAULT 100,
  batch_size INT DEFAULT 10,
  batch_pause_minutes INT DEFAULT 5,
  use_business_hours BOOLEAN DEFAULT false,
  
  -- Agendamento
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de destinatários do broadcast
CREATE TABLE whatsapp_broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID REFERENCES whatsapp_broadcasts(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  
  -- Variáveis para personalização
  variables JSONB DEFAULT '{}',
  
  -- Status do envio
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  whatsapp_message_id TEXT,
  
  -- Ordem de processamento
  processing_order INT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de opt-outs (descadastrados)
CREATE TABLE whatsapp_optouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  reason TEXT,
  broadcast_id UUID REFERENCES whatsapp_broadcasts(id) ON DELETE SET NULL,
  opted_out_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de log de envios do dia (para controle de limite diário)
CREATE TABLE whatsapp_daily_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  send_date DATE NOT NULL DEFAULT CURRENT_DATE,
  send_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id, send_date)
);

-- Índices para performance
CREATE INDEX idx_broadcast_recipients_broadcast_id ON whatsapp_broadcast_recipients(broadcast_id);
CREATE INDEX idx_broadcast_recipients_status ON whatsapp_broadcast_recipients(status);
CREATE INDEX idx_broadcast_recipients_pending ON whatsapp_broadcast_recipients(broadcast_id, status) WHERE status = 'pending';
CREATE INDEX idx_broadcasts_status ON whatsapp_broadcasts(status);
CREATE INDEX idx_broadcasts_created_by ON whatsapp_broadcasts(created_by);
CREATE INDEX idx_optouts_phone ON whatsapp_optouts(phone_number);
CREATE INDEX idx_daily_log_instance_date ON whatsapp_daily_send_log(instance_id, send_date);

-- Enable RLS
ALTER TABLE whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_optouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_daily_send_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para broadcasts
CREATE POLICY "Authenticated users can view broadcasts"
ON whatsapp_broadcasts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create broadcasts"
ON whatsapp_broadcasts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update broadcasts"
ON whatsapp_broadcasts FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete broadcasts"
ON whatsapp_broadcasts FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Políticas RLS para recipients
CREATE POLICY "Authenticated users can view recipients"
ON whatsapp_broadcast_recipients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage recipients"
ON whatsapp_broadcast_recipients FOR ALL
TO authenticated
USING (true);

-- Políticas RLS para optouts
CREATE POLICY "Authenticated users can view optouts"
ON whatsapp_optouts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage optouts"
ON whatsapp_optouts FOR ALL
TO authenticated
USING (true);

-- Políticas RLS para daily log
CREATE POLICY "Authenticated users can view daily log"
ON whatsapp_daily_send_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage daily log"
ON whatsapp_daily_send_log FOR ALL
TO authenticated
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_whatsapp_broadcasts_updated_at
BEFORE UPDATE ON whatsapp_broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_daily_log_updated_at
BEFORE UPDATE ON whatsapp_daily_send_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();;
