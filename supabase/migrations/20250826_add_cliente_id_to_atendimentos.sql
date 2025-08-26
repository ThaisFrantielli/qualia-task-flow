-- Migration: Relacionar atendimentos à tabela clientes
ALTER TABLE public.atendimentos
  ADD COLUMN cliente_id UUID REFERENCES public.clientes(id);

-- (Opcional) Se desejar, remova os campos antigos duplicados:
-- ALTER TABLE public.atendimentos DROP COLUMN client_name, DROP COLUMN client_email, DROP COLUMN client_phone;

-- Atualize as políticas de RLS se necessário:
-- Exemplo: permitir acesso apenas a atendimentos do cliente do usuário logado
-- (ajuste conforme sua regra de negócio)

-- Exemplo de política restritiva:
-- CREATE POLICY "Usuário só vê atendimentos do seu cliente" ON public.atendimentos FOR SELECT USING (cliente_id = auth.uid());
