-- ============================================================
-- Fix: WhatsApp dedup + ticket_motivos.is_active + helper RPC
-- ============================================================

-- 1) Backup das conversas antes de deduplicar
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations_backup_dedup AS
SELECT *, NOW() as backup_at FROM public.whatsapp_conversations WHERE FALSE;

INSERT INTO public.whatsapp_conversations_backup_dedup
SELECT *, NOW() FROM public.whatsapp_conversations
WHERE (whatsapp_number, COALESCE(instance_id::text, '')) IN (
  SELECT whatsapp_number, COALESCE(instance_id::text, '')
  FROM public.whatsapp_conversations
  WHERE whatsapp_number IS NOT NULL
  GROUP BY whatsapp_number, COALESCE(instance_id::text, '')
  HAVING COUNT(*) > 1
);

-- 2) Mesclar duplicatas: para cada (whatsapp_number, instance_id) duplicado,
--    manter a mais recente (por last_message_at desc, created_at desc) e mover mensagens
WITH ranked AS (
  SELECT id, whatsapp_number, instance_id,
    ROW_NUMBER() OVER (
      PARTITION BY whatsapp_number, COALESCE(instance_id::text, '')
      ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC
    ) AS rn
  FROM public.whatsapp_conversations
  WHERE whatsapp_number IS NOT NULL
),
keepers AS (
  SELECT whatsapp_number, instance_id, id AS keeper_id FROM ranked WHERE rn = 1
),
losers AS (
  SELECT r.id AS loser_id, k.keeper_id
  FROM ranked r
  JOIN keepers k
    ON k.whatsapp_number = r.whatsapp_number
   AND COALESCE(k.instance_id::text, '') = COALESCE(r.instance_id::text, '')
  WHERE r.rn > 1
)
UPDATE public.whatsapp_messages m
SET conversation_id = l.keeper_id
FROM losers l
WHERE m.conversation_id = l.loser_id;

-- Deletar conversas perdedoras
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY whatsapp_number, COALESCE(instance_id::text, '')
      ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC
    ) AS rn
  FROM public.whatsapp_conversations
  WHERE whatsapp_number IS NOT NULL
)
DELETE FROM public.whatsapp_conversations
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 3) Trocar índice único: o atual (cliente_id, whatsapp_number) não cobre cliente_id NULL
DROP INDEX IF EXISTS public.idx_whatsapp_conversations_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_conversations_unique_phone_instance
ON public.whatsapp_conversations (whatsapp_number, COALESCE(instance_id::text, ''))
WHERE whatsapp_number IS NOT NULL;

-- 4) Garantir índice único em whatsapp_message_id para deduplicar mensagens (incluindo bot/agent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_msgid_unique
ON public.whatsapp_messages (whatsapp_message_id)
WHERE whatsapp_message_id IS NOT NULL;

-- 5) Adicionar is_active em ticket_motivos (default true) para suportar UI de catálogo
ALTER TABLE public.ticket_motivos
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_ticket_motivos_active ON public.ticket_motivos(is_active);
