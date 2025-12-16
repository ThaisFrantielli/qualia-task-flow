-- Create storage bucket for ticket attachments if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for ticket attachments
CREATE POLICY "Authenticated users can view ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their own ticket attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');