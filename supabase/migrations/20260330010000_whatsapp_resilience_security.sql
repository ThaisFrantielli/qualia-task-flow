-- WhatsApp resiliencia, seguranca e auditoria
-- Timestamp: 20260330010000

-- 1) Colunas para resiliência no envio de mensagens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_messages' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE public.whatsapp_messages ADD COLUMN retry_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_messages' AND column_name = 'next_retry_at'
  ) THEN
    ALTER TABLE public.whatsapp_messages ADD COLUMN next_retry_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_messages' AND column_name = 'last_error'
  ) THEN
    ALTER TABLE public.whatsapp_messages ADD COLUMN last_error TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_messages' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE public.whatsapp_messages ADD COLUMN error_message TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_messages' AND column_name = 'dead_letter'
  ) THEN
    ALTER TABLE public.whatsapp_messages ADD COLUMN dead_letter BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_messages' AND column_name = 'failed_at'
  ) THEN
    ALTER TABLE public.whatsapp_messages ADD COLUMN failed_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_messages' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.whatsapp_messages ADD COLUMN sent_at TIMESTAMP;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_retry
  ON public.whatsapp_messages(status, retry_count, next_retry_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_dead_letter
  ON public.whatsapp_messages(dead_letter)
  WHERE dead_letter = TRUE;

-- 2) Encerramento com motivo em conversas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'closed_reason'
  ) THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN closed_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN closed_at TIMESTAMP;
  END IF;
END $$;

-- 3) Auditoria de ações WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  conversation_id UUID NULL REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
  instance_id UUID NULL REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
  payload JSONB NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_audit_log_created_at ON public.whatsapp_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_audit_log_action ON public.whatsapp_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_whatsapp_audit_log_conversation ON public.whatsapp_audit_log(conversation_id);

ALTER TABLE public.whatsapp_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_audit_log_select_authenticated" ON public.whatsapp_audit_log;
CREATE POLICY "whatsapp_audit_log_select_authenticated"
ON public.whatsapp_audit_log
FOR SELECT
TO authenticated
USING (true);

-- Somente service_role deve inserir, então não criamos policy de INSERT para authenticated.

-- 4) Rate limit por minuto e usuário
CREATE TABLE IF NOT EXISTS public.whatsapp_rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  minute_bucket TIMESTAMP NOT NULL,
  send_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, minute_bucket)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_rate_limit_bucket
  ON public.whatsapp_rate_limit_log(minute_bucket DESC);

ALTER TABLE public.whatsapp_rate_limit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_rate_limit_select_own" ON public.whatsapp_rate_limit_log;
CREATE POLICY "whatsapp_rate_limit_select_own"
ON public.whatsapp_rate_limit_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5) Função para encerramento com motivo (sem CSAT automático)
CREATE OR REPLACE FUNCTION public.close_whatsapp_conversation(
  p_conversation_id UUID,
  p_closed_reason TEXT,
  p_actor UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.whatsapp_conversations
  SET
    status = 'closed',
    closed_reason = p_closed_reason,
    closed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_conversation_id;

  INSERT INTO public.whatsapp_audit_log (actor_user_id, action, conversation_id, payload)
  VALUES (
    p_actor,
    'conversation_closed',
    p_conversation_id,
    jsonb_build_object('reason', p_closed_reason)
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN public.whatsapp_messages.retry_count IS 'Tentativas de reenvio da mensagem';
COMMENT ON COLUMN public.whatsapp_messages.next_retry_at IS 'Próxima tentativa automática de envio';
COMMENT ON COLUMN public.whatsapp_messages.dead_letter IS 'Mensagem movida para dead-letter após exceder tentativas';
COMMENT ON COLUMN public.whatsapp_conversations.closed_reason IS 'Motivo de encerramento da conversa';
COMMENT ON COLUMN public.whatsapp_conversations.closed_at IS 'Data/hora de encerramento da conversa';
COMMENT ON TABLE public.whatsapp_audit_log IS 'Auditoria de ações do módulo WhatsApp';
