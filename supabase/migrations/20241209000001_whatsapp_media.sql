-- Migration: WhatsApp Media Support
-- Description: Add support for media attachments in WhatsApp messages

-- Create whatsapp_media table
CREATE TABLE IF NOT EXISTS public.whatsapp_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL, -- image, document, video, audio, sticker
    file_name TEXT,
    file_size BIGINT, -- in bytes
    mime_type TEXT,
    storage_url TEXT, -- Supabase Storage URL or local path
    thumbnail_url TEXT, -- For videos/images
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_message_id ON public.whatsapp_media(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_conversation_id ON public.whatsapp_media(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_type ON public.whatsapp_media(media_type);

-- Enable RLS
ALTER TABLE public.whatsapp_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_media
CREATE POLICY "Enable read access for authenticated users" ON public.whatsapp_media
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.whatsapp_media
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.whatsapp_media
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON public.whatsapp_media
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add media_id reference to whatsapp_messages (optional, for quick lookup)
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS has_media BOOLEAN DEFAULT FALSE;

-- Create trigger to update has_media flag
CREATE OR REPLACE FUNCTION update_message_has_media()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.whatsapp_messages
        SET has_media = TRUE
        WHERE id = NEW.message_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.whatsapp_messages
        SET has_media = (
            SELECT COUNT(*) > 0 
            FROM public.whatsapp_media 
            WHERE message_id = OLD.message_id
        )
        WHERE id = OLD.message_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_has_media
AFTER INSERT OR DELETE ON public.whatsapp_media
FOR EACH ROW EXECUTE FUNCTION update_message_has_media();

-- Create storage bucket for WhatsApp media (run manually if needed)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('whatsapp-media', 'whatsapp-media', true)
-- ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.whatsapp_media IS 'Stores metadata for media files sent/received via WhatsApp';
COMMENT ON COLUMN public.whatsapp_media.media_type IS 'Type: image, document, video, audio, sticker';
COMMENT ON COLUMN public.whatsapp_media.storage_url IS 'Full URL to file in Supabase Storage or local filesystem';
