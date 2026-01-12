-- 1. Limpar clientes importados do BI
DELETE FROM clientes WHERE origem = 'dim_clientes_bi';

-- 2. Criar função para limpar a tabela antes de reimportar (chamada pelo frontend)
CREATE OR REPLACE FUNCTION public.limpar_clientes_bi()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM clientes WHERE origem = 'dim_clientes_bi';
END;
$$;

-- 3. Grant para usuários autenticados
GRANT EXECUTE ON FUNCTION public.limpar_clientes_bi() TO authenticated;