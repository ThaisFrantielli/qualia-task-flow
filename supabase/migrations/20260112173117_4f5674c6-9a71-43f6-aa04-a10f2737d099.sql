-- Atualiza políticas de storage para ticket-attachments para permitir qualquer path
-- Remove política que exige prefixo 'tasks/'
DROP POLICY IF EXISTS "Authenticated users can view task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete task attachments" ON storage.objects;

-- Cria políticas mais genéricas para ticket-attachments
CREATE POLICY "Authenticated users can view all ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated users can delete all ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-attachments');

-- Atualiza política de upload para authenticated (se não existir)
DROP POLICY IF EXISTS "Authenticated users can upload task attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload all ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');