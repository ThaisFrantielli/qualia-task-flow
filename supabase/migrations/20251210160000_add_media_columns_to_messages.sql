-- Add media columns directly to whatsapp_messages for simpler handling
ALTER TABLE public.whatsapp_messages
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT;

COMMENT ON COLUMN public.whatsapp_messages.media_url IS 'Direct URL to media file in Supabase Storage (if message contains media)';
COMMENT ON COLUMN public.whatsapp_messages.media_type IS 'MIME type of the media (e.g., image/png, application/pdf)';
COMMENT ON COLUMN public.whatsapp_messages.file_name IS 'Original filename of the media attachment';
