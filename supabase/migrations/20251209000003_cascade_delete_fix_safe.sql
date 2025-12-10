-- Safe Migration: Add ON DELETE CASCADE only if target tables exist
-- This script checks information_schema for table presence and applies
-- constraint changes only when appropriate, avoiding "relation does not exist" errors.

DO $$
BEGIN
  -- whatsapp_templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_templates') THEN
    ALTER TABLE public.whatsapp_templates
      DROP CONSTRAINT IF EXISTS whatsapp_templates_instance_id_fkey;

    ALTER TABLE public.whatsapp_templates
      ADD CONSTRAINT whatsapp_templates_instance_id_fkey
      FOREIGN KEY (instance_id)
      REFERENCES public.whatsapp_instances(id)
      ON DELETE CASCADE;

    COMMENT ON CONSTRAINT whatsapp_templates_instance_id_fkey ON public.whatsapp_templates
      IS 'Cascade delete templates when instance is deleted';
  END IF;

  -- whatsapp_conversations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations') THEN
    ALTER TABLE public.whatsapp_conversations
      DROP CONSTRAINT IF EXISTS whatsapp_conversations_instance_id_fkey;

    ALTER TABLE public.whatsapp_conversations
      ADD CONSTRAINT whatsapp_conversations_instance_id_fkey
      FOREIGN KEY (instance_id)
      REFERENCES public.whatsapp_instances(id)
      ON DELETE CASCADE;

    COMMENT ON CONSTRAINT whatsapp_conversations_instance_id_fkey ON public.whatsapp_conversations
      IS 'Cascade delete conversations when instance is deleted';
  END IF;

  -- whatsapp_messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_messages') THEN
    ALTER TABLE public.whatsapp_messages
      DROP CONSTRAINT IF EXISTS whatsapp_messages_instance_id_fkey;

    ALTER TABLE public.whatsapp_messages
      ADD CONSTRAINT whatsapp_messages_instance_id_fkey
      FOREIGN KEY (instance_id)
      REFERENCES public.whatsapp_instances(id)
      ON DELETE CASCADE;

    COMMENT ON CONSTRAINT whatsapp_messages_instance_id_fkey ON public.whatsapp_messages
      IS 'Cascade delete messages when instance is deleted';
  END IF;
END;
$$ LANGUAGE plpgsql;
