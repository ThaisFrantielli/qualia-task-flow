-- =============================================================
-- FASE 2: Normalização de Legado 2025
-- Limpar referências orphaned, colunas obsoletas e constraints
-- pendentes de migrations anteriores a 2026.
-- =============================================================

-- 1. Garantir NOT NULL em colunas essenciais de oportunidades
DO $$
BEGIN
  -- titulo não pode ser nulo (já deveria ter, mas garante)
  ALTER TABLE public.oportunidades
    ALTER COLUMN titulo SET DEFAULT '';
  UPDATE public.oportunidades SET titulo = '' WHERE titulo IS NULL;
  ALTER TABLE public.oportunidades
    ALTER COLUMN titulo SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'oportunidades.titulo: %', SQLERRM;
END $$;

-- 2. Garantir que status tenha valor padrão
DO $$
BEGIN
  UPDATE public.oportunidades SET status = 'aberta' WHERE status IS NULL;
  ALTER TABLE public.oportunidades
    ALTER COLUMN status SET DEFAULT 'aberta';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'oportunidades.status default: %', SQLERRM;
END $$;

-- 3. Remover políticas de nome genérico residuais (legado 2025)
DO $$
DECLARE
  _policy TEXT;
BEGIN
  FOR _policy IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'oportunidades'
      AND policyname ILIKE '%Permitir acesso total%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.oportunidades', _policy);
    RAISE NOTICE 'Dropped policy: %', _policy;
  END LOOP;
END $$;

-- 4. Limpar propostas sem vendedor e sem cliente (órfãs de testes)
DELETE FROM public.propostas
WHERE status = 'rascunho'
  AND vendedor_id IS NULL
  AND cliente_id IS NULL
  AND created_at < NOW() - INTERVAL '90 days';

-- 5. Garantir constraint de valor não negativo em propostas
ALTER TABLE public.propostas
  DROP CONSTRAINT IF EXISTS ck_propostas_valor_mensal_positivo;
ALTER TABLE public.propostas
  ADD CONSTRAINT ck_propostas_valor_mensal_positivo
  CHECK (valor_mensal_total >= 0);

-- 6. Garantir índice em propostas.status para queries de forecast
CREATE INDEX IF NOT EXISTS idx_propostas_status_vendedor
  ON public.propostas(status, vendedor_id);

-- 7. Trigger updated_at em oportunidades (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_oportunidades_updated_at'
      AND tgrelid = 'public.oportunidades'::regclass
  ) THEN
    -- Cria função update_updated_at se não existir
    CREATE OR REPLACE FUNCTION public.update_updated_at_oportunidades()
    RETURNS TRIGGER LANGUAGE plpgsql
    SECURITY DEFINER SET search_path = public
    AS $fn$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $fn$;

    -- Verifica se coluna updated_at existe
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'oportunidades'
        AND column_name = 'updated_at'
    ) THEN
      CREATE TRIGGER update_oportunidades_updated_at
        BEFORE UPDATE ON public.oportunidades
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_oportunidades();
    ELSE
      ALTER TABLE public.oportunidades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      CREATE TRIGGER update_oportunidades_updated_at
        BEFORE UPDATE ON public.oportunidades
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_oportunidades();
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'trigger update_oportunidades_updated_at: %', SQLERRM;
END $$;

-- 8. Sinalizar conclusão
DO $$
BEGIN
  RAISE NOTICE 'Fase 2 - Normalização de legado 2025 aplicada com sucesso.';
END $$;
