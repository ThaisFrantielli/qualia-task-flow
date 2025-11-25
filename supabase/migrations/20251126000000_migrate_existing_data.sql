-- Migration script to assign existing data to default instance
-- Run this after creating at least one instance in the system

-- Step 1: Create a default instance if none exists
DO $$
DECLARE
  default_instance_id UUID;
BEGIN
  -- Check if any instances exist
  IF NOT EXISTS (SELECT 1 FROM public.whatsapp_instances LIMIT 1) THEN
    -- Create default instance
    INSERT INTO public.whatsapp_instances (id, name, status)
    VALUES (gen_random_uuid(), 'Instância Padrão', 'disconnected')
    RETURNING id INTO default_instance_id;
    
    RAISE NOTICE 'Created default instance: %', default_instance_id;
  ELSE
    -- Use the first existing instance as default
    SELECT id INTO default_instance_id 
    FROM public.whatsapp_instances 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    RAISE NOTICE 'Using existing instance as default: %', default_instance_id;
  END IF;

  -- Step 2: Update conversations without instance_id
  UPDATE public.whatsapp_conversations
  SET instance_id = default_instance_id
  WHERE instance_id IS NULL;
  
  RAISE NOTICE 'Updated % conversations', (SELECT COUNT(*) FROM public.whatsapp_conversations WHERE instance_id = default_instance_id);

  -- Step 3: Update messages without instance_id
  UPDATE public.whatsapp_messages
  SET instance_id = default_instance_id
  WHERE instance_id IS NULL;
  
  RAISE NOTICE 'Updated % messages', (SELECT COUNT(*) FROM public.whatsapp_messages WHERE instance_id = default_instance_id);

END $$;

-- Step 4: Verify migration
SELECT 
  'Conversations without instance' as check_type,
  COUNT(*) as count
FROM public.whatsapp_conversations
WHERE instance_id IS NULL

UNION ALL

SELECT 
  'Messages without instance' as check_type,
  COUNT(*) as count
FROM public.whatsapp_messages
WHERE instance_id IS NULL

UNION ALL

SELECT 
  'Total instances' as check_type,
  COUNT(*) as count
FROM public.whatsapp_instances;

-- Optional: Add NOT NULL constraint after migration (uncomment if desired)
-- ALTER TABLE public.whatsapp_conversations ALTER COLUMN instance_id SET NOT NULL;
-- ALTER TABLE public.whatsapp_messages ALTER COLUMN instance_id SET NOT NULL;
