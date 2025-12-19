-- Criar políticas de storage para anexos de tarefas no bucket ticket-attachments
-- O bucket já existe, apenas precisamos adicionar políticas para o path 'tasks/'

-- Política para upload de anexos de tarefas
CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[1] = 'tasks');

-- Política para visualizar anexos de tarefas
CREATE POLICY "Authenticated users can view task attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[1] = 'tasks');

-- Política para deletar anexos de tarefas
CREATE POLICY "Authenticated users can delete task attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[1] = 'tasks');