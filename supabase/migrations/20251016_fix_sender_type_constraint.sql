-- Add support for 'user' sender_type in whatsapp_messages table
-- Migration: Fix sender_type constraint

-- Check current constraint and drop if exists
DO $$ 
BEGIN
    -- Try to drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'whatsapp_messages_sender_type_check'
    ) THEN
        ALTER TABLE whatsapp_messages DROP CONSTRAINT whatsapp_messages_sender_type_check;
    END IF;
END $$;

-- Add new constraint that allows 'user', 'customer', 'bot', 'system'
ALTER TABLE whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_sender_type_check 
CHECK (sender_type IN ('user', 'customer', 'bot', 'system'));