-- Remove conversas orfas sem telefone, sem instancia e sem ultima mensagem.
DELETE FROM public.whatsapp_conversations
WHERE (customer_phone IS NULL OR btrim(customer_phone) = '')
  AND instance_id IS NULL
  AND last_message IS NULL;
