-- Migration: Add CASCADE delete to WhatsApp foreign keys
-- Description: Allow automatic deletion of related records when instance is deleted

-- Drop existing foreign key constraints
ALTER TABLE public.whatsapp_conversations 
DROP CONSTRAINT IF EXISTS whatsapp_conversations_instance_id_fkey;

ALTER TABLE public.whatsapp_messages 
DROP CONSTRAINT IF EXISTS whatsapp_messages_instance_id_fkey;

-- Re-add with ON DELETE CASCADE
ALTER TABLE public.whatsapp_conversations
ADD CONSTRAINT whatsapp_conversations_instance_id_fkey 
FOREIGN KEY (instance_id) 
REFERENCES public.whatsapp_instances(id) 
ON DELETE CASCADE;

ALTER TABLE public.whatsapp_messages
ADD CONSTRAINT whatsapp_messages_instance_id_fkey 
FOREIGN KEY (instance_id) 
REFERENCES public.whatsapp_instances(id) 
ON DELETE CASCADE;

-- Also add CASCADE to templates if it exists
ALTER TABLE public.whatsapp_templates 
DROP CONSTRAINT IF EXISTS whatsapp_templates_instance_id_fkey;

ALTER TABLE public.whatsapp_templates
ADD CONSTRAINT whatsapp_templates_instance_id_fkey 
FOREIGN KEY (instance_id) 
REFERENCES public.whatsapp_instances(id) 
ON DELETE CASCADE;

COMMENT ON CONSTRAINT whatsapp_conversations_instance_id_fkey ON public.whatsapp_conversations IS 'Cascade delete conversations when instance is deleted';
COMMENT ON CONSTRAINT whatsapp_messages_instance_id_fkey ON public.whatsapp_messages IS 'Cascade delete messages when instance is deleted';
COMMENT ON CONSTRAINT whatsapp_templates_instance_id_fkey ON public.whatsapp_templates IS 'Cascade delete templates when instance is deleted';
