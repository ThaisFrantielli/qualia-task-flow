-- Corrige RLS em clientes/cliente_contatos para permitir uso do app (criar/editar cliente)
-- Contexto: migrations anteriores habilitaram RLS e removeram policies antigas, deixando a tabela sem acesso.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clientes'
  ) THEN
    ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

    -- Remove policies antigas/duplicadas (se existirem)
    DROP POLICY IF EXISTS "Permitir leitura de clientes para usuários autenticados" ON public.clientes;
    DROP POLICY IF EXISTS "Authenticated can manage clientes" ON public.clientes;

    -- Política simples: usuários autenticados podem operar clientes
    -- (a tabela não possui team_id/user_id para granularidade melhor sem refatoração de schema)
    CREATE POLICY "Authenticated can manage clientes"
    ON public.clientes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cliente_contatos'
  ) THEN
    ALTER TABLE public.cliente_contatos ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Permitir leitura de contatos para usuários autenticados" ON public.cliente_contatos;
    DROP POLICY IF EXISTS "Authenticated can manage cliente_contatos" ON public.cliente_contatos;

    CREATE POLICY "Authenticated can manage cliente_contatos"
    ON public.cliente_contatos
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;
