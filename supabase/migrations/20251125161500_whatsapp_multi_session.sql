-- Create whatsapp_instances table
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected', -- connecting, connected, disconnected
    qr_code TEXT,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for whatsapp_instances
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.whatsapp_instances
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.whatsapp_instances
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.whatsapp_instances
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON public.whatsapp_instances
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add instance_id to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES public.whatsapp_instances(id);

-- Add instance_id to whatsapp_messages
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES public.whatsapp_instances(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_instance_id ON public.whatsapp_conversations(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance_id ON public.whatsapp_messages(instance_id);

-- Migrate existing data (optional: create a default instance if needed)
-- INSERT INTO public.whatsapp_instances (id, name, status) VALUES ('00000000-0000-0000-0000-000000000000', 'Default', 'disconnected') ON CONFLICT DO NOTHING;
-- UPDATE public.whatsapp_conversations SET instance_id = '00000000-0000-0000-0000-000000000000' WHERE instance_id IS NULL;
-- UPDATE public.whatsapp_messages SET instance_id = '00000000-0000-0000-0000-000000000000' WHERE instance_id IS NULL;
