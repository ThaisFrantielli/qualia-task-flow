-- Migração de dados: associar atendimentos a clientes existentes
-- 1. Para cada atendimento, tente encontrar um cliente correspondente pelo nome e email
-- 2. Atualize o campo cliente_id em atendimentos

UPDATE public.atendimentos a
SET cliente_id = c.id
FROM public.clientes c
WHERE 
  (a.client_email IS NOT NULL AND a.client_email = c.email)
  OR (a.client_name IS NOT NULL AND a.client_name = c.nome);

-- (Opcional) Após migrar, você pode remover os campos antigos se desejar:
-- ALTER TABLE public.atendimentos DROP COLUMN client_name, DROP COLUMN client_email, DROP COLUMN client_phone;
